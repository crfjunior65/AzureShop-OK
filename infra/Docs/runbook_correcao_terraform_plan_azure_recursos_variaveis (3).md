# Runbook — Correção do `terraform plan` no AzureShop

## 1. Objetivo

Corrigir os erros encontrados pelo Terraform ao consultar recursos existentes do Azure e validar variáveis do projeto localizado em:

```text
~/azureshop/infra/terraform
```

## 2. Diagnóstico resumido

O Terraform conseguiu encontrar:

- Resource Group `rg-imersao-arquitetoazure-us`;
- SQL Server `srvsql1965`;
- SQL Database `sqlsrvazure`.

O Terraform não encontrou:

- Virtual Network `vnet-imersao-us`;
- Network Security Group `nsg-snet-aplicacao`;
- Private DNS Zone `privatelink.database.windows.net`.

Também foram identificadas duas variáveis inválidas:

- `suffix = "azureshop#"` não atende à validação;
- `aks_vnet_address_prefixes` recebeu uma string, mas exige uma lista de strings com blocos CIDR.

## 3. Regra importante sobre blocos `data`

Um bloco `data` consulta um recurso que já precisa existir no Azure. Ele não cria o recurso.

Exemplo:

```hcl
data "azurerm_virtual_network" "portal" {
  name                = var.aks_vnet_name
  resource_group_name = data.azurerm_resource_group.portal.name
}
```

Esse código falhará se a VNet não existir exatamente com esse nome no Resource Group informado.

Há duas soluções possíveis:

1. o recurso existe: corrigir nome, assinatura ou Resource Group usados pelo bloco `data`;
2. o recurso ainda não existe: declará-lo como `resource "azurerm_..."` ou criá-lo em uma etapa anterior.

Não troque automaticamente `data` por `resource` sem confirmar o desenho da infraestrutura. Isso poderia tentar criar recursos duplicados.

## 4. Confirmar conta e assinatura ativas

Execute:

```bash
az account show \
  --query '{subscription:name, subscriptionId:id, tenantId:tenantId, user:user.name}' \
  --output table
```

O `subscriptionId` esperado no erro é:

```text
31f0817a-9efc-46d2-a0c2-3c9d85e77619
```

Se a assinatura ativa estiver incorreta, liste as disponíveis:

```bash
az account list \
  --query '[].{Name:name, SubscriptionId:id, IsDefault:isDefault, State:state}' \
  --output table
```

Selecione explicitamente a assinatura correta:

```bash
az account set --subscription "31f0817a-9efc-46d2-a0c2-3c9d85e77619"
```

Confirme novamente com `az account show`.

## 5. Verificar a Virtual Network

Liste todas as VNets da assinatura:

```bash
az network vnet list \
  --query '[].{Name:name, ResourceGroup:resourceGroup, Location:location, AddressPrefixes:addressSpace.addressPrefixes}' \
  --output table
```

Liste somente as VNets do Resource Group esperado:

```bash
az network vnet list \
  --resource-group "rg-imersao-arquitetoazure-us" \
  --query '[].{Name:name, Location:location, AddressPrefixes:addressSpace.addressPrefixes}' \
  --output table
```

Teste o nome informado diretamente:

```bash
az network vnet show \
  --resource-group "rg-imersao-arquitetoazure-us" \
  --name "vnet-imersao-us" \
  --output table
```

Interpretação:

- se aparecer com outro nome, atualize `aks_vnet_name` no `terraform.tfvars`;
- se aparecer em outro Resource Group, corrija o argumento `resource_group_name` do `data`;
- se não aparecer, confirme se o projeto deveria criar essa VNet.

## 6. Verificar o Network Security Group

Liste todos os NSGs da assinatura:

```bash
az network nsg list \
  --query '[].{Name:name, ResourceGroup:resourceGroup, Location:location}' \
  --output table
```

No Resource Group esperado:

```bash
az network nsg list \
  --resource-group "rg-imersao-arquitetoazure-us" \
  --query '[].{Name:name, Location:location}' \
  --output table
```

Teste o nome configurado:

```bash
az network nsg show \
  --resource-group "rg-imersao-arquitetoazure-us" \
  --name "nsg-snet-aplicacao" \
  --output table
```

Se o NSG existir com outro nome ou em outro Resource Group, ajuste o valor usado por:

```hcl
data "azurerm_network_security_group" "portal_data"
```

Se ele não existir, determine se deve ser criado por este projeto ou por uma camada anterior de rede.

