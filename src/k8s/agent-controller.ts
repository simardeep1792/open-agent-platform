// Kubernetes Agent Controller - Production-grade agent lifecycle management

import { KubernetesApi, CoreV1Api, CustomObjectsApi } from '@kubernetes/client-node';
import { EventEmitter } from 'events';
import { Logger } from '../utils/logger';
import { HealthChecker } from '../utils/health-checker';

interface AgentSpec {
  name: string;
  version: string;
  description?: string;
  capabilities: AgentCapability[];
  endpoints: AgentEndpoint[];
  authentication: AuthenticationConfig;
  resources?: ResourceRequirements;
  healthCheck?: HealthCheckConfig;
}

interface AgentStatus {
  phase: 'Pending' | 'Running' | 'Failed' | 'Succeeded';
  health: 'healthy' | 'degraded' | 'unhealthy' | 'unknown';
  lastSeen?: string;
  conditions: StatusCondition[];
  observedGeneration?: number;
  registeredCapabilities: string[];
}

interface StatusCondition {
  type: string;
  status: 'True' | 'False' | 'Unknown';
  lastTransitionTime: string;
  reason?: string;
  message?: string;
}

export class AgentController extends EventEmitter {
  private readonly k8sApi: CoreV1Api;
  private readonly customApi: CustomObjectsApi;
  private readonly logger: Logger;
  private readonly healthChecker: HealthChecker;
  private readonly namespace: string;
  private readonly watchAbortController: AbortController;

  constructor(
    namespace: string = 'default',
    logger?: Logger
  ) {
    super();
    this.namespace = namespace;
    this.logger = logger || new Logger('AgentController');
    this.healthChecker = new HealthChecker();
    this.watchAbortController = new AbortController();

    // Initialize Kubernetes API clients
    const kc = new KubernetesApi();
    kc.loadFromDefault();
    
    this.k8sApi = kc.makeApiClient(CoreV1Api);
    this.customApi = kc.makeApiClient(CustomObjectsApi);
  }

  /**
   * Start the agent controller
   * Begins watching for Agent CRD changes and managing agent lifecycle
   */
  async start(): Promise<void> {
    this.logger.info('Starting Agent Controller', { namespace: this.namespace });

    try {
      // Verify CRD exists
      await this.verifyCRD();
      
      // Start watching for agent changes
      await this.watchAgentResources();
      
      // Start health monitoring
      this.startHealthMonitoring();
      
      this.logger.info('Agent Controller started successfully');
      this.emit('started');
    } catch (error) {
      this.logger.error('Failed to start Agent Controller', { error });
      throw error;
    }
  }

  /**
   * Stop the agent controller
   */
  async stop(): Promise<void> {
    this.logger.info('Stopping Agent Controller');
    
    this.watchAbortController.abort();
    this.healthChecker.stop();
    
    this.emit('stopped');
    this.logger.info('Agent Controller stopped');
  }

  /**
   * Register a new agent with the Kubernetes cluster
   */
  async registerAgent(
    name: string, 
    spec: AgentSpec,
    labels: Record<string, string> = {}
  ): Promise<void> {
    this.logger.info('Registering agent', { name, spec });

    const agentResource = {
      apiVersion: 'a2a.io/v1',
      kind: 'Agent',
      metadata: {
        name,
        namespace: this.namespace,
        labels: {
          'app.kubernetes.io/name': name,
          'app.kubernetes.io/component': 'agent',
          'app.kubernetes.io/part-of': 'a2a-platform',
          'app.kubernetes.io/managed-by': 'a2a-controller',
          ...labels
        },
        annotations: {
          'a2a.io/registered-at': new Date().toISOString(),
          'a2a.io/agent-version': spec.version
        }
      },
      spec,
      status: {
        phase: 'Pending',
        health: 'unknown',
        conditions: [],
        registeredCapabilities: []
      } as AgentStatus
    };

    try {
      await this.customApi.createNamespacedCustomObject(
        'a2a.io',
        'v1',
        this.namespace,
        'agents',
        agentResource
      );

      this.logger.info('Agent registered successfully', { name });
      this.emit('agent-registered', { name, spec });
    } catch (error) {
      this.logger.error('Failed to register agent', { name, error });
      throw error;
    }
  }

