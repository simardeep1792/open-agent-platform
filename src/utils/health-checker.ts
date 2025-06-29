// Health checking utility for agents

import { Logger } from './logger';

export interface HealthCheckConfig {
  path?: string;
  intervalSeconds?: number;
  timeoutSeconds?: number;
  retries?: number;
}

export class HealthChecker {
  private readonly logger: Logger;
  private readonly activeChecks = new Map<string, NodeJS.Timeout>();

  constructor() {
    this.logger = new Logger('HealthChecker');
  }

  /**
   * Check if an agent is healthy
   */
  async checkAgent(name: string, spec: any): Promise<boolean> {
    const endpoints = spec.endpoints || [];
    const healthConfig = spec.healthCheck || {};

    // If no endpoints, consider the agent healthy (stateless)
    if (endpoints.length === 0) {
      return true;
    }

    // Try each endpoint until one succeeds
    for (const endpoint of endpoints) {
      try {
        const isHealthy = await this.checkEndpoint(name, endpoint, healthConfig);
        if (isHealthy) {
          return true;
        }
      } catch (error) {
        this.logger.debug('Endpoint health check failed', { 
          agent: name, 
          endpoint: endpoint.type,
          error 
        });
      }
    }

    return false;
  }

  /**
   * Check health of a specific endpoint
   */
  private async checkEndpoint(
    agentName: string,
    endpoint: any,
    config: HealthCheckConfig
  ): Promise<boolean> {
    const timeout = (config.timeoutSeconds || 5) * 1000;
    const healthPath = config.path || '/health';

    try {
      if (endpoint.type === 'http') {
        return await this.checkHttpEndpoint(agentName, endpoint, healthPath, timeout);
      } else if (endpoint.type === 'grpc') {
        return await this.checkGrpcEndpoint(agentName, endpoint, timeout);
      } else if (endpoint.type === 'websocket') {
        return await this.checkWebSocketEndpoint(agentName, endpoint, timeout);
      }

      // Unknown endpoint type
      this.logger.warn('Unknown endpoint type for health check', {
        agent: agentName,
        type: endpoint.type
      });
      return false;
    } catch (error) {
      this.logger.debug('Health check failed', {
        agent: agentName,
        endpoint: endpoint.type,
        error
      });
      return false;
    }
  }

  /**
   * Check HTTP endpoint health
   */
  private async checkHttpEndpoint(
    agentName: string,
    endpoint: any,
    healthPath: string,
    timeout: number
  ): Promise<boolean> {
    // In a real implementation, this would make an HTTP request
    // For now, we'll simulate a health check
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      // Simulate HTTP health check
      const protocol = endpoint.tls ? 'https' : 'http';
      const url = `${protocol}://${agentName}:${endpoint.port}${healthPath}`;
      
      this.logger.debug('Checking HTTP health', { agent: agentName, url });
      
      // In production, use fetch or axios here
      // const response = await fetch(url, { signal: controller.signal });
      // return response.ok;
      
      // For now, simulate success
      return true;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Check gRPC endpoint health
   */
  private async checkGrpcEndpoint(
    agentName: string,
    endpoint: any,
    timeout: number
  ): Promise<boolean> {
    // In production, this would use gRPC health checking protocol
    this.logger.debug('Checking gRPC health', { 
      agent: agentName, 
      port: endpoint.port 
    });
    
    // Simulate gRPC health check
    return true;
  }

  /**
   * Check WebSocket endpoint health
   */
  private async checkWebSocketEndpoint(
    agentName: string,
    endpoint: any,
    timeout: number
  ): Promise<boolean> {
    // In production, this would establish a WebSocket connection
    this.logger.debug('Checking WebSocket health', { 
      agent: agentName, 
      port: endpoint.port 
    });
    
    // Simulate WebSocket health check
    return true;
  }

  /**
   * Start periodic health checking for an agent
   */
  startPeriodicCheck(
    agentName: string,
    spec: any,
    onHealthChange: (healthy: boolean) => void
  ): void {
    const interval = (spec.healthCheck?.intervalSeconds || 30) * 1000;
    
    // Clear existing check if any
    this.stopPeriodicCheck(agentName);

    const intervalId = setInterval(async () => {
      try {
        const isHealthy = await this.checkAgent(agentName, spec);
        onHealthChange(isHealthy);
      } catch (error) {
        this.logger.error('Periodic health check failed', {
          agent: agentName,
          error
        });
        onHealthChange(false);
      }
    }, interval);

    this.activeChecks.set(agentName, intervalId);
    
    this.logger.info('Started periodic health checking', {
      agent: agentName,
      intervalSeconds: interval / 1000
    });
  }

  /**
   * Stop periodic health checking for an agent
   */
  stopPeriodicCheck(agentName: string): void {
    const intervalId = this.activeChecks.get(agentName);
    if (intervalId) {
      clearInterval(intervalId);
      this.activeChecks.delete(agentName);
      
      this.logger.info('Stopped periodic health checking', {
        agent: agentName
      });
    }
  }

  /**
   * Stop all health checks
   */
  stop(): void {
    for (const [agentName, intervalId] of this.activeChecks) {
      clearInterval(intervalId);
      this.logger.debug('Stopped health check', { agent: agentName });
    }
    this.activeChecks.clear();
    
    this.logger.info('All health checks stopped');
  }
}