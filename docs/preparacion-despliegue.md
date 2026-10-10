# Preparación del despliegue AWS — paso 1

Esta etapa prepara y verifica el código. No crea recursos AWS ni publica el sitio.
Los comandos siguientes son PowerShell, ejecutados desde la raíz del repositorio
salvo cuando se indica `Push-Location`. Los valores `example.com` y las contraseñas
`local-check-only` son datos de pruebas; no son configuración de producción.

## 1. Revisar el estado inicial

```powershell
git status --short
docker version
docker ps --format '{{.Names}} {{.Image}}'
Push-Location backend
.\gradlew.bat --version
Pop-Location
Push-Location frontend
npm run build
npm run lint
Pop-Location
```

- `git status`: comprobar cambios existentes antes de editar.
- `docker version`: comprobar tanto el cliente como el motor Linux de Docker Desktop.
- `docker ps`: identificar contenedores existentes; la base de desarrollo no se modifica.
- `gradlew --version`: verificar el wrapper del proyecto y Java 21.
- `npm run build`: ejecutar TypeScript y producir los archivos estáticos de Vite.
- `npm run lint`: detectar problemas de estilo, hooks y exports; es independiente del build.

La revisión inicial encontró dependencias faltantes en `node_modules`, dos imports
sin uso que impedían compilar y 26 errores/2 advertencias de lint. Se retiraron
los imports `lazy` y `Suspense` no utilizados de la página de detalle de solicitudes.
No se desactivaron reglas de ESLint ni se refactorizaron los componentes ajenos al despliegue.

## 2. Pruebas del backend sin tocar los datos locales

Crear una base desechable (solo si no existe este contenedor):

```powershell
docker run -d --name brunexa-deploy-check-db -p 127.0.0.1:55432:5432 -e POSTGRES_DB=deploy_check -e POSTGRES_USER=deploy_check -e POSTGRES_PASSWORD=local-check-only postgres:17-alpine
```

Se usa el puerto 55432 para no ocupar el 5432 de desarrollo. El nombre de usuario,
base y contraseña pertenecen exclusivamente a esta prueba.

En una terminal dedicada, ejecutar:

```powershell
Push-Location backend
$env:SPRING_CONFIG_IMPORT='optional:file:./build/deploy-check.env[.properties]'
$env:SPRING_PROFILES_ACTIVE='test'
$env:DB_HOST='localhost'
$env:DB_PORT='55432'
$env:DB_NAME='deploy_check'
$env:DB_USER='deploy_check'
$env:DB_PASSWORD='local-check-only'
$env:AWS_REGION='us-east-1'
$env:AWS_EC2_METADATA_DISABLED='true'
.\gradlew.bat test bootJar --console=plain
Pop-Location
```

`SPRING_CONFIG_IMPORT` evita cargar el `.env` real en las pruebas. No crear ese
archivo de importación: su ausencia es intencional. Las variables duran lo que
dure esa terminal; ciérrala al terminar para no reutilizarlas por accidente.
Las pruebas de AWS usan mocks, sin llamadas ni cargos AWS.

`test` ejecuta pruebas unitarias e integración; `bootJar` genera
`backend/build/libs/backend.jar`. Flyway crea el esquema de la base desechable.
Las pruebas de integración de solicitudes utilizan transacciones con rollback.

Pruebas añadidas:

- CORS: origen HTTPS permitido, envío de cookies, rechazo de otros sitios y localhost en prod.
- Credenciales: prod usa la cadena estándar del SDK; dev conserva las propiedades locales existentes.
- Liveness: `AssumeRole`, sesión de 900 segundos y política que solo permite `StartFaceLivenessSession`.
- Liveness falla si falta el rol o AWS lo rechaza, sin entregar credenciales del backend.
- Correo: un fallo SMTP en producción no expone códigos de verificación en logs.

## 3. Empaquetar con Docker

```powershell
docker build -t brunexa-backend:local ./backend
```

