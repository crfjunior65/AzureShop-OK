# 🏗️ Infraestrutura como Código (Terraform) — AzureShop

🚀 **Status: Infraestrutura 100% Automatizada com Terraform!**

Este documento detalha a automatização completa da infraestrutura do projeto AzureShop, migrando de um fluxo manual para um modelo 100% gerenciado via **Terraform**.

---

## 🚀 Tecnologias Utilizadas

- ☁️ **Azure**
- 🏗️ **Terraform**
- ☸️ **AKS (Azure Kubernetes Service)**
- 📦 **ACR (Azure Container Registry)**
- 💾 **Azure SQL Database**
- 🔒 **NSG (Network Security Group)**
- 🌐 **VNet (Virtual Network)**

---

## 🛠️ Processo de Automação

### 1. Sucesso na Automação
Implementamos com sucesso a **infraestrutura 100% gerenciada via Terraform**. Todos os componentes da rede, armazenamento de containers, orquestração e banco de dados agora fazem parte do ciclo de vida completo do IaC (criação, atualização e destruição).

### 2. Refatoração de Módulos
- **`modules/network`**: Refatorado para criar VNet, Subnets e NSG ao invés de apenas consumi-los via `data sources`.
- **`modules/sql-database`**: Refatorado para criar o SQL Server, Database e Private Endpoint, utilizando autenticação exclusiva via **Entra ID (Azure AD)**.

### 3. Ciclo de Vida
Garantimos a total reprodutibilidade do ambiente através de um fluxo limpo: destruição controlada de recursos legados e provisionamento total a partir do código versionado.

---
*Nota: Este arquivo documenta a infraestrutura gerida especificamente por esta pasta. Para detalhes operacionais de cada passo, consulte `docs/automation_runbook.md`.*
