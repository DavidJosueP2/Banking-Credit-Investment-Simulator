# Manual frontend publication: build, assets, other files, HTML, invalidation.
[CmdletBinding()]
param(
    [string]$Profile = 'josue-admin',
    [string]$Region = 'us-east-1',
    [string]$AccountId = '031634410077',
    [string]$Bucket = 'brn-prod-frontend-031634410077',
    [string]$DistributionId = 'E3RB4D70HI03BW'
)

$ErrorActionPreference = 'Stop'
foreach ($command in @('aws', 'npm')) {
    if (-not (Get-Command $command -ErrorAction SilentlyContinue)) {
        throw "$command is required."
    }
}
if ($AccountId -notmatch '^\d{12}$') { throw 'Invalid AccountId.' }
if ($Bucket -notmatch '^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$') { throw 'Invalid bucket name.' }
if ($DistributionId -notmatch '^[A-Z0-9]+$') { throw 'Invalid distribution ID.' }

# Paths are based on the script location, so invocation works from any directory.
$frontendPath = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$distPath = Join-Path $frontendPath 'dist'
$assetsPath = Join-Path $distPath 'assets'
$indexPath = Join-Path $distPath 'index.html'
$destination = "s3://$Bucket"

# Check account and distribution origin before making changes.
$activeAccount = & aws sts get-caller-identity --query Account --output text --region $Region --profile $Profile
if ($LASTEXITCODE -ne 0) { throw 'Unable to verify AWS credentials.' }
if ($activeAccount.Trim() -ne $AccountId) { throw 'AWS profile does not match AccountId.' }
& aws s3api head-bucket --bucket $Bucket --expected-bucket-owner $AccountId --region $Region --profile $Profile
if ($LASTEXITCODE -ne 0) { throw 'Bucket access check failed.' }
$origins = & aws cloudfront get-distribution --id $DistributionId --query 'Distribution.DistributionConfig.Origins.Items[].DomainName' --output text --region $Region --profile $Profile
if ($LASTEXITCODE -ne 0) { throw 'Distribution access check failed.' }
if (($origins -join ' ') -notmatch [regex]::Escape("$Bucket.s3.")) { throw 'Distribution does not reference the selected S3 bucket.' }

# --prefix selects the frontend project; build runs TypeScript then Vite.
& npm --prefix $frontendPath run build
if ($LASTEXITCODE -ne 0) { throw 'Frontend build failed; nothing was uploaded.' }
if (-not (Test-Path -LiteralPath $indexPath -PathType Leaf) -or -not (Test-Path -LiteralPath $assetsPath -PathType Container)) {
    throw 'Expected dist/index.html and dist/assets after build.'
}

# Hashed assets first, HTML last. No --delete: keep assets used by open browser tabs.
& aws s3 sync $assetsPath "$destination/assets" --cache-control 'public,max-age=31536000,immutable' --region $Region --profile $Profile
if ($LASTEXITCODE -ne 0) { throw 'Assets upload failed; HTML was not published.' }
& aws s3 sync $distPath $destination --exclude 'assets/*' --exclude 'index.html' --cache-control 'public,max-age=60' --region $Region --profile $Profile
if ($LASTEXITCODE -ne 0) { throw 'Static files upload failed; HTML was not published.' }
& aws s3 cp $indexPath "$destination/index.html" --content-type 'text/html' --cache-control 'no-cache' --region $Region --profile $Profile
if ($LASTEXITCODE -ne 0) { throw 'HTML upload failed.' }

# Invalidation is asynchronous; AWS returns its ID and current status.
& aws cloudfront create-invalidation --distribution-id $DistributionId --paths '/*' --query 'Invalidation.{Id:Id,Status:Status}' --output table --region $Region --profile $Profile
if ($LASTEXITCODE -ne 0) { throw 'Files were uploaded, but CloudFront invalidation failed.' }
Write-Host 'Frontend uploaded; CloudFront invalidation requested.'
Write-Host 'Default project URL: https://brn.stratiumhub.com'
