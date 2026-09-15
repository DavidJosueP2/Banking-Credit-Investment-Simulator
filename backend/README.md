# Backend del sistema financiero

## Descripción

API del simulador financiero. Esta base técnica deja preparada la comunicación HTTP, PostgreSQL, persistencia con JPA, migraciones con Flyway, validación y una configuración temporal de seguridad.

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

La configuración actual de Spring Security es temporal: permite todas las solicitudes y desactiva CSRF para facilitar el desarrollo inicial de la API. Debe sustituirse por reglas reales de autenticación y autorización antes de publicar el sistema.

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
- **Java incorrecto:** comprueba que `java -version` apunte a JDK 21.
