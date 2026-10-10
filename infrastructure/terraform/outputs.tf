output "aws_account_id" {
  description = "Cuenta en la que Terraform creará los recursos."
  value       = data.aws_caller_identity.current.account_id
}

output "vpc_id" {
  value = aws_vpc.main.id
}

output "public_subnet_ids" {
  value = values(aws_subnet.public)[*].id
}

output "database_subnet_ids" {
  value = values(aws_subnet.database)[*].id
}

output "database_subnet_group_name" {
  value = aws_db_subnet_group.main.name
}

output "backend_ecr_repository_url" {
  value = aws_ecr_repository.backend.repository_url
}

output "frontend_bucket_name" {
  value = aws_s3_bucket.frontend.id
}

output "frontend_certificate_dns_validation" {
  value = {
    for option in aws_acm_certificate.frontend.domain_validation_options : option.domain_name => {
      type   = option.resource_record_type
      name   = option.resource_record_name
      target = option.resource_record_value
    }
  }
}

output "frontend_cloudfront_domain_name" {
  value = try(aws_cloudfront_distribution.frontend[0].domain_name, null)
}

output "frontend_cloudfront_distribution_id" {
  value = try(aws_cloudfront_distribution.frontend[0].id, null)
}

output "ecs_execution_role_arn" {
  value = aws_iam_role.ecs_execution.arn
}

output "backend_task_role_arn" {
  value = aws_iam_role.backend_task.arn
}

output "liveness_role_arn" {
  value = aws_iam_role.liveness.arn
}

output "rekognition_collection_name" {
  value = aws_rekognition_collection.clients.collection_id
}

output "application_secret_arn" {
  value = aws_secretsmanager_secret.application.arn
}

output "database_host" {
  value = aws_db_instance.main.address
}

output "database_port" {
  value = aws_db_instance.main.port
}

output "database_name" {
  value = aws_db_instance.main.db_name
}

output "database_username" {
  value = aws_db_instance.main.username
}

output "backend_security_group_id" {
  value = aws_security_group.backend.id
}

output "api_certificate_arn" {
  value = aws_acm_certificate.api.arn
}

output "api_alb_dns_name" {
  description = "Cloudflare CNAME target for api-brn; use DNS only initially."
  value       = aws_lb.api.dns_name
}

output "api_url" {
  value = "https://${var.api_domain_name}"
}

output "ecs_cluster_name" {
  value = aws_ecs_cluster.main.name
}

output "ecs_service_name" {
  value = aws_ecs_service.backend.name
}

output "backend_log_group_name" {
  value = aws_cloudwatch_log_group.backend.name
}

output "api_certificate_dns_validation" {
  description = "Add these CNAME records in Cloudflare using DNS only."
  value = {
    for option in aws_acm_certificate.api.domain_validation_options : option.domain_name => {
      type   = option.resource_record_type
      name   = option.resource_record_name
      target = option.resource_record_value
    }
  }
}