  /**
   * Unregister an agent from the cluster
   */
  async unregisterAgent(name: string): Promise<void> {
    this.logger.info('Unregistering agent', { name });

    try {
      await this.customApi.deleteNamespacedCustomObject(
        'a2a.io',
        'v1',
        this.namespace,
        'agents',
        name
      );

      this.logger.info('Agent unregistered successfully', { name });
      this.emit('agent-unregistered', { name });
    } catch (error) {
      this.logger.error('Failed to unregister agent', { name, error });
      throw error;
    }
  }

  /**
   * Update agent status
   */
  async updateAgentStatus(
    name: string, 
    status: Partial<AgentStatus>
  ): Promise<void> {
    try {
      // Get current agent resource
      const currentAgent = await this.getAgent(name);
      if (!currentAgent) {
        throw new Error(`Agent ${name} not found`);
      }

      // Merge status updates
      const updatedStatus = {
        ...currentAgent.status,
        ...status,
        lastSeen: new Date().toISOString()
      };

      // Update the resource
      await this.customApi.patchNamespacedCustomObjectStatus(
        'a2a.io',
        'v1',
        this.namespace,
        'agents',
        name,
        {
          status: updatedStatus
        }
      );

      this.emit('agent-status-updated', { name, status: updatedStatus });
    } catch (error) {
      this.logger.error('Failed to update agent status', { name, error });
      throw error;
    }
  }

  /**
   * Get agent by name
   */
  async getAgent(name: string): Promise<any | null> {
    try {
      const response = await this.customApi.getNamespacedCustomObject(
        'a2a.io',
        'v1',
        this.namespace,
        'agents',
        name
      );
      return response.body;
    } catch (error: any) {
      if (error.response?.statusCode === 404) {
        return null;
      }
      throw error;
    }
  }

  /**
   * List all agents in the namespace
   */
  async listAgents(labelSelector?: string): Promise<any[]> {
    try {
      const response = await this.customApi.listNamespacedCustomObject(
        'a2a.io',
        'v1',
        this.namespace,
        'agents',
        undefined, // pretty
        undefined, // allowWatchBookmarks
        undefined, // continue
        undefined, // fieldSelector
        labelSelector
      );

      return (response.body as any).items || [];
    } catch (error) {
      this.logger.error('Failed to list agents', { error });
      return [];
    }
  }

  /**
   * Verify that the Agent CRD exists
   */
  private async verifyCRD(): Promise<void> {
    try {
      const response = await this.customApi.getClusterCustomObject(
        'apiextensions.k8s.io',
        'v1',
        'customresourcedefinitions',
        'agents.a2a.io'
      );
      
      this.logger.debug('Agent CRD verified', { crd: response.body });
    } catch (error) {
      this.logger.error('Agent CRD not found. Please install the CRD first.', { error });
      throw new Error('Agent CRD not found. Run: kubectl apply -f k8s/base/agent-crd.yaml');
    }
  }

  /**
   * Watch for changes to Agent resources
   */
  private async watchAgentResources(): Promise<void> {
    this.logger.info('Starting to watch Agent resources');

    const watch = await this.customApi.listNamespacedCustomObject(
      'a2a.io',
      'v1',
      this.namespace,
      'agents',
      undefined, // pretty
      true, // allowWatchBookmarks
      undefined, // continue
      undefined, // fieldSelector
      undefined, // labelSelector
      undefined, // limit
      undefined, // resourceVersion
      undefined, // resourceVersionMatch
      undefined, // timeoutSeconds
      true // watch
    );

    // Handle watch events
    (watch as any).on('data', (event: any) => {
      this.handleAgentEvent(event);
    });

    (watch as any).on('error', (error: any) => {
      this.logger.error('Watch error', { error });
      // Implement exponential backoff retry
      setTimeout(() => this.watchAgentResources(), 5000);
    });
  }

