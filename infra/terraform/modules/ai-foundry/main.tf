variable "resource_group_name" { type = string }
variable "location" { type = string }
variable "tags" { type = map(string) }
variable "account_name" { type = string }
variable "sku_name" {
  type    = string
  default = "S0"
}
variable "public_network_access" {
  type    = bool
  default = true
}
variable "deployment_name" {
  type    = string
  default = "gpt-4o-mini"
}
variable "model_name" {
  type    = string
  default = "gpt-4o-mini"
}
variable "model_version" {
  type    = string
  default = "2024-07-18"
}
variable "deployment_capacity" {
  type    = number
  default = 10
}

resource "azurerm_cognitive_account" "this" {
  name                          = var.account_name
  resource_group_name           = var.resource_group_name
  location                      = var.location
  kind                          = "OpenAI"
  sku_name                      = var.sku_name
  custom_subdomain_name         = var.account_name
  public_network_access_enabled = var.public_network_access
  tags                          = var.tags
}

resource "azurerm_cognitive_deployment" "this" {
  name                 = var.deployment_name
  cognitive_account_id = azurerm_cognitive_account.this.id

  model {
    format  = "OpenAI"
    name    = var.model_name
    version = var.model_version
  }

  sku {
    name     = "Standard"
    capacity = var.deployment_capacity
  }
}

output "id" { value = azurerm_cognitive_account.this.id }
output "name" { value = azurerm_cognitive_account.this.name }
output "endpoint" { value = azurerm_cognitive_account.this.endpoint }
output "deployment_name" { value = azurerm_cognitive_deployment.this.name }
output "primary_key" {
  value     = azurerm_cognitive_account.this.primary_access_key
  sensitive = true
}
