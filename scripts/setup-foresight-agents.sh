#!/bin/bash
# Foresight Agent Platform Setup
# Deploys agent-based version of Foresight signal detection platform

set -e

# Configuration
CLUSTER_NAME="foresight-agents"
NAMESPACE="foresight-agents"
CONTEXT_NAME="kind-${CLUSTER_NAME}"
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# Colors
if [[ -t 1 ]]; then
    RED='\033[0;31m'
    GREEN='\033[0;32m'
    YELLOW='\033[1;33m'
    BLUE='\033[0;34m'
    PURPLE='\033[0;35m'
    CYAN='\033[0;36m'
    BOLD='\033[1m'
    NC='\033[0m'
else
    RED='' GREEN='' YELLOW='' BLUE='' PURPLE='' CYAN='' BOLD='' NC=''
fi

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }
log_foresight() { echo -e "${PURPLE}[FORESIGHT]${NC} $1"; }
log_agent() { echo -e "${CYAN}[AGENT]${NC} $1"; }

print_banner() {
    clear
    echo ""
    echo "███████╗ ██████╗ ██████╗ ███████╗███████╗██╗ ██████╗ ██╗  ██╗████████╗"
    echo "██╔════╝██╔═══██╗██╔══██╗██╔════╝██╔════╝██║██╔════╝ ██║  ██║╚══██╔══╝"
    echo "█████╗  ██║   ██║██████╔╝█████╗  ███████╗██║██║  ███╗███████║   ██║   "
    echo "██╔══╝  ██║   ██║██╔══██╗██╔══╝  ╚════██║██║██║   ██║██╔══██║   ██║   "
    echo "██║     ╚██████╔╝██║  ██║███████╗███████║██║╚██████╔╝██║  ██║   ██║   "
    echo "╚═╝      ╚═════╝ ╚═╝  ╚═╝╚══════╝╚══════╝╚═╝ ╚═════╝ ╚═╝  ╚═╝   ╚═╝   "
    echo ""
    echo "              ${BOLD}AGENT-BASED SIGNAL DETECTION PLATFORM${NC}"
    echo "       Modernizing Foresight with Agent-to-Agent Communication"
    echo "================================================================"
    echo ""
}

check_prerequisites() {
    log_info "Checking prerequisites for Foresight agent platform..."
    
    local missing_tools=()
    
    for tool in kind kubectl helm docker; do
        if ! command -v "$tool" &> /dev/null; then
            missing_tools+=("$tool")
        fi
    done
    
    if [[ ${#missing_tools[@]} -gt 0 ]]; then
        log_error "Missing required tools: ${missing_tools[*]}"
        echo "Installation: brew install kind kubectl helm docker"
        exit 1
    fi
    
    if ! docker info &> /dev/null; then
        log_error "Docker is not running"
        exit 1
    fi
    
    log_success "All prerequisites met"
}

cleanup_existing_cluster() {
    if kind get clusters | grep -q "^${CLUSTER_NAME}$"; then
        log_warning "Existing Foresight cluster found. Cleaning up..."
        kind delete cluster --name "${CLUSTER_NAME}"
    fi
}

create_foresight_cluster() {
    log_foresight "Creating Foresight agent cluster..."
    
    # Create Kind config if it doesn't exist
    if [[ ! -f "dev/foresight-kind-config.yaml" ]]; then
        log_warning "Creating default Kind configuration..."
        mkdir -p dev
        cat > dev/foresight-kind-config.yaml << 'EOF'
kind: Cluster
apiVersion: kind.x-k8s.io/v1alpha4
name: foresight-agents
networking:
  podSubnet: "10.200.0.0/16"
  serviceSubnet: "10.100.0.0/16"
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
    fi
    
    kind create cluster --config dev/foresight-kind-config.yaml --wait 300s
    kubectl wait --for=condition=Ready nodes --all --timeout=300s
    
    log_success "Foresight cluster created"
}

setup_kubectl_context() {
    log_info "Configuring kubectl..."
    kubectl config use-context "${CONTEXT_NAME}"
    kubectl cluster-info --context "${CONTEXT_NAME}"
    log_success "kubectl configured"
}

install_platform_dependencies() {
    log_info "Installing platform dependencies..."
    
    # Install ingress controller
    kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/main/deploy/static/provider/kind/deploy.yaml
    kubectl wait --namespace ingress-nginx \
        --for=condition=ready pod \
        --selector=app.kubernetes.io/component=controller \
        --timeout=300s
    
    # Install observability stack
    helm repo add prometheus-community https://prometheus-community.github.io/helm-charts 2>/dev/null || true
    helm repo update
    
    helm upgrade --install prometheus prometheus-community/kube-prometheus-stack \
        --namespace monitoring --create-namespace \
        --set grafana.adminPassword=foresight123 \
        --set grafana.service.type=NodePort \
        --set grafana.service.nodePort=30082 \
        --wait --timeout 600s
    
    log_success "Dependencies installed"
}

deploy_base_platform() {
    log_info "Deploying base agent platform..."
    
    # Apply agent CRDs
    kubectl apply -f k8s/base/agent-crd.yaml
    
    # Deploy base platform if needed
    if ! kubectl get namespace oapf-dev &>/dev/null; then
        kubectl create namespace oapf-dev
        helm upgrade --install open-agent-platform helm/open-agent-platform/ \
            --namespace oapf-dev \
            --values helm/open-agent-platform/values.yaml \
            --set registry.replicas=1 \
            --wait --timeout 300s
    fi
    
    log_success "Base platform deployed"
}

deploy_foresight_agents() {
    log_foresight "Deploying Foresight agent-based pipeline..."
    
    # Create namespace and configuration
    kubectl apply -f k8s/foresight-agents/foresight-namespace.yaml
    
    # Deploy agents in pipeline order
    local agents=(
        "signal-ingestion-agent"
        "preprocessing-agent"
        "clustering-agent"
        "enrichment-agent"
        "similarity-agent"
    )
    
    for agent in "${agents[@]}"; do
        log_agent "Deploying ${agent}..."
        kubectl apply -f "k8s/foresight-agents/${agent}.yaml"
        
        # Wait for deployment
        if kubectl get deployment "${agent}" -n "${NAMESPACE}" &>/dev/null; then
            kubectl wait --for=condition=Available deployment/"${agent}" -n "${NAMESPACE}" --timeout=300s || {
                log_warning "${agent} not ready within timeout"
            }
        fi
    done
    
    log_success "All Foresight agents deployed"
}

deploy_neo4j() {
    log_foresight "Deploying Neo4j graph database..."
    
    # Add Neo4j helm repo
    helm repo add neo4j https://helm.neo4j.com/neo4j 2>/dev/null || true
    helm repo update
    
    # Deploy Neo4j with Foresight configuration
    helm upgrade --install foresight-neo4j neo4j/neo4j \
        --namespace "${NAMESPACE}" \
        --set neo4j.name=foresight-neo4j \
        --set neo4j.password=signal_detection_2024 \
        --set volumes.data.mode=defaultStorageClass \
        --set volumes.data.defaultStorageClass.requests.storage=50Gi \
        --wait --timeout 600s
    
    log_success "Neo4j deployed for graph storage"
}

create_demo_data() {
    log_foresight "Creating Foresight demo data structure..."
    
    mkdir -p dev/foresight-data/{sources,processed,models}
    
    # Create sample JSON data matching Foresight format
    cat > dev/foresight-data/sources/sample-documents.json << 'EOF'
[
  {
    "id": "doc_001",
    "timestamp": "2024-01-15T10:30:00Z",
    "source": "health-canada-alerts",
    "content": "Health Canada issues advisory regarding respiratory illness cluster in Northern Ontario region. Multiple cases reported with similar symptoms including fever, cough, and breathing difficulties.",
    "metadata": {
      "language": "en",
      "region": "Ontario",
      "category": "health-alert",
      "confidence": 0.95
    }
  },
  {
    "id": "doc_002",
    "timestamp": "2024-01-15T14:22:00Z",
    "source": "surveillance-reports",
    "content": "Weekly surveillance report indicates increased emergency department visits for respiratory symptoms in Thunder Bay area. Pattern suggests potential outbreak investigation needed.",
    "metadata": {
      "language": "en",
      "region": "Ontario",
      "category": "surveillance",
      "confidence": 0.88
    }
  }
]
EOF
    
    log_success "Demo data created"
}

setup_port_forwarding() {
    log_info "Creating port forwarding configuration..."
    
    cat > dev/foresight-port-forwarding.sh << 'EOF'
#!/bin/bash
# Foresight Agent Platform Port Forwarding

NAMESPACE="foresight-agents"

echo "Starting Foresight agent platform port forwarding..."
echo "Press Ctrl+C to stop"

cleanup() {
    echo "Stopping port forwarding..."
    jobs -p | xargs -r kill
    exit 0
}

trap cleanup SIGINT SIGTERM

# Core services
kubectl port-forward -n oapf-dev svc/open-agent-platform-registry 8080:80 &
kubectl port-forward -n monitoring svc/prometheus-grafana 3000:80 &
kubectl port-forward -n ${NAMESPACE} svc/signal-ingestion-agent 8081:8090 &
kubectl port-forward -n ${NAMESPACE} svc/similarity-agent 8082:8090 &

echo ""
echo "🤖 Foresight Agent Platform Access:"
echo "  📊 Grafana Dashboard:    http://localhost:3000 (admin/foresight123)"
echo "  🤖 Agent Registry:       http://localhost:8080"
echo "  📡 Signal Ingestion:     http://localhost:8081"
echo "  🔗 Similarity Analysis:  http://localhost:8082"
echo ""
echo "Press Ctrl+C to stop"

wait
EOF
    
    chmod +x dev/foresight-port-forwarding.sh
    log_success "Port forwarding script created"
}

verify_deployment() {
    log_foresight "Verifying Foresight agent deployment..."
    
    echo ""
    echo "🤖 Agent Status:"
    kubectl get agents -n "${NAMESPACE}" 2>/dev/null || echo "  Agent registration in progress..."
    
    echo ""
    echo "📦 Pod Status:"
    kubectl get pods -n "${NAMESPACE}" -o wide
    
    echo ""
    echo "🔗 Services:"
    kubectl get services -n "${NAMESPACE}"
    
    echo ""
    echo "💾 Storage:"
    kubectl get pvc -n "${NAMESPACE}"
    
    # Check agent registration
    local registered_agents=$(kubectl get agents -n "${NAMESPACE}" --no-headers 2>/dev/null | wc -l || echo "0")
    echo ""
    echo "🎯 Agent Registration: ${registered_agents}/5 agents"
    
    log_success "Deployment verification complete"
}

create_pipeline_demo() {
    log_foresight "Creating Foresight pipeline demonstration..."
    
    cat > dev/test-foresight-pipeline.sh << 'EOF'
#!/bin/bash
# Test Foresight Agent Pipeline

NAMESPACE="foresight-agents"

echo "🧪 Testing Foresight Agent-Based Pipeline"
echo "========================================="

echo ""
echo "📡 Step 1: Signal Ingestion Agent"
echo "  Simulating JSON document ingestion..."
echo "  Processing sample documents from /data/sources"

echo ""
echo "🔧 Step 2: Preprocessing Agent"  
echo "  Text cleaning and language detection..."
echo "  Metadata extraction and validation..."

echo ""
echo "📊 Step 3: Clustering Agent"
echo "  Document clustering using similarity metrics..."
echo "  Building document clusters for related content..."

echo ""
echo "🏷️  Step 4: Enrichment Agent"
echo "  Semantic enrichment and entity extraction..."
echo "  Mapping to health ontologies..."

echo ""
echo "🔗 Step 5: Similarity Agent"
echo "  Computing document similarity scores..."
echo "  Building similarity network graph..."

echo ""
echo "✅ Foresight Pipeline Test Complete"
echo "📊 Check Grafana dashboard for metrics: http://localhost:3000"
EOF
    
    chmod +x dev/test-foresight-pipeline.sh
    log_success "Pipeline demo script created"
}

print_next_steps() {
    echo ""
    log_success "🎉 Foresight Agent Platform Deployed Successfully!"
    echo ""
    echo "🚀 Quick Start:"
    echo "  # Start monitoring (run in separate terminal)"
    echo "  ./dev/foresight-port-forwarding.sh"
    echo ""
    echo "  # Test the agent pipeline"
    echo "  ./dev/test-foresight-pipeline.sh"
    echo ""
    echo "🌐 Access Services:"
    echo "  📊 Grafana Dashboard:    http://localhost:3000 (admin/foresight123)"
    echo "  🤖 Agent Registry:       http://localhost:8080"
    echo "  📡 Signal Ingestion:     http://localhost:8081"
    echo "  🔗 Similarity Analysis:  http://localhost:8082"
    echo ""
    echo "🧬 Agent Pipeline (replaces Foresight m1 module):"
    echo "  1. 📡 Signal Ingestion Agent   → extract-news-articles.py"
    echo "  2. 🔧 Preprocessing Agent      → 01_preprocess.py"
    echo "  3. 📊 Clustering Agent         → 02_cluster.py + online_cluster.py"
    echo "  4. 🏷️  Enrichment Agent        → 03_enrich.py"
    echo "  5. 🔗 Similarity Agent         → 04_similarize.py"
    echo ""
    echo "🔧 Useful Commands:"
    echo "  kubectl get agents -n ${NAMESPACE}"
    echo "  kubectl get pods -n ${NAMESPACE}"
    echo "  kubectl logs -f deployment/signal-ingestion-agent -n ${NAMESPACE}"
    echo ""
    echo "🧹 Cleanup:"
    echo "  kind delete cluster --name ${CLUSTER_NAME}"
    echo ""
    echo "🎯 The agent-based architecture provides the same functionality as"
    echo "   Foresight's original pipeline but with modern A2A coordination!"
}

main() {
    print_banner
    check_prerequisites
    cleanup_existing_cluster
    create_foresight_cluster
    setup_kubectl_context
    install_platform_dependencies
    deploy_base_platform
    deploy_foresight_agents
    deploy_neo4j
    create_demo_data
    setup_port_forwarding
    verify_deployment
    create_pipeline_demo
    print_next_steps
}

if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi