# Manual frontend deployment

`frontend/.env.production` embeds the public API URL in the Vite build. Never put
passwords in `VITE_*` variables. The existing local development environment is
unchanged. Requests keep credentials enabled for backend sessions.

## Certificate checkpoint

Keep `enable_frontend_distribution = false` and run from the repository root:

```powershell
terraform -chdir=infrastructure/terraform fmt
terraform -chdir=infrastructure/terraform validate
terraform -chdir=infrastructure/terraform plan -var-file=secrets.tfvars -out=frontend-certificate.tfplan
```

Expect one new ACM certificate. Review the plan, then apply its saved file and
read `frontend_certificate_dns_validation`. Add that CNAME in Cloudflare with
DNS only. Wait for ACM to show Issued.

## Distribution checkpoint

Set `enable_frontend_distribution = true` in `terraform.tfvars` and generate a
fresh plan. Expect six additional resources: certificate validation waiter,
origin access control, route function, cache policy, distribution and S3 policy.
Review and apply. The bucket stays private; only this distribution can read it.
Use `frontend_cloudfront_domain_name` as the Cloudflare CNAME target for `brn`
with DNS only and TTL Auto. Keep the certificate validation record separately.

The lightweight CloudFront Function rewrites extensionless application paths to
`/index.html` while preserving `/assets/*` and filenames with extensions. This
supports React Router refreshes without turning missing asset errors into HTML.

## Build and upload

Run from the repository root after the distribution exists:

```powershell
npm --prefix frontend run build
aws s3 sync frontend/dist/assets s3://brn-prod-frontend-031634410077/assets --cache-control "public,max-age=31536000,immutable" --region us-east-1 --profile josue-admin
aws s3 sync frontend/dist s3://brn-prod-frontend-031634410077 --exclude "assets/*" --exclude "index.html" --cache-control "public,max-age=60" --region us-east-1 --profile josue-admin
aws s3 cp frontend/dist/index.html s3://brn-prod-frontend-031634410077/index.html --content-type "text/html" --cache-control "no-cache" --region us-east-1 --profile josue-admin
```

`--prefix` selects the npm project. `sync` uploads new/changed files; no deletion
flag is used, preserving old hashed assets for open browser tabs. Upload assets
first and HTML last. `--exclude` filters paths. `--cache-control` sets caching:
hashed Vite assets can be cached for a year; HTML must revalidate. `cp` uploads
the single HTML file; `--content-type` declares its media type.

To refresh edge caches, use the actual distribution ID from Terraform:

```powershell
aws cloudfront create-invalidation --distribution-id YOUR_DISTRIBUTION_ID --paths "/*" --region us-east-1 --profile josue-admin
```

`--paths "/*"` invalidates cached responses for all paths. Check the home page,
a direct application route and reload, then login and API calls in the browser.
Frontend and API share the same HTTPS site (`stratiumhub.com`) but have different
origins: backend CORS explicitly permits `https://brn.stratiumhub.com`.

Terraform does not upload `dist`; publishing files remains a manual step.
