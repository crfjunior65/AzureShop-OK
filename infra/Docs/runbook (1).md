# Runbook — Obter `aks_node_resource_group` pela Azure CLI

## Objetivo

Identificar o resource group gerenciado automaticamente pelo Azure Kubernetes Service (AKS), conhecido no Terraform como `aks_node_resource_group`.

Esse resource group normalmente contém máquinas virtuais, discos, interfaces de rede, balanceadores e outros componentes utilizados pelos nós do AKS.

## Pré-requisitos

- Azure CLI instalada;
- autenticação realizada com `az login`;
- assinatura correta selecionada;
- nome do resource group do AKS;
- nome do cluster AKS.

## 1. Confirmar a assinatura ativa

```bash
az account show \
  --query '{Name:name,SubscriptionId:id,User:user.name}' \
  --output table
```

Se necessário, selecione explicitamente a assinatura:

```bash
az account set \
  --subscription "31f0817a-9efc-46d2-a0c2-3c9d85e77619"
```

## 2. Listar os clusters AKS

Caso o nome do cluster ainda não seja conhecido:

```bash
az aks list \
  --resource-group rg-imersao-arquitetoazure-us \
  --query '[].{Cluster:name,NodeResourceGroup:nodeResourceGroup,State:provisioningState}' \
  --output table
```

Esse comando já apresenta o nome do cluster e seu node resource group.

## 3. Obter somente o node resource group

Substitua `<NOME_DO_AKS>` pelo nome real do cluster:

```bash
az aks show \
  --resource-group rg-imersao-arquitetoazure-us \
  --name <NOME_DO_AKS> \
  --query nodeResourceGroup \
  --output tsv
```

Exemplo usando uma variável:

```bash
AKS_NAME="aks-imersao-azureshop"

az aks show \
  --resource-group rg-imersao-arquitetoazure-us \
  --name "$AKS_NAME" \
  --query nodeResourceGroup \
  --output tsv
```

## 4. Guardar o resultado em uma variável do Bash

```bash
AKS_NODE_RESOURCE_GROUP="$(az aks show \
  --resource-group rg-imersao-arquitetoazure-us \
  --name "$AKS_NAME" \
  --query nodeResourceGroup \
  --output tsv)"

printf '%s\n' "$AKS_NODE_RESOURCE_GROUP"
```

## 5. Usar o resultado no Terraform

Copie o valor apresentado para `terraform.tfvars`:

```hcl
aks_node_resource_group = "MC_rg-imersao-arquitetoazure-us_aks-imersao-azureshop_eastus"
```

O valor acima é apenas um exemplo. Use exatamente o resultado retornado pela Azure CLI.

## 6. Alternativa: gerar uma linha HCL pronta

```bash
AKS_NODE_RESOURCE_GROUP="$(az aks show \
  --resource-group rg-imersao-arquitetoazure-us \
  --name "$AKS_NAME" \
  --query nodeResourceGroup \
  --output tsv)"

printf 'aks_node_resource_group = "%s"\n' "$AKS_NODE_RESOURCE_GROUP"
```

Copie a linha produzida para `terraform.tfvars`.

## 7. Validação

```bash
az group show \
  --name "$AKS_NODE_RESOURCE_GROUP" \
  --query '{Name:name,Location:location,State:properties.provisioningState}' \
  --output table
```

Resultado esperado: resource group encontrado e estado `Succeeded`.

## Erros comuns

### Cluster não encontrado

Confirme o nome e o resource group:

```bash
az aks list \
  --query '[].{Cluster:name,ResourceGroup:resourceGroup,NodeResourceGroup:nodeResourceGroup}' \
  --output table
```

### Resultado vazio

O cluster pode ainda não ter sido criado ou a conta pode estar conectada na assinatura errada. Confira `az account show` e o resultado de `az aks list`.

### Não alterar o node resource group manualmente

O node resource group é administrado pelo AKS. Evite apagar ou modificar diretamente seus recursos, pois isso pode comprometer o cluster.

## 8. Corrigir `ResourceGroupNotFound` causado por colchetes

Não coloque `[` e `]` ao redor do nome. Em documentação, esses caracteres normalmente indicam um valor que deve ser substituído; eles não fazem parte do nome.

Comando incorreto:

```bash
az network vnet list \
  --resource-group "[MC_rg-imersao-arquitetoazure-us_aks-imersao-azureshop_eastus]" \
  --output table
```

Comando correto:

```bash
az network vnet list \
  --resource-group "MC_rg-imersao-arquitetoazure-us_aks-imersao-azureshop_eastus" \
  --query '[].{Name:name,Prefixes:addressSpace.addressPrefixes}' \
  --output table
```

Antes da consulta, obtenha da Azure o nome oficial para evitar copiar um exemplo incorreto:

```bash
AKS_NAME="aks-imersao-azureshop"

AKS_NODE_RESOURCE_GROUP="$(az aks show \
  --resource-group rg-imersao-arquitetoazure-us \
  --name "$AKS_NAME" \
  --query nodeResourceGroup \
  --output tsv)"

printf 'Node resource group: %s\n' "$AKS_NODE_RESOURCE_GROUP"
```

Valide a existência do resource group:

```bash
az group exists --name "$AKS_NODE_RESOURCE_GROUP"
```

O resultado esperado é `true`. Depois liste as VNets:

```bash
az network vnet list \
  --resource-group "$AKS_NODE_RESOURCE_GROUP" \
  --query '[].{Name:name,Prefixes:addressSpace.addressPrefixes}' \
  --output table
```

Se `az group exists` retornar `false`, confira assinatura, nome do cluster e estado da criação:

```bash
az account show \
  --query '{Subscription:name,SubscriptionId:id}' \
  --output table

az aks list \
  --query '[].{Cluster:name,ResourceGroup:resourceGroup,NodeResourceGroup:nodeResourceGroup,State:provisioningState}' \
  --output table
```

Se o AKS ainda não tiver sido criado com sucesso, o node resource group poderá não existir.

## 9. Não confundir o resource group com o nome da VNet

Os valores representam objetos diferentes:

| Valor | Tipo de recurso | Onde usar |
|---|---|---|
| `MC_rg-imersao-arquitetoazure-us_aks-imersao-azureshop_eastus` | Resource group gerenciado do AKS | `--resource-group` |
| `aks-vnet-41187970` | Possível nome da VNet | `--name`, depois de confirmar que ela existe |

Se `terraform output -raw aks_node_resource_group` retornar o nome iniciado por `MC_`, use exatamente esse resultado como resource group:

```bash
AKS_NODE_RESOURCE_GROUP="$(terraform output -raw aks_node_resource_group)"

printf 'Resource group do AKS: %s\n' "$AKS_NODE_RESOURCE_GROUP"

az group exists --name "$AKS_NODE_RESOURCE_GROUP"
```

Se a resposta for `true`, liste as VNets dentro dele:

```bash
az network vnet list \
  --resource-group "$AKS_NODE_RESOURCE_GROUP" \
  --query '[].{Name:name,Prefixes:addressSpace.addressPrefixes}' \
  --output table
```

Para localizar especificamente `aks-vnet-41187970` em toda a assinatura:

```bash
az network vnet list \
  --query "[?name=='aks-vnet-41187970'].{Name:name,ResourceGroup:resourceGroup,Location:location,Prefixes:addressSpace.addressPrefixes}" \
  --output table
```

O campo `ResourceGroup` retornado nesse último comando é o nome que deve ser passado a `--resource-group`.

Para consultar a VNet pelo nome depois de confirmar seu resource group:

```bash
az network vnet show \
  --resource-group "$AKS_NODE_RESOURCE_GROUP" \
  --name "aks-vnet-41187970" \
  --query '{Name:name,ResourceGroup:resourceGroup,Prefixes:addressSpace.addressPrefixes,Subnets:subnets[].name}' \
  --output jsonc
```

Se a listagem do node resource group não mostrar nenhuma VNet, isso pode ser normal quando o cluster usa uma subnet de uma VNet localizada em outro resource group. Nesse caso, consulte a configuração de rede do AKS:

```bash
az aks show \
  --resource-group rg-imersao-arquitetoazure-us \
  --name aks-imersao-azureshop \
  --query '{NodeResourceGroup:nodeResourceGroup,NetworkPlugin:networkProfile.networkPlugin,SubnetId:agentPoolProfiles[0].vnetSubnetId}' \
  --output jsonc
```

Quando `SubnetId` estiver preenchido, o próprio identificador mostra a assinatura, o resource group, a VNet e a subnet realmente usadas pelo node pool.

## 10. Corrigir valor inválido em `var.aks_node_resource_group`

### Sintoma

O plano termina com:

```text
Error: "resource_group_name" may only contain alphanumeric characters,
dash, underscores, parentheses and periods
```

O erro ocorre antes de consultar a VNet porque o valor de `var.aks_node_resource_group` contém caracteres não permitidos. As causas mais comuns são colchetes, espaços nas extremidades, quebra de linha ou texto de erro copiado junto com o nome.

### Diagnóstico exato do valor recebido pelo Terraform

No diretório `~/azureshop/infra/terraform`, execute:

```bash
terraform console
```

Dentro do console:

```hcl
jsonencode(var.aks_node_resource_group)
length(var.aks_node_resource_group)
regexall("[^0-9A-Za-z_.()-]", var.aks_node_resource_group)
```

Saia com:

```hcl
exit
```

O resultado correto de `jsonencode` deve conter somente:

```text
"MC_rg-imersao-arquitetoazure-us_aks-imersao-azureshop_eastus"
```

O `regexall` deve retornar uma lista vazia. Se retornar espaços, colchetes, barra invertida ou quebra de linha, o valor está incorreto.

### Localizar todas as fontes possíveis

```bash
rg -n -C 3 'aks_node_resource_group|TF_VAR_aks_node_resource_group' \
  . \
  -g '*.tf' \
  -g '*.tfvars' \
  -g '*.auto.tfvars'

env | rg '^TF_VAR_aks_node_resource_group='
```

Uma variável de ambiente `TF_VAR_aks_node_resource_group` tem precedência sobre alguns valores e pode manter um conteúdo antigo. Para removê-la da sessão atual:

```bash
unset TF_VAR_aks_node_resource_group
```

### Corrigir `terraform.tfvars`

Use o valor simples, sem colchetes e sem comandos dentro das aspas:

```hcl
aks_node_resource_group = "MC_rg-imersao-arquitetoazure-us_aks-imersao-azureshop_eastus"
```

Não use:

```hcl
aks_node_resource_group = "[MC_rg-imersao-arquitetoazure-us_aks-imersao-azureshop_eastus]"
```

Também não use `aks-vnet-41187970`, pois esse é o nome provável da VNet, não do resource group.

### Confirmar os dois valores na Azure

```bash
az group show \
  --name "MC_rg-imersao-arquitetoazure-us_aks-imersao-azureshop_eastus" \
  --query '{Name:name,Location:location,State:properties.provisioningState}' \
  --output table

az network vnet list \
  --resource-group "MC_rg-imersao-arquitetoazure-us_aks-imersao-azureshop_eastus" \
  --query '[].{Name:name,Prefixes:addressSpace.addressPrefixes}' \
  --output table
```

Se a saída mostrar `aks-vnet-41187970`, a combinação Terraform deve ser:

```hcl
aks_node_resource_group = "MC_rg-imersao-arquitetoazure-us_aks-imersao-azureshop_eastus"
aks_vnet_name           = "aks-vnet-41187970"
```

### Formatar, validar e criar novo plano

```bash
terraform fmt -recursive
terraform validate
terraform plan -out=tfplan-aks-rede
terraform show tfplan-aks-rede
```

Não reutilize um plano anterior. O plano só deve ser aplicado se terminar sem erros.

## 11. Análise das ações do plano de rede

O plano apresentado contém:

1. criação da regra `Allow-AKS-To-SQL-1433`;
2. atualização interna do bloco `upgrade_settings` do node pool;
3. nenhuma destruição.

A regra de NSG permite tráfego TCP da rede AKS `10.100.0.0/16` para a subnet de dados `10.0.2.0/24`, porta SQL Server `1433`. Antes de aplicar, confirme que esses intervalos são realmente os usados pelas duas redes:

```bash
az network vnet list \
  --query '[].{VNet:name,ResourceGroup:resourceGroup,Prefixes:addressSpace.addressPrefixes}' \
  --output table

az network vnet subnet show \
  --resource-group rg-imersao-arquitetoazure-us \
  --vnet-name vnet-imerssao-us \
  --name snet-dados \
  --query '{Subnet:name,Prefix:addressPrefix,Prefixes:addressPrefixes,NSG:networkSecurityGroup.id}' \
  --output jsonc
```

O `update in-place` não recria o AKS, mas indica que o Terraform pretende remover da configuração registrada o bloco `upgrade_settings`, atualmente com `max_surge = "10%"`. Se essa alteração não foi intencional, não aplique ainda. Localize o `default_node_pool`:

```bash
rg -n -C 15 'default_node_pool|upgrade_settings|max_surge' modules/aks .
```

Dentro do `default_node_pool`, mantenha explicitamente pelo menos:

