variable "resource_group_name" { type = string }
variable "location" { type = string }
variable "tags" { type = map(string) }
variable "app_name" { type = string }
variable "plan_sku" { type = string }
variable "virtual_network_subnet_id" {
  description = "ID da subnet exclusiva delegada a Microsoft.Web/serverFarms para VNet Integration de saida."
  type        = string
  default     = ""
}

resource "azurerm_service_plan" "this" {
  name                = "plan-imersao"
  resource_group_name = var.resource_group_name
  location            = var.location
  os_type             = "Linux"
  sku_name            = var.plan_sku
  tags                = var.tags
}

resource "azurerm_linux_web_app" "this" {
  name                      = var.app_name
  resource_group_name       = var.resource_group_name
  location                  = var.location
  service_plan_id           = azurerm_service_plan.this.id
  virtual_network_subnet_id = var.virtual_network_subnet_id != "" ? var.virtual_network_subnet_id : null
  https_only                = true
  tags                      = var.tags

  identity {
    type = "SystemAssigned"
  }

  site_config {
    minimum_tls_version               = "1.2"
    ftps_state                        = "Disabled"
    health_check_path                 = "/api/health"
    health_check_eviction_time_in_min = 2
    always_on                         = false

    application_stack {
      node_version = "20-lts"
    }
  }

  app_settings = {
    APP_ENV                             = "azure"
    DB_PROVIDER                         = "sqlite"
    SQLITE_PATH                         = "/home/data/loja.db"
    WEBSITE_RUN_FROM_PACKAGE            = "0"
    SCM_DO_BUILD_DURING_DEPLOYMENT      = "false"
    WEBSITES_ENABLE_APP_SERVICE_STORAGE = "true"
  }
}

output "name" { value = azurerm_linux_web_app.this.name }
output "url" { value = "https://${azurerm_linux_web_app.this.default_hostname}" }
output "principal_id" { value = azurerm_linux_web_app.this.identity[0].principal_id }
