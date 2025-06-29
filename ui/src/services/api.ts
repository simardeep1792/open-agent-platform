// API Service for Agent Board

import axios from 'axios';
import { Agent, RegistryStats, ClusterInfo, AgentDiscoveryRequest } from '../types';

const api = axios.create({
  baseURL: '/api',
  timeout: 10000,
});

// Agents API
export const agentsApi = {
  getAll: async (): Promise<{ agents: Agent[]; total: number }> => {
    const response = await api.get('/agents');
    return response.data;
  },

  getById: async (id: string): Promise<Agent> => {
    const response = await api.get(`/agents/${id}`);
    return response.data;
  },

  discover: async (request: AgentDiscoveryRequest): Promise<{ agents: Agent[]; total: number }> => {
    const response = await api.post('/agents/discover', request);
    return response.data;
  },
};

// Registry API
export const registryApi = {
  getStats: async (): Promise<RegistryStats> => {
    const response = await api.get('/stats');
    return response.data;
  },

  getClusters: async (): Promise<{ clusters: ClusterInfo[]; total: number }> => {
    const response = await api.get('/clusters');
    return response.data;
  },
};

// WebSocket connection for real-time updates
export class AgentBoardWebSocket {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;

  constructor(private onMessage: (data: any) => void) {}

  connect(): void {
    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.host;
      this.ws = new WebSocket(`${protocol}//${host}/ws`);

      this.ws.onopen = () => {
        console.log('WebSocket connected');
        this.reconnectAttempts = 0;
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.onMessage(data);
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      this.ws.onclose = () => {
        console.log('WebSocket disconnected');
        this.attemptReconnect();
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
      };
    } catch (error) {
      console.error('Failed to connect WebSocket:', error);
      this.attemptReconnect();
    }
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  private attemptReconnect(): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      setTimeout(() => {
        console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
        this.connect();
      }, this.reconnectDelay * this.reconnectAttempts);
    }
  }
}

export default api;