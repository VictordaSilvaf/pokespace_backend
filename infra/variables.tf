variable "aws_region" {
  type        = string
  description = "AWS region for DynamoDB and IAM resources"
  default     = "sa-east-1"
}

variable "environment" {
  type        = string
  description = "Environment name (dev, staging, prod)"
  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "environment must be one of: dev, staging, prod"
  }
}

variable "enable_point_in_time_recovery" {
  type        = bool
  description = "Enable PITR on DynamoDB tables (recommended for prod)"
  default     = false
}

variable "alarm_sns_topic_arn" {
  type        = string
  description = "Optional SNS topic ARN for DynamoDB CloudWatch alarms"
  default     = ""
}

variable "extra_tags" {
  type        = map(string)
  description = "Additional resource tags"
  default     = {}
}