```hcl
upgrade_settings {
  max_surge = "10%"
}
```

Depois gere outro plano. O objetivo é que a atualização do AKS desapareça se nenhuma mudança no node pool for desejada.

## 12. Critérios antes do `apply`

Somente execute o `apply` quando:

- o plano terminar sem mensagem de erro;
- `aks_node_resource_group` contiver apenas o nome iniciado por `MC_`;
- `aks_vnet_name` contiver apenas o nome da VNet;
- os prefixos `10.100.0.0/16` e `10.0.2.0/24` tiverem sido confirmados;
- a porta `1433` for realmente necessária;
- não houver destruições;
- a alteração de `upgrade_settings` tiver sido removida ou aceita conscientemente.

Aplicação do plano revisado:

```bash
terraform apply tfplan-aks-rede
```

Validação da regra após o `apply`:

```bash
az network nsg rule show \
  --resource-group rg-imersao-arquitetoazure-us \
  --nsg-name nsg-snet-aplicacao-us \
  --name Allow-AKS-To-SQL-1433 \
  --query '{Name:name,Access:access,Direction:direction,Protocol:protocol,Source:sourceAddressPrefixes,Destination:destinationAddressPrefix,Port:destinationPortRange,Priority:priority}' \
  --output jsonc
```

## 13. Valores reais confirmados para a fase 2

A investigação confirmou que `terraform.tfvars` ainda continha valores provisórios:

```hcl
aks_node_resource_group = "aks_node_resource_group]"
aks_vnet_name           = "vnet-name-aks_node_resource_group"
```

Esses valores devem ser substituídos pelos nomes obtidos diretamente da Azure:

```hcl
enable_aks_private_connectivity = true
aks_node_resource_group         = "MC_rg-imersao-arquitetoazure-us_aks-imersao-azureshop_eastus"
aks_vnet_name                   = "aks-vnet-41187970"
aks_vnet_address_prefixes       = ["10.100.0.0/16"]
aks_sql_nsg_priority            = 1004
```

O resource group foi confirmado com estado `Succeeded`, e a VNet `aks-vnet-41187970` foi encontrada dentro dele.

Depois da edição, confirme que nenhum texto provisório permaneceu:

```bash
rg -n 'aks_node_resource_group|aks_vnet_name|vnet-name|resource_group]' terraform.tfvars
```

Valide os valores interpretados pelo Terraform:

```bash
terraform console
```

```hcl
var.aks_node_resource_group
var.aks_vnet_name
regexall("[^0-9A-Za-z_.()-]", var.aks_node_resource_group)
regexall("[^0-9A-Za-z_.()-]", var.aks_vnet_name)
```

As duas chamadas de `regexall` devem retornar `[]`. Não coloque uma barra invertida antes do sublinhado na expressão regular.

Finalize com:

```bash
terraform fmt -recursive
terraform validate
terraform plan -out=tfplan-aks-rede-corrigido
terraform show tfplan-aks-rede-corrigido
```

O erro de caracteres inválidos em `resource_group_name` deve desaparecer. Aplique somente se o plano terminar com sucesso e apresentar as ações esperadas:

```bash
terraform apply tfplan-aks-rede-corrigido
```

## 14. Corrigir aspas finais ausentes no `terraform.tfvars`

Uma conferência posterior mostrou que as duas strings foram digitadas sem as aspas duplas finais:

```hcl
aks_node_resource_group = "MC_rg-imersao-arquitetoazure-us_aks-imersao-azureshop_eastus
aks_vnet_name           = "aks-vnet-41187970
```

Essa sintaxe é inválida. Cada string HCL deve começar e terminar com aspas duplas. O bloco correto é:

```hcl
aks_node_resource_group   = "MC_rg-imersao-arquitetoazure-us_aks-imersao-azureshop_eastus"
aks_vnet_name             = "aks-vnet-41187970"
aks_vnet_address_prefixes = ["10.100.0.0/16"]
aks_sql_nsg_priority      = 1004
```

Confira visualmente as linhas numeradas:

```bash
nl -ba terraform.tfvars | sed -n '24,34p'
```

Execute a formatação e a validação antes de qualquer novo plano:

```bash
terraform fmt terraform.tfvars
terraform validate
```

O resultado esperado da validação é:

```text
Success! The configuration is valid.
```

Somente após essa confirmação gere um novo plano. Um arquivo de plano anterior não deve ser reutilizado depois da correção do `terraform.tfvars`.
