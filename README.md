<div align="center">

# 🛍️ AzureShop

### Imersão Arquiteto Azure — Cloud & AI

**E-commerce didático em Node.js para os laboratórios da Imersão Arquiteto Azure.**
Catálogo de produtos, checkout e integração com IA, provisionado no Azure com _Infrastructure as Code_.

<br />

<p align="center">
  <img src="https://img.shields.io/badge/Azure-0078D4?style=for-the-badge&logo=microsoft-azure&logoColor=white" alt="Azure" />
  <img src="https://img.shields.io/badge/Terraform-7B42BC?style=for-the-badge&logo=terraform&logoColor=white" alt="Terraform" />
  <img src="https://img.shields.io/badge/Kubernetes-326CE5?style=for-the-badge&logo=kubernetes&logoColor=white" alt="AKS" />
  <img src="https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=node.js&logoColor=white" alt="Node.js" />
</p>
<p align="center">
  <img src="https://img.shields.io/badge/Azure_Container_Registry-0078D4?style=for-the-badge&logo=microsoft-azure&logoColor=white" alt="ACR" />
  <img src="https://img.shields.io/badge/Azure_SQL-CC2927?style=for-the-badge&logo=microsoft-sql-server&logoColor=white" alt="SQL Database" />
  <img src="https://img.shields.io/badge/Network_Security_Group-0078D4?style=for-the-badge&logo=azure-networks&logoColor=white" alt="NSG" />
  <img src="https://img.shields.io/badge/Virtual_Network-0078D4?style=for-the-badge&logo=azure-networks&logoColor=white" alt="VNet" />
</p>

<br />

[📖 Workshop](docs/WORKSHOP.md) · [🏗️ Arquitetura](docs/ARCHITECTURE.md) · [🏗️ Infraestrutura](infra/terraform/README_INFRA.md) · [📥 Download ZIP](https://github.com/highexpert-tecnologia/azureshop/archive/refs/heads/main.zip)

</div>

---

## 📑 Sumário

- [🚀 Comece pelo workshop](#-comece-pelo-workshop)
- [📥 Obter o projeto](#-obter-o-projeto)
- [📂 Conteúdo do repositório](#-conteúdo-do-repositório)
- [🏛️ Modelo de infraestrutura](#️-modelo-de-infraestrutura)
- [🔒 Configuração segura](#-configuração-segura)
- [📚 Documentação relacionada](#-documentação-relacionada)

---

## 🚀 Comece pelo workshop

Leia o **[guia completo do workshop](docs/WORKSHOP.md)**. Ele reúne os pré-requisitos, a sequência dos laboratórios e as orientações de segurança e custo.

> 💡 O caminho padrão usa o [Portal do Azure](https://portal.azure.com/) e o [Azure Cloud Shell](https://learn.microsoft.com/azure/cloud-shell/overview), reduzindo instalações locais.
> **Você não precisa executar a aplicação localmente para acompanhar o Dia 1.**

---

## 📥 Obter o projeto

<table>
  <tr>
    <td>📦</td>
    <td><strong>Download ZIP</strong> — não exige Git</td>
    <td><a href="https://github.com/highexpert-tecnologia/azureshop/archive/refs/heads/main.zip">Baixar o projeto</a></td>
  </tr>
  <tr>
    <td>🔧</td>
    <td><strong>Clone com Git</strong></td>
    <td><code>git clone https://github.com/highexpert-tecnologia/azureshop.git</code></td>
  </tr>
</table>

---

## 📂 Conteúdo do repositório

| Caminho | Descrição |
| :--- | :--- |
| 📖 `docs/` | Workshop, arquitetura de referência e diagramas sanitizados |
| 🖥️ `public/` · `src/` | Frontend e API da AzureShop |
| 🏗️ `infra/terraform/` | Infraestrutura completa em Terraform e `terraform.tfvars.example` |
| ☸️ `infra/k8s/` · `infra/sql/` · `infra/vm/` | Manifestos, esquema de dados e material da etapa de VM |
| 🧪 `test/` | Testes automatizados da aplicação |

---

## 🏛️ Modelo de infraestrutura

🚀 **A infraestrutura é 100% provisionada e gerenciada via Terraform.** Todo o ciclo de vida (criação, atualização e destruição) é declarado em código versionado, garantindo total reprodutibilidade do ambiente.

| Componente | Serviço Azure |
| :--- | :--- |
| 🌐 **Rede** | VNet, Subnets e NSG |
| 💾 **Banco de dados** | Azure SQL Database + Private Endpoint (Private Link) |
| 📦 **Registro de imagens** | Azure Container Registry (ACR) |
| ☸️ **Orquestração** | Azure Kubernetes Service (AKS) |
| 🔒 **DNS privado** | `privatelink.database.windows.net` |

> 📌 Detalhes de cada módulo e do fluxo de execução estão em **[Infraestrutura como Código](infra/terraform/README_INFRA.md)**.
> Consulte **[Bloqueios conhecidos e como resolver](docs/WORKSHOP.md#bloqueios-conhecidos-e-como-resolver)** antes de executar qualquer plano.

---

## 🔒 Configuração segura

Use `.env.example` e `infra/terraform/terraform.tfvars.example` **apenas como modelos**. Para o Terraform, crie uma cópia local chamada `terraform.tfvars`, informe somente valores aprovados e **nunca versione esse arquivo**.

> ⚠️ **Não publique nem compartilhe:** `.env`, `terraform.tfvars`, estados Terraform, chaves, tokens, senhas, connection strings, bancos locais ou arquivos de segredo do Kubernetes.

Revise **custos, permissões e região** com o instrutor antes de criar recursos no Azure.

---

## 📚 Documentação relacionada

- 🏗️ **[Arquitetura de referência](docs/ARCHITECTURE.md)** — fluxos de aplicação, dados, identidade e observabilidade.
- 🏗️ **[Infraestrutura como Código](infra/terraform/README_INFRA.md)** — módulos Terraform e processo de automação.
- 📖 **[Guia do workshop](docs/WORKSHOP.md)** — passo a passo completo dos laboratórios.

---

<div align="center">

Feito com 💙 para a **Imersão Arquiteto Azure — Cloud & AI**

</div>
