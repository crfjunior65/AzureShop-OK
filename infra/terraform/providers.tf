terraform {
  required_version = ">= 1.6.0"

  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = ">= 4.2, < 5.0"
    }
  }

  # Backend remoto opcional. Para colaboracao real, configure um Storage Account
  # aprovado antes de habilita-lo; nunca versione state local.
  # backend "azurerm" {}
}

provider "azurerm" {
  # subscription_id vem de ARM_SUBSCRIPTION_ID ou da variavel subscription_id.
  subscription_id = var.subscription_id != "" ? var.subscription_id : null

  features {
    key_vault {
      # Em laboratorio, permite recuperar/limpar Cofres de forma controlada.
      purge_soft_delete_on_destroy    = false
      recover_soft_deleted_key_vaults = true
    }
    resource_group {
      # Protege contra remocao acidental de RG com recursos dentro.
      prevent_deletion_if_contains_resources = true
    }
  }
}
