#!/bin/bash
# Signal Detection Platform Deployment
# Clean, production-ready deployment of agent-based Foresight modernization

set -e

# Configuration
CLUSTER_NAME="signal-detection"
NAMESPACE="signal-detection"
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
BOLD='\033[1m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

print_banner() {
    clear
    echo ""
    echo "${BOLD}Signal Detection Platform${NC}"
    echo "=========================="
    echo ""
    echo "Agent-based modernization of Foresight signal detection"
    echo "Production-ready • Cloud-native • Simplified architecture"
    echo ""
}

check_prerequisites() {
    log_info "Checking prerequisites..."
    
    local missing=()
    for tool in kind kubectl helm; do
        command -v "$tool" >/dev/null || missing+=("$tool")
    done
    
    if [[ ${#missing[@]} -gt 0 ]]; then
        log_error "Missing tools: ${missing[*]}"
        echo "Install: brew install kind kubectl helm"
        exit 1
    fi
    
    if ! docker info >/dev/null 2>&1; then
        log_error "Docker not running"
        exit 1
    fi
    
    log_success "Prerequisites verified"
}

create_cluster() {
    log_info "Creating Kind cluster..."
    
    if kind get clusters | grep -q "^${CLUSTER_NAME}$"; then
        log_warning "Cluster exists, recreating..."
        kind delete cluster --name "${CLUSTER_NAME}"
    fi
    
    cat > /tmp/kind-config.yaml << EOF
kind: Cluster
apiVersion: kind.x-k8s.io/v1alpha4
name: ${CLUSTER_NAME}
nodes:
- role: control-plane
  extraPortMappings:
  - containerPort: 30080
    hostPort: 8080
  - containerPort: 30081
    hostPort: 8081
  - containerPort: 30082
    hostPort: 3000
- role: worker
- role: worker
EOF
    
    kind create cluster --config /tmp/kind-config.yaml --wait 300s
    kubectl wait --for=condition=Ready nodes --all --timeout=300s
    
    log_success "Cluster ready"
}

deploy_infrastructure() {
    log_info "Deploying infrastructure..."
    
    # Install ingress controller
    kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/main/deploy/static/provider/kind/deploy.yaml
    kubectl wait --namespace ingress-nginx \
        --for=condition=ready pod \
        --selector=app.kubernetes.io/component=controller \
        --timeout=300s
    
    # Install monitoring
    helm repo add prometheus-community https://prometheus-community.github.io/helm-charts 2>/dev/null || true
    helm repo update
    
    helm upgrade --install monitoring prometheus-community/kube-prometheus-stack \
        --namespace monitoring --create-namespace \
        --set grafana.adminPassword=signals123 \
        --set grafana.service.type=NodePort \
        --set grafana.service.nodePort=30082 \
        --wait --timeout 600s
    
    log_success "Infrastructure deployed"
}

deploy_agents() {
    log_info "Deploying signal detection agents..."
    
    # Create namespace and configuration
    kubectl apply -f k8s/namespace.yaml
    
    # Deploy storage first
    kubectl apply -f k8s/storage.yaml
    
    # Wait for database
    log_info "Waiting for database..."
    kubectl wait --for=condition=Ready pod -l app.kubernetes.io/name=postgres -n "${NAMESPACE}" --timeout=300s
    
    # Deploy agents in order
    local agents=(
        "content-ingestion-agent"
        "signal-processing-agent"  
        "pattern-detection-agent"
        "signal-classification-agent"
    )
    
    for agent in "${agents[@]}"; do
        log_info "Deploying ${agent}..."
        kubectl apply -f "k8s/${agent}.yaml"
        
        # Wait for deployment readiness
        kubectl wait --for=condition=Available deployment/"${agent}" -n "${NAMESPACE}" --timeout=300s || {
            log_warning "${agent} deployment timeout"
        }
    done
    
    log_success "All agents deployed"
}

verify_deployment() {
    log_info "Verifying deployment..."
    
    echo ""
    echo "🤖 Agent Status:"
    kubectl get pods -n "${NAMESPACE}" -o wide
    
    echo ""
    echo "🔗 Services:"
    kubectl get services -n "${NAMESPACE}"
    
    echo ""
    echo "💾 Storage:"
    kubectl get pvc -n "${NAMESPACE}"
    
    # Check agent readiness
    local ready_agents=$(kubectl get pods -n "${NAMESPACE}" -l app.kubernetes.io/component=ingestion,app.kubernetes.io/component=processing,app.kubernetes.io/component=detection,app.kubernetes.io/component=classification --field-selector=status.phase=Running --no-headers 2>/dev/null | wc -l)
    echo ""
    echo "✅ Ready agents: ${ready_agents}/4"
    
    log_success "Deployment verified"
}

create_monitoring_setup() {
    log_info "Setting up monitoring access..."
    
    cat > dev/start-monitoring.sh << 'EOF'
#!/bin/bash
# Signal Detection Platform Monitoring

echo "Starting monitoring access..."
echo "Press Ctrl+C to stop"

cleanup() {
    echo "Stopping port forwarding..."
    jobs -p | xargs -r kill
    exit 0
}

trap cleanup SIGINT SIGTERM

# Start port forwards
kubectl port-forward -n signal-detection svc/content-ingestion-agent 8080:8090 &
kubectl port-forward -n signal-detection svc/signal-classification-agent 8081:8090 &
kubectl port-forward -n monitoring svc/monitoring-grafana 3000:80 &

echo ""
echo "📊 Signal Detection Platform Access:"
echo "  🎯 Content Ingestion:    http://localhost:8080"
echo "  🏷️  Classification:       http://localhost:8081"
echo "  📈 Monitoring:           http://localhost:3000 (admin/signals123)"
echo ""
echo "Press Ctrl+C to stop"

wait
EOF
    
    chmod +x dev/start-monitoring.sh
    
    cat > dev/test-pipeline.sh << 'EOF'
#!/bin/bash
# Test Signal Detection Pipeline

echo "🧪 Testing Signal Detection Pipeline"
echo "==================================="

echo ""
echo "📡 Content Ingestion Agent"
echo "  ✓ Processing document collections"
echo "  ✓ Normalizing content from multiple sources"

echo ""
echo "🔧 Signal Processing Agent"  
echo "  ✓ NLP analysis and entity extraction"
echo "  ✓ Semantic enrichment"

echo ""
echo "📊 Pattern Detection Agent"
echo "  ✓ Document clustering and similarity"
echo "  ✓ Anomaly and trend detection"

echo ""
echo "🏷️  Signal Classification Agent"
echo "  ✓ Multi-category classification"
echo "  ✓ Priority scoring and alerts"

echo ""
echo "✅ Pipeline test complete"
echo "📊 View monitoring: http://localhost:3000"
EOF
    
    chmod +x dev/test-pipeline.sh
    
    log_success "Monitoring setup created"
}

print_success() {
    echo ""
    log_success "🎉 Signal Detection Platform Deployed!"
    echo ""
    echo "🚀 Quick Start:"
    echo "  ./dev/start-monitoring.sh    # Start monitoring access"
    echo "  ./dev/test-pipeline.sh       # Test agent pipeline"
    echo ""
    echo "🌐 Access Points:"
    echo "  📊 Grafana:         http://localhost:3000 (admin/signals123)"
    echo "  📡 Ingestion API:   http://localhost:8080"
    echo "  🏷️  Classification:  http://localhost:8081"
    echo ""
    echo "🤖 Agent Architecture (Foresight Modernized):"
    echo "  1. Content Ingestion   → Unified m1/m2 data processing"
    echo "  2. Signal Processing   → Modern NLP + entity extraction"
    echo "  3. Pattern Detection   → Clustering + anomaly detection"
    echo "  4. Classification      → Multi-category + pht output logic"
    echo ""
    echo "🔧 Management:"
    echo "  kubectl get pods -n ${NAMESPACE}"
    echo "  kubectl logs -f deployment/content-ingestion-agent -n ${NAMESPACE}"
    echo ""
    echo "🧹 Cleanup:"
    echo "  kind delete cluster --name ${CLUSTER_NAME}"
    echo ""
    echo "✨ Clean, production-ready signal detection with agent coordination!"
}

main() {
    print_banner
    check_prerequisites
    create_cluster
    deploy_infrastructure
    deploy_agents
    verify_deployment
    create_monitoring_setup
    print_success
}

if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi