# Backend deployment checkpoint

Build and push `deploy-health-v1` before applying this configuration. Older images
do not expose the readiness endpoint required by the ALB.

From the repository root:

```powershell
.\backend\scripts\push-ecr.ps1 -Tag deploy-health-v1
terraform -chdir=infrastructure/terraform fmt
terraform -chdir=infrastructure/terraform validate
terraform -chdir=infrastructure/terraform plan -var-file=secrets.tfvars -out=backend.tfplan
```

Review the plan before applying it. This checkpoint adds 14 Terraform resources,
including an ACM validation waiter (not an additional certificate).

`alb.tf` defines HTTPS termination, HTTP-to-HTTPS redirect, IP targets and security
groups. `ecs.tf` defines one Linux x86-64 Fargate task (0.5 vCPU, 1 GiB), its roles,
configuration, Secrets Manager JSON references and seven-day CloudWatch logs.

The ALB checks `/actuator/health/readiness`, including database connectivity.
Only readiness and liveness endpoints are public, with no health details exposed.
The initial startup grace period is 180 seconds. A failed deployment triggers the
ECS circuit breaker; the first deployment has no previous healthy revision to
roll back to. Inspect ECS service events and CloudWatch logs if startup fails.

Public task IPs provide outbound access without a NAT gateway; inbound port 8080
accepts only the ALB security group. RDS stays in isolated database subnets.
Flyway uses `public` only in the new production database; local configuration is
unchanged. The lab uses the RDS master user for startup migrations.

One task does not provide high availability. Deployments may temporarily start a
second task; in-memory login sessions are lost when a task is replaced. Autoscaling
and distributed sessions are intentionally not configured at this checkpoint.

After a successful apply, add a Cloudflare CNAME named `api-brn`, targeting the
`api_alb_dns_name` output, initially with DNS only and TTL Auto. Keep the existing
certificate validation CNAME. Then check:

```powershell
curl.exe --fail https://api-brn.stratiumhub.com/actuator/health/readiness
```

Expected response: `{"status":"UP"}`. Frontend/CloudFront publication and CI/CD
remain subsequent steps. Changing a secret requires restarting/redeploying tasks
to load its new value.
