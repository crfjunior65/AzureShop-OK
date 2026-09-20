variable "resource_group_name" { type = string }
variable "location" { type = string }
variable "tags" { type = map(string) }
variable "vnet_name" { type = string }
variable "vnet_address_space" { type = string }
variable "app_subnet_name" { type = string }
variable "app_subnet_prefix" { type = string }
variable "enable_app_service_vnet_integration" {
  type    = bool
  default = false
}
variable "app_service_integration_subnet_name" {
  type    = string
  default = ""
}
variable "app_service_integration_subnet_prefix" {
  type    = string
  default = ""
}
variable "data_subnet_name" {
  type    = string
  default = "snet-dados"
}
variable "data_subnet_prefix" {
  type    = string
  default = "10.0.2.0/24"
}
variable "allowed_source_ip" {
  type    = string
  default = ""
}
variable "aks_vnet_address_prefixes" {
  type    = list(string)
  default = []
}

locals {
  # Enquanto o IP autorizado nao for definido, as regras ficam fechadas.
  ssh_source = var.allowed_source_ip != "" ? var.allowed_source_ip : "127.0.0.1/32"
}

resource "azurerm_virtual_network" "this" {
  name                = var.vnet_name
  resource_group_name = var.resource_group_name
  location            = var.location
  address_space       = [var.vnet_address_space]
  tags                = var.tags
}

resource "azurerm_subnet" "app" {
  name                 = var.app_subnet_name
  resource_group_name  = var.resource_group_name
  virtual_network_name = azurerm_virtual_network.this.name
  address_prefixes     = [var.app_subnet_prefix]
}

# A VNet Integration requer uma subnet exclusiva; ela nao pode ser compartilhada
# com a VM, Private Endpoint ou outras cargas.
resource "azurerm_subnet" "app_service_integration" {
  count                = var.enable_app_service_vnet_integration ? 1 : 0
  name                 = var.app_service_integration_subnet_name
  resource_group_name  = var.resource_group_name
  virtual_network_name = azurerm_virtual_network.this.name
  address_prefixes     = [var.app_service_integration_subnet_prefix]

  delegation {
    name = "app-service-vnet-integration"

    service_delegation {
      name = "Microsoft.Web/serverFarms"
      actions = [
        "Microsoft.Network/virtualNetworks/subnets/action",
      ]
    }
  }

  lifecycle {
    precondition {
      condition     = var.app_service_integration_subnet_name != "" && var.app_service_integration_subnet_prefix != ""
      error_message = "Defina nome e prefixo da subnet exclusiva antes de habilitar a VNet Integration do App Service."
    }
  }
}

# Sub-rede dedicada ao Private Endpoint do Azure SQL (Private Link).
resource "azurerm_subnet" "data" {
  name                 = var.data_subnet_name
  resource_group_name  = var.resource_group_name
  virtual_network_name = azurerm_virtual_network.this.name
  address_prefixes     = [var.data_subnet_prefix]

  # Mantem as politicas de rede habilitadas para que o NSG seja aplicado ao Private Endpoint.
  private_endpoint_network_policies = "Enabled"
}


resource "azurerm_network_security_group" "this" {
  name                = "nsg-snet-aplicacao-us"
  resource_group_name = var.resource_group_name
  location            = var.location
  tags                = var.tags
}

resource "azurerm_subnet_network_security_group_association" "app" {
  subnet_id                 = azurerm_subnet.app.id
  network_security_group_id = azurerm_network_security_group.this.id
}

resource "azurerm_subnet_network_security_group_association" "data" {
  subnet_id                 = azurerm_subnet.data.id
  network_security_group_id = azurerm_network_security_group.this.id
}

output "vnet_id" { value = azurerm_virtual_network.this.id }
output "vnet_name" { value = azurerm_virtual_network.this.name }
output "app_subnet_id" { value = azurerm_subnet.app.id }
output "app_service_integration_subnet_id" { value = one(azurerm_subnet.app_service_integration[*].id) }
output "data_subnet_id" { value = azurerm_subnet.data.id }
output "nsg_id" { value = azurerm_network_security_group.this.id }
