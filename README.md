# Brunexa

Simulador de créditos e inversiones con solicitudes en línea y administración de productos, usuarios y permisos.

## Proyecto

| Carpeta | Contenido |
| --- | --- |
| [frontend](frontend/README.md) | React, TypeScript y Vite; desarrollo y publicación del sitio. |
| [backend](backend/README.md) | Java 21, Spring Boot, PostgreSQL y Flyway; API y publicación del contenedor. |
| `infrastructure/terraform` | Recursos AWS y configuración del despliegue. |

Para trabajar localmente, inicia PostgreSQL y la API siguiendo el README del backend; después inicia el frontend. Cada componente documenta sus variables y comandos.

## Arquitectura desplegada

```text
Navegador → CloudFront → S3 privado (frontend)
Navegador → ALB HTTPS → ECS Fargate (API) → RDS PostgreSQL
                           ├─ Secrets Manager
                           ├─ Textract / Rekognition
                           └─ CloudWatch Logs
```

Cloudflare publica los registros DNS. ACM emite los certificados tras validar sus CNAME. El registro del frontend apunta a CloudFront; el de la API, al ALB. Son distintos de los registros de validación del certificado.

La VPC tiene subredes públicas para el ALB y las tareas, y subredes aisladas para RDS. El backend acepta tráfico del grupo de seguridad del ALB; la base acepta tráfico del grupo del backend. Las tareas usan IP pública para salida sin NAT Gateway.

El rol de ejecución de ECS descarga la imagen, escribe logs y lee secretos. El rol de la tarea autoriza las llamadas de la aplicación a AWS. El rol de liveness limita las credenciales temporales del navegador a la prueba de vida.

## Terraform

Los archivos `.tf` del directorio forman una sola configuración:

- `network.tf`, `database.tf`: red y PostgreSQL.
- `storage.tf`, `frontend.tf`: ECR, S3 y CloudFront.
- `iam.tf`, `secrets.tf`, `rekognition.tf`: permisos, secretos y colección biométrica.
- `certificates.tf`, `alb.tf`, `ecs.tf`: certificados y servicio de la API.
- `variables.tf`, `locals.tf`, `outputs.tf`: entradas, nombres y resultados.

El estado se guarda en el bucket independiente `josue-iac-state`; el bucket del frontend contiene los archivos de la web. `production.hcl` configura el backend S3. Los valores locales, secretos, planes y estados no se versionan.

Desde la raíz, con Terraform y AWS CLI configurados:

```powershell
terraform -chdir=infrastructure/terraform init -backend-config=production.hcl
terraform -chdir=infrastructure/terraform validate
terraform -chdir=infrastructure/terraform plan -var-file=secrets.tfvars -out=deploy.tfplan
terraform -chdir=infrastructure/terraform apply deploy.tfplan
```

- `-chdir` selecciona el directorio de configuración.
- `-backend-config` indica dónde guardar el estado; se usa en la inicialización.
- `-var-file` carga las entradas sensibles. `terraform.tfvars` se carga automáticamente.
- `-out` guarda un plan. Revísalo antes de aplicar; `apply` con ese archivo ejecuta las acciones guardadas.

Para una instalación nueva, solicita primero los certificados, publica los CNAME indicados en los outputs y espera el estado `Issued`. La distribución del frontend se habilita con `enable_frontend_distribution` después de validar su certificado. La imagen del backend debe existir en ECR antes de iniciar el servicio ECS.

## Publicación manual

Los scripts de backend construyen y suben una imagen nueva a ECR. Actualiza `backend_image_tag` en los valores de Terraform y revisa el plan para desplegarla. Los scripts del frontend compilan, suben a S3 y solicitan invalidación de CloudFront. Los comandos y sus opciones están en los README de cada componente. No se usa CI/CD.

El ALB comprueba `/actuator/health/readiness`, incluida la conexión a la base. Consulta eventos de ECS y logs de CloudWatch si una tarea no arranca. Una tarea nueva carga los secretos al iniciar; reemplazarla también pierde las sesiones que estaban en memoria.

## Eliminar el laboratorio

```powershell
terraform -chdir=infrastructure/terraform plan -destroy -var-file=secrets.tfvars -out=destroy.tfplan
terraform -chdir=infrastructure/terraform apply destroy.tfplan
```

`-destroy` prepara la eliminación de los recursos administrados en ese estado. Esta configuración de laboratorio elimina la base sin snapshot final, los objetos del bucket, las imágenes ECR y los secretos sin período de recuperación. Revisa el plan: los datos no se recuperan con otro `apply`.

El bucket de estado y los registros Cloudflare creados manualmente quedan fuera de esta configuración. Conservar el estado es necesario para administrar los recursos hasta completar la eliminación.