## 7. Verificar a Private DNS Zone

Liste as zonas DNS privadas da assinatura:

```bash
az network private-dns zone list \
  --query '[].{Name:name, ResourceGroup:resourceGroup, Records:numberOfRecordSets}' \
  --output table
```

No Resource Group esperado:

```bash
az network private-dns zone list \
  --resource-group "rg-imersao-arquitetoazure-us" \
  --query '[].{Name:name, Records:numberOfRecordSets}' \
  --output table
```

Teste diretamente:

```bash
az network private-dns zone show \
  --resource-group "rg-imersao-arquitetoazure-us" \
  --name "privatelink.database.windows.net" \
  --output table
```

Em ambientes centralizados, a zona privada pode estar em um Resource Group de conectividade diferente. Se for esse o caso, o `data` deve apontar para o Resource Group real da zona, não necessariamente para o Resource Group da aplicação.

Se a zona não existir, confirme se o módulo deve criar:

- a Private DNS Zone;
- o vínculo da zona com a VNet;
- o Private Endpoint do SQL;
- o registro DNS associado.

## 8. Corrigir a variável `suffix`

Valor atual inválido:

```hcl
suffix = "azureshop#"
```

Segundo a validação declarada em `variables.tf`, o valor precisa:

- ter de 3 a 10 caracteres;
- conter somente letras minúsculas e números;
- não conter `#`, hífen, espaço ou sublinhado.

Exemplos válidos:

```hcl
suffix = "azureshop"
```

ou:

```hcl
suffix = "shop1965"
```

O valor exato deve ser escolhido conforme o padrão de nomes do projeto. `azureshop` possui nove caracteres e atende à mensagem de validação apresentada.

## 9. Corrigir `aks_vnet_address_prefixes`

Valor atual inválido:

```hcl
aks_vnet_address_prefixes = "vnet-addressspace-aks_node_resource_group"
```

A variável foi declarada como `list(string)`. Portanto, precisa receber uma lista de textos:

```hcl
aks_vnet_address_prefixes = ["10.20.0.0/16"]
```

O bloco `10.20.0.0/16` é apenas um exemplo de formato e não deve ser copiado sem verificar a rede existente. Escolha um bloco CIDR que:

- esteja dentro do plano de endereçamento definido;
- não se sobreponha às VNets existentes;
- não se sobreponha à rede local conectada por VPN ou ExpressRoute;
- permita criar as sub-redes necessárias;
- seja compatível com os endereços de serviços e pods definidos para o AKS.

Se forem necessários vários blocos:

```hcl
aks_vnet_address_prefixes = [
  "10.20.0.0/16",
  "10.21.0.0/16",
]
```

Novamente, os valores são exemplos de sintaxe, não recomendações para esta infraestrutura.

## 10. Inspecionar a declaração da variável

Exiba a região do `variables.tf` mencionada pelo erro:

```bash
nl -ba variables.tf | sed -n '90,115p'
```

Procure algo semelhante a:

```hcl
variable "aks_vnet_address_prefixes" {
  type = list(string)
}
```

Também localize todos os usos da variável:

```bash
rg -n 'aks_vnet_address_prefixes|aks_vnet_name|portal_data|portal_sql' .
```

Se `rg` não estiver disponível:

```bash
grep -RInE 'aks_vnet_address_prefixes|aks_vnet_name|portal_data|portal_sql' .
```

## 11. Exemplo parcial do `terraform.tfvars`

Após escolher valores reais e válidos, a estrutura deve se parecer com:

```hcl
suffix = "azureshop"

aks_vnet_name = "NOME_REAL_DA_VNET"

aks_vnet_address_prefixes = [
  "CIDR_REAL_E_SEM_SOBREPOSICAO",
]
```

Os marcadores em letras maiúsculas não são valores executáveis. Substitua-os pelos dados confirmados no Azure e no plano de endereçamento.

## 12. Verificar blocos `data` no `main.tf`

Exiba as linhas relevantes:

```bash
nl -ba main.tf | sed -n '1,60p'
```

Confirme em cada bloco:

- `name`;
- `resource_group_name`;
- dependência da assinatura configurada no provider;
- uso correto da variável correspondente.

Não altere o SQL Server ou o banco: eles já foram localizados corretamente pelo plano.

## 13. Sequência de validação após as correções

Entre no diretório:

```bash
cd ~/azureshop/infra/terraform
```

Formate os arquivos:

```bash
terraform fmt -recursive
```

Valide a sintaxe e os tipos:

```bash
terraform validate
```

