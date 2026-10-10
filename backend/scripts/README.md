# Build and upload the backend to ECR

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

## Commands and options

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
