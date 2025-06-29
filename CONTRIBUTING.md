# Contributing to Open Agent Platform

Welcome! We're thrilled that you're interested in contributing to the Open Agent Platform. This document provides guidelines and information for contributors.

## Code of Conduct

This project and everyone participating in it is governed by our [Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code.

## How to Contribute

### Reporting Issues

Before creating bug reports, please check the existing issues to see if the problem has already been reported. When you create a bug report, please include as many details as possible:

- **Use a clear and descriptive title**
- **Describe the steps to reproduce the problem**
- **Provide specific examples to demonstrate the steps**
- **Describe the behavior you observed and what behavior you expected**
- **Include environment details** (Kubernetes version, platform, etc.)

### Suggesting Enhancements

Enhancement suggestions are tracked as GitHub issues. When creating an enhancement suggestion, please include:

- **Use a clear and descriptive title**
- **Provide a detailed description of the suggested enhancement**
- **Explain why this enhancement would be useful**
- **List any alternatives you've considered**

### Pull Requests

1. **Fork the repository** and create your branch from `main`
2. **Make your changes** following our coding standards
3. **Add tests** for any new functionality
4. **Update documentation** as needed
5. **Ensure the test suite passes**
6. **Submit a pull request**

## Development Environment

### Prerequisites

- Node.js 18+
- Kubernetes cluster (local or remote)
- Docker
- Helm 3.8+
- kubectl

### Setting Up

```bash
# Clone your fork
git clone https://github.com/YOUR_USERNAME/open-agent-platform.git
cd open-agent-platform

# Setup development environment
make dev-setup

# Create local cluster and deploy
make dev
```

### Development Workflow

1. **Create a feature branch**:
   ```bash
   git checkout -b feature/my-new-feature
   ```

2. **Make your changes** following our coding standards

3. **Test your changes**:
   ```bash
   make test
   make lint
   ```

4. **Deploy and test locally**:
   ```bash
   make dev-deploy
   make dev-status
   ```

5. **Commit your changes**:
   ```bash
   git add .
   git commit -m "feat: add my new feature"
   ```

6. **Push to your fork**:
   ```bash
   git push origin feature/my-new-feature
   ```

## Coding Standards

### TypeScript/JavaScript

- Use TypeScript for all new code
- Follow ESLint configuration
- Use Prettier for code formatting
- Prefer async/await over Promises
- Use descriptive variable and function names
- Add JSDoc comments for public APIs

### Kubernetes Manifests

- Use proper resource limits and requests
- Include appropriate labels and annotations
- Follow Kubernetes best practices for security
- Use ConfigMaps and Secrets appropriately

### Helm Charts

- Use semantic versioning
- Document all values in `values.yaml`
- Include helpful chart descriptions
- Test chart templates with different values

### Documentation

- Use clear, concise language
- Include code examples where appropriate
- Keep README files up to date
- Document configuration options

## Project Structure

```
open-agent-platform/
├── src/                    # Core platform source code
│   ├── agents/            # Agent implementations
│   ├── communication/     # A2A protocol implementation
│   ├── k8s/              # Kubernetes controllers
│   ├── registry/         # Agent registry service
│   └── utils/            # Shared utilities
├── ui/                    # Dashboard UI source code
├── k8s/                   # Kubernetes manifests
│   ├── base/             # Base resources
│   └── overlays/         # Environment-specific overlays
├── helm/                  # Helm charts
├── infrastructure/        # OpenTofu infrastructure code
├── docs/                  # Documentation
├── examples/              # Example configurations and agents
└── scripts/              # Build and deployment scripts
```

## Testing

### Running Tests

```bash
# Run all tests
make test

# Run specific test suites
npm test                   # Backend tests
cd ui && npm test         # Frontend tests

# Run with coverage
npm run test:coverage
```

### Writing Tests

- Write unit tests for all new functionality
- Include integration tests for API endpoints
- Test error conditions and edge cases
- Use descriptive test names
- Mock external dependencies appropriately

### Testing Guidelines

- **Unit Tests**: Test individual functions and classes
- **Integration Tests**: Test component interactions
- **E2E Tests**: Test complete user workflows
- **Performance Tests**: Test under load conditions

## Documentation

### API Documentation

- Document all public APIs with OpenAPI/Swagger specs
- Include request/response examples
- Document error codes and messages
- Keep documentation synchronized with code changes

### User Documentation

- Write clear setup and installation guides
- Include troubleshooting sections
- Provide configuration examples
- Document best practices

## Security

### Security Guidelines

- Never commit secrets or credentials
- Use secure coding practices
- Follow the principle of least privilege
- Validate all inputs
- Use parameterized queries for databases

### Reporting Security Issues

Please report security vulnerabilities privately to security@open-agent-platform.io. Do not create public issues for security problems.

## Release Process

### Versioning

We use [Semantic Versioning](https://semver.org/):

- **MAJOR**: Incompatible API changes
- **MINOR**: Backwards-compatible functionality additions
- **PATCH**: Backwards-compatible bug fixes

### Release Checklist

1. Update version numbers
2. Update CHANGELOG.md
3. Create release notes
4. Tag the release
5. Build and push Docker images
6. Update Helm chart repository
7. Announce the release

## Community

### Communication Channels

- **GitHub Discussions**: For general questions and discussions
- **GitHub Issues**: For bug reports and feature requests
- **Discord**: For real-time chat and community support
- **Email**: maintainers@open-agent-platform.io for private matters

### Getting Help

If you need help with development:

1. Check the documentation
2. Search existing GitHub issues
3. Ask in GitHub Discussions
4. Join our Discord community

## Recognition

Contributors are recognized in several ways:

- Listed in CONTRIBUTORS.md
- Mentioned in release notes
- Featured in community highlights
- Invited to contributor events

## License

By contributing to Open Agent Platform, you agree that your contributions will be licensed under the MIT License.

## Questions?

If you have questions about contributing, please:

1. Check this guide first
2. Look through existing issues and discussions
3. Ask in our Discord community
4. Email the maintainers

Thank you for contributing to Open Agent Platform!