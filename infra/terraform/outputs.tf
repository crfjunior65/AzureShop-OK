output "portal_resource_group_name" {
  description = "RG gerenciado pelo Terraform."
  value       = azurerm_resource_group.rg.name
}

output "portal_vnet_id" {
  description = "VNet gerenciada pelo Terraform."
  value       = module.network.vnet_id
}

output "portal_sql_server_fqdn" {
  description = "FQDN do servidor SQL gerenciado pelo Terraform."
  value       = module.sql.server_fqdn
}

output "portal_sql_database_name" {
  description = "Banco SQL gerenciado pelo Terraform."
  value       = module.sql.database_name
}

output "acr_name" {
  description = "Nome do ACR novo; null ate a fase 1 ser habilitada."
  value       = one(module.container_registry[*].name)
}

output "acr_login_server" {
  description = "Login server nao secreto do ACR novo."
  value       = one(module.container_registry[*].login_server)
}

output "aks_name" {
  description = "Nome do AKS novo; null ate a fase 1 ser habilitada."
  value       = one(module.aks[*].name)
}

output "aks_node_resource_group" {
  description = "RG gerenciado retornado pelo AKS para preparar a fase 2."
  value       = one(module.aks[*].node_resource_group)
}

output "aks_get_credentials" {
  description = "Comando de leitura de credenciais do AKS apos a fase 1."
  value       = one(module.aks[*].get_credentials_command)
}
