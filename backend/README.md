# Backend del sistema financiero

## Descripción

API del simulador financiero con PostgreSQL, Flyway y autenticación por sesión. Los roles y permisos son datos persistidos y el servidor comprueba las autoridades de cada cuenta.

## Tecnologías

| Tecnología | Versión o configuración declarada |
| --- | --- |
| Java | 21 |
| Spring Boot | 4.1.1 |
| Gradle Wrapper | 9.7.1 |
| Spring Web MVC | Gestionado por Spring Boot 4.1.1 |
| Spring Data JPA | Gestionado por Spring Boot 4.1.1 |
| PostgreSQL | 17 Alpine |
| Flyway | Gestionado por Spring Boot 4.1.1 |
| Docker Compose | Compose Specification, sin versión fija |

## Requisitos

- JDK 21.
- Docker Desktop con Docker Compose v2.
- PowerShell para ejecutar los ejemplos tal como están escritos.

No es necesario instalar Gradle globalmente porque el proyecto incluye Gradle Wrapper.

## Variables de entorno

| Variable | Descripción | Valor de desarrollo sugerido |
| --- | --- | --- |
| `DB_HOST` | Host de PostgreSQL utilizado por Spring Boot. | `localhost` |
| `DB_PORT` | Puerto publicado por PostgreSQL. | `5432` |
| `DB_NAME` | Nombre de la base de datos. | `financiero_db` |
| `DB_SCHEMA` | Esquema principal administrado por Flyway. | `financiero` |
| `DB_USER` | Usuario utilizado por Spring Boot. | `financiero` |
| `DB_PASSWORD` | Contraseña utilizada por Spring Boot. | `financiero_dev` |
| `POSTGRES_DB` | Base creada por la imagen de PostgreSQL. | `financiero_db` |
| `POSTGRES_USER` | Usuario creado por la imagen de PostgreSQL. | `financiero` |
| `POSTGRES_PASSWORD` | Contraseña del usuario de PostgreSQL. | `financiero_dev` |
| `SERVER_PORT` | Puerto HTTP de Spring Boot. | `8080` |
| `FRONTEND_URL` | Origen autorizado por la política CORS. | `http://localhost:5173` |
| `APP_TIME_ZONE` | Zona horaria de la aplicación y PostgreSQL local. | `America/Guayaquil` |
| `APP_INITIAL_ADMIN_PASSWORD` | Contraseña inicial para crear el primer administrador, si aún no existe. Mínimo 12 caracteres. | Defínela solo en el entorno local. |
| `spring.profiles.active` | Activa el perfil de desarrollo en el archivo `.env` importado como propiedades. | `dev` |
| `APP_DEV_DEMO_USERS_PASSWORD` | Contraseña para las cuentas de ejemplo en `dev`. Admite `password123` solo en ese perfil; otra contraseña debe tener al menos 12 caracteres. | `password123` solo para desarrollo local. |

Los valores incluidos son exclusivamente para desarrollo local. Usa secretos seguros y variables del sistema en otros entornos.

## Configuración inicial

Desde la carpeta `backend/`:

```powershell
Copy-Item .env.example .env
```

Spring Boot importa `.env` de forma opcional. Si el archivo no existe, también puede recibir las variables directamente desde el sistema operativo y dispone de valores predeterminados para desarrollo.

## Base de datos

PostgreSQL se ejecuta como el único servicio de `docker-compose.yml` y conserva sus datos en el volumen `financiero_postgres_data`.

```powershell
docker compose up -d
docker compose ps
docker compose down
```

Para eliminar además todos los datos persistidos del entorno local:

```powershell
docker compose down -v
```

Este último comando es destructivo para el volumen de desarrollo.

## Backend

Una vez disponible PostgreSQL, el backend se podrá iniciar con:

```powershell
.\gradlew bootRun
```

La API está disponible en `http://localhost:8080`. El endpoint de estado es:

```text
GET http://localhost:8080/api/health
```

