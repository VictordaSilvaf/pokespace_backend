resource "aws_cloudwatch_metric_alarm" "idempotency_throttles" {
  alarm_name          = "${local.name_prefix}-idempotency-throttles"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "ThrottledRequests"
  namespace           = "AWS/DynamoDB"
  period              = 60
  statistic           = "Sum"
  threshold           = 0
  treat_missing_data  = "notBreaching"
  alarm_description   = "DynamoDB throttling on idempotency table"

  dimensions = {
    TableName = aws_dynamodb_table.idempotency.name
  }

  alarm_actions = var.alarm_sns_topic_arn != "" ? [var.alarm_sns_topic_arn] : []
  tags          = local.common_tags
}

resource "aws_cloudwatch_metric_alarm" "idempotency_system_errors" {
  alarm_name          = "${local.name_prefix}-idempotency-system-errors"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "SystemErrors"
  namespace           = "AWS/DynamoDB"
  period              = 60
  statistic           = "Sum"
  threshold           = 0
  treat_missing_data  = "notBreaching"
  alarm_description   = "DynamoDB system errors on idempotency table"

  dimensions = {
    TableName = aws_dynamodb_table.idempotency.name
  }

  alarm_actions = var.alarm_sns_topic_arn != "" ? [var.alarm_sns_topic_arn] : []
  tags          = local.common_tags
}