Gere novamente o plano:

```bash
terraform plan -var-file="terraform.tfvars" -out="tfplan"
```

Examine o plano salvo:

```bash
terraform show tfplan
```

Não execute `terraform apply` enquanto algum recurso consultado por `data` continuar ausente ou enquanto houver dúvidas sobre o bloco CIDR.

## 14. Sobre as alterações de Outputs

O plano mostrou:

```text
portal_resource_group_name
portal_sql_database_name
portal_sql_server_fqdn
```

Esses Outputs apenas registrariam no estado valores de recursos já encontrados. A mensagem informa que essa parte não altera a infraestrutura real. Entretanto, o plano geral falhou e não deve ser aplicado até todos os erros serem resolvidos.

## 15. Ordem recomendada de correção

1. confirmar a assinatura ativa;
2. listar VNets, NSGs e zonas DNS privadas;
3. decidir se cada recurso deveria existir ou ser criado pelo Terraform;
4. corrigir nomes e Resource Groups dos blocos `data`;
5. remover o caractere inválido do `suffix`;
6. definir `aks_vnet_address_prefixes` como lista de CIDRs reais;
7. executar `terraform fmt -recursive`;
8. executar `terraform validate`;
9. executar um novo `terraform plan`;
10. revisar o plano antes de qualquer aplicação.

## 16. Checklist

- [ ] Assinatura `31f0817a-9efc-46d2-a0c2-3c9d85e77619` confirmada.
- [ ] Nome e Resource Group da VNet confirmados.
- [ ] Nome e Resource Group do NSG confirmados.
- [ ] Nome e Resource Group da Private DNS Zone confirmados.
- [ ] Decidido quais recursos são existentes (`data`) e quais devem ser criados (`resource`).
- [ ] `suffix` possui de 3 a 10 caracteres minúsculos alfanuméricos.
- [ ] `aks_vnet_address_prefixes` é uma lista de CIDRs válidos.
- [ ] Sobreposição de rede verificada.
- [ ] `terraform validate` concluído sem erros.
- [ ] Novo plano revisado antes do `apply`.

## 17. Registro da atividade

Foram analisados os erros apresentados pelo `terraform plan`. Identificaram-se três consultas a recursos Azure não encontrados e duas variáveis incompatíveis com as validações do projeto. Este documento apresenta comandos de diagnóstico e caminhos de correção sem presumir nomes ou endereços de rede não fornecidos. Nenhum recurso Azure foi criado, alterado ou removido, e nenhum arquivo do projeto foi modificado diretamente.

## 18. Atualização — segundo `terraform plan`

O segundo plano confirmou que as duas correções de variáveis foram bem-sucedidas:

- o erro de validação do `suffix` não voltou a aparecer;
- o erro de tipo de `aks_vnet_address_prefixes` não voltou a aparecer.

O plano agora reconhece a criação de um Azure Container Registry:

```text
module.container_registry[0].azurerm_container_registry.this
```

Resumo parcial apresentado:

```text
Plan: 1 to add, 0 to change, 0 to destroy.
```

O recurso planejado é:

```text
Nome:           acrimersaoazureshop
SKU:            Basic
Região:         eastus
Resource Group: rg-imersao-arquitetoazure-us
Acesso público: habilitado
Admin local:    desabilitado
```

Esse resultado é somente parcial. Como o Terraform terminou com erros nos blocos `data`, o plano não deve ser considerado pronto para aplicação. Execute um novo plano depois de corrigir as três consultas.

## 19. Erros que ainda permanecem

Continuam ausentes, no Resource Group informado:

```text
Virtual Network:   vnet-imersao-us
NSG:               nsg-snet-aplicacao
Private DNS Zone:  privatelink.database.windows.net
Resource Group:    rg-imersao-arquitetoazure-us
```

Não há evidência suficiente para afirmar se:

- os nomes estão errados;
- os recursos estão em outro Resource Group;
- os recursos ainda não foram criados;
- o código deveria criá-los em vez de consultá-los.

## 20. Coleta obrigatória para decidir a correção

Execute os três comandos abaixo. Eles consultam toda a assinatura, evitando perder recursos que estejam em outro Resource Group.

### 20.1 VNets

```bash
az network vnet list \
  --subscription "31f0817a-9efc-46d2-a0c2-3c9d85e77619" \
  --query '[].{Name:name, ResourceGroup:resourceGroup, Location:location, Prefixes:addressSpace.addressPrefixes}' \
  --output table
```

### 20.2 NSGs