Respuesta esperada:

```json
{
  "status": "UP"
}
```

Spring Security exige una sesión para los endpoints privados. Los cambios de estado requieren un token CSRF; las contraseñas se almacenan como hashes BCrypt. Las rutas no configuradas explícitamente quedan denegadas.

## Cuentas y acceso

En `.env`, configura `APP_INITIAL_ADMIN_PASSWORD` con una contraseña propia de al menos 12 caracteres para crear `admin@brunexa.com` al iniciar fuera de `dev`. La cuenta se crea solo si aún no existe; cambiar la variable después no cambia su contraseña.

Para trabajar con cuentas de ejemplo, usa `spring.profiles.active=dev` y `APP_DEV_DEMO_USERS_PASSWORD=password123` en `backend/.env`. Esta contraseña corta se admite únicamente en la creación automática del perfil `dev`, nunca en la creación normal de usuarios. Se crean, si no existen, estas cuentas:

| Usuario | Correo | Rol |
| --- | --- | --- |
| `admin` | `admin@brunexa.com` | Administrador |
| `credito` | `credito@brunexa.com` | Asesor de crédito |
| `analista` | `analista@brunexa.com` | Analista de crédito |
| `inversiones` | `inversiones@brunexa.com` | Asesor de inversiones |
| `cliente` | `cliente@brunexa.com` | Cliente |

El login usa el **usuario**, no el correo (formulario `username`/`password` en `POST /api/auth/login`).

En desarrollo usa solo `APP_DEV_DEMO_USERS_PASSWORD` si quieres que las cuentas compartan esa contraseña inicial; no definas también `APP_INITIAL_ADMIN_PASSWORD` con otra contraseña. No publiques `password123` ni uses el perfil `dev` fuera del entorno local. La contraseña se almacena como hash BCrypt, no en texto plano en PostgreSQL. Quita el perfil `dev` y la variable de ejemplo fuera del entorno local.

El frontend usa `GET /api/auth/csrf`, `POST /api/auth/login` (formulario `username`/`password`), `GET /api/auth/me` y `POST /api/auth/logout`. El administrador puede consultar `GET /api/admin/users`, `/roles`, `/permissions`, crear cuentas con `POST /api/admin/users` y asignar roles con `PUT /api/admin/users/{id}/roles`. El backend vuelve a comprobar las autoridades persistidas en cada petición privada; una revocación se aplica sin esperar a que expire la sesión.

## Flyway

Las migraciones se encuentran en `src/main/resources/db/migration/`. Deben ser incrementales e inmutables una vez aplicadas, siguiendo nombres como:

```text
V1__descripcion.sql
V2__descripcion.sql
```

Hibernate usa `ddl-auto: validate`; por tanto, Flyway es el único responsable de crear o modificar la estructura de la base de datos.

## Estructura

```text
backend/
├── src/main/java/com/edu/uta/backend/
│   ├── config/
│   └── controller/
├── src/main/resources/
│   ├── db/migration/
│   └── application.yaml
├── .env.example
├── docker-compose.yml
├── build.gradle
└── README.md
```

## Problemas comunes

- **Docker no está iniciado:** abre Docker Desktop antes de ejecutar Docker Compose.
- **Puerto 5432 ocupado:** detén la instancia local que lo utiliza o cambia `DB_PORT` en `.env`.
- **Puerto 8080 ocupado:** cambia `SERVER_PORT` en `.env`.
- **`.env` inexistente:** copia `.env.example`; los valores predeterminados permiten arrancar, pero Docker Compose requiere las variables `POSTGRES_*`.
- **Java incorrecto:** comprueba que `java -version` y `JAVA_HOME` apunten a JDK 21.

## Reglas de negocio

Los límites de crédito se consultan en `regla_normativa`, con fechas de vigencia y fuente. Los productos que superan la tasa máxima no se ofrecen. Montos, plazos y cobros institucionales se distinguen de las tasas regulatorias. Los costos opcionales solo se incluyen cuando el cliente los selecciona.

