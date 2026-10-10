resource "aws_cloudwatch_log_group" "backend" {
  name              = "/ecs/${local.name}-backend"
  retention_in_days = 7
}

resource "aws_ecs_cluster" "main" {
  name = "${local.name}-cluster"
}

resource "aws_ecs_task_definition" "backend" {
  family                   = "${local.name}-backend"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = "512"
  memory                   = "1024"
  execution_role_arn       = aws_iam_role.ecs_execution.arn
  task_role_arn            = aws_iam_role.backend_task.arn

  runtime_platform {
    operating_system_family = "LINUX"
    cpu_architecture        = "X86_64"
  }

  container_definitions = jsonencode([{
    name         = "backend"
    image        = "${aws_ecr_repository.backend.repository_url}:${var.backend_image_tag}"
    essential    = true
    portMappings = [{ containerPort = 8080, protocol = "tcp" }]
    stopTimeout  = 60
    environment = [
      { name = "SPRING_PROFILES_ACTIVE", value = "prod" },
      { name = "SERVER_PORT", value = "8080" },
      { name = "DB_HOST", value = aws_db_instance.main.address },
      { name = "DB_PORT", value = tostring(aws_db_instance.main.port) },
      { name = "DB_NAME", value = aws_db_instance.main.db_name },
      { name = "DB_USER", value = aws_db_instance.main.username },
      { name = "DB_SCHEMA", value = "public" },
      { name = "DB_SSL_MODE", value = "require" },
      { name = "FRONTEND_URL", value = var.frontend_url },
      { name = "SMTP_HOST", value = var.smtp_host },
      { name = "SMTP_PORT", value = tostring(var.smtp_port) },
      { name = "MAIL_SENDER", value = var.mail_sender },
      { name = "AWS_REGION", value = var.aws_region },
      { name = "AWS_REKOGNITION_COLLECTION", value = aws_rekognition_collection.clients.collection_id },
      { name = "AWS_LIVENESS_ROLE_ARN", value = aws_iam_role.liveness.arn },
      { name = "APP_TIME_ZONE", value = "America/Guayaquil" },
      { name = "JAVA_TOOL_OPTIONS", value = "-XX:MaxRAMPercentage=65.0" }
    ]
    secrets = [
      for key in ["DB_PASSWORD", "SMTP_USERNAME", "SMTP_PASSWORD", "APP_INITIAL_ADMIN_PASSWORD"] : {
        name      = key
        valueFrom = "${aws_secretsmanager_secret.application.arn}:${key}::"
      }
    ]
    logConfiguration = {
      logDriver = "awslogs"
      options = {
        awslogs-group         = aws_cloudwatch_log_group.backend.name
        awslogs-region        = var.aws_region
        awslogs-stream-prefix = "backend"
      }
    }
  }])
}

resource "aws_ecs_service" "backend" {
  name                               = "${local.name}-backend"
  cluster                            = aws_ecs_cluster.main.id
  task_definition                    = aws_ecs_task_definition.backend.arn
  desired_count                      = 1
  launch_type                        = "FARGATE"
  platform_version                   = "1.4.0"
  health_check_grace_period_seconds  = 180
  deployment_minimum_healthy_percent = 100
  deployment_maximum_percent         = 200
  wait_for_steady_state              = true

  deployment_circuit_breaker {
    enable   = true
    rollback = true
  }

  network_configuration {
    subnets          = values(aws_subnet.public)[*].id
    security_groups  = [aws_security_group.backend.id]
    assign_public_ip = true
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.backend.arn
    container_name   = "backend"
    container_port   = 8080
  }

  depends_on = [
    aws_lb_listener.https,
    aws_iam_role_policy_attachment.ecs_execution,
    aws_iam_role_policy.execution_secrets,
    aws_iam_role_policy.backend_task,
    aws_iam_role_policy.liveness,
    aws_secretsmanager_secret_version.application,
    aws_vpc_security_group_ingress_rule.backend_from_alb,
    aws_vpc_security_group_ingress_rule.database_from_backend,
    aws_vpc_security_group_egress_rule.backend,
    aws_vpc_security_group_egress_rule.alb_to_backend,
    aws_route_table_association.public,
    aws_route_table_association.database
  ]
}
