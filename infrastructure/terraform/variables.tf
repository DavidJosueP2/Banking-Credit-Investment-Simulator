variable "aws_region" {
  description = "Región principal del despliegue."
  type        = string
  default     = "us-east-1"

  validation {
    condition     = var.aws_region == "us-east-1"
    error_message = "Este prototipo está diseñado y probado para us-east-1."
  }
}

variable "project_name" {
  description = "Nombre corto usado como prefijo de recursos."
  type        = string
  default     = "brn"

  validation {
    condition     = can(regex("^[a-z][a-z0-9-]{2,20}$", var.project_name))
    error_message = "project_name debe usar minúsculas, números o guiones y tener entre 3 y 21 caracteres."
  }
}

variable "environment" {
  description = "Ambiente desplegado."
  type        = string
  default     = "prod"

  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "environment debe ser dev, staging o prod."
  }
}

variable "vpc_cidr" {
  description = "Bloque privado de la VPC."
  type        = string
  default     = "10.20.0.0/16"
}

variable "rekognition_collection_name" {
  description = "Face collection managed by Terraform; must match application configuration."
  type        = string
  default     = "brn-clients"
}

variable "api_domain_name" {
  description = "API hostname; DNS validation records are added manually in Cloudflare."
  type        = string
  default     = "api-brn.stratiumhub.com"
}

variable "backend_image_tag" {
  description = "Existing immutable ECR image tag; build and push before applying ECS."
  type        = string
}

variable "frontend_domain_name" {
  type    = string
  default = "brn.stratiumhub.com"
}

variable "enable_frontend_distribution" {
  description = "Enable after publishing the frontend certificate validation CNAME in Cloudflare."
  type        = bool
  default     = false
}

variable "frontend_url" {
  description = "Exact HTTPS origin allowed by backend CORS."
  type        = string
  default     = "https://brn.stratiumhub.com"
}

variable "smtp_host" {
  type    = string
  default = "smtp.gmail.com"
}

variable "smtp_port" {
  type    = number
  default = 587
}

variable "mail_sender" {
  description = "Sender email; must be authorized by the SMTP provider."
  type        = string
}

variable "db_password" {
  description = "Database password shared by RDS and the application secret."
  type        = string
  sensitive   = true

  validation {
    condition     = length(var.db_password) >= 16 && length(var.db_password) <= 128 && can(regex("^[!-~]+$", var.db_password)) && !can(regex("[@\"/ ]", var.db_password))
    error_message = "Use 16-128 printable ASCII characters, excluding spaces, @, / and double quotes."
  }
}

variable "smtp_username" {
  description = "SMTP authentication username."
  type        = string
  sensitive   = true

  validation {
    condition     = length(trimspace(var.smtp_username)) > 0
    error_message = "Provide the SMTP username."
  }
}

variable "smtp_password" {
  description = "SMTP authentication password."
  type        = string
  sensitive   = true

  validation {
    condition     = length(trimspace(var.smtp_password)) > 0
    error_message = "Provide the SMTP password."
  }
}

variable "initial_admin_password" {
  description = "Password used only when creating the first application administrator."
  type        = string
  sensitive   = true

  validation {
    condition     = length(var.initial_admin_password) >= 12
    error_message = "The initial administrator password must contain at least 12 characters."
  }
}
