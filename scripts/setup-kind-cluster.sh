#!/bin/bash
# Complete Kind cluster setup for Open Agent Platform
# One-command setup for contributors and local development

set -e

# Configuration
CLUSTER_NAME="open-agent-platform"
NAMESPACE="oapf-dev"
CONTEXT_NAME="kind-${CLUSTER_NAME}"

# Colors for output
if [[ -t 1 ]]; then
    RED='\033[0;31m'
    GREEN='\033[0;32m'
    YELLOW='\033[1;33m'
    BLUE='\033[0;34m'
    NC='\033[0m' # No Color
else
    RED=''
    GREEN=''
    YELLOW=''
    BLUE=''
    NC=''
fi

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Check if kind is installed
    if ! command -v kind &> /dev/null; then
        log_error "kind is not installed. Please install it first:"
        echo "  brew install kind  # macOS"
        echo "  # or download from https://kind.sigs.k8s.io/docs/user/quick-start/"
        exit 1
    fi
    
    # Check if kubectl is installed
    if ! command -v kubectl &> /dev/null; then
        log_error "kubectl is not installed. Please install it first:"
        echo "  brew install kubectl  # macOS"
        exit 1
    fi
    
    # Check if helm is installed
    if ! command -v helm &> /dev/null; then
        log_error "helm is not installed. Please install it first:"
        echo "  brew install helm  # macOS"
        exit 1
    fi
    
    # Check if Docker is running
    if ! docker info &> /dev/null; then
        log_error "Docker is not running. Please start Docker Desktop or Docker daemon."
        exit 1
    fi
    
    log_success "All prerequisites are met"
}

cleanup_existing_cluster() {
    if kind get clusters | grep -q "^${CLUSTER_NAME}$"; then
        log_warning "Existing cluster '${CLUSTER_NAME}' found. Cleaning up..."
        kind delete cluster --name "${CLUSTER_NAME}"
        log_success "Existing cluster deleted"
    fi
}

create_cluster() {
    log_info "Creating Kind cluster '${CLUSTER_NAME}'..."
    
    # Ensure we're in the project root
    if [[ ! -f "dev/kind-config.yaml" ]]; then
        log_error "kind-config.yaml not found. Please run this script from the project root."
        exit 1
    fi
    
    # Create the cluster
    kind create cluster --config dev/kind-config.yaml --wait 300s
    
    # Wait for cluster to be fully ready
    log_info "Waiting for cluster to be ready..."
    kubectl wait --for=condition=Ready nodes --all --timeout=300s
    
    log_success "Kind cluster created and ready"
}

setup_kubectl_context() {
    log_info "Setting up kubectl context..."
    
    # Set the current context
    kubectl config use-context "${CONTEXT_NAME}"
    
    # Verify connection
    kubectl cluster-info --context "${CONTEXT_NAME}"
    
    log_success "kubectl context configured for '${CONTEXT_NAME}'"
}

install_platform_dependencies() {
    log_info "Installing platform dependencies..."
    
    # Install ingress controller for local access
    log_info "Installing NGINX ingress controller..."
    kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/main/deploy/static/provider/kind/deploy.yaml
    kubectl wait --namespace ingress-nginx \
        --for=condition=ready pod \
        --selector=app.kubernetes.io/component=controller \
        --timeout=300s
    
    # Install cert-manager for TLS (optional but good for testing)
    log_info "Installing cert-manager..."
    kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.13.3/cert-manager.yaml
    kubectl wait --namespace cert-manager \
        --for=condition=ready pod \
        --selector=app.kubernetes.io/instance=cert-manager \
        --timeout=300s
    
    # Create platform namespace
    log_info "Creating platform namespace..."
    kubectl create namespace "${NAMESPACE}" --dry-run=client -o yaml | kubectl apply -f -
    kubectl label namespace "${NAMESPACE}" \
        pod-security.kubernetes.io/enforce=baseline \
        pod-security.kubernetes.io/audit=baseline \
        pod-security.kubernetes.io/warn=baseline
    
    log_success "Platform dependencies installed"
}

