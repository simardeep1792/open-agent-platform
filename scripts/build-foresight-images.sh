#!/bin/bash
# Build all Foresight agent Docker images
# Production-ready health surveillance agent containers

set -e

# Configuration
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
REGISTRY="${DOCKER_REGISTRY:-ghcr.io/simardeep1792}"
VERSION="${VERSION:-latest}"
BUILD_ARGS="${BUILD_ARGS:-}"

# Colors
if [[ -t 1 ]]; then
    RED='\033[0;31m'
    GREEN='\033[0;32m'
    YELLOW='\033[1;33m'
    BLUE='\033[0;34m'
    PURPLE='\033[0;35m'
    NC='\033[0m'
else
    RED=''
    GREEN=''
    YELLOW=''
    BLUE=''
    PURPLE=''
    NC=''
fi

log_info() { echo -e "${BLUE}[BUILD]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }
log_agent() { echo -e "${PURPLE}[AGENT]${NC} $1"; }

print_banner() {
    echo ""
    echo "🏥 Foresight Health Platform - Docker Image Builder"
    echo "=================================================="
    echo ""
}

check_prerequisites() {
    log_info "Checking build prerequisites..."
    
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed or not in PATH"
        exit 1
    fi
    
    if ! docker info &> /dev/null; then
        log_error "Docker daemon is not running"
        exit 1
    fi
    
    # Check Docker Buildx for multi-platform builds
    if ! docker buildx version &> /dev/null; then
        log_warning "Docker Buildx not available - single platform builds only"
    fi
    
    log_success "Build environment ready"
}

build_base_image() {
    log_info "Building base Foresight agent image..."
    
    docker build \
        --file docker/foresight/Dockerfile.base \
        --tag "${REGISTRY}/foresight-base:${VERSION}" \
        --build-arg VERSION="${VERSION}" \
        ${BUILD_ARGS} \
        "${PROJECT_ROOT}"
    
    log_success "Base image built: ${REGISTRY}/foresight-base:${VERSION}"
}

build_agent_image() {
    local agent_name="$1"
    local dockerfile="$2"
    local build_context="${3:-${PROJECT_ROOT}}"
    
    log_agent "Building ${agent_name} image..."
    
    # Build the image
    docker build \
        --file "${dockerfile}" \
        --tag "${REGISTRY}/foresight-${agent_name}:${VERSION}" \
        --tag "${REGISTRY}/foresight-${agent_name}:latest" \
        --build-arg VERSION="${VERSION}" \
        --build-arg BASE_IMAGE="${REGISTRY}/foresight-base:${VERSION}" \
        ${BUILD_ARGS} \
        "${build_context}"
    
    # Test the image
    if docker run --rm --health-timeout=30s "${REGISTRY}/foresight-${agent_name}:${VERSION}" node --version &> /dev/null; then
        log_success "${agent_name} image built and tested successfully"
    else
        log_warning "${agent_name} image built but health check failed"
    fi
}

build_all_agents() {
    log_info "Building all Foresight agent images..."
    
    # Array of agents to build
    local agents=(
        "news-monitor:docker/foresight/Dockerfile.news-monitor"
        "social-media:docker/foresight/Dockerfile.social-media"
        "nlp-agent:docker/foresight/Dockerfile.nlp-agent"
        "epidemiological:docker/foresight/Dockerfile.epidemiological"
        "geospatial:docker/foresight/Dockerfile.geospatial"
        "signal-fusion:docker/foresight/Dockerfile.signal-fusion"
        "risk-assessment:docker/foresight/Dockerfile.risk-assessment"
        "decision-support:docker/foresight/Dockerfile.decision-support"
        "alert-agent:docker/foresight/Dockerfile.alert-agent"
        "reporting:docker/foresight/Dockerfile.reporting"
        "visualization:docker/foresight/Dockerfile.visualization"
    )
    
    # Build each agent
    for agent_spec in "${agents[@]}"; do
        IFS=':' read -r agent_name dockerfile <<< "$agent_spec"
        
        # Check if Dockerfile exists
        if [[ -f "${PROJECT_ROOT}/${dockerfile}" ]]; then
            build_agent_image "$agent_name" "${PROJECT_ROOT}/${dockerfile}"
        else
            log_warning "Dockerfile not found: ${dockerfile} - creating placeholder..."
            create_placeholder_dockerfile "$agent_name" "${PROJECT_ROOT}/${dockerfile}"
            build_agent_image "$agent_name" "${PROJECT_ROOT}/${dockerfile}"
        fi
    done
}

create_placeholder_dockerfile() {
    local agent_name="$1"
    local dockerfile_path="$2"
    
    mkdir -p "$(dirname "$dockerfile_path")"
    
    cat > "$dockerfile_path" << EOF
# ${agent_name} Agent - Foresight Health Platform
# Placeholder Dockerfile - to be implemented

FROM node:18-alpine

RUN addgroup -g 1000 foresight && \\
    adduser -D -s /bin/sh -u 1000 -G foresight foresight

WORKDIR /app

# Copy base agent framework
COPY package*.json ./
RUN npm ci --only=production

COPY dist/ ./

# Agent-specific environment
ENV AGENT_TYPE=${agent_name}
ENV NODE_ENV=production

# Create directories
RUN mkdir -p /app/data /app/logs && \\
    chown -R foresight:foresight /app

USER foresight

EXPOSE 8080 8090

HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \\
    CMD curl -f http://localhost:8080/health || exit 1

CMD ["node", "agents/${agent_name}/index.js"]
EOF
    
    log_info "Created placeholder Dockerfile for ${agent_name}"
}

build_supporting_images() {
    log_info "Building supporting service images..."
    
    # Model downloader for NLP agent
    if [[ ! -f "${PROJECT_ROOT}/docker/foresight/Dockerfile.model-downloader" ]]; then
        cat > "${PROJECT_ROOT}/docker/foresight/Dockerfile.model-downloader" << 'EOF'
# Model Downloader for NLP Agent
FROM python:3.11-slim

RUN pip install --no-cache-dir spacy transformers torch

WORKDIR /models

COPY docker/foresight/scripts/download-models.py ./

CMD ["python", "download-models.py"]
EOF
    fi
    
    build_agent_image "model-downloader" "${PROJECT_ROOT}/docker/foresight/Dockerfile.model-downloader"
}

tag_images() {
    log_info "Tagging images with additional labels..."
    
    # Tag images with build metadata
    local build_date=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
    local git_hash=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")
    
    # Get list of built images
    local images=$(docker images "${REGISTRY}/foresight-*:${VERSION}" --format "{{.Repository}}:{{.Tag}}")
    
    for image in $images; do
        # Add metadata labels
        docker image inspect "$image" > /dev/null 2>&1 && \
        docker tag "$image" "${image%-*:*}:build-${git_hash}"
        
        log_info "Tagged $image with build metadata"
    done
}

push_images() {
    if [[ "${PUSH_IMAGES:-false}" == "true" ]]; then
        log_info "Pushing images to registry..."
        
        # Login to registry if credentials are provided
        if [[ -n "${REGISTRY_USERNAME:-}" && -n "${REGISTRY_PASSWORD:-}" ]]; then
            echo "${REGISTRY_PASSWORD}" | docker login "${REGISTRY%%/*}" -u "${REGISTRY_USERNAME}" --password-stdin
        fi
        
        # Push all images
        docker images "${REGISTRY}/foresight-*:${VERSION}" --format "{{.Repository}}:{{.Tag}}" | while read -r image; do
            log_info "Pushing $image..."
            docker push "$image"
        done
        
        log_success "All images pushed to registry"
    else
        log_info "Skipping image push (set PUSH_IMAGES=true to enable)"
    fi
}

cleanup_build_cache() {
    log_info "Cleaning up build cache..."
    
    # Remove dangling images
    docker image prune -f > /dev/null 2>&1 || true
    
    # Remove build cache (if using buildx)
    docker buildx prune -f > /dev/null 2>&1 || true
    
    log_success "Build cache cleaned"
}

print_summary() {
    echo ""
    log_success "🏥 Foresight Health Platform - Build Complete!"
    echo ""
    echo "📦 Built Images:"
    docker images "${REGISTRY}/foresight-*:${VERSION}" --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}\t{{.CreatedAt}}"
    echo ""
    echo "🚀 Next Steps:"
    echo "  # Test with Docker Compose:"
    echo "  cd docker/foresight && docker-compose up"
    echo ""
    echo "  # Deploy to Kubernetes:"
    echo "  ./scripts/setup-foresight-platform.sh"
    echo ""
    echo "  # Push to registry:"
    echo "  PUSH_IMAGES=true ./scripts/build-foresight-images.sh"
    echo ""
}

main() {
    print_banner
    check_prerequisites
    
    cd "${PROJECT_ROOT}"
    
    # Build in dependency order
    build_base_image
    build_all_agents
    build_supporting_images
    tag_images
    push_images
    cleanup_build_cache
    print_summary
}

# Allow script to be sourced for testing
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi