# Open Agent Platform Infrastructure
# Production-ready OpenTofu configuration for CNCF-aligned deployment

terraform {
  required_version = ">= 1.6"
  
  required_providers {
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.23"
    }
    helm = {
      source  = "hashicorp/helm"
      version = "~> 2.11"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.5"
    }
  }

  # Configure remote state for production
  # backend "s3" {
  #   bucket         = "oapf-terraform-state"
  #   key            = "infrastructure/terraform.tfstate"
  #   region         = "us-west-2"
  #   encrypt        = true
  #   dynamodb_table = "oapf-terraform-locks"
  # }
}

# Local variables for configuration
locals {
  platform_name = "open-agent-platform"
  environment   = var.environment
  
  common_labels = {
    "app.kubernetes.io/name"       = local.platform_name
    "app.kubernetes.io/instance"   = var.instance_name
    "app.kubernetes.io/version"    = var.platform_version
    "app.kubernetes.io/managed-by" = "opentofu"
    "environment"                  = local.environment
  }

  common_annotations = {
    "meta.helm.sh/release-name"      = var.instance_name
    "meta.helm.sh/release-namespace" = var.namespace
  }
}

# Create namespace
resource "kubernetes_namespace" "oapf" {
  metadata {
    name = var.namespace
    
    labels = merge(local.common_labels, {
      "pod-security.kubernetes.io/enforce" = "restricted"
      "pod-security.kubernetes.io/audit"   = "restricted"
      "pod-security.kubernetes.io/warn"    = "restricted"
    })
    
    annotations = local.common_annotations
  }
}

# Platform core infrastructure
module "kubernetes" {
  source = "./modules/kubernetes"
  
  namespace        = kubernetes_namespace.oapf.metadata[0].name
  platform_name    = local.platform_name
  environment      = local.environment
  instance_name    = var.instance_name
  platform_version = var.platform_version
  
  # Agent registry configuration
  registry_replicas = var.registry_replicas
  registry_image    = var.registry_image
  registry_tag      = var.registry_tag
  
  # Resource limits
  registry_resources = var.registry_resources
  
  # Storage configuration
  persistence_enabled = var.persistence_enabled
  storage_class      = var.storage_class
  storage_size       = var.storage_size
  
  # Common labels and annotations
  common_labels      = local.common_labels
  common_annotations = local.common_annotations
  
  depends_on = [kubernetes_namespace.oapf]
}

# Observability stack
module "observability" {
  source = "./modules/observability"
  count  = var.observability_enabled ? 1 : 0
  
  namespace         = kubernetes_namespace.oapf.metadata[0].name
  platform_name     = local.platform_name
  environment       = local.environment
  
  # Prometheus configuration
  prometheus_enabled        = var.prometheus_enabled
  prometheus_retention_days = var.prometheus_retention_days
  prometheus_storage_size   = var.prometheus_storage_size
  
  # Grafana configuration
  grafana_enabled = var.grafana_enabled
  grafana_admin_password = var.grafana_admin_password
  
  # Jaeger tracing
  jaeger_enabled = var.jaeger_enabled
  
  # Common labels and annotations
  common_labels      = local.common_labels
  common_annotations = local.common_annotations
  
  depends_on = [module.kubernetes]
}

# Security and RBAC
module "security" {
  source = "./modules/security"
  
  namespace      = kubernetes_namespace.oapf.metadata[0].name
  platform_name = local.platform_name
  environment    = local.environment
  
  # RBAC configuration
  rbac_enabled = var.rbac_enabled
  
  # mTLS and certificates
  mtls_enabled = var.mtls_enabled
  
  # Network policies
  network_policies_enabled = var.network_policies_enabled
  
  # Pod security
  pod_security_standards = var.pod_security_standards
  
  # Common labels and annotations
  common_labels      = local.common_labels
  common_annotations = local.common_annotations
  
  depends_on = [kubernetes_namespace.oapf]
}