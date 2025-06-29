// Main Server - Agent Registry and Communication Hub

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import { AgentRegistry } from '../registry/agent-registry';
import { CloudyAgent } from '../agents/cloudy-agent';
import { AgentMessage } from '../types';

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });

// Global registry instance
const registry = new AgentRegistry();

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Agent connections map
const agentConnections = new Map<string, any>();

// WebSocket handling for agent connections
wss.on('connection', (ws, req) => {
  const url = new URL(req.url || '', `http://${req.headers.host}`);
  const agentId = url.pathname.split('/').pop();
  
  if (!agentId) {
    ws.close(1008, 'Invalid agent ID');
    return;
  }

  console.log(`Agent ${agentId} connected`);
  agentConnections.set(agentId, ws);

  ws.on('message', async (data) => {
    try {
      const message: AgentMessage = JSON.parse(data.toString());
      await handleAgentMessage(message, agentId);
    } catch (error) {
      console.error('Error handling message:', error);
    }
  });

  ws.on('close', () => {
    console.log(`Agent ${agentId} disconnected`);
    agentConnections.delete(agentId);
    registry.unregisterAgent(agentId);
  });

  ws.on('error', (error) => {
    console.error(`WebSocket error for agent ${agentId}:`, error);
  });
});

// Message routing between agents
async function handleAgentMessage(message: AgentMessage, fromAgentId: string): Promise<void> {
  if (message.to === 'registry') {
    // Handle registry requests
    await handleRegistryRequest(message, fromAgentId);
  } else {
    // Route message to target agent
    const targetConnection = agentConnections.get(message.to);
    if (targetConnection && targetConnection.readyState === 1) {
      targetConnection.send(JSON.stringify(message));
    } else {
      // Send error back to sender
      const errorResponse: AgentMessage = {
        from: 'registry',
        to: fromAgentId,
        type: 'response',
        payload: {
          jsonrpc: '2.0',
          id: message.payload.id,
          error: {
            code: -32001,
            message: 'Agent not found or unavailable',
            data: { target_agent: message.to }
          }
        },
        timestamp: new Date().toISOString()
      };
      
      const senderConnection = agentConnections.get(fromAgentId);
      if (senderConnection && senderConnection.readyState === 1) {
        senderConnection.send(JSON.stringify(errorResponse));
      }
    }
  }
}

// Handle registry-specific requests
async function handleRegistryRequest(message: AgentMessage, fromAgentId: string): Promise<void> {
  const request = message.payload;
  let result: any;
  let error: any;

  try {
    switch (request.method) {
      case 'agent/register':
        await registry.registerAgent(request.params);
        result = { success: true, message: 'Agent registered successfully' };
        break;

      case 'agent/unregister':
        await registry.unregisterAgent(request.params.agent_id);
        result = { success: true, message: 'Agent unregistered successfully' };
        break;

      case 'agent/discover':
        result = await registry.discoverAgents(request.params);
        break;

      case 'agent/get':
        result = await registry.getAgent(request.params.agent_id);
        break;

      case 'agent/list':
        result = await registry.getAllAgents();
        break;

      case 'registry/stats':
        result = registry.getStatistics();
        break;

      default:
        error = {
          code: -32601,
          message: 'Method not found',
          data: { method: request.method }
        };
    }
  } catch (err) {
    error = {
      code: -32603,
      message: err instanceof Error ? err.message : 'Internal error'
    };
  }

  // Send response back to agent
  const response: AgentMessage = {
    from: 'registry',
    to: fromAgentId,
    type: 'response',
    payload: {
      jsonrpc: '2.0',
      id: request.id,
      ...(error ? { error } : { result })
    },
    timestamp: new Date().toISOString()
  };

  const connection = agentConnections.get(fromAgentId);
  if (connection && connection.readyState === 1) {
    connection.send(JSON.stringify(response));
  }
}

// REST API Endpoints for Agent Board UI
app.get('/api/agents', async (req, res) => {
  try {
    const agents = await registry.getAllAgents();
    res.json({ agents, total: agents.length });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch agents' });
  }
});

app.get('/api/agents/:id', async (req, res) => {
  try {
    const agent = await registry.getAgent(req.params.id);
    if (!agent) {
      return res.status(404).json({ error: 'Agent not found' });
    }
    res.json(agent);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch agent' });
  }
});

app.post('/api/agents/discover', async (req, res) => {
  try {
    const result = await registry.discoverAgents(req.body);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Failed to discover agents' });
  }
});

app.get('/api/stats', (req, res) => {
  try {
    const stats = registry.getStatistics();
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

app.get('/api/clusters', async (req, res) => {
  try {
    const clusters = await registry.getClusters();
    res.json({ clusters, total: clusters.length });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch clusters' });
  }
});

// Agent Board UI routes (serve React app)
app.use(express.static('ui/dist'));
app.get('*', (req, res) => {
  res.sendFile('index.html', { root: 'ui/dist' });
});

// Registry event logging
registry.on('agent_registered', (agent) => {
  console.log(`Agent registered: ${agent.name} (${agent.id})`);
});

registry.on('agent_unregistered', (agent) => {
  console.log(`Agent unregistered: ${agent.name} (${agent.id})`);
});

registry.on('agent_health_changed', (agent) => {
  console.log(`Agent health changed: ${agent.name} -> ${agent.health}`);
});

// Start server
const PORT = process.env.PORT || 3010;
server.listen(PORT, () => {
  console.log(`A2A Registry Server running on port ${PORT}`);
  console.log(`WebSocket endpoint: ws://localhost:${PORT}/agents/{agent-id}`);
  console.log(`Agent Board UI: http://localhost:${PORT}`);
  
  // Start sample agents for demonstration
  startSampleAgents();
});

// Start sample agents
async function startSampleAgents(): Promise<void> {
  console.log('Starting sample agents...');
  
  try {
    // Start Cloudy Agent
    const cloudyAgent = new CloudyAgent('cloudy-001', `ws://localhost:${PORT}/agents/cloudy-001`);
    await cloudyAgent.start();
    console.log('Cloudy Agent started successfully');
    
    // Add more sample agents here
    
  } catch (error) {
    console.error('Failed to start sample agents:', error);
  }
}

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('Shutting down server...');
  server.close(() => {
    console.log('Server stopped');
    process.exit(0);
  });
});

export { app, server, registry };