Las solicitudes reutilizan los cálculos de los simuladores. El cliente guarda un borrador, adjunta documentos y verifica su identidad para enviarlo. El asesor revisa; el analista decide los créditos que requieren aprobación. El administrador consulta el historial, sin decidir operaciones. El servidor impide revisar solicitudes propias y aplica la separación de funciones.

## Comprobación local

```powershell
.\gradlew test
```

Las pruebas de integración necesitan PostgreSQL disponible. No se modifican migraciones ya aplicadas: los cambios de esquema se añaden en una nueva migración.

## Publicación manual en ECR

These scripts build a Linux x86-64 image, authenticate Docker to ECR and upload
the image. They do not run tests, create infrastructure or update ECS.

Prerequisites: Docker running with Linux containers, AWS CLI installed, the
`josue-admin` profile configured, and the `brn-prod-backend` ECR repository created.
Both scripts verify that the profile belongs to account `031634410077`.
The Docker build excludes `.env` files through `backend/.dockerignore`.

Run from the repository root (each command is one line):

PowerShell:

```powershell
.\backend\scripts\push-ecr.ps1
```

Bash (Linux, WSL or Git Bash; AWS profile and Docker must be available there):

```bash
bash backend/scripts/push-ecr.sh
```

Optional configuration:

```powershell
.\backend\scripts\push-ecr.ps1 -Profile josue-admin -Region us-east-1 -AccountId 031634410077 -Repository brn-prod-backend -Tag deploy-v1
```

```bash
PROFILE=josue-admin REGION=us-east-1 ACCOUNT_ID=031634410077 REPOSITORY=brn-prod-backend TAG=deploy-v1 bash backend/scripts/push-ecr.sh
```

The default tag is `deploy-yyyyMMdd-HHmmss`. ECR tags are immutable: use a new tag
when uploading another image. Save the final `Uploaded image:` URI for ECS.

### Comandos y opciones

1. `aws sts get-caller-identity`: checks the account. `--query Account` selects
   its ID; `--output text` returns plain text. `--profile` selects local AWS
   credentials and `--region` selects the AWS region.
2. `docker build`: builds from the backend directory. `--platform linux/amd64`
   targets Linux x86-64; `-t` assigns the complete ECR image URI and version tag.
   The Dockerfile runs Gradle `bootJar` to package the application with Java 21.
3. `aws ecr get-login-password`: obtains an ECR authentication token.
   The pipe `|` sends it to `docker login`; `--username AWS` is the username ECR
   requires; `--password-stdin` reads the token without putting it in an argument.
4. `docker push`: uploads the tagged image layers to ECR.

PowerShell checks `$LASTEXITCODE` after each external command because
`$ErrorActionPreference` alone does not reliably stop on native command failures.
For Docker login it delegates the native pipeline to `cmd.exe /d /c` to avoid
PowerShell token encoding changes. `/d` disables CMD startup commands and `/c`
runs the command and exits. The token is not captured or printed by the script.
Bash uses `set -euo pipefail`: stop on command errors, unset variables and failed
pipeline stages. Paths and values are quoted to support directory names with spaces.

AWS reference: https://docs.aws.amazon.com/AmazonECR/latest/userguide/docker-push-ecr-image.html

## Pruebas de rendimiento con k6

Desde la raíz, con k6 instalado:

```powershell
k6 version
.\backend\performance\run.ps1
```

El script usa la API de producción `https://api-brn.stratiumhub.com` por defecto.
`-BaseUrl` permite elegir otro servidor y `-ProductId` otro producto compatible
con un crédito de USD 5.000 a 24 meses, sistema francés. No necesita credenciales:
las rutas probadas son públicas y no guardan simulaciones.