El contexto de construcción es `backend`. La etapa de construcción usa JDK 21
y el wrapper Gradle del proyecto. La imagen final contiene JRE 21 y el JAR,
se ejecuta con un usuario sin privilegios y activa `prod`.
`.dockerignore` excluye `.env`, compilaciones previas y otros archivos locales.
El Dockerfile compila, pero no ejecuta pruebas de integración: estas requieren PostgreSQL
y se ejecutan por separado antes de publicar una imagen.

El nombre estable `backend.jar` evita depender de comodines que puedan copiar el JAR incorrecto.
El proceso Java recibe directamente las señales de ECS; Spring tiene apagado gradual.
La imagen configura `TZ=America/Guayaquil` para las llamadas `LocalDate.now()` del negocio.
Si se cambia la zona, configurar tanto `TZ` como `APP_TIME_ZONE` con el mismo valor.

## 4. Desarrollo y producción

`application.yaml` conserva los valores locales. `application-prod.yaml` los
sobrescribe cuando `SPRING_PROFILES_ACTIVE=prod`. El `.env` local sigue siendo
compatible, incluso si contiene `spring.profiles.active`; no se copia a la imagen.
No montar un `.env` de desarrollo en un contenedor desplegado.

| Variable en ECS | Uso |
| --- | --- |
| `SPRING_PROFILES_ACTIVE=prod` | Activar configuración de producción. |
| `DB_HOST`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` | Conexión a RDS; contraseña mediante Secrets Manager. |
| `DB_PORT` / `DB_SCHEMA` | Opcionales; 5432 / financiero. |
| `DB_SSL_MODE` | Predeterminado `require`: conexión cifrada. `verify-full` requiere configurar la CA de RDS. |
| `FRONTEND_URL` | Origen HTTPS exacto, por ejemplo `https://app.tudominio.com`, sin barra final ni ruta. |
| `SMTP_HOST`, `SMTP_USERNAME`, `SMTP_PASSWORD` | Servidor de correo real y credenciales. |
| `SMTP_PORT` | 587 por defecto; configuración STARTTLS obligatorio, no SMTPS implícito de puerto 465. |
| `MAIL_SENDER` | Remitente autorizado por el proveedor SMTP. |
| `APP_INITIAL_ADMIN_PASSWORD` | Contraseña de al menos 12 caracteres para crear el primer administrador si no existe. |
| `AWS_REGION` | Región utilizada por los clientes de biometría y STS. |
| `AWS_LIVENESS_ROLE_ARN` | Rol dedicado a las credenciales temporales del navegador. |
| `AWS_REKOGNITION_COLLECTION` | Colección administrada por Terraform; predeterminado `brn-clients`. |

Las credenciales de base de datos, correo y bootstrap se inyectarán con Secrets Manager
en la definición de tarea. Esta etapa no implementa lectura directa de Secrets Manager en Java.
No inyectar claves permanentes AWS en ECS: su **task role** da acceso al SDK.
El **execution role** es distinto: ECS lo usa para descargar la imagen, enviar logs e inyectar secretos.

Las cuentas de ejemplo y el controlador de pruebas biométricas solo se activan con
`dev` y nunca si `prod` está activo. El administrador bootstrap se crea una sola vez;
cambiar su variable no cambia una contraseña existente.

En prod las cookies son `Secure`, `HttpOnly` y `SameSite=Strict`. Usar frontend y API
bajo el mismo dominio registrable, ambos HTTPS (`app.tudominio.com` / `api.tudominio.com`),
o el mismo origen con `/api`. Los dominios independientes de CloudFront y ALB no son
una solución intercambiable: las cookies pueden no enviarse.
El ALB deberá ser la única entrada al puerto del backend, pues se confía en sus cabeceras de proxy.

La sesión permanece en memoria: iniciar con una tarea. Un reemplazo puede exigir volver
a iniciar sesión, y varias tareas requieren diseñar la persistencia/afinidad de sesiones.

## 5. AWS y Liveness

`AwsConfig` utiliza exclusivamente la cadena de credenciales del SDK: el perfil de AWS
seleccionado en local y el task role de ECS en producción. La aplicación no acepta claves
AWS permanentes en `application.yaml` ni en `.env`.
`LivenessCredentialsService` sustituye `GetFederationToken` y `GetSessionToken` por
`AssumeRole`. Lo utilizan registro, solicitudes y la pantalla de desarrollo.
El contrato JSON que recibe el frontend no cambia.

