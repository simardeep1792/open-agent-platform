// A2A Protocol Implementation with MCP-inspired patterns

import { EventEmitter } from 'events';
import { JsonRpcRequest, JsonRpcResponse, JsonRpcError, AgentMessage } from '../types';

export class A2AProtocol extends EventEmitter {
  private correlationMap = new Map<string, (response: JsonRpcResponse) => void>();
  private streamMap = new Map<string, (data: any) => void>();

  constructor(private agentId: string) {
    super();
  }

  // Core JSON-RPC 2.0 Methods
  async sendRequest(to: string, method: string, params?: any): Promise<any> {
    const id = this.generateId();
    const request: JsonRpcRequest = {
      jsonrpc: '2.0',
      method,
      params,
      id
    };

    return new Promise((resolve, reject) => {
      this.correlationMap.set(id.toString(), (response: JsonRpcResponse) => {
        if (response.error) {
          reject(new A2AError(response.error));
        } else {
          resolve(response.result);
        }
      });

      this.sendMessage({
        from: this.agentId,
        to,
        type: 'request',
        payload: request,
        timestamp: new Date().toISOString(),
        correlation_id: id.toString()
      });

      // Timeout after 30 seconds
      setTimeout(() => {
        if (this.correlationMap.has(id.toString())) {
          this.correlationMap.delete(id.toString());
          reject(new Error('Request timeout'));
        }
      }, 30000);
    });
  }

  sendNotification(to: string, method: string, params?: any): void {
    const notification = {
      jsonrpc: '2.0' as const,
      method,
      params
    };

    this.sendMessage({
      from: this.agentId,
      to,
      type: 'notification',
      payload: notification,
      timestamp: new Date().toISOString()
    });
  }

  sendResponse(to: string, id: string | number, result?: any, error?: JsonRpcError): void {
    const response: JsonRpcResponse = {
      jsonrpc: '2.0',
      id,
      ...(error ? { error } : { result })
    };

    this.sendMessage({
      from: this.agentId,
      to,
      type: 'response',
      payload: response,
      timestamp: new Date().toISOString(),
      correlation_id: id.toString()
    });
  }

  // Streaming Support (inspired by MCP)
  createStream(to: string, method: string, params?: any): Promise<string> {
    const streamId = this.generateId();
    
    return this.sendRequest(to, 'stream/create', {
      stream_id: streamId,
      method,
      params
    }).then(() => streamId);
  }

  sendStreamData(to: string, streamId: string, data: any): void {
    this.sendMessage({
      from: this.agentId,
      to,
      type: 'stream',
      payload: data,
      timestamp: new Date().toISOString(),
      stream_id: streamId
    });
  }

  closeStream(to: string, streamId: string): void {
    this.sendRequest(to, 'stream/close', { stream_id: streamId });
  }

  onStream(streamId: string, callback: (data: any) => void): void {
    this.streamMap.set(streamId, callback);
  }

  // Agent Discovery Methods
  async discoverAgents(capabilities?: string[], modalities?: string[]): Promise<any> {
    return this.sendRequest('registry', 'agent/discover', {
      capabilities,
      modalities
    });
  }

  async getAgentCapabilities(agentId: string): Promise<any> {
    return this.sendRequest(agentId, 'agent/capabilities');
  }

  async querySkill(agentId: string, skillName: string): Promise<any> {
    return this.sendRequest(agentId, 'agent/query-skill', {
      skill: skillName
    });
  }

  // Message Handling
  handleMessage(message: AgentMessage): void {
    if (message.type === 'response' && message.correlation_id) {
      const callback = this.correlationMap.get(message.correlation_id);
      if (callback) {
        callback(message.payload as JsonRpcResponse);
        this.correlationMap.delete(message.correlation_id);
      }
    } else if (message.type === 'stream' && message.stream_id) {
      const callback = this.streamMap.get(message.stream_id);
      if (callback) {
        callback(message.payload);
      }
    } else if (message.type === 'request') {
      this.emit('request', message.payload, message.from);
    } else if (message.type === 'notification') {
      this.emit('notification', message.payload, message.from);
    }
  }

  // Abstract method to be implemented by transport layer
  protected sendMessage(message: AgentMessage): void {
    this.emit('send', message);
  }

  private generateId(): string {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
  }
}

export class A2AError extends Error {
  public code: number;
  public data?: any;

  constructor(error: JsonRpcError) {
    super(error.message);
    this.code = error.code;
    this.data = error.data;
    this.name = 'A2AError';
  }
}

// Standard A2A Error Codes
export const A2AErrorCodes = {
  PARSE_ERROR: -32700,
  INVALID_REQUEST: -32600,
  METHOD_NOT_FOUND: -32601,
  INVALID_PARAMS: -32602,
  INTERNAL_ERROR: -32603,
  AGENT_NOT_FOUND: -32001,
  CAPABILITY_NOT_FOUND: -32002,
  AUTHENTICATION_FAILED: -32003,
  AUTHORIZATION_FAILED: -32004,
  RATE_LIMITED: -32005
} as const;