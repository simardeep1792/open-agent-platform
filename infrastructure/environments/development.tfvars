# Development environment configuration
# Optimized for local development and testing

environment   = "development"
namespace     = "oapf-dev"
instance_name = "oapf-dev"

# Registry configuration - minimal for development
registry_replicas = 1
registry_image    = "ghcr.io/open-agent-platform/registry"
registry_tag      = "latest"

registry_resources = {
  requests = {
    cpu    = "50m"
    memory = "64Mi"
  }
  limits = {
    cpu    = "200m"
    memory = "256Mi"
  }
}

# Storage - use default storage class
persistence_enabled = true
storage_class      = ""
storage_size       = "5Gi"

# Observability - lightweight for development
observability_enabled     = true
prometheus_enabled        = true
prometheus_retention_days = 7
prometheus_storage_size   = "10Gi"
grafana_enabled          = true
grafana_admin_password   = "admin123"
jaeger_enabled           = true

# Security - relaxed for development
rbac_enabled             = true
mtls_enabled            = false  # Disabled for easier development
network_policies_enabled = false  # Disabled for easier debugging
pod_security_standards   = "baseline"

# Development features
sample_agents_enabled = true
agent_auto_scaling   = false

# Networking - no external access needed
ingress_enabled = false
tls_enabled     = false

# External services - use in-cluster for development
external_redis_enabled      = false
external_postgresql_enabled = false