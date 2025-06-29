import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { 
  ArrowLeft, 
  Activity, 
  Zap, 
  CheckCircle,
  AlertTriangle,
  XCircle,
  Circle,
  Play,
  Pause,
  RefreshCw,
  Settings,
  Code,
  Globe
} from 'lucide-react';
import { agentsApi } from '../services/api';
import { Agent, HealthStatus } from '../types';

const AgentDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  
  const { data: agent, isLoading, error } = useQuery<Agent>({
    queryKey: ['agent', id],
    queryFn: () => agentsApi.getById(id!),
    enabled: !!id,
  });

  const getHealthIcon = (health: HealthStatus) => {
    switch (health) {
      case 'healthy':
        return <CheckCircle className="w-5 h-5 text-success-500" />;
      case 'degraded':
        return <AlertTriangle className="w-5 h-5 text-warning-500" />;
      case 'unhealthy':
        return <XCircle className="w-5 h-5 text-danger-500" />;
      default:
        return <Circle className="w-5 h-5 text-gray-400" />;
    }
  };

  const getHealthBadge = (health: HealthStatus) => (
    <span className={`inline-flex px-3 py-1 text-sm font-medium rounded-full status-${health}`}>
      {health}
    </span>
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  if (error || !agent) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-400 mb-4">
          <XCircle className="w-12 h-12 mx-auto" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">Agent not found</h3>
        <p className="text-gray-600 mb-4">The requested agent could not be found.</p>
        <Link to="/agents" className="btn btn-primary">
          Back to Agents
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link to="/agents" className="p-2 hover:bg-gray-100 rounded-md transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center space-x-3">
              {getHealthIcon(agent.health)}
              <h1 className="text-3xl font-bold text-gray-900">{agent.name}</h1>
              {getHealthBadge(agent.health)}
            </div>
            <p className="text-gray-600 mt-1">{agent.description}</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <button className="btn btn-secondary flex items-center space-x-2">
            <RefreshCw className="w-4 h-4" />
            <span>Refresh</span>
          </button>
          <button className="btn btn-success flex items-center space-x-2">
            <Play className="w-4 h-4" />
            <span>Start</span>
          </button>
          <button className="btn btn-warning flex items-center space-x-2">
            <Pause className="w-4 h-4" />
            <span>Pause</span>
          </button>
          <button className="btn btn-secondary">
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Version</p>
              <p className="text-2xl font-bold text-gray-900">{agent.version}</p>
            </div>
            <div className="p-3 bg-primary-100 rounded-lg">
              <Code className="w-6 h-6 text-primary-600" />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Capabilities</p>
              <p className="text-2xl font-bold text-gray-900">{agent.capabilities.length}</p>
            </div>
            <div className="p-3 bg-success-100 rounded-lg">
              <Zap className="w-6 h-6 text-success-600" />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Endpoints</p>
              <p className="text-2xl font-bold text-gray-900">{agent.endpoints.length}</p>
            </div>
            <div className="p-3 bg-warning-100 rounded-lg">
              <Globe className="w-6 h-6 text-warning-600" />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Uptime</p>
              <p className="text-2xl font-bold text-gray-900">99.9%</p>
            </div>
            <div className="p-3 bg-primary-100 rounded-lg">
              <Activity className="w-6 h-6 text-primary-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Agent Information */}
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Agent Information</h3>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700">Agent ID</label>
              <p className="text-sm text-gray-900 font-mono bg-gray-50 p-2 rounded">{agent.id}</p>
            </div>
            
            <div>
              <label className="text-sm font-medium text-gray-700">Created</label>
              <p className="text-sm text-gray-900">{new Date(agent.created).toLocaleString()}</p>
            </div>
            
            <div>
              <label className="text-sm font-medium text-gray-700">Last Updated</label>
              <p className="text-sm text-gray-900">{new Date(agent.updated).toLocaleString()}</p>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">Authentication</label>
              <p className="text-sm text-gray-900 capitalize">{agent.authentication.type}</p>
            </div>

            {/* Metadata */}
            {Object.keys(agent.metadata).length > 0 && (
              <div>
                <label className="text-sm font-medium text-gray-700">Metadata</label>
                <div className="bg-gray-50 p-3 rounded mt-1">
                  {Object.entries(agent.metadata).map(([key, value]) => (
                    <div key={key} className="flex justify-between text-sm">
                      <span className="text-gray-600">{key}:</span>
                      <span className="text-gray-900">{JSON.stringify(value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Endpoints */}
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Endpoints</h3>
          <div className="space-y-3">
            {agent.endpoints.map((endpoint, index) => (
              <div key={index} className="p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-900 uppercase">
                    {endpoint.type}
                  </span>
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    endpoint.auth_required ? 'bg-warning-100 text-warning-800' : 'bg-success-100 text-success-800'
                  }`}>
                    {endpoint.auth_required ? 'Auth Required' : 'Open'}
                  </span>
                </div>
                <p className="text-sm text-gray-600 font-mono break-all">{endpoint.url}</p>
                <div className="flex flex-wrap gap-1 mt-2">
                  {endpoint.methods.map((method) => (
                    <span
                      key={method}
                      className="text-xs px-2 py-1 bg-primary-100 text-primary-800 rounded"
                    >
                      {method}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Capabilities */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Capabilities</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {agent.capabilities.map((capability) => (
            <div key={capability.id} className="p-4 bg-gray-50 rounded-lg">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h4 className="font-medium text-gray-900">{capability.name}</h4>
                  <p className="text-sm text-gray-600">{capability.description}</p>
                </div>
                <div className="flex space-x-1">
                  {capability.async && (
                    <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded">
                      Async
                    </span>
                  )}
                  {capability.streaming && (
                    <span className="text-xs px-2 py-1 bg-green-100 text-green-800 rounded">
                      Streaming
                    </span>
                  )}
                </div>
              </div>
              
              <div className="mb-3">
                <label className="text-xs font-medium text-gray-700">Modalities</label>
                <div className="flex flex-wrap gap-1 mt-1">
                  {capability.modalities.map((modality) => (
                    <span
                      key={modality}
                      className="text-xs px-2 py-1 bg-purple-100 text-purple-800 rounded"
                    >
                      {modality}
                    </span>
                  ))}
                </div>
              </div>

              <div className="text-xs text-gray-500">
                <p className="font-medium">ID: {capability.id}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AgentDetail;