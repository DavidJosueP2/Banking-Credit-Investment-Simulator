#!/usr/bin/env bash
# Manual frontend publication: build, assets, other files, HTML, invalidation.
set -euo pipefail

PROFILE="${PROFILE:-josue-admin}"
REGION="${REGION:-us-east-1}"
ACCOUNT_ID="${ACCOUNT_ID:-031634410077}"
BUCKET="${BUCKET:-brn-prod-frontend-031634410077}"
DISTRIBUTION_ID="${DISTRIBUTION_ID:-E3RB4D70HI03BW}"
[[ "$ACCOUNT_ID" =~ ^[0-9]{12}$ ]] || { echo 'Invalid ACCOUNT_ID.' >&2; exit 1; }
[[ "$BUCKET" =~ ^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$ ]] || { echo 'Invalid bucket name.' >&2; exit 1; }
[[ "$DISTRIBUTION_ID" =~ ^[A-Z0-9]+$ ]] || { echo 'Invalid distribution ID.' >&2; exit 1; }
for command in aws npm; do
    command -v "$command" >/dev/null || { echo "$command is required." >&2; exit 1; }
done

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
FRONTEND_DIR="$(cd -- "$SCRIPT_DIR/.." && pwd)"
DIST_DIR="$FRONTEND_DIR/dist"
DESTINATION="s3://$BUCKET"

# Check account and distribution origin before making changes.
ACTIVE_ACCOUNT="$(aws sts get-caller-identity --query Account --output text --region "$REGION" --profile "$PROFILE")"
[[ "$ACTIVE_ACCOUNT" == "$ACCOUNT_ID" ]] || { echo 'AWS profile does not match ACCOUNT_ID.' >&2; exit 1; }
aws s3api head-bucket --bucket "$BUCKET" --expected-bucket-owner "$ACCOUNT_ID" --region "$REGION" --profile "$PROFILE"
ORIGINS="$(aws cloudfront get-distribution --id "$DISTRIBUTION_ID" --query 'Distribution.DistributionConfig.Origins.Items[].DomainName' --output text --region "$REGION" --profile "$PROFILE")"
[[ "$ORIGINS" == *"$BUCKET.s3."* ]] || { echo 'Distribution does not reference the selected S3 bucket.' >&2; exit 1; }

npm --prefix "$FRONTEND_DIR" run build
[[ -f "$DIST_DIR/index.html" && -d "$DIST_DIR/assets" ]] || { echo 'Missing build output.' >&2; exit 1; }

# Hashed assets first, HTML last. No --delete: preserve previous hashed assets.
aws s3 sync "$DIST_DIR/assets" "$DESTINATION/assets" --cache-control 'public,max-age=31536000,immutable' --region "$REGION" --profile "$PROFILE"
aws s3 sync "$DIST_DIR" "$DESTINATION" --exclude 'assets/*' --exclude 'index.html' --cache-control 'public,max-age=60' --region "$REGION" --profile "$PROFILE"
aws s3 cp "$DIST_DIR/index.html" "$DESTINATION/index.html" --content-type 'text/html' --cache-control 'no-cache' --region "$REGION" --profile "$PROFILE"

# Invalidation is asynchronous; AWS returns its ID and current status.
aws cloudfront create-invalidation --distribution-id "$DISTRIBUTION_ID" --paths '/*' --query 'Invalidation.{Id:Id,Status:Status}' --output table --region "$REGION" --profile "$PROFILE"
echo 'Frontend uploaded; CloudFront invalidation requested.'
echo 'Default project URL: https://brn.stratiumhub.com'
