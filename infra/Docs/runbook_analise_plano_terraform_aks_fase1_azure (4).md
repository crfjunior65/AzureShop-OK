# Runbook — Análise, validação e aplicação segura do AKS Fase 1

## 1. Objetivo

Analisar o plano Terraform salvo em `tfplan-fase1`, validar os pré-requisitos do Azure e executar com segurança a criação de:

- um cluster Azure Kubernetes Service (AKS);
- uma atribuição da função `AcrPull` para que o AKS baixe imagens do Azure Container Registry existente.

Ambiente identificado:

```text
Assinatura:     31f0817a-9efc-46d2-a0c2-3c9d85e77619
Resource Group: rg-imersao-arquitetoazure-us
Região:         eastus
AKS:            aks-imersao-azureshop
ACR:            acrimersaoazureshop1965
ACR endpoint:   acrimersaoazureshop1965.azurecr.io
```

## 2. Diagnóstico principal

O plano está sintaticamente válido e não contém erro Terraform. Ele propõe:

```text
Plan: 2 to add, 0 to change, 0 to destroy.
```

Recursos:

```text
module.aks[0].azurerm_kubernetes_cluster.this
azurerm_role_assignment.aks_acr_pull[0]
```

Não há alteração nem destruição de recursos existentes.

O plano pode ser aplicado somente depois das validações de:

- assinatura e identidade autenticada;
- permissões para criar AKS e atribuir função RBAC;
- registro dos provedores Azure;
- disponibilidade e cota da VM `Standard_B4ms` em `eastus`;
- arquitetura de rede desejada;
- custo do nó e recursos complementares;
- valor do principal usado na função `AcrPull`;
- disponibilidade do nome e versão do AKS.

## 3. O que será criado

### 3.1 Cluster AKS

Configuração observada:

```text
Nome:                         aks-imersao-azureshop
Região:                       eastus
Resource Group:               rg-imersao-arquitetoazure-us
Plano do AKS:                 Free
Cluster privado:              não
Quantidade inicial de nós:    1
Tamanho da VM:                Standard_B4ms
Node pool:                    system
Disco:                        Managed
Plugin de rede:               Azure CNI
Saída para internet:           Load Balancer
Load Balancer:                Standard
Identidade:                   SystemAssigned
OIDC:                         habilitado
Workload Identity:            habilitado
RBAC do Kubernetes:           habilitado
Secrets Store CSI/Key Vault:  habilitado
Rotação de segredo:           habilitada a cada 2 minutos
```

### 3.2 Permissão do AKS no ACR

Será criada uma atribuição:

```text
Função: AcrPull
Escopo: ACR acrimersaoazureshop1965
```

Essa função permite baixar imagens. Ela não permite enviar imagens para o ACR.

## 4. Pontos de atenção encontrados

### 4.1 O plano Free não torna os nós gratuitos

O `sku_tier = "Free"` refere-se ao gerenciamento do cluster. A VM `Standard_B4ms`, discos, IP público, Load Balancer e tráfego podem gerar custos.

Antes do `apply`, confirme orçamento e alertas de custo.

### 4.2 Cluster com um nó

Um nó é adequado para laboratório e estudo, mas não fornece alta disponibilidade. Manutenção ou falha do nó pode interromper todas as aplicações.

### 4.3 Cluster público

O plano mostra:

```hcl
private_cluster_enabled = false
```

O endpoint da API do Kubernetes será público, embora continue protegido por autenticação e autorização. Para produção, revise restrições de IP autorizadas ou adoção de cluster privado.

### 4.4 Rede gerenciada pelo AKS

No trecho fornecido, o `default_node_pool` não apresenta `vnet_subnet_id`. Isso normalmente significa que o AKS criará ou utilizará rede gerenciada em seu Node Resource Group, em vez de colocar os nós diretamente na VNet existente `vnet-imerssao-us`.

Se a arquitetura pretende usar uma sub-rede própria, corrija o módulo antes da aplicação. Se o desenho prevê rede gerenciada e peering em fase posterior, o plano é coerente.

### 4.5 Versão do Kubernetes não fixada

O plano mostra `kubernetes_version = known after apply`, indicando que o Azure escolherá uma versão padrão suportada. Isso facilita laboratório, mas reduz previsibilidade. Para ambientes controlados, consulte versões suportadas e fixe uma versão aprovada.

### 4.6 Função AcrPull

O `principal_id` é conhecido somente depois da criação do cluster. Isso é normal se o recurso usa a identidade do kubelet exportada pelo módulo.

O principal correto para baixar imagens normalmente é a identidade do kubelet, não a identidade do plano de controle. Verifique o código antes de aplicar.

### 4.7 Permissão para criar role assignment

Além de criar o AKS, a identidade que executa Terraform precisa poder criar atribuições RBAC no escopo do ACR. Ter permissão de Contributor, isoladamente, pode não ser suficiente para atribuir funções.

### 4.8 Rotação do Key Vault a cada dois minutos

O intervalo `2m` é muito frequente. Pode ser intencional para demonstração. Para uso contínuo, revise conforme os requisitos de atualização de segredos e operação.

## 5. Não aplicar o plano imediatamente

Um plano salvo executa exatamente as decisões registradas naquele arquivo. Se qualquer variável, módulo, estado ou configuração for alterado, descarte o plano antigo e gere outro.

Não aplique enquanto os testes das seções seguintes não forem concluídos.

## 6. Confirmar diretório e assinatura

```bash
cd ~/azureshop/infra/terraform
pwd
```

Confirme a assinatura:

