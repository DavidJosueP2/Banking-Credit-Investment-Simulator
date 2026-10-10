terraform {
  required_version = ">= 1.10.0, < 2.0.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.0"
    }
  }

  # El bucket se crea una sola vez con los comandos documentados en README.md.
  # production.hcl configures production state storage during terraform init.
  backend "s3" {}
}
