#!/usr/bin/env bash
#
# Read-only Azure preflight for the AzureShop workshop.
# This script intentionally performs no create, update, delete, deploy, build,
# apply, or data-plane operations. It never reads or writes secrets.

set -euo pipefail
set +x

readonly LOCATION="${LAB_LOCATION:-eastus}"
readonly VM_SKUS="${LAB_VM_SKUS:-Standard_B1s,Standard_B1ms,Standard_B2ms,Standard_D2als_v7}"

require_command() {
  command -v "$1" >/dev/null 2>&1 || {
    printf 'ERROR: required command is unavailable: %s\n' "$1" >&2
    exit 1
  }
}

note() {
  printf '\n==> %s\n' "$*"
}

require_command az

if [[ -n "${LAB_SUBSCRIPTION_ID:-}" ]]; then
  az account set --subscription "$LAB_SUBSCRIPTION_ID"
fi

note "Azure account context"
az account show --query '{name:name,id:id,state:state,tenantId:tenantId,user:user.name}' --output jsonc

note "Provider registration states"
for provider in \
  Microsoft.Compute \
  Microsoft.Network \
  Microsoft.Web \
  Microsoft.Sql \
  Microsoft.ContainerRegistry \
  Microsoft.ContainerService \
  Microsoft.CognitiveServices; do
  az provider show --namespace "$provider" --query '{namespace:namespace,state:registrationState}' --output jsonc
done

note "VM sizes reported for $LOCATION"
IFS=',' read -r -a sku_array <<< "$VM_SKUS"
for sku in "${sku_array[@]}"; do
  az vm list-skus \
    --location "$LOCATION" \
    --resource-type virtualMachines \
    --size "$sku" \
    --query '[].{name:name,restrictions:restrictions}' \
    --output table
done
printf 'A listed SKU and restrictions=[] are not a capacity guarantee. Confirm again in the Portal before creation.\n'

note "Compute usage and limits reported for $LOCATION"
az vm list-usage --location "$LOCATION" --output table

note "App Service regional catalog and usage endpoint"
az appservice list-locations --sku B1 --query "[?name=='$LOCATION'].{name:name,available:available}" --output table || true
subscription_id="$(az account show --query id --output tsv)"
az rest \
  --method get \
  --url "https://management.azure.com/subscriptions/${subscription_id}/providers/Microsoft.Web/locations/${LOCATION}/usages?api-version=2022-03-01" \
  --query "value[].{name:name.value,current:currentValue,limit:limit,unit:unit}" \
  --output table || printf 'WARNING: App Service usage query was unavailable; confirm quota in the Portal.\n' >&2

note "AKS versions advertised for $LOCATION"
az aks get-versions --location "$LOCATION" --query '{orchestrators:orchestrators[].orchestratorVersion}' --output jsonc || true

note "Read-only preflight complete"
printf 'Review quota, policy, regional capacity and budget in the Portal before any separate authorization to create resources.\n'
