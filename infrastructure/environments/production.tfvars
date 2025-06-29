# Production environment configuration
# Optimized for high availability, security, and performance

environment   = "production"
namespace     = "open-agent-platform"
instance_name = "oapf-prod"

# Registry configuration - highly available
registry_replicas = 3
registry_image    = "ghcr.io/open-agent-platform/registry"
registry_tag      = "1.0.0"  # Use specific version in production

registry_resources = {
  requests = {
    cpu    = "200m"
    memory = "256Mi"
  }
  limits = {
    cpu    = "1000m"
    memory = "1Gi"
  }
}

# Storage - production-grade with specific storage class
persistence_enabled = true
storage_class      = "fast-ssd"
storage_size       = "100Gi"

# Observability - full monitoring stack
observability_enabled     = true
prometheus_enabled        = true
prometheus_retention_days = 30
prometheus_storage_size   = "500Gi"
grafana_enabled          = true
grafana_admin_password   = ""  # Set via environment variable
jaeger_enabled           = true

# Security - maximum security for production
rbac_enabled             = true
mtls_enabled            = true
network_policies_enabled = true
pod_security_standards   = "restricted"

# Production features
sample_agents_enabled = false  # No sample agents in production
agent_auto_scaling   = true

# Networking - external access with TLS
ingress_enabled = true
ingress_class   = "nginx"
ingress_host    = "agents.company.com"
tls_enabled     = true

# External services - use managed cloud services
external_redis_enabled      = true
external_redis_url         = ""  # Set via environment variable
external_postgresql_enabled = true
external_postgresql_url     = ""  # Set via environment variable