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
| `APP_BOOTSTRAP_PASSWORD` | Contraseña inicial para crear el primer administrador, si aún no existe. Mínimo 12 caracteres. | Defínela solo en el entorno local. |
| `spring.profiles.active` | Activa el perfil de desarrollo en el archivo `.env` importado como propiedades. | `dev` |
| `APP_EXAMPLE_PASSWORD` | Contraseña para las cuatro cuentas de ejemplo en `dev`. Admite `password123` solo en ese perfil; otra contraseña debe tener al menos 12 caracteres. | `password123` solo para desarrollo local. |

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

La API estará prevista en `http://localhost:8080`. El endpoint técnico inicial será:

```text
GET http://localhost:8080/api/health
```

Respuesta esperada:

```json
{
  "status": "UP"
}
```

Spring Security exige una sesión para los endpoints privados. Los cambios de estado requieren un token CSRF; las contraseñas se almacenan cifradas con BCrypt. Las rutas no configuradas explícitamente quedan denegadas.

## Cuentas y acceso

En `.env`, configura `APP_BOOTSTRAP_PASSWORD` con una contraseña propia de al menos 12 caracteres para crear `admin@brunexa.com` al iniciar fuera de `dev`. La cuenta se crea solo si aún no existe; cambiar la variable después no cambia su contraseña.

Para trabajar con cuentas de ejemplo, usa `spring.profiles.active=dev` y `APP_EXAMPLE_PASSWORD=password123` en `backend/.env`. Esta contraseña corta se admite únicamente en la creación automática del perfil `dev`, nunca en la creación normal de usuarios. Se crean, si no existen, estas cuentas:

| Correo | Rol |
| --- | --- |
| `admin@brunexa.com` | Administrador |
| `credito@brunexa.com` | Asesor de crédito |
| `inversiones@brunexa.com` | Asesor de inversiones |
| `cliente@brunexa.com` | Cliente |

En desarrollo usa solo `APP_EXAMPLE_PASSWORD` si quieres que las cuatro cuentas compartan esa contraseña inicial; no definas también `APP_BOOTSTRAP_PASSWORD` con otra contraseña. No publiques `password123` ni uses el perfil `dev` fuera del entorno local. La contraseña se almacena como hash BCrypt, no en texto plano en PostgreSQL. Quita el perfil `dev` y la variable de ejemplo fuera del entorno local.

El frontend usa `GET /api/auth/csrf`, `POST /api/auth/login` (formulario `email`/`password`), `GET /api/auth/me` y `POST /api/auth/logout`. El administrador puede consultar `GET /api/admin/users`, `/roles`, `/permissions`, crear cuentas con `POST /api/admin/users` y asignar roles con `PUT /api/admin/users/{id}/roles`. El backend vuelve a comprobar las autoridades persistidas en cada petición privada; una revocación se aplica sin esperar a que expire la sesión.

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