```bash
az network nsg list \
  --subscription "31f0817a-9efc-46d2-a0c2-3c9d85e77619" \
  --query '[].{Name:name, ResourceGroup:resourceGroup, Location:location}' \
  --output table
```

### 20.3 Zonas DNS privadas

```bash
az network private-dns zone list \
  --subscription "31f0817a-9efc-46d2-a0c2-3c9d85e77619" \
  --query '[].{Name:name, ResourceGroup:resourceGroup, Records:numberOfRecordSets}' \
  --output table
```

## 21. Coleta do código para identificar o caminho correto

Exiba os blocos `data` sem mostrar o restante do projeto:

```bash
cd ~/azureshop/infra/terraform
nl -ba main.tf | sed -n '1,60p'
```

Localize módulos ou recursos que possam criar VNet, NSG ou DNS:

```bash
rg -n 'azurerm_virtual_network|azurerm_network_security_group|azurerm_private_dns_zone|module.*(network|vnet|dns)' .
```

Se `rg` não estiver instalado:

```bash
grep -RInE 'azurerm_virtual_network|azurerm_network_security_group|azurerm_private_dns_zone|module.*(network|vnet|dns)' .
```

## 22. Matriz de decisão

| Resultado da consulta no Azure | Ação correta |
|---|---|
| Recurso existe com o mesmo nome e mesmo Resource Group | Verificar assinatura, provider/alias e permissões |
| Recurso existe com outro nome | Corrigir o nome informado ao bloco `data` |
| Recurso existe em outro Resource Group | Corrigir `resource_group_name` no bloco `data` |
| Recurso não existe, mas é pré-requisito externo | Criá-lo pela camada responsável e executar novo plano |
| Recurso não existe e este projeto deve gerenciá-lo | Implementar bloco `resource` ou módulo correspondente |
| Recurso será criado por um módulo no mesmo projeto | Referenciar diretamente o output/recurso do módulo; não consultá-lo antecipadamente com `data` |

## 23. Caso a rede deva ser criada pelo mesmo projeto

Se a análise do código confirmar que o próprio projeto deve criar a VNet, o NSG e a zona DNS, não basta alterar `data` para `resource`. Será necessário definir, conforme o desenho aprovado:

- VNet e endereço CIDR real;
- sub-redes e seus CIDRs;
- NSG e regras de entrada/saída;
- associação do NSG à sub-rede;
- Private DNS Zone do SQL;
- vínculo da zona DNS com a VNet;
- Private Endpoint do SQL, se fizer parte da arquitetura;
- dependências e referências entre os recursos;
- outputs consumidos pelo AKS ou por outros módulos.

Os blocos que usam os dados atuais também precisarão trocar referências, por exemplo, de:

```hcl
data.azurerm_virtual_network.portal.id
```

para uma referência ao recurso ou ao output real, como:

```hcl
azurerm_virtual_network.this.id
```

ou:

```hcl
module.network.vnet_id
```

Os nomes acima são exemplos estruturais; utilize os nomes reais definidos no projeto.

## 24. Próximo ponto de controle

Antes de editar `main.tf`, reúna:

1. saída das três listagens do Azure CLI;
2. linhas 1 a 60 do `main.tf`;
3. resultado da busca por recursos e módulos de rede;
4. confirmação se VNet, NSG e DNS deveriam existir previamente ou ser criados por este projeto.

Com essas informações é possível indicar a alteração exata, sem inventar nomes, Resource Groups ou blocos CIDR.

## 25. Atualização — recursos de rede identificados

A assinatura ativa foi confirmada:

```text
Nome:            Azure subscription 1
Subscription ID: 31f0817a-9efc-46d2-a0c2-3c9d85e77619
Usuário:         live.com#crfjunior65@outlook.com
```

Portanto, os erros não são causados pela seleção de uma assinatura incorreta.

### 25.1 VNet confirmada

O Terraform procurava:

```text
vnet-imersao-us
```

O recurso existente no Azure é:

```text
Nome:           vnet-imerssao-us
Resource Group: rg-imersao-arquitetoazure-us
Região:         eastus
```

A diferença está na palavra `imerssao`: o recurso real possui dois caracteres `s` consecutivos.

No `terraform.tfvars`, altere:

```hcl
aks_vnet_name = "vnet-imersao-us"
```

para:

```hcl
aks_vnet_name = "vnet-imerssao-us"
```

Antes de alterar, confirme se o bloco `data.azurerm_virtual_network.portal` realmente usa `var.aks_vnet_name`:

