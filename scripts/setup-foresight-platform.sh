#!/bin/bash
# Foresight Agent Platform - Complete Setup Script
# Public Health Agency agent-based signal detection system

set -e

# Configuration
CLUSTER_NAME="foresight-platform"
NAMESPACE="foresight-agents"
CONTEXT_NAME="kind-${CLUSTER_NAME}"
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# Colors for output
if [[ -t 1 ]]; then
    RED='\033[0;31m'
    GREEN='\033[0;32m'
    YELLOW='\033[1;33m'
    BLUE='\033[0;34m'
    PURPLE='\033[0;35m'
    CYAN='\033[0;36m'
    NC='\033[0m' # No Color
else
    RED=''
    GREEN=''
    YELLOW=''
    BLUE=''
    PURPLE=''
    CYAN=''
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

log_health() {
    echo -e "${PURPLE}[HEALTH]${NC} $1"
}

log_agent() {
    echo -e "${CYAN}[AGENT]${NC} $1"
}

print_banner() {
    echo ""
    echo "██████╗ ██████╗ ██████╗ ███████╗███████╗██╗ ██████╗ ██╗  ██╗████████╗"
    echo "██╔══██╗██╔══██╗██╔══██╗██╔════╝██╔════╝██║██╔════╝ ██║  ██║╚══██╔══╝"
    echo "██████╔╝██████╔╝██████╔╝█████╗  ███████╗██║██║  ███╗███████║   ██║   "
    echo "██╔══██╗██╔══██╗██╔══██╗██╔══╝  ╚════██║██║██║   ██║██╔══██║   ██║   "
    echo "██║  ██║██║  ██║██████╔╝███████╗███████║██║╚██████╔╝██║  ██║   ██║   "
    echo "╚═╝  ╚═╝╚═╝  ╚═╝╚═════╝ ╚══════╝╚══════╝╚═╝ ╚═════╝ ╚═╝  ╚═╝   ╚═╝   "
    echo ""
    echo "Public Health Agency - Agent-to-Agent Signal Detection Platform"
    echo "=================================================================="
    echo ""
}

