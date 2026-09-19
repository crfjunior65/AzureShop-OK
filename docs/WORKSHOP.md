# Imersão Arquiteto Azure - Edição 5 - Cloud & AI

**Realização:** High Expert
**Instrutor:** Guilherm Maia - MVP Microsoft - Founder & CEO

Este guia de apoio é um roteiro Hands-on Lab para executar do projeto completo do início ao fim da Arquitetura da aplicação Azure Shop Store.

## Índice

1. [Antes de começar](#antes-de-comecar)
2. [Mapa de onde cada atividade acontece](#mapa-de-onde-cada-atividade-acontece)
3. [Modo de validação do instrutor](#modo-de-validação-do-instrutor)
4. [Checklist pré- Imersão](#checklist-pre-aula)
5. [Dia 1 - Portal, VM, App Service e dados](#dia-1---portal-vm-app-service-e-dados)
   1. [Lab 1 - Preparação](#lab-1---preparacao)
   2. [Lab 2 - Rede fundamental](#lab-2---rede-fundamental)
   3. [Lab 3 - Criação da Máquina virtual (VM) no Portal do Azurel](#lab-3---criação-da-maquina-virtual-no-portal)
   4. [Lab 4 - Análise da aplicação na VM com GitHub Copilot](#lab-4---analise-da-aplicação-na-vm-com-github-copilot)
   5. [Lab 5 - Implementação do Azure App Service e migração/publicação do conteúdo](#lab-5---implementacao-do-azure-app-service-e-migracaopublicação-do-conteudo)
   6. [Lab 6 - Azure SQL Database](#lab-6---azure-sql-database)
   7. [Lab 7 - Private Endpoint e Private DNS](#lab-7---private-endpoint-e-private-dns)
   8. [Lab 8 - VNet Integration do App Service](#lab-8---vnet-integration-do-app-service)
6. [Dia 2 - Cloud Shell, Terraform, ACR e AKS](#dia-2---cloud-shell-terraform-acr-e-aks)
   1. [Lab 9 - Preparação e plano Terraform](#lab-9---preparacao-e-plano-terraform)
   2. [Lab 10 - ACR e AKS: fase 1](#lab-10---acr-e-aks-fase-1)
   3. [Lab 11 - Peering, DNS e NSG: fase 2](#lab-11---peering-dns-e-nsg-fase-2)
   4. [Lab 12 - Azure AI Foundry com configuração segura](#lab-12---azure-ai-foundry-com-configuracao-segura)
   5. [Lab 13 - Build e publicação no AKS](#lab-13---build-e-publicação-no-aks)
7. [Matriz de aceite por Lab](#matriz-de-aceite-por-lab)
8. [Troubleshooting e cleanup](#troubleshooting-e-cleanup)
9. [Referências oficiais](#referências-oficiais)

## Antes de começar

### Obrigatório

1. Computador atualizado com navegador moderno (Edge ou Chrome), internet estável e e-mail.
2. Assinatura Azure ativa. (pode ser uma conta trial ou de preferência uma conta paga (Pay-As-You-Go - PAYG). Confirme [assinatura e cobrança](https://learn.microsoft.com/azure/cost-management-billing/manage/create-subscription) antes da aula.
3. [VS Code](https://code.visualstudio.com/Download), [Git](https://git-scm.com/downloads) e conta [GitHub](https://github.com/signup).
4. [GitHub Copilot para VS Code](https://marketplace.visualstudio.com/items?itemName=GitHub.copilot), (pode ser a versão Free) instalado e autenticado. 
5. [PuTTY](https://www.chiark.greenend.org.uk/~sgtatham/putty/latest.html) no Windows para SSH. macOS/Linux podem usar `ssh` nativo.
6. Projeto clonado:

   ```bash
   git clone https://github.com/highexpert-tecnologia/azureshop.git
   cd azureshop
   ```

   O [Download ZIP](https://github.com/highexpert-tecnologia/azureshop/archive/refs/heads/main.zip) serve apenas para leitura; Git e clone são o caminho principal.

### Arquivos reais que você usará

| Arquivo | Papel |
|---|---|
| `package.json` | Scripts `dev`, `start` e `test`; Node.js `>=20`. |
| `src/server.js` | Entrada da aplicação. |
| `src/app.js` | API, incluido `/api/health`, `/api/products` e pedidos. |
| `.env.example` | Modelo local seguro; padrão `DB_PROVIDER=sqlite`. |
| `infra/sql/schema.sql` | Esquema idempotente para Azure SQL. |
| `Dockerfile` | Imagem Node 22, porta 3000 e health check. |
| `infra/terraform/` | Modelo A do Dia 2. |
| `infra/k8s/` | Namespace, ConfigMap, Deployment, Service e exemplos de segredo. |

## Mapa de onde cada atividade acontece

| Ambiente | O que fazer | O que não fazer |
|---|---|---|
| **Portal Azure** | Dia 1: RG, rede, VM, App Service, SQL, Private Endpoint, DNS e VNet Integration. | Colar segredos em campos compartilhados ou criar sem revisar SKU/custo. |
| **VS Code + GitHub Copilot** | Ler código, pedir análise, revisar diffs, editar e executar testes locais opcionais. | Esperar que Copilot crie Azure, execute migração ou aprove mudanças sozinho. |
| **Cloud Shell Bash** | Preflight, Azure CLI, Terraform, ACR Build e `kubectl` do Dia 2. | Salvar senha em histórico, state, `tfvars` ou arquivo do repositório. |
| **GitHub** | Versionar alterações revisadas do código e documentação. | Versionar `.env`, state, plano, segredo Kubernetes ou arquivo de senha. |
| **Ambiente do instrutor** | Demonstrar recursos bloqueados por quota/capacidade e permitir observação. | Usar como justificativa para ignorar revisão de plano, segurança ou custo. |

## Modo de validação (OPCIONAL)

Use este modo **antes da Imersão** ou quando não houver autorização para criar recursos. Ele é Read-only/dry-run.

```bash
bash scripts/preflight-workshop-readonly.sh
```

O script consulta apenas conta, providers, SKUs de VM, uso de compute, catálogo/uso do App Service, versões AKS e provider de IA. Ele não cria, atualiza, remove, faz build, deploy, `terraform apply` ou operação de dados.

## Checklist Pré-Imersão

- [ ] GitHub e Copilot autenticados no VS Code.
- [ ] Projeto clonado e aberto; `package.json`, `docs/`, `infra/terraform/` e `infra/k8s/` localizados.
- [ ] Portal aberto; diretório, subscription, RBAC, cobrança, budget e região conferidos.
- [ ] Cloud Shell aberto em **Bash**; armazenamento persistente aceito conscientemente, se solicitado.
- [ ] Preflight read-only executado e evidências não sensíveis registradas.
- [ ] SKU da VM, quota do App Service, SQL, ACR, AKS e IA confirmadas ou ambiente compartilhado definido.
- [ ] Senhas serão digitadas somente no Portal ou por canal seguro; não no chat, Git ou arquivo do curso.

# Dia 1 - Portal, VM, App Service e dados

## Lab 1 - Preparação

**Objetivo:** confirmar contexto, custo/RBAC e criar o contenedor do Lab.

**Antes de começar:** subscription aprovada, permissão para criar RG e região East US confirmada.

### Passos no Portal

1. Entre em [portal.azure.com](https://portal.azure.com/) e abra **Subscriptions**. Confirme nome, status, Tenant e cobrança.
2. Abra **Resource groups** > **Create**.
3. Preencha:
   - Subscription: `[definir: sua Subscription]`;
   - Resource group: `rg-imersao-arquitetoazure`;
   - Region: **East US** ou **outra região disponível**.
4. Em **Tags**, informe somente valores não sensíveis:
   - `project = azureshop`;
   - `company = highexpert]`;
   - `costcenter = 010`.
5. Selecione **Review + create**, leia custo/políticas e selecione **Create** somente com autorização.
6. Abra o RG criado e localize **Activity log**, **Cost Management** e **Resource visualizer**.

**Resultado esperado:** RG em East US, Tags visíveis e atividade de criação registrada.

**Validação:** confirme Subscription, Location e quatro Tags. Se algum campo divergir, pare antes do Lab 2.

**Falhas e contingência:** RBAC/Policy bloqueou a criação -> instrutor cria ou usa ambiente compartilhado. Região não aprovada -> não substitua sem revisar quotas.

**Custo e cleanup:** RG sozinho não é o custo principal; ele não apaga custos já gerados. Ao fim, remova recursos somente com autorização e depois revise o RG.

## Lab 2 - Criação da rede (Virtual Networks)

**Objetivo:** criar VNet, subnets e NSG com menor privilégio.

**Antes de começar:** Lab 1 concluído. O CIDR público que será autorizado para SSH será usado somente no Lab 3; nunca use `Any`/`*` como origem SSH.

### Passos no Portal

1. Abra **Virtual networks** > **Create**.
2. Na aba básico, escolha o RG do Lab 1, nome `vnet-imersao` e East US.
3. Em **IP Addresses**, use espaço `10.10.0.0/16` e crie:
   - `snet-aplicacao` - `10.10.1.0/24`;
   - `snet-dados` - `10.10.2.0/24`;
   - `snet-appservice-integration` - `10.10.3.0/24`, delegada a `Microsoft.Web/serverFarms`.
4. Crie a VNet e abra **Subnets** para confirmar prefixos e delegação.
5. Abra **Network security groups** > **Create**. Nome: `nsg-snet-aplicacao`, mesmo RG/região.
6. não crie regra Inbound neste Lab: a VM nascerá sem porta Inbound aberta e a regra SSH restrita será criada no Lab 3.
7. Associe o NSG a `snet-aplicacao` e `snet-dados`. Se já houver outro NSG associado, pare e entenda a divergência; não o substitua.
8. não associe NSG/VNet Integration/Private Endpoint a `snet-appservice-integration` além do uso previsto, e não use `snet-dados` para VM ou VNet Integration.

**Resultado esperado:** 3 subnets sem sobreposição; NSG associado sem regra Inbound ampla; SSH ainda não está liberado.

**validação:** no Portal, confira prefixos, delegação e associação do NSG. Nenhuma porta Inbound deve estar liberada antes do Lab 3.

**Falhas e contingência:** prefixo sobreposto ou NSG diferente -> corrija antes de criar cargas. Sem CIDR seguro no Lab 3 -> use demonstração, não abra SSH.

**Custo e cleanup:** VNet/NSG não são o principal custo; a superfície de ataque de regra ampla é o risco principal.

## Lab 3 - Criação da Máquina virtual (VM) no Portal do Azure

**Objetivo:** criar a VM Ubuntu que representa o ponto de partida IaaS, publicar nela uma instância da aplicação AzureShop e conectá-la de forma restrita.

**Antes de começar:** Labs 1-2 concluídos, PuTTY/SSH disponível e um CIDR público atual do aluno confirmado no formato `x.x.x.x/32`.

### Confirmar capacidade antes de criar

1. No Portal, abra **Create a resource** > pesquise **Virtual machine** > **Create** > **Azure virtual machine**.
2. Em **Basics**, escolha a subscription do Lab 1, RG `rg-imersao-arquitetoazure` e região **East US**.
3. Abra **See all sizes**. Pesquise a SKU pretendida e prossiga somente se o Portal permitir a seleção.
4. Como alternativa Read-only, no Cloud Shell execute:

   ```bash
   az vm list-skus --location eastus --resource-type virtualMachines --size "[definir: SKU]" -o table
   ```

**Go/no-go:** se surgir `SkuNotAvailable` ou bloqueio de quota, pare. Escolha outra combinação de SKU/região/zona somente depois de uma nova consulta e aprovação.

### Criar a VM e a regra de SSH

1. Ainda em **Basics**, preencha:
   - **Virtual machine name:** `vm-imersao`;
   - **Image:** **Ubuntu Server 22.04 LTS**;
   - **Size:** `[definir: SKU disponivel validada agora]`;
   - **Authentication type:** Password;
   - **Username:** `[definir]`;
   - **Password:** crie localmente e digite somente nesta tela. Nunca a registre em Git, arquivo, chat, log, `tfvars` ou screenshot;
   - **Inbound port rules:** **None**.
2. Abra **Disks**. Mantenha o disco padrão somente se a estimativa de custo estiver aprovada; não ative recursos extras sem necessidade didática.
3. Abra **Networking** e escolha:
   - Virtual network: `vnet-imersao`;
   - Subnet: `snet-aplicacao`;
   - Public IP: **Create new**, SKU **Standard**, assignment **Static**, IP version **IPv4**;
   - NIC network security group: **Advanced** > escolha o NSG existente `nsg-snet-aplicacao`;
   - Public Inbound ports: **None**.
4. Em **Management** e **Advanced**, mantenha os padrões aprovados. não cole Cloud-init com segredo. O arquivo `infra/vm/cloud-init.yaml` é apenas referência, pressupõe o usuário `azureuser` e não clona o repositório; não o use sem adaptar e revisar esse pré-requisito.
5. Selecione **Review + create**. Confirme RG, East US, Ubuntu 22.04, SKU, VNet/subnet, PIP Standard/Static/IPv4, NSG existente e que nenhuma porta Inbound será criada automaticamente. Selecione **Create** somente com esses valores corretos.
6. Quando o deployment terminar com **Succeeded**, abra o recurso **Public IP address** criado e copie o valor de **IP address**.
7. Abra `nsg-snet-aplicacao` > **Inbound security rules** > **Create**. Crie exatamente:
   - Source: **IP Addresses**;
   - Source IP addresses/CIDR: `[definir: IP publico atual do aluno]/32`;
   - Source port ranges: `*`;
   - Destination: Any;
   - Service: SSH;
   - Protocol: TCP; action: Allow; priority: `1000` se estiver livre;
   - Name: `Allow-SSH-From-Student-IP`.
8. Confira a regra criada. Azure pode representar `*` como valor simples, lista ou nulo complementar; confirme a intenção (TCP/22 da origem `/32`), sem ampliar o acesso.

### Conectar por PuTTY e preparar o ponto de partida da aplicação Azure Shop na VM

1. Abra PuTTY no computador local. Em **Session**, preencha **Host Name (or IP address)** com o PIP copiado e **Port** `22`; em **Connection type**, selecione **SSH**.
2. Selecione **Open**. Aceite a chave do host somente depois de conferir que o IP é o da VM criada.
3. Informe o username criado no Portal e digite a senha somente no cliente PuTTY. O PuTTY não exibirá os caracteres da senha.
4. Valide a sessão:

   ```bash
   whoami
   uname -a
   ip -brief address
   ```

5. Para estabelecer o ponto de partida da aplicação na VM, execute somente na sessão SSH:

   ```bash
   sudo apt-get update
   sudo apt-get install -y git curl
   curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
   sudo apt-get install -y nodejs
   git clone https://github.com/highexpert-tecnologia/azureshop.git ~/azureshop
   cd ~/azureshop
   npm ci
   npm test
   mkdir -p data
   APP_ENV=azure DB_PROVIDER=sqlite SQLITE_PATH="$PWD/data/loja.db" npm start
   ```

6. Em uma segunda sessão SSH, valide sem abrir a porta 3000 para a Internet:

   ```bash
   curl -fsS http://127.0.0.1:3000/api/health
   curl -fsS http://127.0.0.1:3000/api/products
   ```

   Pare a execução manual com `Ctrl+C`. O repositório não contém um instalador de serviço genérico para o username escolhido; portanto este é um teste inicial, não uma publicação permanente na VM.

**Evidências de sucesso:** deployment `Succeeded`; PIP Standard/Static/IPv4; NIC em `snet-aplicacao`; NSG com uma única regra TCP/22 da origem `/32`; `npm test` e os dois `curl` locais concluindo.

**Falhas e contingência:** `SkuNotAvailable`/quota -> não crie alternativa não aprovada. SSH falhou -> confira VM em execução, PIP, regra `/32`, prioridade, IP público atual e firewall local; não abra SSH para Internet. `npm ci`/teste falhou -> confira versão Node (`node --version`) e clone antes de seguir.

**Custo e cleanup:** VM, PIP Standard, disco e IP podem gerar custo. Desalocar reduz custo de computação, mas pode manter custos de disco/IP; remova VM, NIC, PIP e disco somente com autorização e após registrar evidências.

## Lab 4 - Análise da aplicação na VM com GitHub Copilot (SOMENTE INSTRUTOR)

**Objetivo:** analisar a aplicação que foi validada na VM e produzir, revisar e testar uma modernização mínima para PaaS.

**Antes de começar:** Lab 3 concluído; VM acessível por PuTTY; checkout local no computador do aluno; VS Code e Copilot autenticados. O uso do VS Code é sobre o clone **local**. não use Remote-SSH, pois este workshop não fornece setup, extensões ou hardening desse caminho.

Copilot **não provisiona recursos Azure, não executa migração sozinho e não aprovações**. Ele gera análise e sugestões; a pessoa revisa e aplica.

1. No computador local, abra o checkout no VS Code: **File** > **Open Folder** > pasta `azureshop`.
2. Use PuTTY somente para observar/validar o ponto de partida na VM. As alterações deste Lab são feitas no clone local e chegarão ao App Service no Lab 5.
3. Abra o painel **Chat** do GitHub Copilot. não anexe `.env`, senha, log sensível ou dados de clientes.
4. **Prompt 1 - análise.** Envie:

   ```text
   Analise esta aplicação Node.js para uma migração de VM para Azure App Service.
   Leia package.json, src/server.js, src/app.js, src/config.js, Dockerfile e .env.example.
   Informe: runtime mínimo, comando de início, porta, health check, configurações de
   banco, estado local e riscos de PaaS. não exponha, invente ou solicite segredos.
   não altere arquivos. Produza uma checklist para revisão humana.
   ```

5. Compare a resposta com os arquivos reais:
   - `package.json`: Node `>=20`, `npm start` executa `node src/server.js`, `npm test` executa `node --test`;
   - `src/app.js`: health em `/api/health`;
   - `src/config.js`: banco padrão SQLite e variáveis Azure SQL;
   - `Dockerfile`: porta 3000 e Node 22 na imagem.
6. Registre somente configurações não sensíveis confirmadas. Se Copilot sugerir runtime, porta ou arquivo inexistente, corrija a sugestão antes de continuar.

7. **Prompt 2 - Plano de modernização.** Envie:

   ```text
   Proponha apenas alterações mínimas para tornar esta aplicação adequada ao Azure App Service.
   Preserve API, carrinho, checkout e comportamento. Use configuração por variável de ambiente,
   mantenha /api/health e não adicione senhas, tokens ou connection strings.
   Mostre um plano por arquivo e espere minha revisão antes de editar.
   ```

8. Leia o plano. Recuse alterações que removam rotas, troquem banco sem configuração ou introduzam segredo.
9. 
**Prompt 3 - Implementação mínima.** Somente com o plano aprovado, envie:

   ```text
   Aplique somente as alterações aprovadas. Depois mostre o diff e explique como validar
   com os scripts existentes de package.json. não execute comandos Azure e não crie arquivos de segredo.
   ```

10. Abra **Source Control** no VS Code, revise cada diff e descarte sugestões erradas. Copilot não substitui revisão humana.

11. Execute os comandos reais do repositório no terminal integrado do VS Code:

   ```bash
   npm ci
   npm test
   ```

   - `npm ci` instala exatamente o lockfile;
   - `npm test` executa `node --test`;
   - só avance quando os testes passarem.

13. Para que o ZIP deploy do Lab 5 contenha as alterações revisadas, publique somente os arquivos aprovados em um branch Git acessível pelo Cloud Shell:

   ```bash
   git status
   git add [arquivos-revisados]
   git commit -m "chore: prepare app service migration"
   git push -u origin [definir: branch]
   ```

   Confira `git diff --cached` antes do commit e nunca adicione `.env`, `terraform.tfvars`, state, ZIP ou qualquer segredo. Sem permissão no repositório, use um fork ou branch que o aluno controle; o Cloud Shell usará a URL/branch correspondente no Lab 5.

**Evidências de sucesso:** 3 prompts executados em ordem; diff revisado; `npm test` aprovado; branch com mudanças não sensíveis publicado. O Lab não cria nem altera no Azure.

**Falhas e contingência:** sugestão imprecisa -> preserve comportamento atual e corrija manualmente. Teste falhou -> corrija no clone local até passar; não publique mudança não testada. Copilot indisponível -> execute a mesma revisão humana dos arquivos listados no passo 5.

## Lab 5 - Implementação do Azure App Service e Migração/publicação do conteúdo

**Objetivo:** criar App Service Linux e publicar o código revisado por um único método: ZIP deploy via Cloud Shell.

**Antes de começar:** Lab 4 concluído; quota e SKU de App Service conferidas. A quota B1 foi insuficiente na subscription testada; não assuma B1 disponível.

### Criar App Service Plan e Web App no Portal

1. No Portal do Azure, abra **App Service plans** > **Create**.
2. Escolha RG, East US e Linux. Se a SKU estiver indisponível ou sem quota, pare e use outra combinação disponível.
3. Abra **App Services** > **Create**:
   - Resource group: o RG do Lab 1;
   - Name: `[definir: nome globalmente unico]`;
   - Publish: Code;
   - Runtime stack: uma versão Node.js disponível no Portal que atenda ao `engines.node >=20` do `package.json`;
   - Operating System: Linux;
   - App Service Plan: o plano criado.
4. Em **Environment variables**, configure apenas:

   | Nome | Valor inicial |
   |---|---|
   | `APP_ENV` | `azure` |
   | `DB_PROVIDER` | `sqlite` |
   | `SQLITE_PATH` | `/home/data/loja.db` |

5. Crie o recurso e copie o **Default domain** quando estiver `Running`.

### Publicar por ZIP via Cloud Shell

O Portal cria o App Service; a publicação usa um único fluxo: ZIP pelo Cloud Shell com `az webapp deploy`. Isso evita criar workflow GitHub Actions sem revisão.

1. Autentique-se no Cloud Shell com a subscription correta (`az account show`) e clone a URL/branch que contém a revisão aprovada no Lab 4:

   ```bash
   git clone --branch "[definir: branch]" "[definir: URL Git]" azureshop
   cd azureshop
   git status --short
   ```

2. Confirme que `git status --short` está vazio e que o commit contém o diff revisado. Se a revisão ainda estiver somente no computador local, não continue: publique a branch aprovada primeiro ou use um fork controlado pelo aluno.
3. Crie ZIP sem `.env`, `node_modules`, dados locais ou arquivos de segredo:

   ```bash
   zip -r ../azureshop.zip . \
     -x 'node_modules/*' '.env' '.env.*' 'data/*' '*.tfstate*' '*.tfvars' 'infra/k8s/secret.yaml'
   ```

4. Publique o ZIP:

   ```bash
   az webapp deploy \
     --resource-group rg-imersao-arquitetoazure \
     --name "[definir: nome do App Service]" \
     --type zip \
     --src-path ../azureshop.zip
   ```

5. Aguarde o retorno de `az webapp deploy`. No Portal, abra **Log stream** e **Configuration**. Confirme que nenhuma senha foi enviada.
6. Valide no navegador ou Cloud Shell:

   ```bash
   curl -fsS "https://[definir: default-domain]/api/health"
   curl -fsS "https://[definir: default-domain]/api/products"
   ```

7. No navegador, abra o catálogo, adicione item ao carrinho e avance no checkout. Enquanto `DB_PROVIDER=sqlite`, pedidos usam o SQLite persistido no diretório configurado do App Service, o que não é uma estratégia durável para produção. A migração para Azure SQL é tratada somente no Lab 6.

**Resultado esperado:** health retorna `status: ok`, catálogo responde e UI funciona.

**Falhas e contingência:** runtime incompatível -> revise `package.json` e stack. Falha de ZIP -> confira se `package.json`, `src/` e `public/` estão na raiz do ZIP. Sem quota -> ambiente compartilhado.

**Custo e cleanup:** plano fica cobrado enquanto ativo; acompanhe Cost Management e remova somente com autorização.

## Lab 6 - Azure SQL Database

**Objetivo:** criar o banco, aplicar o esquema e mudar a AzureShop de SQLite para SQL Server.

**Antes de começar:** Lab 5 saudável; SKU/região do SQL e canal seguro de senha aprovados.

### Passos no Portal

1. Abra **SQL databases** > **Create**.
2. Selecione o RG. Database name: `imersao`.
3. Em **Server**, crie ou escolha um servidor lógico:
   - Server name: `[definir: globalmente unico]`;
   - Region: `[definir: regiao/SKU confirmadas]`;
   - Authentication: SQL authentication;
   - Server admin login: `[definir]`;
   - Password: digite por canal seguro; nunca registre.
4. Escolha uma SKU aprovada, reveja a estimativa e crie.
5. Abra o banco > **Query editor**. Autentique sem expor a senha em screenshot/chat.
6. Abra `infra/sql/schema.sql` no VS Code, revise e execute o conteúdo no Query editor. O arquivo é idempotente e cria/atualiza tabelas e catálogo.
7. Mantenha acesso público do SQL habilitado temporariamente somente enquanto o caminho privado ainda não foi validado.

### Mudar a aplicação para SQL

O código **já suporta** SQL Server: `src/config.js` seleciona SQL quando `DB_PROVIDER=sqlserver`, e `src/db/sqlserver.js` implementa o repositório. A migração só fica ativa quando as quatro variáveis SQL estiverem configuradas.

No App Service > **Environment variables**, altere:

| Nome | Valor |
|---|---|
| `DB_PROVIDER` | `sqlserver` |
| `AZURE_SQL_SERVER` | `[servidor].database.windows.net` |
| `AZURE_SQL_DATABASE` | `imersao` |
| `AZURE_SQL_USER` | `[definir]` |
| `AZURE_SQL_PASSWORD` | injeção segura aprovada; nunca registrar |

Salve e reinicie o App Service se o Portal solicitar.

**Resultado esperado:** `/api/health` retorna banco `sqlserver`; produtos e pedidos podem ser lidos/criados no banco.

**validação:** execute health, catálogo e um pedido de teste sem dados pessoais reais; confira tabelas/pedido no Query editor.

**Falhas e contingência:** schema não aplicado, credencial incorreta, firewall ou DNS -> volte a revisar o estado, sem colocar senha em log. Se a configuração segura de senha não existir, mantenha SQLite apenas como demonstração e trate migração SQL como pendente.

**Custo e cleanup:** SQL cobra por SKU/armazenamento. não aumente SKU sem revisar custo.

## Lab 7 - Private Endpoint e Private DNS

**Objetivo:** preparar o caminho privado para SQL.

**Antes de começar:** Labs 2 e 6; SQL existente; `snet-dados` exclusiva.

### Passos no Portal

1. Abra `vnet-imersao` > **Subnets** e confirme `snet-dados` = `10.10.2.0/24`.
2. Abra o SQL Server > **Networking** > **Private endpoint connections** > **Create**.
3. Preencha:
   - Name: `[definir]`;
   - Resource type: `Microsoft.Sql/servers`;
   - Target sub-resource: `sqlServer`;
   - VNet: `vnet-imersao`;
   - Subnet: `snet-dados`.
4. Em **DNS**, crie/selecione `privatelink.database.windows.net` e o zone group.
5. Conclua e aguarde a conexão **Approved**.
6. Na Private DNS Zone, abra **Virtual network links** e confirme link para `vnet-imersao`, com auto-registration desabilitado.
7. Anote somente nomes não secretos do servidor, PE e zona para o Terraform do Dia 2.

**Resultado esperado:** PE Approved, IP privado em `snet-dados`, zone group e link DNS presentes.

**validação:** o hostname normal `[servidor].database.windows.net`, e não o nome `privatelink`, deve resolver para IP privado a partir de uma carga na VNet.

**Falhas e contingência:** PE em subnet errada, zona sem link ou estado Pending -> pare e corrija antes do Lab 8. não desabilite acesso público ainda.

**Custo e cleanup:** Private Endpoint pode cobrar; revise estimativa.

## Lab 8 - VNet Integration do App Service

**Objetivo:** permitir que o App Service alcance o SQL pelo PE.

**Antes de começar:** Lab 7 Approved; plano de App Service compatível; `snet-appservice-integration` vazia e delegada.

### Passos no Portal

1. Abra `vnet-imersao` e confirme:
   - `snet-appservice-integration`;
   - prefixo `10.10.3.0/24`;
   - delegação `Microsoft.Web/serverFarms`.
2. Abra App Service > **Networking** > **VNet integration** > **Add VNet**.
3. Escolha `vnet-imersao` e `snet-appservice-integration`. Nunca escolha `snet-dados`.
4. No NSG `nsg-snet-aplicacao` associado a dados, crie regra:
   - Source: `10.10.3.0/24`;
   - Destination: `10.10.2.0/24`;
   - Protocol: TCP;
   - Destination port: `1433`;
   - Action: Allow;
   - Priority: `1003`, se livre;
   - Name: `Allow-AppService-To-SQL-1433`.
5. Mantenha `AZURE_SQL_SERVER` no hostname normal do SQL e reinicie a aplicação se necessário.
6. Confirme health e acesso a produtos/pedidos.

**Ordem segura obrigatória:** somente considere desabilitar acesso público do SQL depois de PE Approved + link DNS + VNet Integration + TCP 1433 + health da aplicação comprovados. Essa decisão não é automática no workshop.

**Falhas e contingência:** subnet sem delegação, SKU não suporta integração, DNS resolve IP público ou timeout 1433 -> mantenha acesso atual, investigue e use ambiente compartilhado.

**Custo e cleanup:** revise custo do plano e PE.

# Dia 2 - Cloud Shell, Terraform, ACR e AKS

O Dia 2 usa o **Modelo A**:

- Dia 1 e Portal: RG, VNet, NSG, App Service, SQL, PE e DNS.
- Terraform fase 1 cria apenas ACR, AKS e `AcrPull`.
- Terraform fase 2 cria apenas dois peerings, link DNS da VNet AKS e regra NSG AKS -> SQL.
- Terraform não cria nem importa recursos do Dia 1.

## Lab 9 - Preparação e Plano Terraform

**Objetivo:** configurar variáveis não secretas, validar o handoff e revisar plano.

**Antes de começar:** Labs 1-8 completos ou ambiente compartilhado equivalente; preflight/quota revisados.

### Passos no Cloud Shell

1. Abra Cloud Shell em Bash, confirme a conta:

   ```bash
   az account show
   ```

2. Obtenha código:

   ```bash
   git clone https://github.com/highexpert-tecnologia/azureshop.git
   cd azureshop
   git pull --ff-only
   cd infra/terraform
   ```

3. Copie o exemplo local:

   ```bash
   cp terraform.tfvars.example terraform.tfvars
   ```

4. Edite somente identificadores não secretos:

   | Variável | Origem |
   |---|---|
   | `resource_group_name`, `suffix` | Resource Group manual e identificador exclusivo do aluno |
   | `portal_vnet_name`, `portal_data_nsg_name`, `portal_data_subnet_name` | Lab 2 |
   | `portal_sql_server_name`, `portal_sql_database_name` | Lab 6 |
   | `portal_sql_private_dns_zone_name` | Lab 7 |

   Nunca coloque senha de VM/SQL em `terraform.tfvars`.

5. Mantenha inicialmente:

   ```hcl
   deploy_acr = false
   deploy_aks = false
   enable_aks_private_connectivity = false
   ```

6. Execute:

   ```bash
   terraform init -backend=false
   terraform fmt -check
   terraform validate
   terraform plan -out=tfplan-inicial
   terraform show -no-color tfplan-inicial
   ```

**Resultado esperado:** data sources encontram RG, VNet, subnet de dados, NSG, SQL, banco e DNS privado do Dia 1; plano não tenta criá-los.

**Inspeção de variáveis e outputs:**

```bash
terraform providers
terraform output
```

Antes da fase 1, outputs de ACR/AKS podem ser nulos. Após a fase 1, use `terraform output -raw acr_login_server`, `terraform output -raw aks_name` e `terraform output -raw aks_node_resource_group`.

**Falhas e contingência:** data source falhou -> nome/RG/região não coincide; não troque o Terraform para recriar recurso manual. Use plan/manifests e ambiente compartilhado.

**Custo e cleanup:** `init`, `fmt`, `validate` e `plan` não criam Azure. State/plano local não deve ser commitado.

## Lab 10 - ACR e AKS: fase 1

**Objetivo:** criar a camada nova de containers depois de quota, SKU e plano aprovados.

**Antes de começar:** Lab 9 aprovado; quota AKS/ACR e tamanho de nó confirmados. `aks_node_size` em `terraform.tfvars.example` é apenas um exemplo; confirme SKU atual.

### Passos

1. Em `terraform.tfvars`, defina:

   ```hcl
   deploy_acr = true
   deploy_aks = true
   enable_aks_private_connectivity = false
   ```

2. Gere e revise:

   ```bash
   terraform plan -out=tfplan-fase1
   terraform show -no-color tfplan-fase1
   ```

3. O plano deve conter somente ACR, AKS e role `AcrPull`. Se contiver recurso manual do Dia 1, pare.
4. Com aprovação separada, aplique:

   ```bash
   terraform apply tfplan-fase1
   ```

5. Obtenha dados não secretos:

   ```bash
   terraform output
   terraform output -raw aks_get_credentials
   terraform output -raw aks_node_resource_group
   ```

6. Execute o comando retornado por `aks_get_credentials` ou:

   ```bash
   az aks get-credentials \
     --resource-group "$(terraform output -raw portal_resource_group_name)" \
     --name "[definir: aks_name]" \
     --overwrite-existing
   kubectl get nodes
   ```

**Resultado esperado:** ACR e AKS `Succeeded`, nós `Ready`, role `AcrPull` criada.

**Falhas e contingência:** quota/SKU/RBAC -> não crie cluster alternativo sem aprovação. Aluno revisa plano e manifestos; instrutor demonstra em cluster compartilhado.

**Custo e cleanup:** AKS e ACR geram custo. não deixe cluster individual ativo sem objetivo e cleanup aprovados.

## Lab 11 - Peering, DNS e NSG: fase 2

**Objetivo:** conectar a VNet AKS ao PE SQL sem recriar o Dia 1.

**Antes de começar:** Lab 10 concluído; PE Approved; espaços de endereço sem sobreposição.

### Passos

1. Obtenha RG gerenciado e VNet AKS:

   ```bash
   cd infra/terraform
   terraform output -raw aks_node_resource_group
   az network vnet list \
     --resource-group "[definir: aks_node_resource_group]" \
     --query '[].{name:name,prefixes:addressSpace.addressPrefixes}' \
     -o table
   ```

2. Em `terraform.tfvars`, preencha somente valores reais coletados:

   ```hcl
   aks_node_resource_group = "[definir]"
   aks_vnet_name = "[definir]"
   aks_vnet_address_prefixes = ["[definir: prefixo real da VNet AKS]"]
   enable_aks_private_connectivity = true
   ```

3. Gere/revise:

   ```bash
   terraform plan -out=tfplan-fase2
   terraform show -no-color tfplan-fase2
   ```

4. O plano deve criar exatamente:
   - `peer-imersao-to-aks-*`;
   - `peer-aks-to-imersao-*`;
   - link da zona `privatelink.database.windows.net` para VNet AKS;
   - regra `Allow-AKS-To-SQL-1433`.
5. Com aprovação, aplique:

   ```bash
   terraform apply tfplan-fase2
   ```

6. No Portal, confirme peerings conectados, link DNS sem registro automático e regra TCP 1433 restrita aos prefixos AKS.

**Validação opcional em cluster existente:** somente após autorização e sem deixar recursos:

```bash
kubectl -n azure-shop run netcheck --image=busybox:1.36 --restart=Never -- sleep 300
kubectl -n azure-shop wait --for=condition=Ready pod/netcheck --timeout=90s
kubectl -n azure-shop exec netcheck -- nslookup "[servidor].database.windows.net"
kubectl -n azure-shop exec netcheck -- nc -zvw5 "[servidor].database.windows.net" 1433
kubectl -n azure-shop delete pod netcheck --ignore-not-found
```

**Falhas e contingência:** VNet/MC RG ausente, prefixo sobreposto, DNS/TCP falha -> não desabilite SQL público. Use diagrama e ambiente compartilhado.

**Custo e cleanup:** peerings/PE e cluster podem gerar custo. O `netcheck` deve ser removido.

## Lab 12 - Azure AI Foundry com configuração segura

**Objetivo:** distinguir provisionamento de Foundry da integração de código e validar limites.

**Antes de começar:** provider `Microsoft.CognitiveServices`, RBAC, modelo, versão, quota e capacidade confirmados no Portal/Foundry.

### Descoberta pelo Portal

1. Abra [Microsoft Foundry](https://ai.azure.com) e localize recurso/projeto aprovado.
2. Em **Models**, confirme modelo, versão, tipo de deployment e capacidade para a subscription/região.
3. Se não houver capacidade, não crie recurso paralelo para contornar limite. Use playground/ambiente do instrutor.
4. Revise custo, TPM/RPM, métricas, 429 e budget.

### O que o código já faz e o que ainda falta

- Existe endpoint `POST /api/ai/recommendations`.
- Ele fica desabilitado enquanto `AI_ENABLED` não for `true`.
- `src/ai/client.js` exige `AZURE_OPENAI_ENDPOINT`, `AZURE_OPENAI_DEPLOYMENT` e **API key** (`AZURE_OPENAI_API_KEY`).
- O código atual **não implementa autenticação por identidade gerenciada** para OpenAI.
- `infra/k8s/secretproviderclass.yaml` é apenas um modelo com placeholders; ele não configura identidade, Key Vault nem segredo automaticamente.

Portanto, provisionar Foundry não significa que a aplicação já está integrada de forma segura. A integração só deve ocorrer quando o instrutor aprovar um mecanismo de segredo (por exemplo, Key Vault) e as alterações de código necessárias.

**validação:** confirme provider, deployment `Succeeded`, identidade/RBAC e chamada sem dados sensíveis somente em ambiente aprovado.

**Falhas e contingência:** quota/modelo/região indisponível -> playground ou demonstração; não prometer integração de código que não foi implementada.

**Custo e cleanup:** custo varia por modelo/capacidade/uso. Configure limites e alertas antes de carga real.

## Lab 13 - Build e publicação no AKS

**Objetivo:** construir imagem no ACR, preparar manifestos e fazer rollout seguro.

**Antes de começar:** Labs 10-11 concluídos em cluster aprovado; credenciais AKS; ACR login server; mecanismo seguro de segredo SQL definido. Sem segredo seguro, não prometa health SQL.

### Passos

1. Confira manifestos:

   ```bash
   ls infra/k8s
   cat infra/k8s/configmap.yaml
   ```

   `configmap.yaml` define `DB_PROVIDER=sqlserver`. `deployment.yaml` contém placeholders `ACR_NAME` e `IMAGE_TAG`; nunca aplique sem substituí-los.

2. Crie namespace e ConfigMap:

   ```bash
   kubectl apply -f infra/k8s/namespace.yaml
   kubectl apply -f infra/k8s/configmap.yaml
   ```

3. Build remoto no ACR com tag imutável:

   ```bash
   ACR_NAME="[definir]"
   IMAGE_TAG="[definir: tag-imutavel]"
   az acr build \
     --registry "$ACR_NAME" \
     --image "azure-shop:$IMAGE_TAG" \
     --file Dockerfile \
     .
   ```

4. **Segredo SQL:** `infra/k8s/secret.example.yaml` é somente esquema. Nunca copie valores reais para esse arquivo nem crie `secret.yaml` no repositório. Use mecanismo aprovado pelo instrutor, como integração Key Vault/CSI devidamente configurada, ou uma criação interativa segura fora do checkout. Sem isso, o Deployment configurado para SQL não deve ser considerado pronto.
5. Gere manifest temporário fora do Git:

   ```bash
   mkdir -p /tmp/azure-shop-manifests
   sed \
     -e "s|ACR_NAME|$ACR_NAME|g" \
     -e "s|IMAGE_TAG|$IMAGE_TAG|g" \
     infra/k8s/deployment.yaml \
     > /tmp/azure-shop-manifests/deployment.yaml
   ```

6. Revise o arquivo temporário e aplique somente quando placeholders e segredo seguro estiverem resolvidos:

   ```bash
   kubectl apply -f /tmp/azure-shop-manifests/deployment.yaml
   kubectl apply -f infra/k8s/service.yaml
   kubectl -n azure-shop rollout status deployment/azure-shop --timeout=5m
   kubectl -n azure-shop get pods,service
   kubectl -n azure-shop logs deployment/azure-shop --tail=100
   ```

7. Aguarde `EXTERNAL-IP` no Service `azure-shop`, abra `http://[definir: external-ip]`, valide `/api/health`, catálogo, carrinho e checkout.

**Resultado esperado:** duas réplicas prontas, probes em `/api/health`, Service LoadBalancer e imagem do ACR.

**Falhas e contingência:** placeholder restante, `ImagePullBackOff`, segredo SQL ausente, health 503 ou External IP pendente -> pare, leia eventos/logs e use ambiente compartilhado. Copilot pode explicar logs, mas não deve executar comandos ou corrigir sem revisão.

**Custo e cleanup:** ACR Build, imagens, AKS e LoadBalancer podem cobrar. Remova manifestos temporários em `/tmp` e siga cleanup aprovado para recursos Azure.

## Matriz de aceite por Lab

| Lab | Pré-requisito | Ação esperada | Evidência de sucesso | Falha comum | Contingência | Custo/quota |
|---|---|---|---|---|---|---|
| 1 | Subscription/RBAC/budget | Portal: RG e Tags | RG East US e Activity Log | RBAC/policy | Ambiente instrutor | Recursos posteriores geram custo |
| 2 | Lab 1 | Portal: VNet/subnets/NSG sem Inbound | Prefixos/delegação/NSG associado | Prefixo/NSG errado | Diagrama/demonstração | Rede básico |
| 3 | SKU/CIDR/PuTTY | Portal: VM, PIP, regra SSH `/32` e teste local na VM | SSH restrito, `npm test`, health local | `SkuNotAvailable`/SSH | Outra SKU aprovada | VM/PIP/disco |
| 4 | VM e Copilot | VS Code: três prompts, diff e testes | diff humano e testes aprovados | Sugestão/teste falho | Revisão manual | Sem custo Azure |
| 5 | Quota App Service/branch Git | Portal + ZIP Cloud Shell | Health/catálogo/carrinho | Quota/runtime/ZIP | Ambiente compartilhado | Plano App Service |
| 6 | Canal seguro SQL | Portal + schema | Health `sqlserver` | Credencial/schema | SQLite demonstrativo | SQL/armazenamento |
| 7 | SQL e VNet | Portal: PE/DNS | PE Approved/link DNS | Subnet/DNS errada | demonstração | Private Endpoint |
| 8 | Subnet delegada | Portal: VNet Integration | DNS/TCP/health | SKU/DNS/NSG | Ambiente compartilhado | Plano/PE |
| 9 | Dia 1 identificado | Cloud Shell: plan | Sem recriar Dia 1 | Data source falha | Corrigir nomes | Plan não cria custo |
| 10 | Quota AKS/ACR | Terraform fase 1 | ACR/AKS/AcrPull | Quota/RBAC | Plano/manifests | AKS/ACR |
| 11 | AKS pronto | Terraform fase 2 | Peering/DNS/NSG | Prefixo/DNS | Diagrama/cluster compartilhado | Rede/cluster |
| 12 | Provider/modelo/quota | Portal Foundry | Deployment/limites | 429/quota | Playground | IA por uso/capacidade |
| 13 | ACR/AKS/segredo seguro | ACR Build + rollout | Health/UI | Segredo/imagem/IP | Ambiente compartilhado | Build/AKS/LB |

## Troubleshooting e cleanup

| Sintoma | Causa provável | Correção segura |
|---|---|---|
| `SkuNotAvailable` | Capacidade regional dinâmica | Consulte Portal/`az vm list-skus`, escolha alternativa aprovada ou use demonstração. |
| Quota B1 insuficiente | Limite de App Service da subscription | Valide quota antes do Lab 5; use SKU/região/subscription aprovada ou ambiente compartilhado. |
| `terraform plan` cria Dia 1 | Nome/RG/data source divergente | não aplique; corrija `terraform.tfvars` não secreto. |
| SQL health 503 | Credencial, schema, DNS ou TCP | não exponha senha; valide schema, PE, DNS, VNet Integration e 1433 em ordem. |
| Pod `ImagePullBackOff` | Imagem/tag/ACR Pull | Confirme ACR, tag e role `AcrPull`; leia eventos. |
| AI 501/503 | AI desabilitada ou configuração incompleta | É esperado sem endpoint/deployment/API key aprovada; não invente integração. |

Ao terminar um Lab com recursos reais:

1. Registre custo, recursos e evidências não sensíveis.
2. Remova apenas recursos criados para o Lab e aprovados pelo instrutor.
3. não remova RG, VNet, SQL, ACR ou AKS compartilhados sem confirmar dependência de outros alunos.
4. Remova arquivos temporários, ZIPs, planos e state locais; não os versione.

## Referências oficiais

- [Portal do Azure](https://portal.azure.com/)
- [Azure Cloud Shell](https://learn.microsoft.com/azure/cloud-shell/overview)
- [App Service no Linux](https://learn.microsoft.com/azure/app-service/quickstart-nodejs)
- [VNet Integration do App Service](https://learn.microsoft.com/azure/app-service/overview-vnet-integration)
- [Azure SQL com Private Endpoint](https://learn.microsoft.com/azure/azure-sql/database/private-endpoint-overview)
- [DNS para Private Endpoint](https://learn.microsoft.com/azure/private-link/private-endpoint-dns)
- [Azure Kubernetes Service](https://learn.microsoft.com/azure/aks/)
- [Terraform AzureRM](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs)