```bash
nl -ba main.tf | sed -n '14,25p'
```

### 25.2 NSG confirmado

O Terraform procurava:

```text
nsg-snet-aplicacao
```

Esse nome pertence ao ambiente `brazilsouth`, no Resource Group sem o sufixo `-us`. Para o ambiente atual de `eastus`, o recurso correto é:

```text
Nome:           nsg-snet-aplicacao-us
Resource Group: rg-imersao-arquitetoazure-us
Região:         eastus
```

Localize onde o nome é definido:

```bash
rg -n 'nsg-snet-aplicacao|portal_data' main.tf variables.tf terraform.tfvars '*.tf'
```

Uma forma mais segura, caso a expansão do curinga pelo shell cause problema, é:

```bash
rg -n 'nsg-snet-aplicacao|portal_data' .
```

Atualize o valor de:

```text
nsg-snet-aplicacao
```

para:

```text
nsg-snet-aplicacao-us
```

Se o nome estiver escrito diretamente no `main.tf`, a correção típica será:

```hcl
data "azurerm_network_security_group" "portal_data" {
  name                = "nsg-snet-aplicacao-us"
  resource_group_name = data.azurerm_resource_group.portal.name
}
```

Se o bloco usar uma variável, altere somente o valor correspondente no `terraform.tfvars` e preserve o uso da variável no `main.tf`.

## 26. Private DNS Zone ainda pendente

Ainda não foi fornecido o resultado da listagem de zonas privadas. Execute:

```bash
az network private-dns zone list \
  --subscription "31f0817a-9efc-46d2-a0c2-3c9d85e77619" \
  --query '[].{Name:name, ResourceGroup:resourceGroup, Records:numberOfRecordSets}' \
  --output table
```

Há três resultados possíveis:

1. `privatelink.database.windows.net` existe em `rg-imersao-arquitetoazure-us`: o nome está correto, e será necessário investigar provider/permissão;
2. a zona existe em outro Resource Group: ajuste somente o `resource_group_name` do bloco `data.azurerm_private_dns_zone.portal_sql`;
3. a zona não existe: confirme se deve ser criada por este projeto ou por uma camada compartilhada de rede.

## 27. Aplicar as duas correções confirmadas

Abra o arquivo de variáveis:

```bash
cd ~/azureshop/infra/terraform
nano terraform.tfvars
```

Corrija a VNet para:

```hcl
aks_vnet_name = "vnet-imerssao-us"
```

Corrija a variável do NSG, se existir, para:

```hcl
NOME_REAL_DA_VARIAVEL_NSG = "nsg-snet-aplicacao-us"
```

O identificador `NOME_REAL_DA_VARIAVEL_NSG` é um marcador. Não o copie literalmente. Descubra o nome real com:

```bash
rg -n 'nsg-snet-aplicacao|network_security_group' .
```

Se o NSG estiver fixo no `main.tf`, altere o texto diretamente nesse bloco.

## 28. Validação intermediária

Depois das duas correções:

```bash
terraform fmt -recursive
terraform validate
terraform plan
```

Resultado esperado nesta etapa:

- o erro da VNet deve desaparecer;
- o erro do NSG deve desaparecer;
- o erro da Private DNS Zone poderá permanecer até sua localização ou criação ser resolvida;
- o ACR continuará aparecendo como recurso a criar, caso nenhuma outra condição do projeto o desabilite.

Não execute `terraform apply` enquanto o plano terminar com erro.

## 29. Atualização — VNet e NSG corrigidos

O novo resultado confirmou que as correções foram aplicadas corretamente.

Recursos encontrados:

```text
VNet:    vnet-imerssao-us
NSG:     nsg-snet-aplicacao-us
Subnet:  snet-dados
SQL:     srvsql1965 / sqlsrvazure
```

O comando abaixo também foi concluído com sucesso:

```bash
terraform validate
```

Resultado:

```text
Success! The configuration is valid.
```

Isso confirma que a sintaxe, os tipos das variáveis e as referências estáticas da configuração são válidos. O `validate` não confirma que todos os recursos consultados existem no Azure; essa consulta acontece durante o `plan`.

## 30. Diagnóstico definitivo da Private DNS Zone

O comando de listagem não apresentou nenhuma linha:

```bash
az network private-dns zone list \
  --subscription "31f0817a-9efc-46d2-a0c2-3c9d85e77619" \
  --query '[].{Name:name, ResourceGroup:resourceGroup, Records:numberOfRecordSets}' \
  --output table
```

