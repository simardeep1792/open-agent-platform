// A2A Protocol Types and Schemas

export interface AgentCard {
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

// JSON-RPC 2.0 Message Types
export interface JsonRpcRequest {
  jsonrpc: '2.0';
  method: string;
  params?: any;
  id: string | number;
}

export interface JsonRpcResponse {
  jsonrpc: '2.0';
  result?: any;
  error?: JsonRpcError;
  id: string | number | null;
}

export interface JsonRpcError {
  code: number;
  message: string;
  data?: any;
}

export interface JsonRpcNotification {
  jsonrpc: '2.0';
  method: string;
  params?: any;
}

// Agent Communication Types
export interface AgentMessage {
  from: string;
  to: string;
  type: 'request' | 'response' | 'notification' | 'stream';
  payload: any;
  timestamp: string;
  correlation_id?: string;
  stream_id?: string;
}

export interface AgentDiscoveryRequest {
  capabilities?: string[];
  modalities?: Modality[];
  location?: string;
}

export interface AgentDiscoveryResponse {
  agents: AgentCard[];
  total: number;
  page: number;
  per_page: number;
}

// Workflow and Coordination Types
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

// Multi-cluster Types
export interface ClusterInfo {
  id: string;
  name: string;
  region: string;
  endpoints: string[];
  health: HealthStatus;
  agents: number;
  last_seen: string;
}

export interface ClusterEvent {
  type: 'agent_joined' | 'agent_left' | 'cluster_joined' | 'cluster_left';
  cluster_id: string;
  agent_id?: string;
  timestamp: string;
  metadata?: Record<string, any>;
}