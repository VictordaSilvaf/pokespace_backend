# DynamoDB infrastructure for PokeSpace
#
# Flat Terraform root module (AWS provider loads `*.tf` only from this directory).
#
# Tables:
# - game-{env}-idempotency      (`dynamodb_idempotency.tf` — Phase 2, used by the API)
# - game-{env}-player-history   (`dynamodb_player_history.tf` — Phase 3, provisioned now)
#
# Also:
# - `iam_app_role.tf` — least-privilege policy (GetItem/PutItem/UpdateItem/Query)
# - `monitoring_alarms.tf` — throttling / system error alarms
#
# Usage:
#   cd infra
#   terraform init
#   terraform plan -var='environment=dev'
#   terraform apply -var='environment=prod' -var='enable_point_in_time_recovery=true'
#
# Never use production tables from development.
# Region default: sa-east-1.