Como o Azure CLI voltou ao prompt sem erro e sem resultados, a assinatura não possui uma Private DNS Zone visível para esse usuário. Consequentemente, este bloco não pode funcionar atualmente:

```hcl
data "azurerm_private_dns_zone" "portal_sql" {
  name                = "privatelink.database.windows.net"
  resource_group_name = data.azurerm_resource_group.portal.name
}
```

O bloco `data` exige que a zona já exista.

## 31. Solução recomendada — gerenciar a zona com Terraform

Se este projeto é responsável pela rede privada do SQL, substitua o bloco `data` por um recurso gerenciado:

```hcl
resource "azurerm_private_dns_zone" "portal_sql" {
  name                = "privatelink.database.windows.net"
  resource_group_name = data.azurerm_resource_group.portal.name

  tags = {
    company = "highexpert"
    managed = "terraform"
    project = "azureshop"
  }
}
```

Crie também o vínculo da zona com a VNet para que recursos dentro da rede consigam resolver o nome privado do SQL:

```hcl
resource "azurerm_private_dns_zone_virtual_network_link" "portal_sql" {
  name                  = "link-sql-vnet-imerssao-us"
  resource_group_name   = data.azurerm_resource_group.portal.name
  private_dns_zone_name = azurerm_private_dns_zone.portal_sql.name
  virtual_network_id    = data.azurerm_virtual_network.portal.id
  registration_enabled  = false

  tags = {
    company = "highexpert"
    managed = "terraform"
    project = "azureshop"
  }
}
```

Para uma zona de Private Link do Azure SQL, `registration_enabled = false` é apropriado: a zona é usada para resolver registros privados do serviço, não para registrar automaticamente máquinas virtuais da VNet.

## 32. Atualizar referências após trocar `data` por `resource`

Localize todas as referências atuais:

```bash
rg -n 'data\.azurerm_private_dns_zone\.portal_sql|portal_sql' .
```

Troque referências como:

```hcl
data.azurerm_private_dns_zone.portal_sql.id
```

por:

```hcl
azurerm_private_dns_zone.portal_sql.id
```

Da mesma forma:

```hcl
data.azurerm_private_dns_zone.portal_sql.name
```

deve se tornar:

```hcl
azurerm_private_dns_zone.portal_sql.name
```

Faça essa alteração somente se a zona realmente passar a ser criada pelo Terraform.

## 33. Alternativa — zona como pré-requisito externo

Se uma equipe ou camada de conectividade deve administrar a zona, mantenha o bloco `data`. Nesse caso, a zona precisa ser criada fora deste código antes do `terraform plan`.

Exemplo de criação manual pelo Azure CLI:

```bash
az network private-dns zone create \
  --subscription "31f0817a-9efc-46d2-a0c2-3c9d85e77619" \
  --resource-group "rg-imersao-arquitetoazure-us" \
  --name "privatelink.database.windows.net"
```

Depois, seria necessário criar o vínculo com a VNet:

```bash
az network private-dns link vnet create \
  --subscription "31f0817a-9efc-46d2-a0c2-3c9d85e77619" \
  --resource-group "rg-imersao-arquitetoazure-us" \
  --zone-name "privatelink.database.windows.net" \
  --name "link-sql-vnet-imerssao-us" \
  --virtual-network "vnet-imerssao-us" \
  --registration-enabled false
```

Não execute esses comandos se o Terraform será o proprietário da zona. Escolha apenas uma abordagem para evitar recursos sem gerenciamento ou conflitos posteriores.

## 34. Conferência antes da edição

Para indicar a modificação exata, examine o bloco e seus consumidores:

```bash
nl -ba main.tf | sed -n '40,60p'
rg -n 'portal_sql|private_dns_zone' .
```

Se houver um módulo de Private Endpoint, verifique se ele espera uma lista de IDs:

```hcl
private_dns_zone_ids = [azurerm_private_dns_zone.portal_sql.id]
```

O nome exato do argumento depende do módulo usado no projeto.

## 35. Validação depois da implementação Terraform

Execute:

```bash
terraform fmt -recursive
terraform validate
terraform plan -out="tfplan"
terraform show tfplan
```

O plano esperado deve incluir, além do ACR:

- criação de `azurerm_private_dns_zone.portal_sql`;
- criação de `azurerm_private_dns_zone_virtual_network_link.portal_sql`;
- outros recursos habilitados pelo projeto, se houver;
- nenhuma mensagem `was not found` para a zona DNS.

