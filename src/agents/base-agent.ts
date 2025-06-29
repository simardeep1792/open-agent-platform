// Base Agent Framework with A2A Protocol Support

import { EventEmitter } from 'events';
import { A2AProtocol } from '../communication/protocol';
import { AgentCard, AgentCapability, JsonRpcRequest, JsonRpcResponse } from '../types';

export abstract class BaseAgent extends EventEmitter {
  protected protocol: A2AProtocol;
  protected capabilities: Map<string, AgentCapability> = new Map();
  protected requestHandlers: Map<string, (params?: any, from?: string) => Promise<any>> = new Map();

  constructor(
    protected agentCard: AgentCard,
    protected transportLayer: AgentTransport
  ) {
    super();
    this.protocol = new A2AProtocol(agentCard.id);
    this.setupProtocol();
    this.setupDefaultHandlers();
  }

  // Abstract methods to be implemented by concrete agents
  abstract initialize(): Promise<void>;
  abstract shutdown(): Promise<void>;
  protected abstract setupCapabilities(): void;

  // Agent Registration and Discovery
  async start(): Promise<void> {
    this.setupCapabilities();
    await this.initialize();
    
    // Register with the agent registry
    await this.registerWithRegistry();
    
    // Start listening for messages
    this.transportLayer.on('message', (message) => {
      this.protocol.handleMessage(message);
    });

    this.emit('started');
  }

  async stop(): Promise<void> {
    await this.shutdown();
    await this.unregisterFromRegistry();
    this.emit('stopped');
  }

  // Capability Management
  protected addCapability(capability: AgentCapability, handler: (params?: any, from?: string) => Promise<any>): void {
    this.capabilities.set(capability.id, capability);
    this.requestHandlers.set(capability.id, handler);
    this.agentCard.capabilities.push(capability);
  }

  protected removeCapability(capabilityId: string): void {
    this.capabilities.delete(capabilityId);
    this.requestHandlers.delete(capabilityId);
    this.agentCard.capabilities = this.agentCard.capabilities.filter(c => c.id !== capabilityId);
  }

  // Agent-to-Agent Communication
  async sendRequest(targetAgent: string, method: string, params?: any): Promise<any> {
    return this.protocol.sendRequest(targetAgent, method, params);
  }

  sendNotification(targetAgent: string, method: string, params?: any): void {
    this.protocol.sendNotification(targetAgent, method, params);
  }

  async discoverAgents(capabilities?: string[], modalities?: string[]): Promise<any> {
    return this.protocol.discoverAgents(capabilities, modalities);
  }

  async getAgentCapabilities(agentId: string): Promise<any> {
    return this.protocol.getAgentCapabilities(agentId);
  }

  // Streaming Support
  async createStream(targetAgent: string, method: string, params?: any): Promise<string> {
    return this.protocol.createStream(targetAgent, method, params);
  }

  sendStreamData(targetAgent: string, streamId: string, data: any): void {
    this.protocol.sendStreamData(targetAgent, streamId, data);
  }

  closeStream(targetAgent: string, streamId: string): void {
    this.protocol.closeStream(targetAgent, streamId);
  }

  onStream(streamId: string, callback: (data: any) => void): void {
    this.protocol.onStream(streamId, callback);
  }

  // Health and Status
  updateHealth(status: 'healthy' | 'degraded' | 'unhealthy'): void {
    this.agentCard.health = status;
    this.agentCard.updated = new Date().toISOString();
    this.emit('health_changed', status);
  }

  getStatus(): AgentCard {
    return { ...this.agentCard };
  }

  // Private Methods
  private setupProtocol(): void {
    this.protocol.on('request', (request: JsonRpcRequest, from: string) => {
      this.handleRequest(request, from);
    });

    this.protocol.on('notification', (notification: any, from: string) => {
      this.handleNotification(notification, from);
    });

    this.protocol.on('send', (message) => {
      this.transportLayer.send(message);
    });
  }

  private setupDefaultHandlers(): void {
    // Standard A2A protocol handlers
    this.requestHandlers.set('agent/capabilities', async () => {
      return {
        agent: this.agentCard.name,
        capabilities: Array.from(this.capabilities.values())
      };
    });

    this.requestHandlers.set('agent/status', async () => {
      return this.getStatus();
    });

    this.requestHandlers.set('agent/health', async () => {
      return {
        health: this.agentCard.health,
        timestamp: new Date().toISOString()
      };
    });

    this.requestHandlers.set('agent/query-skill', async (params) => {
      const { skill } = params || {};
      const capability = Array.from(this.capabilities.values())
        .find(c => c.name.toLowerCase() === skill?.toLowerCase());
      
      return {
        available: !!capability,
        capability: capability || null
      };
    });
  }

  private async handleRequest(request: JsonRpcRequest, from: string): Promise<void> {
    try {
      const handler = this.requestHandlers.get(request.method);
      
      if (!handler) {
        this.protocol.sendResponse(from, request.id, undefined, {
          code: -32601,
          message: 'Method not found',
          data: { method: request.method }
        });
        return;
      }

      const result = await handler(request.params, from);
      this.protocol.sendResponse(from, request.id, result);
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Internal error';
      this.protocol.sendResponse(from, request.id, undefined, {
        code: -32603,
        message: errorMessage
      });
    }
  }

  private handleNotification(notification: any, from: string): void {
    this.emit('notification', notification, from);
  }

  private async registerWithRegistry(): Promise<void> {
    try {
      await this.sendRequest('registry', 'agent/register', this.agentCard);
    } catch (error) {
      console.error('Failed to register with registry:', error);
    }
  }

  private async unregisterFromRegistry(): Promise<void> {
    try {
      await this.sendRequest('registry', 'agent/unregister', { agent_id: this.agentCard.id });
    } catch (error) {
      console.error('Failed to unregister from registry:', error);
    }
  }
}

// Transport Layer Interface
export interface AgentTransport extends EventEmitter {
  send(message: any): void;
  connect(): Promise<void>;
  disconnect(): Promise<void>;
}

// Simple HTTP/WebSocket Transport Implementation
export class WebSocketTransport extends EventEmitter implements AgentTransport {
  private ws: any; // WebSocket connection

  constructor(private url: string) {
    super();
  }

  async connect(): Promise<void> {
    // WebSocket connection implementation
    console.log(`Connecting to ${this.url}`);
  }

  async disconnect(): Promise<void> {
    if (this.ws) {
      this.ws.close();
    }
  }

  send(message: any): void {
    if (this.ws && this.ws.readyState === 1) { // WebSocket.OPEN
      this.ws.send(JSON.stringify(message));
    }
  }
}