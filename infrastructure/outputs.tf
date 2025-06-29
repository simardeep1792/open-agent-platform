# Output values for Open Agent Platform infrastructure

output "namespace" {
  description = "Kubernetes namespace where the platform is deployed"
  value       = kubernetes_namespace.oapf.metadata[0].name
}

output "platform_name" {
  description = "Name of the platform deployment"
  value       = local.platform_name
}

output "environment" {
  description = "Environment name"
  value       = local.environment
}

output "instance_name" {
  description = "Instance name for this deployment"
  value       = var.instance_name
}

# Registry service information
output "registry_service_name" {
  description = "Name of the agent registry service"
  value       = module.kubernetes.registry_service_name
}

output "registry_service_port" {
  description = "Port of the agent registry service"
  value       = module.kubernetes.registry_service_port
}

output "registry_endpoint" {
  description = "Internal endpoint for agent registry"
  value       = "http://${module.kubernetes.registry_service_name}.${kubernetes_namespace.oapf.metadata[0].name}.svc.cluster.local:${module.kubernetes.registry_service_port}"
}

# Dashboard access information
output "dashboard_service_name" {
  description = "Name of the dashboard service"
  value       = module.kubernetes.dashboard_service_name
}

output "dashboard_service_port" {
  description = "Port of the dashboard service"
  value       = module.kubernetes.dashboard_service_port
}

# Observability endpoints
output "observability_endpoints" {
  description = "Observability service endpoints"
  value = var.observability_enabled ? {
    prometheus = try(module.observability[0].prometheus_endpoint, null)
    grafana    = try(module.observability[0].grafana_endpoint, null)
    jaeger     = try(module.observability[0].jaeger_endpoint, null)
  } : {}
}

# Security configuration
output "security_config" {
  description = "Security configuration status"
  value = {
    rbac_enabled             = var.rbac_enabled
    mtls_enabled            = var.mtls_enabled
    network_policies_enabled = var.network_policies_enabled
    pod_security_standards   = var.pod_security_standards
  }
}

# Agent information
output "sample_agents" {
  description = "Information about deployed sample agents"
  value = var.sample_agents_enabled ? {
    cloudy_agent = {
      name      = "cloudy-agent"
      namespace = kubernetes_namespace.oapf.metadata[0].name
      selector  = "app.kubernetes.io/name=cloudy-agent"
    }
  } : {}
}

# Connection information for local development
output "local_development" {
  description = "Commands for local development access"
  value = {
    dashboard_port_forward = "kubectl port-forward svc/${module.kubernetes.dashboard_service_name} 8080:${module.kubernetes.dashboard_service_port} -n ${kubernetes_namespace.oapf.metadata[0].name}"
    registry_port_forward  = "kubectl port-forward svc/${module.kubernetes.registry_service_name} 8081:${module.kubernetes.registry_service_port} -n ${kubernetes_namespace.oapf.metadata[0].name}"
    get_agents            = "kubectl get agents -n ${kubernetes_namespace.oapf.metadata[0].name}"
    get_pods              = "kubectl get pods -n ${kubernetes_namespace.oapf.metadata[0].name}"
  }
}

# Helm values for additional customization
output "helm_values_reference" {
  description = "Reference Helm values for this deployment"
  value = {
    platform = {
      environment = local.environment
      namespace   = kubernetes_namespace.oapf.metadata[0].name
      version     = var.platform_version
    }
    registry = {
      replicas  = var.registry_replicas
      image     = var.registry_image
      tag       = var.registry_tag
      resources = var.registry_resources
    }
    persistence = {
      enabled      = var.persistence_enabled
      storageClass = var.storage_class
      size         = var.storage_size
    }
    observability = {
      enabled    = var.observability_enabled
      prometheus = var.prometheus_enabled
      grafana    = var.grafana_enabled
      jaeger     = var.jaeger_enabled
    }
    security = {
      rbac           = var.rbac_enabled
      mtls           = var.mtls_enabled
      networkPolicies = var.network_policies_enabled
    }
  }
}