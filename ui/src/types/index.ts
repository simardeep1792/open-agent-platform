// UI Types for Agent Board

export interface Agent {
  id: string;
  name: string;
  version: string;
  description: string;
  capabilities: AgentCapability[];
  endpoints: AgentEndpoint[];
  authentication: AuthenticationInfo;
  metadata: Record<string, any>;
  health: HealthStatus;
  created: string;
  updated: string;
}

export interface AgentCapability {
  id: string;
  name: string;
  description: string;
  input_schema: any;
  output_schema: any;
  modalities: Modality[];
  async: boolean;
  streaming: boolean;
}

export interface AgentEndpoint {
  type: 'http' | 'websocket' | 'grpc';
  url: string;
  methods: string[];
  auth_required: boolean;
}

export interface AuthenticationInfo {
  type: 'bearer' | 'api_key' | 'oauth2' | 'none';
  scheme?: string;
  bearer_format?: string;
  scopes?: string[];
}

export type Modality = 'text' | 'audio' | 'video' | 'image' | 'file' | 'form';
export type HealthStatus = 'healthy' | 'degraded' | 'unhealthy' | 'unknown';

export interface RegistryStats {
  total_agents: number;
  healthy_agents: number;
  degraded_agents: number;
  unhealthy_agents: number;
  total_clusters: number;
  total_capabilities: number;
}

export interface ClusterInfo {
  id: string;
  name: string;
  region: string;
  endpoints: string[];
  health: HealthStatus;
  agents: number;
  last_seen: string;
}

export interface AgentDiscoveryRequest {
  capabilities?: string[];
  modalities?: Modality[];
  location?: string;
}

export interface WorkflowDefinition {
  id: string;
  name: string;
  description: string;
  steps: WorkflowStep[];
  triggers: WorkflowTrigger[];
  variables: Record<string, any>;
}

export interface WorkflowStep {
  id: string;
  name: string;
  agent_id: string;
  capability_id: string;
  input_mapping: Record<string, string>;
  output_mapping: Record<string, string>;
  depends_on?: string[];
  timeout?: number;
}

export interface WorkflowTrigger {
  type: 'manual' | 'schedule' | 'event' | 'webhook';
  config: Record<string, any>;
}

export interface WorkflowExecution {
  id: string;
  workflow_id: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  steps: StepExecution[];
  variables: Record<string, any>;
  started: string;
  completed?: string;
  error?: string;
}

export interface StepExecution {
  step_id: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  input: any;
  output?: any;
  error?: string;
  started?: string;
  completed?: string;
}