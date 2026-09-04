resource "aws_dynamodb_table" "player_history" {
  name         = "${local.name_prefix}-player-history"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "PK"
  range_key    = "SK"

  attribute {
    name = "PK"
    type = "S"
  }

  attribute {
    name = "SK"
    type = "S"
  }

  server_side_encryption {
    enabled = true
  }

  point_in_time_recovery {
    enabled = var.enable_point_in_time_recovery || var.environment == "prod"
  }

  tags = merge(local.common_tags, {
    Name    = "${local.name_prefix}-player-history"
    Purpose = "player-history"
  })
}