```bash
az account show \
  --query '{Name:name, SubscriptionId:id, TenantId:tenantId, User:user.name}' \
  --output table
```

Resultado esperado para o ID:

```text
31f0817a-9efc-46d2-a0c2-3c9d85e77619
```

Se necessário:

```bash
az account set \
  --subscription "31f0817a-9efc-46d2-a0c2-3c9d85e77619"
```

## 7. Verificar provedores do Azure

```bash
az provider show \
  --namespace Microsoft.ContainerService \
  --query registrationState \
  --output tsv

az provider show \
  --namespace Microsoft.Compute \
  --query registrationState \
  --output tsv

az provider show \
  --namespace Microsoft.Network \
  --query registrationState \
  --output tsv

az provider show \
  --namespace Microsoft.Authorization \
  --query registrationState \
  --output tsv
```

Todos devem retornar:

```text
Registered
```

Se algum provedor necessário não estiver registrado e a conta tiver permissão:

```bash
az provider register --namespace Microsoft.ContainerService
```

Repita somente para o namespace que estiver pendente e aguarde `Registered`.

## 8. Verificar disponibilidade da VM

Consulte o SKU em `eastus`:

```bash
az vm list-skus \
  --location eastus \
  --size Standard_B4ms \
  --all \
  --query '[].{Name:name, Zones:locationInfo[0].zones, Restrictions:restrictions}' \
  --output jsonc
```

Analise `Restrictions`. Se houver restrição para a assinatura ou região, a criação do node pool poderá falhar.

Confirme também que o SKU é listado:

```bash
az vm list-sizes \
  --location eastus \
  --query "[?name=='Standard_B4ms'].{Name:name, Cores:numberOfCores, MemoryMB:memoryInMb}" \
  --output table
```

Resultado esperado:

```text
Standard_B4ms
4 vCPUs
16384 MB de memória
```

## 9. Verificar cotas de CPU

Liste as cotas da região:

```bash
az vm list-usage \
  --location eastus \
  --query '[].{Name:localName, Current:currentValue, Limit:limit}' \
  --output table
```

Procure:

- Total Regional vCPUs;
- família de CPUs correspondente ao SKU B-series/Bsv2, conforme retornado pelo Azure;
- limite disponível de pelo menos quatro vCPUs para um nó `Standard_B4ms`.

Se a cota for insuficiente, solicite aumento, escolha outro SKU autorizado ou outra região antes de aplicar.

## 10. Verificar versões do Kubernetes

```bash
az aks get-versions \
  --location eastus \
  --output table
```

Confirme as versões suportadas na região. Se desejar previsibilidade, acrescente ao módulo uma variável de versão e configure uma versão suportada.

Não fixe uma versão que não apareça como disponível em `eastus`.

## 11. Confirmar que o AKS ainda não existe

```bash
az aks list \
  --subscription "31f0817a-9efc-46d2-a0c2-3c9d85e77619" \
  --query "[?name=='aks-imersao-azureshop'].{Name:name, ResourceGroup:resourceGroup, Location:location, ProvisioningState:provisioningState}" \
  --output table
```

O resultado deve estar vazio. Se o cluster existir, não aplique o plano de criação antes de decidir se deve ser importado.

## 12. Confirmar o ACR e seu estado

```bash
az acr show \
  --subscription "31f0817a-9efc-46d2-a0c2-3c9d85e77619" \
  --resource-group "rg-imersao-arquitetoazure-us" \
  --name "acrimersaoazureshop1965" \
  --query '{Name:name, Id:id, LoginServer:loginServer, Sku:sku.name}' \
  --output table
```

Confirme no estado Terraform:

```bash
terraform state show \
  'module.container_registry[0].azurerm_container_registry.this'
```

## 13. Verificar o principal usado no AcrPull

Localize o recurso:

```bash
rg -n -C 10 'resource "azurerm_role_assignment" "aks_acr_pull"' .
```

Procure o argumento:

```hcl
principal_id = ...
```

O módulo AKS deve expor a identidade adequada do kubelet, com referência semelhante a:

```hcl
principal_id = module.aks[0].kubelet_object_id
```

O nome do output pode variar. Examine:

```bash
rg -n 'kubelet|principal_id|object_id' modules/aks main.tf
```

Se o código usa a identidade do plano de controle, revise antes da aplicação.

## 14. Verificar permissão para criar a atribuição RBAC

Obtenha o usuário autenticado:

```bash
az ad signed-in-user show \
  --query '{DisplayName:displayName, UserPrincipalName:userPrincipalName, ObjectId:id}' \
  --output table
```

Liste atribuições no escopo da assinatura:

```bash
USER_OBJECT_ID="$(az ad signed-in-user show --query id --output tsv)"

az role assignment list \
  --assignee "$USER_OBJECT_ID" \
  --scope "/subscriptions/31f0817a-9efc-46d2-a0c2-3c9d85e77619" \
  --include-inherited \
  --query '[].{Role:roleDefinitionName, Scope:scope}' \
  --output table
```

A identidade precisa ter permissão para `Microsoft.Authorization/roleAssignments/write` no escopo aplicável, diretamente ou por uma função/política equivalente. Se não tiver, o AKS pode ser criado e a atribuição `AcrPull` falhar, resultando em aplicação parcial.

## 15. Confirmar a arquitetura de rede

Inspecione o módulo:

```bash
rg -n -C 12 'default_node_pool|vnet_subnet_id|network_profile' modules/aks main.tf
```

### Opção A — rede gerenciada pelo AKS

Continue com o plano atual se o projeto prevê:

