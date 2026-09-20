# Runbook: Automação Total de Infraestrutura com Terraform

Este documento detalha o processo de migração de uma infraestrutura Azure (criada parcialmente via Portal) para um modelo 100% automatizado via Terraform.

## 1. Contexto Inicial
O projeto original seguia um fluxo "Dia 1 Manual / Dia 2 Terraform", onde recursos como VNet, SQL e NSG eram criados no Portal e apenas consumidos pelo Terraform via `data sources`.

## 2. Fase de Investigação
Identificamos os recursos existentes via Azure CLI para planejar a importação.

### Comandos de Inspeção
- `az group list --output table`: Lista grupos de recursos.
- `az aks list --output table`: Lista clusters AKS.
- `az resource list --resource-group <rg-name> --output table`: Lista todos os recursos dentro de um grupo específico.

## 3. Estratégia de Refatoração
A migração consistiu em substituir `data sources` por blocos `resource` nos módulos Terraform.

### Alterações nos Módulos
- **`modules/network/main.tf`**: Substituição da consulta de NSG existente pela criação do recurso `azurerm_network_security_group`.
- **`modules/sql-database/main.tf`**: Refatoração do `azurerm_mssql_server` para remover a necessidade de `administrator_login_password` em texto claro e adoção de autenticação exclusiva via Azure AD (`azuread_authentication_only = true`).

## 4. Importação e Sincronização
Para que o Terraform passasse a gerenciar os recursos criados manualmente sem destruí-los, usamos o comando `import`.

### Comando de Importação
```bash
terraform import <resource_address> <azure_resource_id>
```
- **Funcionalidade:** Associa um recurso existente no Azure a um bloco de código no Terraform.
- **Sintaxe:** 
  - `terraform import`: Comando base.
  - `<resource_address>`: O caminho do recurso no seu arquivo `.tf` (ex: `module.aks.azurerm_kubernetes_cluster.this`).
  - `<azure_resource_id>`: O ID completo do recurso na Azure (pode ser obtido via `az resource show --id ...`).

## 5. Destruição e Re-provisionamento
Após a importação e alinhamento, autorizamos a destruição para garantir um estado limpo (IaC puro).

### Comandos de Limpeza e Criação
- `terraform destroy -auto-approve`: Destrói todos os recursos mapeados no estado do Terraform.
- `terraform plan`: Valida o que será criado.
- `terraform apply -auto-approve`: Executa o provisionamento da infraestrutura do zero.

---
*Nota: Este documento reflete as etapas validadas até o momento. Lembre-se de sempre validar os erros de `plan` e `apply` antes de prosseguir em ambientes produtivos.*
