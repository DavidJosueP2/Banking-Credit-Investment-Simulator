#!/usr/bin/env bash
# Builds and uploads the backend image; does not deploy an ECS service.
set -euo pipefail

# Override defaults through environment variables when needed.
PROFILE="${PROFILE:-josue-admin}"
REGION="${REGION:-us-east-1}"
ACCOUNT_ID="${ACCOUNT_ID:-031634410077}"
REPOSITORY="${REPOSITORY:-brn-prod-backend}"
TAG="${TAG:-deploy-$(date +%Y%m%d-%H%M%S)}"

[[ "$ACCOUNT_ID" =~ ^[0-9]{12}$ ]] || { echo 'Invalid ACCOUNT_ID.' >&2; exit 1; }
[[ "$TAG" =~ ^[A-Za-z0-9_][A-Za-z0-9_.-]{0,127}$ ]] || { echo 'Invalid Docker tag.' >&2; exit 1; }
for command in aws docker; do
    command -v "$command" >/dev/null || { echo "$command is required." >&2; exit 1; }
done

# Resolve the context relative to the script, independent of the current directory.
SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$(cd -- "$SCRIPT_DIR/.." && pwd)"
REGISTRY="$ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com"
IMAGE_URI="$REGISTRY/$REPOSITORY:$TAG"

ACTIVE_ACCOUNT="$(aws sts get-caller-identity --query Account --output text --profile "$PROFILE" --region "$REGION")"
[[ "$ACTIVE_ACCOUNT" == "$ACCOUNT_ID" ]] || { echo 'AWS profile does not match ACCOUNT_ID.' >&2; exit 1; }

# --platform matches the planned x86-64 Fargate task; -t sets the image URI.
echo "Building $IMAGE_URI"
docker build --platform linux/amd64 -t "$IMAGE_URI" "$BACKEND_DIR"

# No token is printed. pipefail stops the script if either command fails.
TOKEN="$(aws ecr get-login-password --region "$REGION" --profile "$PROFILE")"
printf '%s' "$TOKEN" | docker login --username AWS --password-stdin "$REGISTRY"
unset TOKEN

docker push "$IMAGE_URI"
echo "Uploaded image: $IMAGE_URI"
