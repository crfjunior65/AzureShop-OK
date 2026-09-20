locals {
  tags = {
    project       = "azureshop"
    company      = "highexpert"
    managed = "terraform"
  }

  acr_name = "acrimersaoazureshop1965"
  aks_name = "aks-imersao-azureshop"
}

# Resource Group de uso comum
resource "azurerm_resource_group" "rg" {
  name     = var.resource_group_name
  location = "eastus"
  tags     = local.tags
}

# Módulo de Rede (Agora gerenciando recursos)
module "network" {
  source              = "./modules/network"
  resource_group_name = azurerm_resource_group.rg.name
  location            = azurerm_resource_group.rg.location
  tags                = local.tags
  vnet_name           = var.portal_vnet_name
  vnet_address_space  = "10.0.0.0/16" # Confirmar CIDR real da VNet
  app_subnet_name     = "snet-aplicacao"
  app_subnet_prefix   = "10.0.1.0/24"
  # Adicione aqui os demais parâmetros esperados pelo módulo network
}

# Módulo SQL
module "sql" {
  source              = "./modules/sql-database"
  resource_group_name = azurerm_resource_group.rg.name
  location            = azurerm_resource_group.rg.location
  tags                = local.tags
  server_name         = var.portal_sql_server_name
  database_name       = var.portal_sql_database_name
  sku_name            = "Basic" # Confirmar SKU
  admin_login         = "adminuser" # Confirmar login
  admin_password      = "Password1234!" # Confirmar senha/usar segredo
  enable_private_endpoint = true
  subnet_id           = module.network.data_subnet_id
  vnet_id             = module.network.vnet_id
}

# ACR e AKS
module "container_registry" {
  source              = "./modules/container-registry"
  resource_group_name = azurerm_resource_group.rg.name
  location            = azurerm_resource_group.rg.location
  tags                = local.tags
  acr_name            = local.acr_name
  sku                 = var.acr_sku
}

module "aks" {
  source              = "./modules/aks"
  resource_group_name = azurerm_resource_group.rg.name
  location            = azurerm_resource_group.rg.location
  tags                = local.tags
  aks_name            = local.aks_name
  node_count          = var.aks_node_count
  node_size           = var.aks_node_size
}

resource "azurerm_role_assignment" "aks_acr_pull" {
  scope                = module.container_registry.id
  role_definition_name = "AcrPull"
  principal_id         = module.aks.kubelet_object_id
}
