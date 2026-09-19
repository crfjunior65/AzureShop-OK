output "portal_resource_group_name" {
  description = "RG manual do Dia 1 lido pelo Terraform; este modulo nao o cria."
  value       = data.azurerm_resource_group.portal.name
}

output "portal_vnet_id" {
  description = "VNet manual do Dia 1 usada como destino do peering."
  value       = data.azurerm_virtual_network.portal.id
}

output "portal_sql_server_fqdn" {
  description = "FQDN nao secreto do SQL manual do Dia 1."
  value       = data.azurerm_mssql_server.portal.fully_qualified_domain_name
}

output "portal_sql_database_name" {
  description = "Banco SQL manual do Dia 1 confirmado pelo Terraform."
  value       = data.azurerm_mssql_database.portal.name
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
