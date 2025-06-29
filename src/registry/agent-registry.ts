// Agent Registry Service for Discovery and Management

import { EventEmitter } from 'events';
import { AgentCard, AgentDiscoveryRequest, AgentDiscoveryResponse, HealthStatus, ClusterInfo } from '../types';

export class AgentRegistry extends EventEmitter {
  private agents = new Map<string, AgentCard>();
  private clusters = new Map<string, ClusterInfo>();
  private healthChecks = new Map<string, NodeJS.Timeout>();

  constructor() {
    super();
    this.startHealthMonitoring();
  }

  // Agent Registration
  async registerAgent(agent: AgentCard): Promise<void> {
    const existingAgent = this.agents.get(agent.id);
    
    if (existingAgent) {
      // Update existing agent
      const updatedAgent = {
        ...agent,
        updated: new Date().toISOString()
      };
      this.agents.set(agent.id, updatedAgent);
      this.emit('agent_updated', updatedAgent);
    } else {
      // Register new agent
      const newAgent = {
        ...agent,
        created: new Date().toISOString(),
        updated: new Date().toISOString(),
        health: 'healthy' as HealthStatus
      };
      this.agents.set(agent.id, newAgent);
      this.emit('agent_registered', newAgent);
    }

    // Start health monitoring for this agent
    this.startAgentHealthCheck(agent.id);
  }

  async unregisterAgent(agentId: string): Promise<void> {
    const agent = this.agents.get(agentId);
    if (agent) {
      this.agents.delete(agentId);
      
      // Stop health monitoring
      const healthCheck = this.healthChecks.get(agentId);
      if (healthCheck) {
        clearInterval(healthCheck);
        this.healthChecks.delete(agentId);
      }

      this.emit('agent_unregistered', agent);
    }
  }

  // Agent Discovery
  async discoverAgents(request: AgentDiscoveryRequest): Promise<AgentDiscoveryResponse> {
    let filteredAgents = Array.from(this.agents.values());

    // Filter by capabilities
    if (request.capabilities && request.capabilities.length > 0) {
      filteredAgents = filteredAgents.filter(agent =>
        request.capabilities!.some(cap =>
          agent.capabilities.some(agentCap => 
            agentCap.name.toLowerCase().includes(cap.toLowerCase()) ||
            agentCap.id === cap
          )
        )
      );
    }

    // Filter by modalities
    if (request.modalities && request.modalities.length > 0) {
      filteredAgents = filteredAgents.filter(agent =>
        agent.capabilities.some(cap =>
          cap.modalities.some(modality =>
            request.modalities!.includes(modality)
          )
        )
      );
    }

    // Filter by location (cluster)
    if (request.location) {
      filteredAgents = filteredAgents.filter(agent =>
        agent.metadata?.cluster === request.location
      );
    }

    // Only return healthy agents
    filteredAgents = filteredAgents.filter(agent => 
      agent.health === 'healthy' || agent.health === 'degraded'
    );

    return {
      agents: filteredAgents,
      total: filteredAgents.length,
      page: 1,
      per_page: filteredAgents.length
    };
  }

  async getAgent(agentId: string): Promise<AgentCard | null> {
    return this.agents.get(agentId) || null;
  }

  async getAllAgents(): Promise<AgentCard[]> {
    return Array.from(this.agents.values());
  }

  // Health Monitoring
  async updateAgentHealth(agentId: string, health: HealthStatus): Promise<void> {
    const agent = this.agents.get(agentId);
    if (agent) {
      agent.health = health;
      agent.updated = new Date().toISOString();
      this.emit('agent_health_changed', agent);
    }
  }

  private startAgentHealthCheck(agentId: string): void {
    // Clear existing health check
    const existingCheck = this.healthChecks.get(agentId);
    if (existingCheck) {
      clearInterval(existingCheck);
    }

    // Start new health check every 30 seconds
    const healthCheck = setInterval(async () => {
      try {
        const agent = this.agents.get(agentId);
        if (!agent) {
          clearInterval(healthCheck);
          this.healthChecks.delete(agentId);
          return;
        }

        // Perform health check (simplified)
        const isHealthy = await this.performHealthCheck(agent);
        const newHealth: HealthStatus = isHealthy ? 'healthy' : 'unhealthy';
        
        if (newHealth !== agent.health) {
          await this.updateAgentHealth(agentId, newHealth);
        }
      } catch (error) {
        console.error(`Health check failed for agent ${agentId}:`, error);
        await this.updateAgentHealth(agentId, 'unhealthy');
      }
    }, 30000);

    this.healthChecks.set(agentId, healthCheck);
  }

  private async performHealthCheck(agent: AgentCard): Promise<boolean> {
    // Simplified health check - in production, this would ping the agent
    const httpEndpoint = agent.endpoints.find(e => e.type === 'http');
    if (!httpEndpoint) return true; // No endpoint to check

    try {
      // In a real implementation, we'd make an HTTP request to the health endpoint
      // For now, we'll simulate this
      const timeSinceUpdate = Date.now() - new Date(agent.updated).getTime();
      return timeSinceUpdate < 300000; // Consider unhealthy if no update in 5 minutes
    } catch {
      return false;
    }
  }

  private startHealthMonitoring(): void {
    // Clean up stale agents every 5 minutes
    setInterval(() => {
      const staleThreshold = Date.now() - 600000; // 10 minutes
      
      for (const [agentId, agent] of this.agents.entries()) {
        const lastUpdate = new Date(agent.updated).getTime();
        if (lastUpdate < staleThreshold) {
          this.updateAgentHealth(agentId, 'unknown');
        }
      }
    }, 300000);
  }

  // Multi-cluster Support
  async registerCluster(cluster: ClusterInfo): Promise<void> {
    this.clusters.set(cluster.id, {
      ...cluster,
      last_seen: new Date().toISOString()
    });
    this.emit('cluster_registered', cluster);
  }

  async unregisterCluster(clusterId: string): Promise<void> {
    const cluster = this.clusters.get(clusterId);
    if (cluster) {
      this.clusters.delete(clusterId);
      this.emit('cluster_unregistered', cluster);
    }
  }

  async getClusters(): Promise<ClusterInfo[]> {
    return Array.from(this.clusters.values());
  }

  // Statistics
  getStatistics() {
    const agents = Array.from(this.agents.values());
    const healthyAgents = agents.filter(a => a.health === 'healthy').length;
    const degradedAgents = agents.filter(a => a.health === 'degraded').length;
    const unhealthyAgents = agents.filter(a => a.health === 'unhealthy').length;

    return {
      total_agents: agents.length,
      healthy_agents: healthyAgents,
      degraded_agents: degradedAgents,
      unhealthy_agents: unhealthyAgents,
      total_clusters: this.clusters.size,
      total_capabilities: agents.reduce((sum, agent) => sum + agent.capabilities.length, 0)
    };
  }
}