deploy_platform() {
    log_info "Deploying Open Agent Platform..."
    
    # Apply CRDs first
    kubectl apply -f k8s/base/agent-crd.yaml
    
    # Create development values file if it doesn't exist
    if [[ ! -f "dev/values-dev.yaml" ]]; then
        log_info "Creating development values file..."
        cat > dev/values-dev.yaml << EOF
# Development values for Open Agent Platform
platform:
  environment: development
  logLevel: debug

registry:
  replicas: 1
  resources:
    requests:
      cpu: 50m
      memory: 64Mi
    limits:
      cpu: 200m
      memory: 256Mi

observability:
  enabled: true
  prometheus:
    enabled: true
    retention: 7d
    storage: 5Gi
  grafana:
    enabled: true
    adminPassword: admin123

security:
  mtls:
    enabled: false  # Simplified for local development
  networkPolicies:
    enabled: false  # Easier debugging locally

# Enable sample agents for demonstration
sampleAgents:
  enabled: true
  
# Service configuration for Kind cluster
services:
  registry:
    type: NodePort
    nodePort: 30080
  dashboard:
    type: NodePort
    nodePort: 30081
  grafana:
    type: NodePort
    nodePort: 30082
  prometheus:
    type: NodePort
    nodePort: 30083
EOF
    fi
    
    # Deploy using Helm
    helm upgrade --install "${CLUSTER_NAME}" helm/open-agent-platform/ \
        --namespace "${NAMESPACE}" \
        --values helm/open-agent-platform/values.yaml \
        --values dev/values-dev.yaml \
        --wait --timeout 600s
    
    log_success "Platform deployed"
}

setup_port_forwarding() {
    log_info "Setting up port forwarding..."
    
    # Create port forwarding script
    cat > dev/start-port-forwarding.sh << 'EOF'
#!/bin/bash
# Port forwarding script for Open Agent Platform development

NAMESPACE="oapf-dev"

echo "Starting port forwarding for Open Agent Platform..."
echo "Press Ctrl+C to stop all port forwards"

# Function to cleanup background processes
cleanup() {
    echo "Stopping port forwarding..."
    jobs -p | xargs -r kill
    exit 0
}

trap cleanup SIGINT SIGTERM

# Start port forwards in background
kubectl port-forward -n ${NAMESPACE} svc/open-agent-platform-registry 8080:80 &
kubectl port-forward -n ${NAMESPACE} svc/open-agent-platform-dashboard 8081:80 &
kubectl port-forward -n ${NAMESPACE} svc/open-agent-platform-grafana 3000:80 &
kubectl port-forward -n ${NAMESPACE} svc/open-agent-platform-prometheus 9090:80 &

echo ""
echo "Port forwarding active:"
echo "  Agent Registry: http://localhost:8080"
echo "  Dashboard:      http://localhost:8081"
echo "  Grafana:        http://localhost:3000"
echo "  Prometheus:     http://localhost:9090"
echo ""
echo "Press Ctrl+C to stop"

# Wait for all background processes
wait
EOF
    
    chmod +x dev/start-port-forwarding.sh
    
    log_success "Port forwarding script created at dev/start-port-forwarding.sh"
}

verify_deployment() {
    log_info "Verifying deployment..."
    
    # Check pods
    echo ""
    echo "Pod Status:"
    kubectl get pods -n "${NAMESPACE}" -o wide
    
    # Check services
    echo ""
    echo "Service Status:"
    kubectl get services -n "${NAMESPACE}"
    
    # Check agents
    echo ""
    echo "Agent Status:"
    kubectl get agents -n "${NAMESPACE}" 2>/dev/null || echo "No agents deployed yet"
    
    # Check ingress
    echo ""
    echo "Ingress Status:"
    kubectl get ingress -n "${NAMESPACE}" 2>/dev/null || echo "No ingress configured"
    
    log_success "Deployment verification complete"
}

print_next_steps() {
    echo ""
    log_success "Open Agent Platform is ready for development!"
    echo ""
    echo "Quick start commands:"
    echo "  # Start port forwarding (run in separate terminal)"
    echo "  ./dev/start-port-forwarding.sh"
    echo ""
    echo "  # Access services:"
    echo "  Agent Registry: http://localhost:8080"
    echo "  Dashboard:      http://localhost:8081"
    echo "  Grafana:        http://localhost:3000 (admin/admin123)"
    echo "  Prometheus:     http://localhost:9090"
    echo ""
    echo "  # Useful kubectl commands:"
    echo "  kubectl get pods -n ${NAMESPACE}"
    echo "  kubectl get agents -n ${NAMESPACE}"
    echo "  kubectl logs -f deployment/open-agent-platform-registry -n ${NAMESPACE}"
    echo ""
    echo "  # Cleanup when done:"
    echo "  kind delete cluster --name ${CLUSTER_NAME}"
    echo ""
}

main() {
    echo "Open Agent Platform - Kind Cluster Setup"
    echo "========================================"
    echo ""
    
    check_prerequisites
    cleanup_existing_cluster
    create_cluster
    setup_kubectl_context
    install_platform_dependencies
    deploy_platform
    setup_port_forwarding
    verify_deployment
    print_next_steps
}

# Allow script to be sourced for testing
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi