# Input variables for Open Agent Platform infrastructure

# Core configuration
variable "environment" {
  description = "Environment name (development, staging, production)"
  type        = string
  default     = "development"
  
  validation {
    condition     = contains(["development", "staging", "production"], var.environment)
    error_message = "Environment must be one of: development, staging, production."
  }
}

variable "namespace" {
  description = "Kubernetes namespace for the platform"
  type        = string
  default     = "open-agent-platform"
}

variable "instance_name" {
  description = "Instance name for this deployment"
  type        = string
  default     = "oapf"
}

variable "platform_version" {
  description = "Platform version to deploy"
  type        = string
  default     = "1.0.0"
}

# Registry configuration
variable "registry_replicas" {
  description = "Number of registry replicas"
  type        = number
  default     = 1
  
  validation {
    condition     = var.registry_replicas >= 1 && var.registry_replicas <= 10
    error_message = "Registry replicas must be between 1 and 10."
  }
}

variable "registry_image" {
  description = "Registry container image"
  type        = string
  default     = "ghcr.io/open-agent-platform/registry"
}

variable "registry_tag" {
  description = "Registry container image tag"
  type        = string
  default     = "latest"
}

variable "registry_resources" {
  description = "Resource limits and requests for registry pods"
  type = object({
    requests = object({
      cpu    = string
      memory = string
    })
    limits = object({
      cpu    = string
      memory = string
    })
  })
  default = {
    requests = {
      cpu    = "100m"
      memory = "128Mi"
    }
    limits = {
      cpu    = "500m"
      memory = "512Mi"
    }
  }
}

# Storage configuration
variable "persistence_enabled" {
  description = "Enable persistent storage for registry"
  type        = bool
  default     = true
}

variable "storage_class" {
  description = "Storage class for persistent volumes"
  type        = string
  default     = ""
}

variable "storage_size" {
  description = "Size of persistent volume for registry"
  type        = string
  default     = "10Gi"
}

# Observability configuration
variable "observability_enabled" {
  description = "Enable observability stack (Prometheus, Grafana, Jaeger)"
  type        = bool
  default     = true
}

variable "prometheus_enabled" {
  description = "Enable Prometheus monitoring"
  type        = bool
  default     = true
}

variable "prometheus_retention_days" {
  description = "Prometheus data retention period in days"
  type        = number
  default     = 15
}

variable "prometheus_storage_size" {
  description = "Prometheus storage size"
  type        = string
  default     = "50Gi"
}

variable "grafana_enabled" {
  description = "Enable Grafana dashboards"
  type        = bool
  default     = true
}

variable "grafana_admin_password" {
  description = "Grafana admin password"
  type        = string
  default     = ""
  sensitive   = true
}

variable "jaeger_enabled" {
  description = "Enable Jaeger distributed tracing"
  type        = bool
  default     = true
}

# Security configuration
variable "rbac_enabled" {
  description = "Enable RBAC security policies"
  type        = bool
  default     = true
}

variable "mtls_enabled" {
  description = "Enable mutual TLS for agent communication"
  type        = bool
  default     = true
}

variable "network_policies_enabled" {
  description = "Enable Kubernetes network policies"
  type        = bool
  default     = true
}

variable "pod_security_standards" {
  description = "Pod Security Standards level (privileged, baseline, restricted)"
  type        = string
  default     = "restricted"
  
  validation {
    condition     = contains(["privileged", "baseline", "restricted"], var.pod_security_standards)
    error_message = "Pod security standards must be one of: privileged, baseline, restricted."
  }
}

# Agent configuration
variable "sample_agents_enabled" {
  description = "Deploy sample agents for demonstration"
  type        = bool
  default     = true
}

variable "agent_auto_scaling" {
  description = "Enable horizontal pod autoscaling for agents"
  type        = bool
  default     = false
}

# Networking configuration
variable "ingress_enabled" {
  description = "Enable ingress for external access"
  type        = bool
  default     = false
}

variable "ingress_class" {
  description = "Ingress class to use"
  type        = string
  default     = "nginx"
}

variable "ingress_host" {
  description = "Hostname for ingress"
  type        = string
  default     = "oapf.local"
}

variable "tls_enabled" {
  description = "Enable TLS for ingress"
  type        = bool
  default     = true
}

# External services configuration
variable "external_redis_enabled" {
  description = "Use external Redis service"
  type        = bool
  default     = false
}

variable "external_redis_url" {
  description = "External Redis connection URL"
  type        = string
  default     = ""
  sensitive   = true
}

variable "external_postgresql_enabled" {
  description = "Use external PostgreSQL service"
  type        = bool
  default     = false
}

variable "external_postgresql_url" {
  description = "External PostgreSQL connection URL"
  type        = string
  default     = ""
  sensitive   = true
}