- VNet criada/gerenciada pelo AKS no Node Resource Group;
- peering com `vnet-imerssao-us` em uma fase posterior;
- vínculo de DNS privado criado depois que a VNet do AKS existir.

### Opção B — sub-rede própria

Pare e altere o código se o AKS precisa nascer dentro de uma sub-rede previamente planejada. Nesse caso, o módulo deve receber o ID da sub-rede e configurar `vnet_subnet_id` no node pool.

Não use a sub-rede de dados automaticamente. AKS requer planejamento de endereços, permissões e capacidade de IPs.

## 16. Revisar custos e segurança

Antes de aplicar, confirme:

- custo mensal estimado do `Standard_B4ms`;
- custo de disco gerenciado;
- IP público e Load Balancer Standard;
- tráfego de saída;
- política de desligamento ou destruição do laboratório;
- exposição pública do API Server;
- ausência de alta disponibilidade com somente um nó.

Para produção, não aprove esta configuração sem revisão de arquitetura, disponibilidade, monitoramento, backups, políticas e segurança.

## 17. Regenerar o plano após qualquer alteração

Se alguma configuração for alterada, preserve o plano antigo:

```bash
if [ -f tfplan-fase1 ]; then
  mv tfplan-fase1 tfplan-fase1.NAO-APLICAR
fi
```

Depois:

```bash
terraform fmt -recursive
terraform validate
terraform plan -out=tfplan-fase1-revisado
terraform show tfplan-fase1-revisado
```

Confirme:

```text
Plan: 2 to add, 0 to change, 0 to destroy.
```

E confirme os dois endereços:

```text
module.aks[0].azurerm_kubernetes_cluster.this
azurerm_role_assignment.aks_acr_pull[0]
```

## 18. Aplicar o plano

Somente depois de concluir as validações:

```bash
terraform apply tfplan-fase1
```

Se um plano revisado foi gerado, aplique o nome revisado:

```bash
terraform apply tfplan-fase1-revisado
```

Não execute `terraform apply` sem informar o arquivo correto, para não gerar um plano diferente no momento da aplicação.

## 19. Monitorar a criação

Em outro terminal, acompanhe operações do Resource Group:

```bash
az deployment operation group list \
  --resource-group "rg-imersao-arquitetoazure-us" \
  --name "NOME_DA_IMPLANTACAO" \
  --output table
```

Como o provider Terraform pode usar chamadas diretas em vez de um deployment nomeado, o comando acima pode não apresentar uma implantação correspondente. Como alternativa, acompanhe o cluster:

```bash
az aks show \
  --resource-group "rg-imersao-arquitetoazure-us" \
  --name "aks-imersao-azureshop" \
  --query '{Name:name, State:provisioningState, PowerState:powerState.code, NodeResourceGroup:nodeResourceGroup}' \
  --output table
```

## 20. Tratamento de falha parcial

Se o AKS for criado e o `AcrPull` falhar:

1. não execute `terraform destroy` automaticamente;
2. execute `terraform state list`;
3. consulte o AKS no Azure;
4. corrija a permissão RBAC;
5. gere um novo `terraform plan`;
6. aplique somente a atribuição pendente pelo plano normal.

Comandos:

```bash
terraform state list | sort

az aks show \
  --resource-group "rg-imersao-arquitetoazure-us" \
  --name "aks-imersao-azureshop" \
  --output table

terraform plan
```

## 21. Validação pós-implantação

### 21.1 Confirmar convergência

```bash
terraform plan
```

Resultado desejado:

```text
No changes. Your infrastructure matches the configuration.
```

### 21.2 Conferir o estado

```bash
terraform state list | sort
```

Deve incluir:

```text
module.aks[0].azurerm_kubernetes_cluster.this
azurerm_role_assignment.aks_acr_pull[0]
```

### 21.3 Obter credenciais

```bash
az aks get-credentials \
  --resource-group "rg-imersao-arquitetoazure-us" \
  --name "aks-imersao-azureshop"
```

Para evitar sobrescrever silenciosamente contexto existente, confira antes:

```bash
kubectl config get-contexts
```

Se o contexto já existir e a intenção for atualizá-lo:

```bash
az aks get-credentials \
  --resource-group "rg-imersao-arquitetoazure-us" \
  --name "aks-imersao-azureshop" \
  --overwrite-existing
```

### 21.4 Testar o cluster

```bash
kubectl cluster-info
kubectl get nodes -o wide
kubectl get pods --all-namespaces
```

Resultado esperado:

- um nó `Ready`;
- pods de sistema em `Running` ou concluindo inicialização;
- endpoint do cluster acessível.

### 21.5 Validar identidade e ACR

```bash
az aks show \
  --resource-group "rg-imersao-arquitetoazure-us" \
  --name "aks-imersao-azureshop" \
  --query '{ProvisioningState:provisioningState, KubernetesVersion:kubernetesVersion, NodeResourceGroup:nodeResourceGroup, KubeletObjectId:identityProfile.kubeletidentity.objectId}' \
  --output table
```

Capture a identidade do kubelet:

```bash
KUBELET_OBJECT_ID="$(az aks show \
  --resource-group 'rg-imersao-arquitetoazure-us' \
  --name 'aks-imersao-azureshop' \
  --query 'identityProfile.kubeletidentity.objectId' \
  --output tsv)"
```

Confira a função no ACR:

```bash
ACR_ID="$(az acr show \
  --resource-group 'rg-imersao-arquitetoazure-us' \
  --name 'acrimersaoazureshop1965' \
  --query id \
  --output tsv)"

az role assignment list \
  --assignee "$KUBELET_OBJECT_ID" \
  --scope "$ACR_ID" \
  --query '[].{Role:roleDefinitionName, PrincipalId:principalId, Scope:scope}' \
  --output table
```