  /**
   * Handle Agent resource events
   */
  private handleAgentEvent(event: any): void {
    const { type, object } = event;
    const agentName = object.metadata.name;

    this.logger.debug('Agent event received', { type, agentName });

    switch (type) {
      case 'ADDED':
        this.emit('agent-added', object);
        this.reconcileAgent(object);
        break;
      case 'MODIFIED':
        this.emit('agent-modified', object);
        this.reconcileAgent(object);
        break;
      case 'DELETED':
        this.emit('agent-deleted', object);
        break;
      default:
        this.logger.warn('Unknown event type', { type });
    }
  }

  /**
   * Reconcile agent state - ensure desired state matches actual state
   */
  private async reconcileAgent(agent: any): Promise<void> {
    const name = agent.metadata.name;
    const spec = agent.spec;
    const status = agent.status || {};

    this.logger.debug('Reconciling agent', { name, phase: status.phase });

    try {
      // Validate agent specification
      this.validateAgentSpec(spec);

      // Update phase to Running if currently Pending
      if (status.phase === 'Pending') {
        await this.updateAgentStatus(name, {
          phase: 'Running',
          conditions: [{
            type: 'Ready',
            status: 'True',
            lastTransitionTime: new Date().toISOString(),
            reason: 'AgentStarted',
            message: 'Agent has been successfully started'
          }]
        });
      }

      // Register capabilities
      const capabilityIds = spec.capabilities.map((cap: any) => cap.id);
      await this.updateAgentStatus(name, {
        registeredCapabilities: capabilityIds
      });

    } catch (error) {
      this.logger.error('Failed to reconcile agent', { name, error });
      
      await this.updateAgentStatus(name, {
        phase: 'Failed',
        conditions: [{
          type: 'Ready',
          status: 'False',
          lastTransitionTime: new Date().toISOString(),
          reason: 'ReconciliationFailed',
          message: `Failed to reconcile agent: ${error}`
        }]
      });
    }
  }

  /**
   * Validate agent specification
   */
  private validateAgentSpec(spec: AgentSpec): void {
    if (!spec.name || !spec.version) {
      throw new Error('Agent name and version are required');
    }

    if (!spec.capabilities || spec.capabilities.length === 0) {
      throw new Error('Agent must have at least one capability');
    }

    // Validate semantic version
    if (!/^v?[0-9]+\.[0-9]+\.[0-9]+$/.test(spec.version)) {
      throw new Error('Agent version must follow semantic versioning');
    }
  }

  /**
   * Start health monitoring for all agents
   */
  private startHealthMonitoring(): void {
    this.logger.info('Starting health monitoring');

    setInterval(async () => {
      try {
        const agents = await this.listAgents();
        
        for (const agent of agents) {
          await this.checkAgentHealth(agent);
        }
      } catch (error) {
        this.logger.error('Health monitoring error', { error });
      }
    }, 30000); // Check every 30 seconds
  }

  /**
   * Check individual agent health
   */
  private async checkAgentHealth(agent: any): Promise<void> {
    const name = agent.metadata.name;
    const spec = agent.spec;
    const currentHealth = agent.status?.health || 'unknown';

    try {
      // Perform health check based on agent configuration
      const isHealthy = await this.healthChecker.checkAgent(name, spec);
      const newHealth = isHealthy ? 'healthy' : 'unhealthy';

      // Update status if health changed
      if (newHealth !== currentHealth) {
        await this.updateAgentStatus(name, {
          health: newHealth,
          conditions: [{
            type: 'Healthy',
            status: isHealthy ? 'True' : 'False',
            lastTransitionTime: new Date().toISOString(),
            reason: isHealthy ? 'HealthCheckPassed' : 'HealthCheckFailed',
            message: `Agent health check ${isHealthy ? 'passed' : 'failed'}`
          }]
        });

        this.emit('agent-health-changed', { name, health: newHealth });
      }
    } catch (error) {
      this.logger.error('Health check failed', { name, error });
      
      if (currentHealth !== 'unknown') {
        await this.updateAgentStatus(name, {
          health: 'unknown'
        });
      }
    }
  }
}