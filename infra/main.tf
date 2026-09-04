terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

locals {
  name_prefix = "game-${var.environment}"
  common_tags = merge(
    {
      Project     = "pokespace"
      Environment = var.environment
      ManagedBy   = "terraform"
    },
    var.extra_tags,
  )
}
