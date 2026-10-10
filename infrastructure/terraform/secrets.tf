resource "aws_secretsmanager_secret" "application" {
  name                    = "${local.name}-app-secrets"
  description             = "Database, SMTP and initial administrator credentials for the disposable lab."
  recovery_window_in_days = 0
}

resource "aws_secretsmanager_secret_version" "application" {
  secret_id = aws_secretsmanager_secret.application.id
  secret_string = jsonencode({
    DB_PASSWORD                = var.db_password
    SMTP_USERNAME              = var.smtp_username
    SMTP_PASSWORD              = var.smtp_password
    APP_INITIAL_ADMIN_PASSWORD = var.initial_admin_password
  })
}

data "aws_iam_policy_document" "execution_secrets" {
  statement {
    actions   = ["secretsmanager:GetSecretValue"]
    resources = [aws_secretsmanager_secret.application.arn]
  }
}

resource "aws_iam_role_policy" "execution_secrets" {
  name   = "${local.name}-read-app-secrets"
  role   = aws_iam_role.ecs_execution.id
  policy = data.aws_iam_policy_document.execution_secrets.json
}