Deve aparecer `AcrPull`.

## 22. Teste funcional de download de imagem

Depois de enviar uma imagem ao ACR, crie um manifesto de teste ou use uma imagem existente no registro.

Exemplo estrutural:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: teste-acr
spec:
  replicas: 1
  selector:
    matchLabels:
      app: teste-acr
  template:
    metadata:
      labels:
        app: teste-acr
    spec:
      containers:
        - name: app
          image: acrimersaoazureshop1965.azurecr.io/REPOSITORIO:TAG
```

Substitua `REPOSITORIO:TAG` por uma imagem real do ACR.

Depois:

```bash
kubectl apply -f teste-acr.yaml
kubectl get pods -w
kubectl describe pod -l app=teste-acr
```

Se aparecer `ImagePullBackOff`, verifique:

- nome e tag da imagem;
- login server correto;
- atribuição `AcrPull` para a identidade do kubelet;
- propagação do RBAC, que pode levar alguns minutos;
- conectividade de saída do cluster.

## 23. Comandos de diagnóstico em caso de falha

### Erro de cota

```bash
az vm list-usage --location eastus --output table
```

### SKU indisponível

```bash
az vm list-skus \
  --location eastus \
  --size Standard_B4ms \
  --all \
  --output jsonc
```

### Falha na criação do AKS

```bash
az aks show \
  --resource-group "rg-imersao-arquitetoazure-us" \
  --name "aks-imersao-azureshop" \
  --query '{State:provisioningState, Details:provisioningStateTransitionTime, NodeResourceGroup:nodeResourceGroup}' \
  --output jsonc
```

### Falha no role assignment

```bash
terraform state list | rg 'aks|role_assignment'
terraform plan
```

### Eventos do Kubernetes

```bash
kubectl get events --all-namespaces \
  --sort-by='.lastTimestamp'
```

## 24. Reversão controlada

Se o laboratório precisar ser removido, gere primeiro um plano de destruição específico para os recursos desta fase. Não destrua sem revisar o escopo.

Confira os endereços:

```bash
terraform state list | rg 'module\.aks|aks_acr_pull'
```

Planeje a remoção controlada conforme a estratégia do projeto. Evite `terraform destroy` geral, pois o estado também contém o ACR e a zona DNS.

Antes de qualquer remoção:

- exporte manifests necessários;
- confirme que não há aplicações importantes;
- verifique volumes persistentes;
- registre o Node Resource Group;
- revise o plano para garantir que ACR, SQL, VNet e DNS não serão removidos indevidamente.

## 25. Checklist pré-apply

- [ ] Assinatura e usuário corretos.
- [ ] Provedores Azure registrados.
- [ ] `Standard_B4ms` disponível em `eastus`.
- [ ] Pelo menos quatro vCPUs disponíveis na cota aplicável.
- [ ] Custos do nó, disco, balanceador e tráfego aceitos.
- [ ] Nome `aks-imersao-azureshop` ainda livre na assinatura/Resource Group.
- [ ] Arquitetura de rede gerenciada confirmada.
- [ ] Cluster público aceito para o laboratório.
- [ ] Principal do `AcrPull` confirmado como identidade adequada do kubelet.
- [ ] Executor possui permissão para criar role assignment.
- [ ] Plano mostra zero destruições.
- [ ] Plano salvo corresponde à configuração atual.

## 26. Checklist pós-apply

- [ ] Terraform terminou sem erro.
- [ ] Novo `terraform plan` retorna `No changes`.
- [ ] AKS em estado `Succeeded`.
- [ ] Nó em estado `Ready`.
- [ ] Pods de sistema saudáveis.
- [ ] `AcrPull` atribuído ao kubelet no escopo do ACR.
- [ ] Imagem do ACR baixada com sucesso pelo cluster.
- [ ] Custos e alertas configurados.
- [ ] Próxima fase planejada sem duplicar a Private DNS Zone.

## 27. Fontes oficiais

- AKS: https://learn.microsoft.com/azure/aks/
- Azure CLI para AKS: https://learn.microsoft.com/cli/azure/aks
- Azure VM SKUs: https://learn.microsoft.com/cli/azure/vm#az-vm-list-skus
- Cotas do Azure: https://learn.microsoft.com/azure/quotas/
- Integração AKS e ACR: https://learn.microsoft.com/azure/aks/cluster-container-registry-integration
- Azure RBAC: https://learn.microsoft.com/azure/role-based-access-control/

## 28. Registro da análise

Foi analisado o plano fornecido no arquivo `Texto colado(2).txt`. O plano não apresenta erro e propõe dois recursos novos: AKS e função `AcrPull`. A solução documentada concentra-se em validar os riscos que não aparecem como erro no plano, prevenir aplicação parcial e fornecer testes completos depois da implantação. Nenhum recurso Azure foi criado, alterado ou removido durante esta análise.

## 29. Atualização — diagnóstico do SKU `Standard_B4ms`

O teste executado retornou:

```text
reasonCode: NotAvailableForSubscription
location:   eastus
SKU:        Standard_B4ms
```

Também existem restrições nas zonas 1 e 2. A restrição do tipo `Location` é suficiente para impedir o uso do SKU em toda a região `eastus` para esta assinatura.

Conclusão:

```text
Standard_B4ms não pode ser usado por esta assinatura em eastus.
```

O problema não é falta de cota regional geral:

```text
Total Regional vCPUs: 0 usados / 10 disponíveis
Standard BS Family:   0 usados / 10 disponíveis
```

Ter cota disponível para uma família não remove uma restrição `NotAvailableForSubscription` aplicada ao SKU.

## 30. Não aplicar o plano atual

O arquivo `tfplan-fase1` contém:

```hcl
vm_size = "Standard_B4ms"
```

Se aplicado, há grande probabilidade de a criação do node pool falhar. Não execute:

```bash
terraform apply tfplan-fase1
```

Preserve-o com nome de bloqueio:

```bash
if [ -f tfplan-fase1 ]; then
  mv tfplan-fase1 tfplan-fase1.B4MS-INDISPONIVEL.NAO-APLICAR