Revise especialmente:

- Resource Group;
- VNet vinculada;
- nome exato da zona;
- regras de acesso público do ACR e do SQL;
- recursos a destruir, que devem permanecer em zero nesta etapa.

Somente depois de obter um plano completo e sem erros deve-se considerar o `terraform apply`.

## 36. Atualização — referência antiga na linha 120

Depois que `data.azurerm_private_dns_zone.portal_sql` foi substituído por `resource "azurerm_private_dns_zone" "portal_sql"`, permaneceu uma referência ao tipo antigo no vínculo existente:

```hcl
resource "azurerm_private_dns_zone_virtual_network_link" "aks" {
  private_dns_zone_name = data.azurerm_private_dns_zone.portal_sql.name
}
```

Como o bloco `data` não existe mais, o Terraform retornou:

```text
Reference to undeclared resource
A data resource "azurerm_private_dns_zone" "portal_sql" has not been declared
```

Corrija a linha para referenciar o novo recurso:

```hcl
resource "azurerm_private_dns_zone_virtual_network_link" "aks" {
  private_dns_zone_name = azurerm_private_dns_zone.portal_sql.name
}
```

Não é necessário mudar o nome local `aks` do vínculo para solucionar esse erro. Também não crie um segundo `azurerm_private_dns_zone_virtual_network_link` se esse bloco existente já vincula a mesma zona à mesma VNet.

## 37. Verificar todas as referências antigas

Execute:

```bash
rg -n 'data\.azurerm_private_dns_zone\.portal_sql' .
```

O comando não deve retornar nenhuma ocorrência depois das correções.

Confira todas as referências à zona:

```bash
rg -n 'azurerm_private_dns_zone\.portal_sql|private_dns_zone_name|private_dns_zone_ids' .
```

Referências válidas ao recurso criado pelo Terraform começam com:

```hcl
azurerm_private_dns_zone.portal_sql
```

## 38. Por que o arquivo `tfplan` não existe

O comando:

```bash
terraform plan -out=tfplan
```

falhou durante a validação da referência. Como o plano não foi concluído, o Terraform não criou `tfplan`. Por isso, o comando seguinte apresentou:

```text
Failed to read the given file as a state or plan file
open tfplan: no such file or directory
```

Esse segundo erro não representa um problema adicional no estado. Ele é consequência direta da falha do `terraform plan`.

## 39. Execução segura após a correção

Execute primeiro cada fase separadamente:

```bash
terraform fmt -recursive
terraform validate
terraform plan -out=tfplan
```

Somente se o `terraform plan` terminar com sucesso, execute:

```bash
terraform show tfplan
```

Também é possível condicionar a exibição ao sucesso do plano:

```bash
terraform plan -out=tfplan && terraform show tfplan
```

O operador `&&` executa o segundo comando somente se o primeiro terminar sem erro.

## 40. Correção direta com editor

Abra o arquivo diretamente próximo à linha indicada:

```bash
nano +120 main.tf
```

Altere somente:

```hcl
data.azurerm_private_dns_zone.portal_sql.name
```

para:

```hcl
azurerm_private_dns_zone.portal_sql.name
```

Salve, feche e execute a sequência de validação da seção anterior.

## 41. Atualização — aplicação parcial e conflito no nome do ACR

O comando abaixo foi executado:

```bash
terraform apply tfplan
```

A aplicação teve resultado parcial:

- a Private DNS Zone `privatelink.database.windows.net` foi criada com sucesso;
- a criação do Azure Container Registry falhou com HTTP `409 Conflict`;
- o Terraform não desfaz automaticamente a zona criada quando outro recurso falha.

O erro recebido foi:

```text
AlreadyInUse: The registry DNS name acrimersaoazureshop.azurecr.io is already in use.
```

Nomes de Azure Container Registry têm escopo global. Segundo as regras do Azure, devem possuir de 5 a 50 caracteres alfanuméricos. Portanto, não aceitam hífen, sublinhado ou ponto no nome do recurso.

## 42. Confirmar o recurso registrado no estado

Verifique se a zona foi registrada no estado Terraform:

```bash
terraform state list | sort
```

Consulte especificamente:

```bash
terraform state show azurerm_private_dns_zone.portal_sql
```

Verifique também o vínculo:

```bash
terraform state list | rg 'private_dns_zone|virtual_network_link|container_registry'
```

Não remova nem recrie a zona. O próximo plano deve reconhecê-la como existente e gerenciada no estado.

