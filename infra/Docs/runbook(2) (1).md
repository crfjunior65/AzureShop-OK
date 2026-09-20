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
