# Builds and uploads the backend image; does not deploy an ECS service.
[CmdletBinding()]
param(
    [string]$Profile = 'josue-admin',
    [string]$Region = 'us-east-1',
    [string]$AccountId = '031634410077',
    [string]$Repository = 'brn-prod-backend',
    [string]$Tag = ('deploy-' + (Get-Date -Format 'yyyyMMdd-HHmmss'))
)

$ErrorActionPreference = 'Stop'
if ($AccountId -notmatch '^\d{12}$') { throw 'AccountId must contain 12 digits.' }
if ($Region -notmatch '^[a-z0-9-]+$') { throw 'Invalid AWS region.' }
if ($Tag -notmatch '^[A-Za-z0-9_][A-Za-z0-9_.-]{0,127}$') { throw 'Invalid Docker tag.' }
foreach ($command in @('aws', 'docker')) {
    if (-not (Get-Command $command -ErrorAction SilentlyContinue)) {
        throw "$command is required."
    }
}

# Resolve the build context relative to this script, not the current directory.
$backendPath = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$registry = "$AccountId.dkr.ecr.$Region.amazonaws.com"
$imageUri = "${registry}/${Repository}:${Tag}"

# Check the active account before uploading to the selected registry.
$activeAccount = & aws sts get-caller-identity --query Account --output text --profile $Profile --region $Region
if ($LASTEXITCODE -ne 0) { throw 'Unable to verify AWS credentials.' }
if ($activeAccount.Trim() -ne $AccountId) { throw 'AWS profile does not match AccountId.' }

# --platform matches the planned x86-64 Fargate task; -t sets the image URI.
Write-Host "Building $imageUri"
& docker build --platform linux/amd64 -t $imageUri $backendPath
if ($LASTEXITCODE -ne 0) { throw 'Docker build failed; nothing was pushed.' }

# CMD owns the native pipeline, avoiding PowerShell token encoding changes.
# Profile/region/account are restricted to safe characters before interpolation.
if ($Profile -notmatch '^[A-Za-z0-9_.-]+$') { throw 'Profile must use letters, digits, dots, underscores or hyphens.' }
$loginCommand = "aws ecr get-login-password --region $Region --profile $Profile | docker login --username AWS --password-stdin $registry"
& cmd.exe /d /c $loginCommand
if ($LASTEXITCODE -ne 0) { throw 'Docker login to ECR failed; nothing was pushed.' }

& docker push $imageUri
if ($LASTEXITCODE -ne 0) { throw 'Docker push failed.' }
Write-Host "Uploaded image: $imageUri"
