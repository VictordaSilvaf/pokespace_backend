output "idempotency_table_name" {
  value       = aws_dynamodb_table.idempotency.name
  description = "DynamoDB table name for idempotency records"
}

output "idempotency_table_arn" {
  value       = aws_dynamodb_table.idempotency.arn
  description = "DynamoDB table ARN for idempotency records"
}

output "player_history_table_name" {
  value       = aws_dynamodb_table.player_history.name
  description = "DynamoDB table name for player activity history (app wiring in a later phase)"
}

output "player_history_table_arn" {
  value       = aws_dynamodb_table.player_history.arn
  description = "DynamoDB table ARN for player activity history"
}

output "app_dynamodb_policy_arn" {
  value       = aws_iam_policy.app_dynamodb.arn
  description = "IAM policy ARN to attach to the API runtime role"
}
