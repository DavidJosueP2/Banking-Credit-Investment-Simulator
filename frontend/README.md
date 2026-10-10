# Frontend

Interfaz de Brunexa: simuladores de crédito e inversión, cuenta de cliente y panel administrativo.

## Desarrollo local

Requiere Node.js compatible con Vite 8 (`^20.19.0` o `>=22.12.0`) y npm. Desde `frontend/`:

```powershell
npm ci
Copy-Item .env.example .env
npm run dev
```

`npm ci` instala las versiones del archivo de bloqueo. Copia el entorno solo si no tienes uno. Vite sirve la interfaz en `http://localhost:5173`.

`VITE_API_BASE_URL` define la API (local: `http://localhost:8080/api`). Las variables `VITE_*` son públicas; no deben contener contraseñas. La instancia de `src/lib/api.ts` envía la cookie de sesión y el token CSRF.

## Estructura

- `src/pages/`: vistas públicas, de clientes y administración.
- `src/features/`: solicitudes, simuladores, biometría y exportación.
- `src/components/ui/`: controles base.
- `src/components/shared/`: cabeceras, estados y ayudas informativas.
- `src/components/layout/`: navegación y distribución de páginas.
- `src/app/`: rutas, permisos, proveedores y configuración institucional.
- `src/lib/`: API, formatos y utilidades.

React Router organiza las rutas; TanStack Query consulta y actualiza datos. React Hook Form y Zod validan formularios. El backend comprueba los permisos aunque la interfaz oculte un acceso.

## Criterios de interfaz

Usa los colores del tema y los componentes compartidos. Las cabeceras llevan un título y una frase breve. `InfoHint` muestra ayudas secundarias con clic, teclado o toque; los errores y costos relevantes permanecen visibles. Los simuladores colocan los resultados debajo del formulario y las tablas permiten desplazamiento horizontal en móvil.

Axiforma se usa en títulos y Plus Jakarta Sans en texto. La institución puede personalizar las fuentes, colores, imágenes y textos; los valores guardados prevalecen sobre los predeterminados.

## Verificación

```powershell
npm run lint
npm run build
```

La compilación comprueba TypeScript y genera `dist/`. Revisa los simuladores en móvil y escritorio, la navegación a secciones, los filtros del panel y las rutas al recargar.

## Publicación manual

Run from the repository root:

```powershell
.\frontend\scripts\deploy-s3.ps1
```

```bash
bash frontend/scripts/deploy-s3.sh
```

Prerequisites: Node/npm, installed frontend dependencies, AWS CLI, the
`josue-admin` profile, the S3 bucket and CloudFront distribution already created.
Bash requires these tools and credentials to be available in its environment.
Configure the Cloudflare CNAME `brn` to `dpgg2ij2v1gwt.cloudfront.net` with DNS only.

The scripts build locally, upload files, and request cache invalidation. They do
not run Terraform or modify DNS. Production API configuration comes from
`frontend/.env.production`; Vite embeds it during build. `VITE_*` is public
configuration and must never contain secrets.

### Secuencia y opciones

1. Verify the AWS account (`sts get-caller-identity`), bucket access
   (`s3api head-bucket`) and selected distribution (`cloudfront get-distribution`).
   `--expected-bucket-owner` checks ownership. `--query` selects fields;
   `--output text` produces plain text. These checks precede uploads.
2. `npm --prefix ... run build`: choose the frontend directory and run its build.
3. `aws s3 sync`: upload new/changed files. Hashed assets are uploaded first with
   `--cache-control public,max-age=31536000,immutable` (one year). Other files use
   60 seconds; `--exclude` skips assets and HTML during that step.
4. `aws s3 cp`: publish `index.html` last, once its assets exist. `--content-type
   text/html` declares HTML; `--cache-control no-cache` requires revalidation.
5. `cloudfront create-invalidation`: refresh edge caches. `--distribution-id`
   selects the distribution; `--paths "/*"` selects all paths. It returns an ID
   and status, usually InProgress; successful submission does not mean completed.

All AWS commands use `--region` and `--profile`. No deletion flag is used: old
hashed assets remain available for browser tabs using the previous build.
`sync` compares file metadata; explicit `cp` always republishes the HTML.

PowerShell checks native exit codes; Bash uses `set -euo pipefail` to stop on
errors. If invalidation fails after upload, files are already published: retry
invalidation rather than assuming no change occurred.

Override settings in PowerShell with `-Profile`, `-Region`, `-AccountId`,
`-Bucket`, `-DistributionId`. In Bash use environment variables `PROFILE`,
`REGION`, `ACCOUNT_ID`, `BUCKET`, `DISTRIBUTION_ID`. Update the distribution ID
if you destroy and recreate CloudFront.

Verify the home page, a direct route and reload, then login and API requests at
https://brn.stratiumhub.com after invalidation completes.