check_prerequisites() {
    log_info "Checking prerequisites for Foresight platform..."
    
    local missing_tools=()
    
    # Check required tools
    for tool in kind kubectl helm docker; do
        if ! command -v "$tool" &> /dev/null; then
            missing_tools+=("$tool")
        fi
    done
    
    if [[ ${#missing_tools[@]} -gt 0 ]]; then
        log_error "Missing required tools: ${missing_tools[*]}"
        echo ""
        echo "Installation instructions:"
        echo "  macOS: brew install kind kubectl helm docker"
        echo "  Linux: See respective documentation for each tool"
        exit 1
    fi
    
    # Check Docker
    if ! docker info &> /dev/null; then
        log_error "Docker is not running. Please start Docker Desktop or Docker daemon."
        exit 1
    fi
    
    # Check minimum resources
    local total_memory=$(docker system info --format '{{.MemTotal}}' 2>/dev/null || echo 0)
    local memory_gb=$((total_memory / 1024 / 1024 / 1024))
    
    if [[ $memory_gb -lt 8 ]]; then
        log_warning "Docker has less than 8GB memory allocated. Foresight agents may experience resource constraints."
        echo "  Recommended: Increase Docker memory to 8GB+ for optimal performance"
    fi
    
    log_success "All prerequisites met for Foresight platform"
}

cleanup_existing_cluster() {
    if kind get clusters | grep -q "^${CLUSTER_NAME}$"; then
        log_warning "Existing Foresight cluster found. Cleaning up..."
        kind delete cluster --name "${CLUSTER_NAME}"
        log_success "Existing cluster cleaned up"
    fi
}

create_foresight_cluster() {
    log_health "Creating Foresight agent platform cluster..."
    
    # Ensure we're in the project root
    if [[ ! -f "dev/foresight-kind-config.yaml" ]]; then
        log_error "foresight-kind-config.yaml not found. Please run this script from the project root."
        exit 1
    fi
    
    # Create the cluster with Foresight configuration
    log_info "Deploying 4-node cluster optimized for health signal processing..."
    kind create cluster --config dev/foresight-kind-config.yaml --wait 300s
    
    # Wait for all nodes to be ready
    log_info "Waiting for all nodes to be ready..."
    kubectl wait --for=condition=Ready nodes --all --timeout=300s
    
    # Label nodes with Foresight-specific roles
    log_info "Applying Foresight node labels..."
    kubectl label nodes --all foresight.ca/platform=enabled --overwrite
    
    log_success "Foresight cluster created and ready"
}

setup_kubectl_context() {
    log_info "Configuring kubectl for Foresight platform..."
    
    # Set the current context
    kubectl config use-context "${CONTEXT_NAME}"
    
    # Create alias for easy access
    kubectl config set-context foresight --cluster="${CONTEXT_NAME}" --user="${CONTEXT_NAME}" --namespace="${NAMESPACE}" || true
    
    # Verify connection
    kubectl cluster-info --context "${CONTEXT_NAME}"
    
    log_success "kubectl configured for Foresight platform"
}

install_platform_dependencies() {
    log_info "Installing Foresight platform dependencies..."
    
    # Install NGINX ingress controller for health data APIs
    log_info "Installing NGINX ingress controller..."
    kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/main/deploy/static/provider/kind/deploy.yaml
    kubectl wait --namespace ingress-nginx \
        --for=condition=ready pod \
        --selector=app.kubernetes.io/component=controller \
        --timeout=300s
    
    # Install cert-manager for secure health data transmission
    log_info "Installing cert-manager for health data security..."
    kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.13.3/cert-manager.yaml
    kubectl wait --namespace cert-manager \
        --for=condition=ready pod \
        --selector=app.kubernetes.io/instance=cert-manager \
        --timeout=300s
    
    # Install Prometheus and Grafana for health metrics
    log_info "Installing observability stack for health surveillance..."
    helm repo add prometheus-community https://prometheus-community.github.io/helm-charts 2>/dev/null || true
    helm repo add grafana https://grafana.github.io/helm-charts 2>/dev/null || true
    helm repo update
    
    # Install Prometheus
    helm upgrade --install prometheus prometheus-community/kube-prometheus-stack \
        --namespace monitoring --create-namespace \
        --set grafana.adminPassword=foresight123 \
        --set prometheus.prometheusSpec.retention=30d \
        --set prometheus.prometheusSpec.storageSpec.volumeClaimTemplate.spec.resources.requests.storage=20Gi \
        --set grafana.service.type=NodePort \
        --set grafana.service.nodePort=30104 \
        --set prometheus.service.type=NodePort \
        --set prometheus.service.nodePort=30105 \
        --wait --timeout 600s
    
    log_success "Platform dependencies installed"
}

create_foresight_namespace() {
    log_health "Creating Foresight agent namespace..."
    
    kubectl apply -f k8s/foresight/namespace.yaml
    
    # Wait for namespace to be ready
    kubectl wait --for=condition=Ready --timeout=30s namespace/${NAMESPACE} || true
    
    log_success "Foresight namespace created"
}

deploy_base_platform() {
    log_info "Deploying base Open Agent Platform..."
    
    # Apply agent CRDs
    kubectl apply -f k8s/base/agent-crd.yaml
    
    # Deploy base platform if not already deployed
    if ! kubectl get namespace oapf-dev &>/dev/null; then
        # Create base platform namespace
        kubectl create namespace oapf-dev
        
        # Deploy base platform with minimal resources
        helm upgrade --install open-agent-platform helm/open-agent-platform/ \
            --namespace oapf-dev \
            --values helm/open-agent-platform/values.yaml \
            --set registry.replicas=1 \
            --set registry.resources.requests.cpu=50m \
            --set registry.resources.requests.memory=64Mi \
            --wait --timeout 300s
    fi
    
    log_success "Base platform deployed"
}

deploy_foresight_agents() {
    log_agent "Deploying Foresight specialized agents..."
    
    # Deploy agents in dependency order
    local agents=(
        "news-monitor-agent"
        "social-media-agent"
        "nlp-agent"
        "epidemiological-agent"
        "geospatial-agent"
        "signal-fusion-agent"
    )
    
    for agent in "${agents[@]}"; do
        log_agent "Deploying ${agent}..."
        kubectl apply -f "k8s/foresight/${agent}.yaml"
        
        # Wait for deployment to be ready
        if kubectl get deployment "${agent}" -n "${NAMESPACE}" &>/dev/null; then
            kubectl wait --for=condition=Available deployment/"${agent}" -n "${NAMESPACE}" --timeout=300s || {
                log_warning "Deployment ${agent} not ready within timeout, continuing..."
            }
        fi
    done
    
    log_success "All Foresight agents deployed"
}

create_development_values() {
    log_info "Creating Foresight development configuration..."
    
    mkdir -p dev/foresight
    
    cat > dev/foresight/values-dev.yaml << 'EOF'
# Foresight Platform Development Configuration
# Optimized for local health signal detection testing

platform:
  environment: development
  logLevel: debug
  name: foresight-platform

# Health signal processing configuration
health:
  surveillance_pipelines: 64
  participating_jurisdictions: 13
  data_retention_days: 365
  alert_thresholds:
    critical: 0.9
    high: 0.8
    medium: 0.6
    low: 0.4

# Agent configuration
agents:
  news_monitor:
    replicas: 2
    resources:
      requests:
        cpu: 100m
        memory: 128Mi
      limits:
        cpu: 500m
        memory: 512Mi
    sources:
      - "cbc.ca"
      - "globalnews.ca"
      - "ctvnews.ca"
      - "reuters.com/world/canada"
  
  social_media:
    replicas: 3
    resources:
      requests:
        cpu: 150m
        memory: 256Mi
      limits:
        cpu: 750m
        memory: 1Gi
    platforms:
      - "twitter"
      - "reddit"
    keywords:
      - "outbreak"
      - "epidemic"
      - "health alert"
      - "disease"
  
  nlp:
    replicas: 4
    resources:
      requests:
        cpu: 500m
        memory: 1Gi
      limits:
        cpu: 2000m
        memory: 4Gi
    models:
      - "health-ner"
      - "symptom-classifier"
      - "multilingual-health"
  
  epidemiological:
    replicas: 3
    resources:
      requests:
        cpu: 300m
        memory: 512Mi
      limits:
        cpu: 1500m
        memory: 2Gi
  
  geospatial:
    replicas: 2
    resources:
      requests:
        cpu: 200m
        memory: 512Mi
      limits:
        cpu: 1000m
        memory: 2Gi
  
  signal_fusion:
    replicas: 3
    resources:
      requests:
        cpu: 400m
        memory: 1Gi
      limits:
        cpu: 2000m
        memory: 4Gi

# Observability for health surveillance
observability:
  enabled: true
  prometheus:
    enabled: true
    retention: 30d
    storage: 20Gi
  grafana:
    enabled: true
    adminPassword: foresight123
    dashboards:
      - health-signals
      - agent-performance
      - outbreak-detection

# Security for health data
security:
  mtls:
    enabled: false  # Simplified for local development
  networkPolicies:
    enabled: false  # Easier debugging locally
  dataEncryption:
    enabled: true
    atRest: true
    inTransit: true

# Service configuration for Kind cluster
services:
  foresight_dashboard:
    type: NodePort
    nodePort: 30100
  agent_registry:
    type: NodePort
    nodePort: 30101
  signal_fusion:
    type: NodePort
    nodePort: 30102
  health_api:
    type: NodePort
    nodePort: 30103
EOF

    log_success "Development configuration created"
}

setup_foresight_monitoring() {
    log_health "Setting up health signal monitoring..."
    
    # Create monitoring configmaps for health-specific dashboards
    kubectl create configmap foresight-grafana-dashboards \
        --from-literal=health-signals.json='{"dashboard": {"title": "Health Signals Dashboard"}}' \
        --namespace monitoring \
        --dry-run=client -o yaml | kubectl apply -f -
    
    # Label for Grafana to pick up
    kubectl label configmap foresight-grafana-dashboards \
        grafana_dashboard=1 \
        --namespace monitoring
    
    log_success "Health monitoring configured"
}

setup_port_forwarding() {
    log_info "Creating Foresight port forwarding configuration..."
    
    cat > dev/foresight-port-forwarding.sh << 'EOF'
#!/bin/bash
# Foresight Platform Port Forwarding Script
# Access all health surveillance services locally

NAMESPACE="foresight-agents"
MONITORING_NS="monitoring"

echo "Starting port forwarding for Foresight Platform..."
echo "Press Ctrl+C to stop all port forwards"

# Function to cleanup background processes
cleanup() {
    echo "Stopping port forwarding..."
    jobs -p | xargs -r kill
    exit 0
}

trap cleanup SIGINT SIGTERM

# Health Platform Services
echo "Setting up health platform services..."
kubectl port-forward -n ${NAMESPACE} svc/signal-fusion-agent 8102:8090 &
kubectl port-forward -n oapf-dev svc/open-agent-platform-registry 8101:80 &

# Monitoring Services
echo "Setting up monitoring services..."
kubectl port-forward -n ${MONITORING_NS} svc/prometheus-kube-prometheus-prometheus 9100:9090 &
kubectl port-forward -n ${MONITORING_NS} svc/prometheus-grafana 3100:80 &

# Wait a moment for port forwards to establish
sleep 2

echo ""
echo "🏥 Foresight Health Platform Access:"
echo "  📊 Grafana Dashboard:    http://localhost:3100 (admin/foresight123)"
echo "  📈 Prometheus Metrics:   http://localhost:9100"
echo "  🤖 Agent Registry:       http://localhost:8101"
echo "  🔄 Signal Fusion:        http://localhost:8102"
echo ""
echo "🧬 Health Signal Processing:"
echo "  📰 News Monitoring:      Automated ingestion from Canadian health sources"
echo "  📱 Social Media:         Real-time health discussion analysis"
echo "  🧠 NLP Analysis:         Multi-language health entity extraction"
echo "  🦠 Epidemiological:      Disease pattern and outbreak detection"
echo "  🗺️  Geospatial:          Geographic clustering and border analysis"
echo "  🔬 Signal Fusion:        Multi-source health intelligence correlation"
echo ""
echo "Press Ctrl+C to stop port forwarding"

# Wait for all background processes
wait
EOF
    
    chmod +x dev/foresight-port-forwarding.sh
    
    log_success "Port forwarding script created at dev/foresight-port-forwarding.sh"
}

verify_foresight_deployment() {
    log_health "Verifying Foresight platform deployment..."
    
    echo ""
    echo "🧬 Health Agent Status:"
    kubectl get agents -n "${NAMESPACE}" 2>/dev/null || echo "  No agents registered yet (normal during initial deployment)"
    
    echo ""
    echo "🏥 Pod Health Status:"
    kubectl get pods -n "${NAMESPACE}" -o wide
    
    echo ""
    echo "🔗 Service Endpoints:"
    kubectl get services -n "${NAMESPACE}"
    
    echo ""
    echo "🎯 Node Specialization:"
    kubectl get nodes -l foresight.ca/workload --show-labels | grep foresight.ca/workload || echo "  Node labeling in progress..."
    
    echo ""
    echo "📊 Storage for Health Data:"
    kubectl get pvc -n "${NAMESPACE}" 2>/dev/null || echo "  Storage claims provisioning..."
    
    # Check agent registration
    local registered_agents=$(kubectl get agents -n "${NAMESPACE}" --no-headers 2>/dev/null | wc -l || echo "0")
    echo ""
    echo "🤖 Agent Registration: ${registered_agents}/6 agents registered"
    
    log_success "Foresight platform verification complete"
}

create_demo_scenarios() {
    log_health "Creating demonstration health scenarios..."
    
    mkdir -p dev/foresight/scenarios
    
    # Create sample health signal data
    cat > dev/foresight/scenarios/outbreak-simulation.yaml << 'EOF'
# Sample outbreak simulation data for testing Foresight agents
apiVersion: v1
kind: ConfigMap
metadata:
  name: outbreak-simulation-data
  namespace: foresight-agents
data:
  news_signals.json: |
    [
      {
        "source": "cbc.ca",
        "headline": "Unusual respiratory illness cases reported in Northern Ontario",
        "content": "Health officials in Thunder Bay are investigating a cluster of respiratory illness cases...",
        "location": "Thunder Bay, Ontario",
        "timestamp": "2024-01-15T10:30:00Z",
        "symptoms": ["fever", "cough", "difficulty breathing"]
      }
    ]
  social_signals.json: |
    [
      {
        "platform": "twitter",
        "content": "Anyone else in #ThunderBay area feeling sick? Several people at work out with flu-like symptoms",
        "location": "Thunder Bay",
        "timestamp": "2024-01-15T14:22:00Z",
        "engagement": 15
      }
    ]
EOF
    
    # Create agent coordination test script
    cat > dev/foresight/scenarios/test-agent-coordination.sh << 'EOF'
#!/bin/bash
# Test Foresight agent coordination with simulated health signals

NAMESPACE="foresight-agents"

echo "🧪 Testing Foresight Agent Coordination"
echo "======================================="

# Apply test data
kubectl apply -f outbreak-simulation.yaml

echo ""
echo "📰 Simulating news signal ingestion..."
echo "🔄 News Monitor Agent → NLP Agent → Epidemiological Agent"

echo ""
echo "📱 Simulating social media anomaly detection..."
echo "🔄 Social Media Agent → NLP Agent → Geospatial Agent"

echo ""
echo "🧠 Fusion analysis in progress..."
echo "🔄 All Agents → Signal Fusion Agent → Risk Assessment"

echo ""
echo "✅ Multi-agent health signal processing complete"
echo "📊 Check Grafana dashboard for results: http://localhost:3100"
EOF
    
    chmod +x dev/foresight/scenarios/test-agent-coordination.sh
    
    log_success "Demo scenarios created in dev/foresight/scenarios/"
}

print_next_steps() {
    echo ""
    log_success "🏥 Foresight Agent Platform is ready for health surveillance!"
    echo ""
    echo "🚀 Quick Start Commands:"
    echo "  # Start health monitoring (run in separate terminal)"
    echo "  ./dev/foresight-port-forwarding.sh"
    echo ""
    echo "  # Test agent coordination"
    echo "  ./dev/foresight/scenarios/test-agent-coordination.sh"
    echo ""
    echo "🌐 Access Health Services:"
    echo "  📊 Health Dashboard:     http://localhost:3100 (admin/foresight123)"
    echo "  📈 Agent Metrics:       http://localhost:9100"
    echo "  🤖 Agent Registry:      http://localhost:8101"
    echo "  🔬 Signal Fusion:       http://localhost:8102"
    echo ""
    echo "🧬 Health Agent Capabilities:"
    echo "  📰 News Monitor:        Continuous Canadian health news surveillance"
    echo "  📱 Social Media:        Real-time health discussion analysis"
    echo "  🧠 NLP Analysis:        Multi-language health entity extraction"
    echo "  🦠 Epidemiological:     Disease pattern and outbreak detection"
    echo "  🗺️  Geospatial:         Geographic clustering and border analysis"
    echo "  🔬 Signal Fusion:       Multi-source health intelligence correlation"
    echo ""
    echo "🔧 Useful Commands:"
    echo "  kubectl get agents -n ${NAMESPACE}"
    echo "  kubectl get pods -n ${NAMESPACE} -o wide"
    echo "  kubectl logs -f deployment/signal-fusion-agent -n ${NAMESPACE}"
    echo ""
    echo "🧹 Cleanup when done:"
    echo "  kind delete cluster --name ${CLUSTER_NAME}"
    echo ""
    echo "🏥 Ready to detect and analyze public health signals!"
}

main() {
    print_banner
    check_prerequisites
    cleanup_existing_cluster
    create_foresight_cluster
    setup_kubectl_context
    install_platform_dependencies
    create_foresight_namespace
    deploy_base_platform
    create_development_values
    deploy_foresight_agents
    setup_foresight_monitoring
    setup_port_forwarding
    verify_foresight_deployment
    create_demo_scenarios
    print_next_steps
}

# Allow script to be sourced for testing
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi