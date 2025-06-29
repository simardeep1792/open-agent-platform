# Open Agent Platform Makefile
# Production-ready automation for development and deployment

.PHONY: help dev-setup dev-deploy dev-clean build test lint format check-deps
.DEFAULT_GOAL := help

# Variables
PROJECT_NAME := open-agent-platform
NAMESPACE := $(PROJECT_NAME)
KUBECONFIG ?= ~/.kube/config
HELM_CHART := ./helm/$(PROJECT_NAME)
DOCKER_REGISTRY ?= ghcr.io/open-agent-platform
VERSION ?= latest

## Help
help: ## Show this help message
	@echo "Open Agent Platform - Development Commands"
	@echo ""
	@awk 'BEGIN {FS = ":.*##"} /^[a-zA-Z_-]+:.*?##/ { printf "  %-20s %s\n", $$1, $$2 }' $(MAKEFILE_LIST)

## Development Environment
dev-setup: ## Setup local development environment
	@echo "Setting up development environment..."
	@command -v kubectl >/dev/null 2>&1 || { echo "kubectl is required"; exit 1; }
	@command -v helm >/dev/null 2>&1 || { echo "helm is required"; exit 1; }
	@command -v docker >/dev/null 2>&1 || { echo "docker is required"; exit 1; }
	npm install
	cd ui && npm install
	@echo "Development environment ready"

dev-cluster: ## Create local development cluster (kind)
	@echo "Creating local Kubernetes cluster..."
	@command -v kind >/dev/null 2>&1 || { echo "kind is required for local cluster"; exit 1; }
	kind create cluster --name $(PROJECT_NAME) --config ./dev/kind-config.yaml
	kubectl cluster-info --context kind-$(PROJECT_NAME)
	@echo "Local cluster created"

dev-deploy: ## Deploy platform to local development environment
	@echo "Deploying to development environment..."
	kubectl create namespace $(NAMESPACE) --dry-run=client -o yaml | kubectl apply -f -
	kubectl apply -f k8s/base/agent-crd.yaml
	helm upgrade --install $(PROJECT_NAME) $(HELM_CHART) \
		--namespace $(NAMESPACE) \
		--values $(HELM_CHART)/values.yaml \
		--values ./dev/values-dev.yaml \
		--wait --timeout 300s
	@echo "Platform deployed successfully"
	@echo "Access dashboard: kubectl port-forward svc/$(PROJECT_NAME)-dashboard 8080:80 -n $(NAMESPACE)"

dev-status: ## Show development environment status
	@echo "Development Environment Status"
	@echo ""
	kubectl get pods -n $(NAMESPACE) -o wide
	@echo ""
	kubectl get agents -n $(NAMESPACE) 2>/dev/null || echo "No agents deployed yet"
	@echo ""
	kubectl get services -n $(NAMESPACE)

dev-logs: ## Show logs from development pods
	@echo "Showing platform logs..."
	kubectl logs -l app.kubernetes.io/name=$(PROJECT_NAME) -n $(NAMESPACE) --tail=50 -f

dev-clean: ## Clean up development environment
	@echo "Cleaning up development environment..."
	helm uninstall $(PROJECT_NAME) -n $(NAMESPACE) || true
	kubectl delete namespace $(NAMESPACE) || true
	kind delete cluster --name $(PROJECT_NAME) || true
	@echo "Development environment cleaned"

## Building and Testing
build: ## Build all components
	@echo "Building platform components..."
	npm run build
	cd ui && npm run build
	@echo "Build completed"

test: ## Run tests
	@echo "Running tests..."
	npm test
	cd ui && npm test
	@echo "All tests passed"

lint: ## Run linting
	@echo "Running linters..."
	npm run lint
	cd ui && npm run lint
	helm lint $(HELM_CHART)
	@echo "Linting completed"

format: ## Format code
	@echo "Formatting code..."
	npm run format || true
	cd ui && npm run format || true
	@echo "Code formatted"

## Docker Operations
docker-build: ## Build Docker images
	@echo "Building Docker images..."
	docker build -t $(DOCKER_REGISTRY)/registry:$(VERSION) .
	docker build -t $(DOCKER_REGISTRY)/cloudy-agent:$(VERSION) -f agents/cloudy/Dockerfile .
	@echo "Docker images built"

docker-push: ## Push Docker images
	@echo "Pushing Docker images..."
	docker push $(DOCKER_REGISTRY)/registry:$(VERSION)
	docker push $(DOCKER_REGISTRY)/cloudy-agent:$(VERSION)
	@echo "Docker images pushed"

## Infrastructure
infra-init: ## Initialize infrastructure (OpenTofu)
	@echo "Initializing infrastructure..."
	cd infrastructure && tofu init
	@echo "Infrastructure initialized"

infra-plan: ## Plan infrastructure changes
	@echo "Planning infrastructure changes..."
	cd infrastructure && tofu plan -var-file="environments/development.tfvars"

infra-apply: ## Apply infrastructure changes
	@echo "Applying infrastructure changes..."
	cd infrastructure && tofu apply -var-file="environments/development.tfvars"
	@echo "Infrastructure applied"

infra-destroy: ## Destroy infrastructure
	@echo "Destroying infrastructure..."
	cd infrastructure && tofu destroy -var-file="environments/development.tfvars"
	@echo "Infrastructure destroyed"

## Helm Operations
helm-template: ## Generate Helm templates
	@echo "Generating Helm templates..."
	helm template $(PROJECT_NAME) $(HELM_CHART) \
		--values $(HELM_CHART)/values.yaml \
		--output-dir ./output/helm-templates
	@echo "Helm templates generated in ./output/helm-templates"

helm-package: ## Package Helm chart
	@echo "Packaging Helm chart..."
	helm package $(HELM_CHART) --destination ./output/charts
	@echo "Helm chart packaged"

## Security and Compliance
security-scan: ## Run security scans
	@echo "Running security scans..."
	@command -v trivy >/dev/null 2>&1 && trivy fs . || echo "Trivy not found, skipping filesystem scan"
	@command -v snyk >/dev/null 2>&1 && snyk test || echo "Snyk not found, skipping vulnerability scan"
	@echo "Security scans completed"

compliance-check: ## Check compliance with CNCF standards
	@echo "Checking CNCF compliance..."
	@command -v polaris >/dev/null 2>&1 && polaris audit --format=pretty || echo "Polaris not found"
	@command -v kube-score >/dev/null 2>&1 && kubectl get pods -n $(NAMESPACE) -o yaml | kube-score score - || echo "kube-score not found"
	@echo "Compliance check completed"

## Utilities
check-deps: ## Check if required dependencies are installed
	@echo "Checking dependencies..."
	@command -v node >/dev/null 2>&1 || echo "Node.js is not installed"
	@command -v npm >/dev/null 2>&1 || echo "npm is not installed"
	@command -v kubectl >/dev/null 2>&1 || echo "kubectl is not installed"
	@command -v helm >/dev/null 2>&1 || echo "helm is not installed"
	@command -v docker >/dev/null 2>&1 || echo "docker is not installed"
	@command -v kind >/dev/null 2>&1 || echo "kind is not installed (optional for local development)"
	@command -v tofu >/dev/null 2>&1 || echo "OpenTofu is not installed (optional for infrastructure)"
	@echo "Dependency check completed"

clean: ## Clean up build artifacts
	@echo "Cleaning up..."
	rm -rf dist/
	rm -rf ui/dist/
	rm -rf node_modules/.cache/
	rm -rf output/
	@echo "Cleanup completed"

docs: ## Generate documentation
	@echo "Generating documentation..."
	@command -v helm-docs >/dev/null 2>&1 && helm-docs $(HELM_CHART) || echo "helm-docs not found"
	@echo "Documentation generated"

## Quick Development Workflow
dev: dev-setup dev-cluster dev-deploy dev-status ## Complete development setup
	@echo "Development environment is ready!"
	@echo "Next steps:"
	@echo "  1. Access dashboard: kubectl port-forward svc/$(PROJECT_NAME)-dashboard 8080:80 -n $(NAMESPACE)"
	@echo "  2. View logs: make dev-logs"
	@echo "  3. Check status: make dev-status"