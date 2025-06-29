# Agent-to-Agent (A2A) Interoperability PoC

## Project Overview
A proof of concept implementation of Google's Agent2Agent (A2A) protocol for agent interoperability, featuring multi-cluster coordination and a comprehensive Agent Board UI.

## Key Commands
- `npm install`: Install all dependencies
- `npm run dev`: Start development environment
- `npm run build`: Build for production
- `npm run test`: Run test suite
- `npm run lint`: Run ESLint
- `npm run typecheck`: Run TypeScript checks
- `docker-compose up`: Start full system with dependencies

## Architecture
- **Core**: TypeScript/Node.js with JSON-RPC 2.0 communication
- **UI**: React-based Agent Board for monitoring and control
- **Communication**: MCP-inspired patterns with A2A protocol compliance
- **Deployment**: Cloud-native with Kubernetes manifests

## Development Workflow
1. Agents communicate via standardized schemas
2. Real-time monitoring through Agent Board
3. Multi-cluster coordination capabilities
4. Enterprise-ready security and authentication

## Sample Agents
- Cloudy Agent: Cloud resource management
- Data Agent: Analytics and processing
- Workflow Agent: Task orchestration
- Security Agent: Compliance monitoring