En el siguiente paso se debe configurar:

1. Task role del backend con permisos concretos de Textract/Rekognition y
   `sts:AssumeRole` únicamente sobre el rol de Liveness.
2. Rol de Liveness cuya relación de confianza permita al task role asumirlo;
   su política permite `rekognition:StartFaceLivenessSession`.
3. El código añade una política de sesión con esa misma acción y vigencia de 15 minutos.
   `Resource: "*"` corresponde a esta acción de streaming; no concede todas las acciones de Rekognition.
4. Terraform crea la colección `brn-clients` en la región configurada. La aplicación no la crea al arrancar.

Para probar biometría desde tu equipo, configurar también el ARN del rol y autorizar a
tu identidad local para asumirlo. Ya no basta el antiguo permiso `GetFederationToken`.
No se han creado roles ni invocado servicios biométricos reales en esta etapa.

### Retirar el usuario IAM heredado

El backend ya no debe depender de un usuario IAM con claves permanentes. En desarrollo,
iniciar el proceso con el perfil local del administrador:

```powershell
$env:AWS_PROFILE = 'brunexa-admin'
$env:AWS_REGION = 'us-east-1'
aws sts get-caller-identity --profile brunexa-admin
```

En Fargate no se define `AWS_PROFILE`, `AWS_ACCESS_KEY_ID` ni `AWS_SECRET_ACCESS_KEY`:
el SDK recibe credenciales temporales del task role. Antes de borrar el usuario heredado,
consultar su clave y último uso, desactivarla y comprobar que ningún proceso lo necesita:

```powershell
$keys = aws iam list-access-keys --user-name brunexa-backend --profile brunexa-admin | ConvertFrom-Json
$keyId = $keys.AccessKeyMetadata[0].AccessKeyId
aws iam get-access-key-last-used --access-key-id $keyId --profile brunexa-admin
aws iam update-access-key --user-name brunexa-backend --access-key-id $keyId --status Inactive --profile brunexa-admin
aws iam list-access-keys --user-name brunexa-backend --profile brunexa-admin
```

Si la comprobación es correcta, eliminar la clave y luego el usuario desde IAM. Si algo
todavía dependía de esa identidad, reactivar la clave antes de borrarla permite revertir:

```powershell
aws iam update-access-key --user-name brunexa-backend --access-key-id $keyId --status Active --profile brunexa-admin
# Después de verificar el reemplazo:
aws iam delete-access-key --user-name brunexa-backend --access-key-id $keyId --profile brunexa-admin
aws iam delete-user --user-name brunexa-backend --profile brunexa-admin
```

`delete-user` solo funciona cuando el usuario ya no tiene grupos, políticas, perfil de
consola u otras credenciales asociadas. La consola IAM muestra esas dependencias y permite
quitarlas antes del borrado definitivo.

## 6. Frontend y URL de API

```powershell
Push-Location frontend
npm ci --no-audit --no-fund
$env:VITE_API_BASE_URL='https://api.example.com/api'
npm run build
npm run lint
Pop-Location
```

`npm ci` reinstala exactamente el lockfile. No se actualizaron las versiones declaradas.
El dominio de arriba solo comprueba compilación; reemplazarlo por el real antes de publicar.

Vite incorpora `VITE_API_BASE_URL` al JavaScript durante el build. Cambiar una variable
en ECS después no cambia ese frontend: hay que recompilar y publicar `frontend/dist`.
No colocar secretos en variables `VITE_*`.

La compilación rechaza una URL vacía, HTTP, localhost o una URL sin `/api` al final.
También acepta `/api`, exclusivamente para una distribución CloudFront que enrute
`/api/*` al ALB, sin cachear respuestas y reenviando cookies y las cabeceras necesarias.
En desarrollo, `npm run dev` conserva `http://localhost:8080/api` como valor predeterminado.

Ejecutado desde `frontend`, `node scripts/check-api-config.mjs` comprueba la configuración
real de Vite: rechaza cinco URLs inválidas y acepta HTTPS y `/api`, sin recompilar los assets.

## 7. Probar la imagen con producción local

```powershell
docker compose -f backend/compose.verify.yaml -p brunexa-verify up -d
docker compose -f backend/compose.verify.yaml -p brunexa-verify logs --tail 80 backend
Invoke-RestMethod http://localhost:18080/api/health
.\backend\scripts\check-container.ps1
```

El Compose de verificación usa otra base desechable dentro de su red y datos ficticios.
Activa prod, permite comprobar migraciones, bootstrap, CORS y cookies, y publica solo
en la interfaz local. `DB_SSL_MODE=disable` es una excepción para ese PostgreSQL local.
`/api/health` comprueba que el proceso responde; no es una comprobación continua de RDS.

Este entorno no tiene un proveedor SMTP ni credenciales AWS reales, por lo que no valida
entrega de correo ni reconocimiento facial. Tampoco sustituye la prueba de login en
navegador con HTTPS real: las cookies seguras requieren ese despliegue.

`check-container.ps1` comprueba health, preflight CORS, login del administrador de prueba,
atributos de cookies, acceso autenticado/anónimo, catálogo, simulación y generación de PDF.
Simula `X-Forwarded-Proto: https` del ALB y envía la cookie manualmente sobre HTTP local:
esto verifica el servidor, no las políticas del navegador ni un certificado TLS.

Al finalizar, retirar únicamente los contenedores de prueba:

```powershell
docker compose -f backend/compose.verify.yaml -p brunexa-verify down -v
docker rm -f brunexa-deploy-check-db
```

Esos comandos eliminan los datos desechables de verificación. No ejecutarlos contra
el Compose o el contenedor `financiero-postgres` de desarrollo.

## Resultados — 28 de septiembre de 2026

| Comprobación | Resultado |
| --- | --- |
| Backend: `test bootJar` | 90 pruebas, 0 fallos y 0 errores; JAR generado. |
| Imagen Docker Linux/Java 21 | Construcción correcta. |
| Usuario y contenido de la imagen | UID 10001; `/app` contiene solo `backend.jar`, sin `.env`; zona horaria -05. |
| Arranque con `prod` y PostgreSQL vacío | Correcto; 35 migraciones aplicadas. |
| Script `check-container.ps1` | 10 comprobaciones correctas: health, CORS, login, cookies, sesión, acceso anónimo, catálogo, simulación y PDF. |
| Frontend: `npm ci` | Instalación reproducible completada; lockfile sin cambios. |
| Frontend: build HTTPS | Correcto; se usó `https://api.example.com/api`, solo para probar compilación. |
| Validación de URL de API | 5 configuraciones inválidas rechazadas y 2 válidas aceptadas. |
| Frontend: lint | Pendiente: 24 errores preexistentes y 2 advertencias en componentes ajenos al despliegue. |

Vite advierte de bundles grandes; npm advierte sobre dependencias transitivas de Amplify/XState
con rangos de React anteriores a React 19. No se cambiaron versiones ni se ocultaron advertencias.
La compilación exitosa no sustituye una prueba real de cámara/Liveness con AWS.

Pendientes para el despliegue: región y rol reales, colección Rekognition, SMTP real,
dominios/HTTPS, Terraform y GitHub Actions. El lint aún no está en condiciones de ser
un control obligatorio que pase en CI. La autenticación y la prueba de PDF del contenedor
son comprobaciones HTTP locales; no se ha certificado el flujo completo en navegador sobre AWS.

Comandos adicionales de inspección ejecutados:

```powershell
docker compose -f backend/compose.verify.yaml -p brunexa-verify config --quiet
docker compose -f backend/compose.verify.yaml -p brunexa-verify exec -T backend id -u
docker compose -f backend/compose.verify.yaml -p brunexa-verify exec -T backend date +%Z
docker compose -f backend/compose.verify.yaml -p brunexa-verify exec -T backend ls -a /app
git diff --check
```

Comprueban sintaxis de Compose, usuario del proceso, zona horaria, archivos copiados a
la imagen y errores de espacios en el diff, respectivamente. En Windows, Docker y
las descargas de Gradle/npm necesitaron permisos del entorno para acceder al motor,
a la red y a sus cachés; no se cambiaron permisos IAM de AWS.
