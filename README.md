# AzureShop — Imersão Arquiteto Azure Cloud & AI

Material da aplicação AzureShop para os laboratórios da Imersão Arquiteto Azure.

## Comece pelo workshop

Leia o [guia completo do workshop](docs/WORKSHOP.md). Ele reúne os pré-requisitos, a sequência dos laboratórios e as orientações de segurança e custo.

## Obter o projeto

- **[Download ZIP (não exige Git)](https://github.com/highexpert-tecnologia/azureshop/archive/refs/heads/main.zip):** baixe o projeto sem instalar Git.
- **Clone com Git:** `git clone https://github.com/highexpert-tecnologia/azureshop.git`

O caminho padrão do workshop usa o [Portal do Azure](https://portal.azure.com/) e o [Azure Cloud Shell](https://learn.microsoft.com/azure/cloud-shell/overview), reduzindo instalações locais. Você não precisa executar a aplicação localmente para acompanhar o Dia 1.

## Conteúdo do repositório

- `docs/`: workshop, arquitetura e diagramas sanitizados.
- `public/` e `src/`: frontend e API da AzureShop.
- `infra/terraform/`: infraestrutura didática em Terraform e `terraform.tfvars.example`.
- `infra/k8s/`, `infra/sql/` e `infra/vm/`: manifestos, esquema de dados e material da etapa de VM.
- `test/`: testes automatizados da aplicação.

## Configuração segura

Use `.env.example` e `infra/terraform/terraform.tfvars.example` apenas como modelos. Para Terraform, crie uma cópia local de `terraform.tfvars.example` chamada `terraform.tfvars`, informe somente valores aprovados e nunca versione esse arquivo.

Não publique nem compartilhe `.env`, `terraform.tfvars`, estados Terraform, chaves, tokens, senhas, connection strings, bancos locais ou arquivos de segredo do Kubernetes. Revise custos, permissões e região com o instrutor antes de criar recursos Azure.

No modelo oficial do workshop, o Dia 1 cria RG, VNet, App Service, SQL, Private Endpoint e DNS pelo Portal. O Terraform do Dia 2 consulta esses recursos como dados e cria somente ACR, AKS e a conectividade nova em duas fases. Consulte [Bloqueios conhecidos e como resolver](docs/WORKSHOP.md#bloqueios-conhecidos-e-como-resolver) antes de executar um plano.

Consulte também a [arquitetura de referência](docs/ARCHITECTURE.md).
