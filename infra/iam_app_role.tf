data "aws_iam_policy_document" "app_dynamodb" {
  statement {
    sid    = "DynamoDbIdempotencyAndHistory"
    effect = "Allow"
    actions = [
      "dynamodb:GetItem",
      "dynamodb:PutItem",
      "dynamodb:UpdateItem",
      "dynamodb:Query",
      "dynamodb:DescribeTable",
    ]
    resources = [
      aws_dynamodb_table.idempotency.arn,
      aws_dynamodb_table.player_history.arn,
      "${aws_dynamodb_table.player_history.arn}/index/*",
    ]
  }
}

resource "aws_iam_policy" "app_dynamodb" {
  name        = "${local.name_prefix}-api-dynamodb"
  description = "Least-privilege DynamoDB access for the PokeSpace API"
  policy      = data.aws_iam_policy_document.app_dynamodb.json
  tags        = local.common_tags
}

# Attach this policy to the API task/instance role in your compute stack.
# Example (uncomment and set role name when wiring ECS/EC2/EKS):
#
# resource "aws_iam_role_policy_attachment" "app_dynamodb" {
#   role       = var.api_iam_role_name
#   policy_arn = aws_iam_policy.app_dynamodb.arn
# }