Ejecuta 30 segundos de calentamiento y tres pruebas de 60 segundos con 10, 50 y
100 usuarios virtuales. Cada usuario alterna `/api/public/creditos/entidades`,
`/calcular` y `/capacidad`, con una pausa de un segundo después de cada petición.
La capacidad se calcula para una cuota disponible de USD 300. Se comprueba HTTP
200 y el contenido de la respuesta; no basta con que el servidor responda.

Los JSON en `backend/performance/results` incluyen p50, p95, p99, peticiones,
req/s y errores por ruta. El calentamiento y las consultas previas no se mezclan
con las muestras por endpoint. Objetivos: p95 < 500 ms, p99 < 1.000 ms y errores
< 1 %. k6 devuelve código 99 si incumple objetivos: es un resultado, no un fallo
del entorno. La prueba se interrumpe si los errores alcanzan 5 % o el p95 global
alcanza 5 segundos; el lanzador no continúa hacia cargas mayores si detecta esos
límites. Las peticiones tienen un timeout de 10 segundos.

Son pruebas exploratorias cortas desde la computadora que ejecuta k6. Incluyen
la latencia de red de las peticiones HTTP; no miden renderizado del navegador
ni son una prueba de capacidad máxima. Un usuario virtual no equivale a una
petición por segundo. El p99 con pocas muestras es orientativo. No prueban una
mejora causal ni representan todos los productos, plazos o usuarios posibles.

### Medición en producción — 9 de octubre de 2026

Ejecución local en Windows con k6 2.1.0, aproximadamente 22:54–22:58
(America/Guayaquil). Una ejecución por nivel, no una comparación antes/después.
API: `https://api-brn.stratiumhub.com`. Producto 3, sistema francés, plazo de
24 meses. Calcular: USD 5.000; capacidad: cuota disponible de USD 300.
La revisión desplegada no se identificó: el commit local no demuestra la
versión de la imagen que estaba ejecutándose en AWS.

| Usuarios virtuales | Ruta | p50 ms | p95 ms | p99 ms | Peticiones | Errores |
|---:|---|---:|---:|---:|---:|---:|
| 10 | entidades | 109,6 | 202,2 | 290,5 | 174 | 0 % |
| 10 | calcular | 103,2 | 177,7 | 224,8 | 175 | 0 % |
| 10 | capacidad | 185,7 | 449,5 | 531,0 | 173 | 0 % |
| 50 | entidades | 113,6 | 407,1 | 762,0 | 814 | 0 % |
| 50 | calcular | 105,1 | 406,0 | 677,2 | 818 | 0 % |
| 50 | capacidad | 239,3 | 901,5 | 1178,1 | 823 | 0 % |
| 100 | entidades | 386,5 | 912,8 | 1104,6 | 1300 | 0 % |
| 100 | calcular | 396,6 | 905,8 | 1091,5 | 1305 | 0 % |
| 100 | capacidad | 703,8 | 1396,9 | 1789,0 | 1311 | 0 % |

Throughput conjunto observado: 8,46 req/s con 10 VUs, 39,73 con 50 VUs y
62,96 con 100 VUs. Tasas reportadas por k6 sobre la duración de ejecución,
incluido el cierre de las peticiones; los conteos por ruta excluyen preflight.
Total medido: 6.893 peticiones, todas válidas. El nivel de 10 VUs cumplió los
objetivos de las tres rutas; capacidad incumplió latencia con 50 VUs y las tres
rutas la incumplieron con 100. El servidor respondió UP después de la prueba.
62,96 req/s es throughput observado, no capacidad sostenible bajo p95 < 500 ms.
No se buscó el punto exacto de saturación ni se midieron CPU, memoria o costos.

Resultados originales: `performance/results/20261009-225414-vus-*.json`.
Tabla exportable: `performance/results/20261009-225414-summary.csv`.

Frase posible para CV: «Validé una API financiera desplegada en AWS mediante
pruebas de carga con k6 de hasta 100 usuarios virtuales: 6.893 peticiones sin
errores observados y p95 inferior a 450 ms en las tres rutas con 10 usuarios».