fi
```

## 31. Escolher um SKU alternativo

Para um laboratório com um único nó, um candidato inicial é:

```text
Standard_D2s_v4
```

Motivos:

- possui duas vCPUs e memória suficiente para um node pool pequeno;
- não é uma VM burstable como a B-series;
- a saída de cotas mostra `Standard DSv4 Family vCPUs` com limite 10;
- consumiria duas das dez vCPUs regionais disponíveis.

Esse candidato ainda precisa ser validado quanto a restrições específicas da assinatura.

## 32. Validar `Standard_D2s_v4`

```bash
az vm list-skus \
  --location eastus \
  --size Standard_D2s_v4 \
  --all \
  --query '[].{Name:name, Zones:locationInfo[0].zones, Restrictions:restrictions}' \
  --output jsonc
```

Resultado aceitável:

```json
"Restrictions": []
```

Se aparecer `NotAvailableForSubscription`, não utilize o SKU. Teste o próximo candidato.

Confirme os dados do tamanho:

```bash
az vm list-sizes \
  --location eastus \
  --query "[?name=='Standard_D2s_v4'].{Name:name, Cores:numberOfCores, MemoryMB:memoryInMb}" \
  --output table
```

## 33. Alternativas se `Standard_D2s_v4` estiver restrito

Teste, uma por vez, opções de famílias cuja cota apresentada é maior que zero:

```bash
for AKS_VM_CANDIDATE in Standard_D2s_v4 Standard_D2s_v3 Standard_D2_v4 Standard_D2_v3; do
  echo "Verificando: $AKS_VM_CANDIDATE"
  az vm list-skus \
    --location eastus \
    --size "$AKS_VM_CANDIDATE" \
    --all \
    --query '[].{Name:name, Restrictions:restrictions}' \
    --output jsonc
done
```

Escolha somente um SKU que:

- seja retornado pelo comando;
- apresente `Restrictions: []`;
- possua pelo menos duas vCPUs;
- tenha cota disponível na família correspondente;
- seja compatível com AKS;
- tenha custo aceito para o laboratório.

Não escolha somente pela cota. Disponibilidade, restrições e compatibilidade também precisam estar válidas.

## 34. Localizar a variável do tamanho da VM

```bash
rg -n 'Standard_B4ms|vm_size|node_vm_size|aks.*vm' .
```

O valor pode estar:

- em `terraform.tfvars`;
- na chamada `module "aks"` do `main.tf`;
- como valor padrão em `modules/aks/variables.tf`;
- diretamente no recurso `azurerm_kubernetes_cluster`.

Prefira configurar o valor por variável no `terraform.tfvars`.

Exemplo, usando o nome real da variável encontrado no projeto:

```hcl
aks_node_vm_size = "Standard_D2s_v4"
```

`aks_node_vm_size` é apenas um exemplo de nome. Não o copie antes de confirmar a declaração real.

## 35. Versão do Kubernetes

A consulta mostrou:

```text
1.37.0  Preview
1.36.4  estável
```

Não use `1.37.0` neste projeto enquanto estiver marcada como Preview.

Para tornar a implantação previsível, use uma versão estável suportada. Com base na saída coletada, a candidata é:

```text
1.36.4
```

Antes de gravar, valide novamente:

```bash
az aks get-versions \
  --location eastus \
  --query "values[?version=='1.36.4']" \
  --output jsonc
