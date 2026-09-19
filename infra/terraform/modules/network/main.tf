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
  default = "10.10.2.0/24"
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
  name                = "nsg-${var.app_subnet_name}"
  resource_group_name = var.resource_group_name
  location            = var.location
  tags                = var.tags

  security_rule {
    name                       = "Allow-SSH"
    priority                   = 1001
    direction                  = "Inbound"
    access                     = "Allow"
    protocol                   = "Tcp"
    source_port_range          = "*"
    destination_port_range     = "22"
    source_address_prefix      = local.ssh_source
    destination_address_prefix = "*"
  }

  security_rule {
    name                       = "Allow-App-3000"
    priority                   = 1002
    direction                  = "Inbound"
    access                     = "Allow"
    protocol                   = "Tcp"
    source_port_range          = "*"
    destination_port_range     = "3000"
    source_address_prefix      = local.ssh_source
    destination_address_prefix = "*"
  }

  dynamic "security_rule" {
    for_each = var.enable_app_service_vnet_integration ? [1] : []
    content {
      name                       = "Allow-App-Service-To-SQL-1433"
      priority                   = 1003
      direction                  = "Inbound"
      access                     = "Allow"
      protocol                   = "Tcp"
      source_port_range          = "*"
      destination_port_range     = "1433"
      source_address_prefix      = var.app_service_integration_subnet_prefix
      destination_address_prefix = var.data_subnet_prefix
    }
  }

  dynamic "security_rule" {
    for_each = length(var.aks_vnet_address_prefixes) > 0 ? [1] : []
    content {
      name                       = "Allow-AKS-To-SQL-1433"
      priority                   = 1004
      direction                  = "Inbound"
      access                     = "Allow"
      protocol                   = "Tcp"
      source_port_range          = "*"
      destination_port_range     = "1433"
      source_address_prefixes    = var.aks_vnet_address_prefixes
      destination_address_prefix = var.data_subnet_prefix
    }
  }
}

resource "azurerm_subnet_network_security_group_association" "app" {
  subnet_id                 = azurerm_subnet.app.id
  network_security_group_id = azurerm_network_security_group.this.id
}

# Associa o mesmo NSG a sub-rede de dados (snet-dados) do Private Endpoint.
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
