locals {
  name = "${var.project_name}-${var.environment}"

  # Dos zonas permiten que el ALB y el subnet group de RDS cumplan sus requisitos.
  availability_zones = slice(data.aws_availability_zones.available.names, 0, 2)

  public_subnet_cidrs = {
    for index, az in local.availability_zones : az => cidrsubnet(var.vpc_cidr, 8, index)
  }

  database_subnet_cidrs = {
    for index, az in local.availability_zones : az => cidrsubnet(var.vpc_cidr, 8, index + 10)
  }
}