```

Dependendo da versão do Azure CLI, a estrutura retornada por `get-versions` pode mudar. A listagem em tabela já confirmou que `1.36.4` está disponível e não está marcada como Preview.

## 36. Localizar e configurar a versão do AKS

```bash
rg -n 'kubernetes_version|orchestrator_version|aks_version' .
```

Se o módulo ainda não possui variável, uma estrutura recomendada é:

Em `modules/aks/main.tf` ou arquivo de variáveis do módulo:

```hcl
variable "kubernetes_version" {
  description = "Versao Kubernetes suportada na regiao do AKS."
  type        = string
}
```

No recurso:

```hcl
resource "azurerm_kubernetes_cluster" "this" {
  kubernetes_version = var.kubernetes_version

  default_node_pool {
    orchestrator_version = var.kubernetes_version
  }
}
```

Na chamada do módulo:

```hcl
module "aks" {
  kubernetes_version = var.aks_kubernetes_version
}
```

No `variables.tf` raiz:

```hcl
variable "aks_kubernetes_version" {
  description = "Versao Kubernetes do AKS."
  type        = string
}
```

No `terraform.tfvars`:

```hcl
aks_kubernetes_version = "1.36.4"
```

Adapte os nomes à estrutura existente. Não duplique variáveis se o projeto já possuir uma entrada equivalente.

## 37. Sequência de correção

1. testar `Standard_D2s_v4`;
2. se permitido, localizar a variável que define `Standard_B4ms`;
3. substituir pelo SKU validado;
4. decidir se a versão `1.36.4` será fixada;
5. editar os arquivos necessários;
6. formatar e validar;
7. gerar um plano novo;
8. conferir o SKU e a versão no plano;
9. somente então aplicar.

Comandos:

```bash
terraform fmt -recursive
terraform validate
terraform plan -out=tfplan-fase1-sku-corrigido
terraform show tfplan-fase1-sku-corrigido
```

## 38. Barreiras obrigatórias no plano corrigido

O plano novo não pode conter:

```hcl
vm_size = "Standard_B4ms"
```

Ele deve conter o SKU validado, por exemplo:

```hcl
vm_size = "Standard_D2s_v4"
```

Se a versão for fixada, deve mostrar:

```hcl
kubernetes_version = "1.36.4"
```

e, quando aplicável:

```hcl
orchestrator_version = "1.36.4"
```

Continue exigindo:

```text
0 to destroy
```

## 39. Aplicar o plano corrigido

Somente se `Restrictions` estiver vazio e o plano mostrar o SKU correto:

```bash
terraform apply tfplan-fase1-sku-corrigido
```

## 40. Se ainda ocorrer falha de capacidade

Mesmo sem restrição, o Azure pode ocasionalmente não ter capacidade física momentânea para um SKU em uma região ou zona.

Se o erro indicar capacidade insuficiente:

1. não tente repetidamente em sequência;
2. confirme se foi criada alguma parte do cluster;
3. execute `terraform state list` e `az aks show`;
4. teste outro SKU permitido;
5. considere outra região somente se todos os recursos e requisitos de latência permitirem;
6. gere sempre um novo plano depois da mudança.

## 41. Resultado atualizado da análise

O primeiro bloqueio técnico foi identificado antes da aplicação:

```text
Standard_B4ms não está disponível para a assinatura em eastus.
```

A correção recomendada é validar e adotar um SKU alternativo, preferencialmente `Standard_D2s_v4` como primeiro candidato, e regenerar o plano. A cota regional de dez vCPUs é suficiente para um nó de duas vCPUs, desde que a família escolhida também tenha cota e o SKU não possua restrições.

## 42. Atualização — séries D v3 e v4 também bloqueadas

Foram testados:

```text
Standard_D2s_v4
Standard_D2s_v3
Standard_D2_v4
Standard_D2_v3
```

Todos retornaram:

```text
reasonCode: NotAvailableForSubscription
type:       Location
location:   eastus
```

Também foram apresentadas restrições para as zonas 1, 2 e 3. Portanto, nenhum desses quatro SKUs pode ser usado nessa assinatura em `eastus`.

Não continue testando apenas variações v3 e v4 da mesma família. A saída de cotas indica que várias famílias mais novas possuem limite 10, incluindo opções v6 e v7, que devem ser investigadas.

## 43. Observação sobre o laço executado

Na transcrição apareceu:

```text
done--output jsonc
```

O correto é encerrar o comando `az` com `--output jsonc` antes do `done`:

```bash
for ...; do
  az vm list-skus ... \
    --output jsonc
done
```

Apesar da digitação exibida, os resultados dos SKUs foram retornados e confirmam as restrições.

## 44. Gerar inventário de SKUs sem restrições

Execute o comando abaixo para listar somente SKUs de máquinas virtuais sem restrições para a assinatura em `eastus`:

```bash
az vm list-skus \
  --location eastus \
  --resource-type virtualMachines \
  --all \
  --query "[?length(restrictions)==\`0\`].{Name:name,vCPUs:capabilities[?name=='vCPUs'].value | [0],MemoryGB:capabilities[?name=='MemoryGB'].value | [0]}" \
  --output tsv \
  | awk '$2 >= 2 && $3 >= 4 {printf "%-32s vCPU=%-4s RAM=%sGB\\n", $1, $2, $3}' \
  | sort
```

Finalidade:

- `length(restrictions)==0`: mantém apenas SKUs liberados;
- `vCPUs`: extrai a quantidade de processadores virtuais;
- `MemoryGB`: extrai a memória;
- `awk`: mantém máquinas com no mínimo duas vCPUs e 4 GB de RAM;
- `sort`: organiza os resultados.

Se o Azure CLI local não aceitar a consulta complexa, use a alternativa em duas etapas.

## 45. Alternativa compatível em duas etapas

Salve a lista completa em um arquivo temporário de diagnóstico:

```bash
az vm list-skus \
  --location eastus \
  --resource-type virtualMachines \
  --all \
  --output json > /tmp/azure-vm-skus-eastus.json
