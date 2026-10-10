# Cloudflare DNS is managed manually. Request first, then copy the validation
# CNAME from Terraform outputs into Cloudflare with proxy disabled (DNS only).
resource "aws_acm_certificate" "api" {
  domain_name       = var.api_domain_name
  validation_method = "DNS"

  lifecycle {
    create_before_destroy = true
  }

  tags = { Name = "${local.name}-api-certificate" }
}