## 43. Verificar se o ACR conflitante pertence à assinatura

Liste os registros acessíveis na assinatura:

```bash
az acr list \
  --subscription "31f0817a-9efc-46d2-a0c2-3c9d85e77619" \
  --query '[].{Name:name, ResourceGroup:resourceGroup, Location:location, LoginServer:loginServer, Id:id}' \
  --output table
```

Consulte especificamente o nome:

```bash
az acr list \
  --subscription "31f0817a-9efc-46d2-a0c2-3c9d85e77619" \
  --query "[?name=='acrimersaoazureshop'].{Name:name, ResourceGroup:resourceGroup, Location:location, Id:id}" \
  --output table
```

Interpretação:

- se o resultado estiver vazio, o nome provavelmente pertence a outro cliente/assinatura e deve ser trocado;
- se o registro aparecer, ele pertence a uma assinatura acessível e pode ser candidato a importação, após confirmar que é exatamente o recurso que este projeto deve gerenciar.

## 44. Verificar disponibilidade de um novo nome

O Azure CLI fornece o comando oficial:

```bash
az acr check-name --name NOME_CANDIDATO
```

Exemplo de teste, sem garantia prévia de disponibilidade:

```bash
az acr check-name --name acrimersaoazureshop1965 --output table
```

Para mostrar campos importantes:

```bash
az acr check-name \
  --name acrimersaoazureshop1965 \
  --query '{Available:nameAvailable, Reason:reason, Message:message}' \
  --output table
```

O nome só deve ser usado quando `Available` retornar `true`.

O candidato precisa:

- ter de 5 a 50 caracteres;
- conter somente letras e números;
- ser globalmente exclusivo;
- permanecer estável, pois fará parte do endereço `NOME.azurecr.io`.

## 45. Localizar a formação do nome no Terraform

O nome pode ser montado pelo módulo a partir de `prefix`, `suffix`, projeto ou ambiente. Localize sua origem:

```bash
rg -n 'acrimersaoazureshop|container_registry|acr_name|registry_name|suffix|prefix' .
```

Inspecione a chamada do módulo e o recurso:

```bash
nl -ba modules/container-registry/main.tf | sed -n '1,40p'
```

```bash
rg -n -C 8 'module "container_registry"' .
```

Altere preferencialmente a variável de entrada no `terraform.tfvars` ou na chamada do módulo. Evite fixar um nome diretamente dentro do módulo se ele foi projetado para ser reutilizável.

## 46. Caminho A — usar um novo nome disponível

Depois de encontrar um candidato disponível:

1. altere a variável que gera o nome;
2. formate e valide;
3. gere um novo plano;
4. confira que a zona será mantida e que somente os recursos pendentes serão criados.

```bash
terraform fmt -recursive
terraform validate
terraform plan -out=tfplan-novo
terraform show tfplan-novo
```

Não reutilize o `tfplan` anterior. Planos salvos representam a configuração e o estado no momento em que foram gerados; após uma aplicação parcial e uma mudança de nome, gere um novo arquivo.

Se o plano estiver correto:

```bash
terraform apply tfplan-novo
```

## 47. Caminho B — importar um ACR existente

Use este caminho somente se `az acr list` confirmar que o registro pertence à assinatura correta e se ele deve ser administrado por este projeto.

Obtenha o ID completo:

```bash
az acr show \
  --subscription "31f0817a-9efc-46d2-a0c2-3c9d85e77619" \
  --name "acrimersaoazureshop" \
  --query id \
  --output tsv
```

Antes de importar, confira o endereço Terraform do recurso:

```text
module.container_registry[0].azurerm_container_registry.this
```

Formato do comando:

```bash
terraform import \
  'module.container_registry[0].azurerm_container_registry.this' \
  'ID_COMPLETO_RETORNADO_PELO_AZURE'
```

Não use `ID_COMPLETO_RETORNADO_PELO_AZURE` literalmente. Copie o ID real retornado por `az acr show`.

Depois:

```bash
terraform plan
```

Revise possíveis alterações no ACR importado. O código pode tentar modificar SKU, acesso público, políticas, tags ou outras propriedades para fazê-las coincidir com a configuração Terraform.

## 48. Verificação final após o ACR

```bash
terraform state list | sort
terraform plan
```

O resultado final esperado é:

```text
No changes. Your infrastructure matches the configuration.
```

Se ainda existirem recursos para criar, revise o plano completo antes de aplicar. A ausência de recursos para destruir continua sendo um ponto obrigatório de conferência.