```

Depois extraia os SKUs sem restrições:

```bash
jq -r '
  .[]
  | select((.restrictions | length) == 0)
  | {
      name: .name,
      vcpus: ([.capabilities[] | select(.name == "vCPUs") | .value][0] // "0"),
      memory: ([.capabilities[] | select(.name == "MemoryGB") | .value][0] // "0")
    }
  | select((.vcpus | tonumber) >= 2 and (.memory | tonumber) >= 4)
  | [.name, .vcpus, .memory]
  | @tsv
' /tmp/azure-vm-skus-eastus.json \
  | sort \
  | column -t
```

Se `jq` não estiver instalado:

```bash
sudo apt update
sudo apt install -y jq
```

O arquivo em `/tmp` é temporário e não contém credenciais; ele contém metadados públicos e restrições da assinatura.

## 46. Testar candidatos v6 e v7

Com base nas famílias que apresentaram cota 10, teste inicialmente:

```bash
for AKS_VM_CANDIDATE in \
  Standard_D2as_v6 \
  Standard_D2ads_v6 \
  Standard_D2s_v6 \
  Standard_D2as_v7 \
  Standard_D2ads_v7 \
  Standard_D2s_v7
do
  echo "Verificando: $AKS_VM_CANDIDATE"

  az vm list-skus \
    --location eastus \
    --size "$AKS_VM_CANDIDATE" \
    --all \
    --query '[].{Name:name, Restrictions:restrictions}' \
    --output jsonc
done
```

Alguns nomes podem não existir na região. Um resultado vazio significa que o nome consultado não foi retornado e não deve ser usado.

Um candidato só é aceito quando a saída contém o nome e:

```json
"Restrictions": []
```

## 47. Cruzar disponibilidade com cotas

Depois de identificar um SKU sem restrições, descubra a família do SKU:

```bash
AKS_VM_SIZE="Standard_D2as_v6"

az vm list-skus \
  --location eastus \
  --size "$AKS_VM_SIZE" \
  --all \
  --query '[0].{Name:name,Family:family,Restrictions:restrictions,Capabilities:capabilities}' \
  --output jsonc
```

Substitua `Standard_D2as_v6` pelo candidato real.

Depois confira se a família correspondente possui limite maior que zero:

```bash
az vm list-usage \
  --location eastus \
  --query '[?limit>`0`].{Name:localName,Current:currentValue,Limit:limit}' \
  --output table
```

O SKU deve passar nos dois critérios:

1. nenhuma restrição em `list-skus`;
2. cota familiar e regional suficientes em `list-usage`.

## 48. Critérios para selecionar o melhor SKU

Entre os SKUs liberados, priorize:

1. pelo menos duas vCPUs;
2. pelo menos 4 GB de RAM, preferencialmente 8 GB para margem do sistema;
3. família com limite mínimo suficiente;
4. ausência de GPU e recursos especializados desnecessários;
5. custo compatível com laboratório;
6. arquitetura x64 compatível com as imagens;
7. disponibilidade contínua na região;
8. compatibilidade com node pool de sistema do AKS.

Evite escolher SKU somente porque aparece na lista. Tamanhos muito grandes, GPU, HPC, memória extrema ou hardware confidencial aumentam custo e complexidade.

## 49. Se nenhum SKU econômico estiver liberado

Há três caminhos:

### Caminho A — solicitar habilitação/cota

Abra uma solicitação de suporte/cota para a família desejada em `eastus`. A aprovação depende do tipo de assinatura e disponibilidade regional.

### Caminho B — testar outra região

Compare regiões antes de mover o AKS:

```bash
for AKS_REGION in eastus2 centralus southcentralus; do
  echo "Região: $AKS_REGION"
  az vm list-skus \
    --location "$AKS_REGION" \
    --size Standard_D2s_v4 \
    --all \
    --query '[].{Name:name,Restrictions:restrictions}' \
    --output jsonc
done
```

Trocar a região do AKS afeta rede, latência, peering, custos de transferência, arquitetura de DNS e proximidade com SQL e ACR. Não mude somente para ultrapassar a restrição sem revisar essas consequências.

### Caminho C — usar outro tipo de assinatura

Assinaturas gratuitas, de estudante, patrocinadas ou com ofertas específicas podem restringir SKUs e regiões. Uma assinatura paga pode ter outro conjunto de disponibilidade, mas isso exige decisão de cobrança e governança.

## 50. Próximo ponto de controle

Não altere ainda o `vm_size`. Primeiro execute:

```bash
az vm list-skus \
  --location eastus \
  --resource-type virtualMachines \
  --all \
  --query "[?length(restrictions)==\`0\`].{Name:name,vCPUs:capabilities[?name=='vCPUs'].value | [0],MemoryGB:capabilities[?name=='MemoryGB'].value | [0]}" \
  --output tsv \
  | awk '$2 >= 2 && $3 >= 4 {printf "%-32s vCPU=%-4s RAM=%sGB\\n", $1, $2, $3}' \
  | sort
```

Envie a lista resultante. Com ela será possível escolher o menor SKU adequado que esteja realmente liberado, sem novas tentativas por suposição.

## 51. Resultado da verificação dos SKUs v6 e v7

O teste realizado em `eastus` retornou:

| SKU | Resultado | Decisão |
|---|---|---|
| `Standard_D2as_v6` | `NotAvailableForSubscription` | Não usar |
| `Standard_D2ads_v6` | `NotAvailableForSubscription` | Não usar |
| `Standard_D2s_v6` | `NotAvailableForSubscription` | Não usar |
| `Standard_D2as_v7` | `Restrictions: []` | Candidato recomendado |
| `Standard_D2ads_v7` | `Restrictions: []` | Alternativa com disco temporário local |
| `Standard_D2s_v7` | `Restrictions: []` | Alternativa Intel |

`Restrictions: []` confirma que o SKU não está bloqueado para esta assinatura e região. Isso resolve a causa encontrada nos tamanhos v3, v4 e v6, mas a cota da família ainda deve ser conferida antes do `apply`.

## 52. Escolha recomendada

Use inicialmente:

```hcl
vm_size = "Standard_D2as_v7"
```

Esse tamanho oferece duas vCPUs e 8 GiB de memória. É uma escolha equilibrada para um laboratório AKS com um único nó. Como o plano usa disco de sistema gerenciado, não há necessidade inicial de escolher a variante `D2ads_v7` somente pelo disco temporário local.

Use `Standard_D2s_v7` se houver uma exigência explícita de processador Intel. Use `Standard_D2ads_v7` apenas quando a carga realmente depender de armazenamento temporário local; esse armazenamento não deve guardar dados persistentes.

## 53. Confirmar família e cotas do SKU recomendado

Defina a variável somente no shell e consulte os detalhes:

```bash
AKS_VM_SIZE="Standard_D2as_v7"

az vm list-skus \
  --location eastus \
  --size "$AKS_VM_SIZE" \
  --all \
  --query '[0].{Name:name,Family:family,Restrictions:restrictions,vCPUs:capabilities[?name==`vCPUs`].value | [0],MemoryGB:capabilities[?name==`MemoryGB`].value | [0]}' \
  --output jsonc
```

Anote o valor de `Family` e confira as cotas:

```bash
az vm list-usage \
  --location eastus \
  --query '[?limit>`0`].{Name:localName,Current:currentValue,Limit:limit}' \
  --output table
```

Para um node pool com um nó `D2as_v7`, devem existir pelo menos duas vCPUs livres tanto na cota regional total quanto na cota da família Dasv7. Se a família tiver limite zero ou menos de duas vCPUs livres, solicite aumento de cota ou escolha outro SKU liberado cuja família tenha cota suficiente.

## 54. Localizar onde o tamanho está configurado

No diretório Terraform:

```bash
cd ~/azureshop/infra/terraform

rg -n 'Standard_B4ms|vm_size|node_vm_size|aks.*vm' . \
  -g '*.tf' \
  -g '*.tfvars'
```

Altere o valor na fonte real indicada pela busca, preferencialmente em `terraform.tfvars`. Não digite uma atribuição HCL diretamente no Bash: `vm_size = "..."` é sintaxe Terraform, não comando de terminal.

Exemplo em `terraform.tfvars`:

```hcl
aks_vm_size = "Standard_D2as_v7"
```

O nome exato da variável pode ser diferente. Preserve o nome já declarado em `variables.tf` e altere apenas o valor.

## 55. Invalidar o plano antigo e gerar um plano novo

Um plano salvo contém o valor antigo. Portanto, não aplique novamente um arquivo criado com `Standard_B4ms` ou outro SKU bloqueado.

Mova o plano antigo para manter evidência de diagnóstico, se ele existir:

```bash
if [ -f tfplan-fase1 ]; then
  mv tfplan-fase1 tfplan-fase1-sku-antigo
fi
```

Formate, valide e gere outro plano:

```bash
terraform fmt -recursive
terraform validate
terraform plan -out=tfplan-fase1-d2asv7
terraform show tfplan-fase1-d2asv7
```

No plano, confirme obrigatoriamente:

- `vm_size = "Standard_D2as_v7"`;
- somente os recursos esperados serão criados;
- nenhuma destruição não planejada (`0 to destroy`);
- o ACR existente `acrimersaoazureshop1965` não será recriado;
- a zona DNS privada já gerenciada não será duplicada;
- a atribuição `AcrPull` aponta para o ACR correto;
- o node pool começa com um nó, conforme o desenho do laboratório.

Se o plano ainda mostrar o SKU antigo, pare. Descubra qual variável, variável de ambiente `TF_VAR_*`, workspace ou arquivo `*.auto.tfvars` está sobrescrevendo o valor:

```bash
env | rg '^TF_VAR_'
terraform workspace show
find . -maxdepth 2 -type f \( -name '*.tfvars' -o -name '*.auto.tfvars' \) -print
```

## 56. Aplicar o plano corrigido

Somente depois das conferências:

```bash
terraform apply tfplan-fase1-d2asv7
```

Não execute `terraform apply` sem o nome do plano neste ponto, pois isso recalcularia as ações e perderia a garantia de aplicar exatamente o plano revisado.

## 57. Verificação pós-criação

Após o `apply` bem-sucedido:

```bash
terraform state list | sort
terraform output

az aks list \
  --resource-group rg-imersao-arquitetoazure-us \
  --query '[].{Name:name,Location:location,ProvisioningState:provisioningState,NodeResourceGroup:nodeResourceGroup}' \
  --output table
```

Obtenha as credenciais e valide o nó:

```bash
AKS_NAME="$(terraform output -raw aks_name)"

az aks get-credentials \
  --resource-group rg-imersao-arquitetoazure-us \
  --name "$AKS_NAME" \
  --overwrite-existing

kubectl get nodes -o wide
kubectl get pods -A
```

O resultado esperado é o cluster em `Succeeded`, um nó `Ready` e os pods do sistema sem falhas persistentes.

## 58. Se o SKU v7 falhar durante a criação

Mesmo sem restrições em `list-skus`, o `apply` ainda pode revelar falta momentânea de capacidade, cota ou uma regra específica do AKS. Registre o erro integral e classifique:

- `OperationNotAllowed` ou mensagem de quota: solicitar aumento de cota da família Dasv7;
- `SkuNotAvailable`: testar `Standard_D2s_v7` e depois `Standard_D2ads_v7`, sempre gerando novo plano;
- `OverconstrainedAllocationRequest`: remover zona fixa, se configurada, ou avaliar outra região após revisar a arquitetura;
- erro de política: consultar as Azure Policies atribuídas à assinatura e ao resource group;
- erro de versão do Kubernetes: listar versões suportadas em `eastus` e atualizar a versão fixada.

Comando para capturar os detalhes da última implantação no resource group:

```bash
az deployment group list \
  --resource-group rg-imersao-arquitetoazure-us \
  --query '[0].{Name:name,State:properties.provisioningState,Timestamp:properties.timestamp,Error:properties.error}' \
  --output jsonc
```

Cada troca de SKU exige um novo `terraform plan -out=...`; nunca reutilize um plano que contenha o tamanho anterior.
