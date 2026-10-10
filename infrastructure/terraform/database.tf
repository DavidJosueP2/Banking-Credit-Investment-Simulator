# Resolve a supported minor release within PostgreSQL 17.
data "aws_rds_engine_version" "postgres" {
  engine  = "postgres"
  version = "17"
  latest  = true
}

# This group will be attached to the Fargate tasks in the next step.
# No inbound access is allowed until the ALB rule is configured.
resource "aws_security_group" "backend" {
  name        = "${local.name}-backend-sg"
  description = "Backend tasks; inbound access will be restricted to the ALB."
  vpc_id      = aws_vpc.main.id

  tags = { Name = "${local.name}-backend-sg" }
}

resource "aws_vpc_security_group_egress_rule" "backend" {
  security_group_id = aws_security_group.backend.id
  cidr_ipv4         = "0.0.0.0/0"
  ip_protocol       = "-1"
  description       = "Outbound access for AWS APIs, SMTP and database connections."
}

resource "aws_security_group" "database" {
  name        = "${local.name}-database-sg"
  description = "Private PostgreSQL access from backend tasks only."
  vpc_id      = aws_vpc.main.id

  tags = { Name = "${local.name}-database-sg" }
}

resource "aws_vpc_security_group_ingress_rule" "database_from_backend" {
  security_group_id            = aws_security_group.database.id
  referenced_security_group_id = aws_security_group.backend.id
  from_port                    = 5432
  to_port                      = 5432
  ip_protocol                  = "tcp"
  description                  = "PostgreSQL connections from backend tasks."
}

resource "aws_db_instance" "main" {
  identifier                 = "${local.name}-postgres"
  engine                     = "postgres"
  engine_version             = data.aws_rds_engine_version.postgres.version
  instance_class             = "db.t4g.micro"
  allocated_storage          = 20
  storage_type               = "gp3"
  storage_encrypted          = true
  db_name                    = "brn_financiero"
  username                   = "brn_admin"
  password                   = var.db_password
  port                       = 5432
  db_subnet_group_name       = aws_db_subnet_group.main.name
  vpc_security_group_ids     = [aws_security_group.database.id]
  publicly_accessible        = false
  multi_az                   = false
  auto_minor_version_upgrade = true
  copy_tags_to_snapshot      = true

  # Disposable learning environment: destroy deletes the database without backups.
  backup_retention_period      = 0
  delete_automated_backups     = true
  skip_final_snapshot          = true
  deletion_protection          = false
  performance_insights_enabled = false

  tags = { Name = "${local.name}-postgres" }
}
