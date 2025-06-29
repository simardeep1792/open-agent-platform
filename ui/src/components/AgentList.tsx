import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { 
  Search, 
  Filter, 
  RefreshCw, 
  Eye, 
  Play, 
  Pause,
  MoreVertical,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Circle
} from 'lucide-react';
import { agentsApi } from '../services/api';
import { HealthStatus } from '../types';

const AgentList: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [healthFilter, setHealthFilter] = useState<HealthStatus | 'all'>('all');
  const [capabilityFilter, setCapabilityFilter] = useState('');

  const { data: agentsData, isLoading, refetch } = useQuery({
    queryKey: ['agents'],
    queryFn: agentsApi.getAll,
  });

  const agents = agentsData?.agents || [];

  // Filter agents based on search criteria
  const filteredAgents = agents.filter(agent => {
    const matchesSearch = agent.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         agent.description.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesHealth = healthFilter === 'all' || agent.health === healthFilter;
    
    const matchesCapability = !capabilityFilter || 
                             agent.capabilities.some(cap => 
                               cap.name.toLowerCase().includes(capabilityFilter.toLowerCase())
                             );

    return matchesSearch && matchesHealth && matchesCapability;
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
    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full status-${health}`}>
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Agents</h2>
          <p className="text-gray-600">Manage and monitor your agent ecosystem</p>
        </div>
        <button
          onClick={() => refetch()}
          className="btn btn-primary flex items-center space-x-2"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Refresh</span>
        </button>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search agents..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>

          {/* Health Filter */}
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <select
              value={healthFilter}
              onChange={(e) => setHealthFilter(e.target.value as HealthStatus | 'all')}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="all">All Health States</option>
              <option value="healthy">Healthy</option>
              <option value="degraded">Degraded</option>
              <option value="unhealthy">Unhealthy</option>
              <option value="unknown">Unknown</option>
            </select>
          </div>

          {/* Capability Filter */}
          <div>
            <input
              type="text"
              placeholder="Filter by capability..."
              value={capabilityFilter}
              onChange={(e) => setCapabilityFilter(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="text-2xl font-bold text-gray-900">{agents.length}</div>
          <div className="text-sm text-gray-600">Total Agents</div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="text-2xl font-bold text-success-600">
            {agents.filter(a => a.health === 'healthy').length}
          </div>
          <div className="text-sm text-gray-600">Healthy</div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="text-2xl font-bold text-warning-600">
            {agents.filter(a => a.health === 'degraded').length}
          </div>
          <div className="text-sm text-gray-600">Degraded</div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="text-2xl font-bold text-danger-600">
            {agents.filter(a => a.health === 'unhealthy').length}
          </div>
          <div className="text-sm text-gray-600">Unhealthy</div>
        </div>
      </div>

      {/* Agent Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredAgents.map((agent) => (
          <div key={agent.id} className="card hover:shadow-md transition-shadow">
            {/* Agent Header */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center space-x-3">
                {getHealthIcon(agent.health)}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{agent.name}</h3>
                  <p className="text-sm text-gray-600">v{agent.version}</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                {getHealthBadge(agent.health)}
                <button className="p-1 text-gray-400 hover:text-gray-600">
                  <MoreVertical className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Agent Description */}
            <p className="text-gray-600 text-sm mb-4 line-clamp-2">
              {agent.description}
            </p>

            {/* Capabilities */}
            <div className="mb-4">
              <div className="text-sm font-medium text-gray-700 mb-2">
                Capabilities ({agent.capabilities.length})
              </div>
              <div className="flex flex-wrap gap-1">
                {agent.capabilities.slice(0, 3).map((capability) => (
                  <span
                    key={capability.id}
                    className="inline-flex px-2 py-1 text-xs font-medium bg-primary-100 text-primary-800 rounded-full"
                  >
                    {capability.name}
                  </span>
                ))}
                {agent.capabilities.length > 3 && (
                  <span className="inline-flex px-2 py-1 text-xs font-medium bg-gray-100 text-gray-600 rounded-full">
                    +{agent.capabilities.length - 3} more
                  </span>
                )}
              </div>
            </div>

            {/* Metadata */}
            <div className="text-xs text-gray-500 mb-4 space-y-1">
              <div>ID: {agent.id}</div>
              <div>Updated: {new Date(agent.updated).toLocaleString()}</div>
              {agent.metadata?.cluster && (
                <div>Cluster: {agent.metadata.cluster}</div>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-4 border-t border-gray-200">
              <div className="flex space-x-2">
                <button className="p-2 text-gray-400 hover:text-success-600 hover:bg-success-50 rounded-md transition-colors">
                  <Play className="w-4 h-4" />
                </button>
                <button className="p-2 text-gray-400 hover:text-warning-600 hover:bg-warning-50 rounded-md transition-colors">
                  <Pause className="w-4 h-4" />
                </button>
              </div>
              
              <Link
                to={`/agents/${agent.id}`}
                className="btn btn-secondary flex items-center space-x-1 text-sm"
              >
                <Eye className="w-4 h-4" />
                <span>View</span>
              </Link>
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {filteredAgents.length === 0 && (
        <div className="text-center py-12">
          <div className="text-gray-400 mb-4">
            <Search className="w-12 h-12 mx-auto" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No agents found</h3>
          <p className="text-gray-600">
            {searchTerm || healthFilter !== 'all' || capabilityFilter
              ? 'Try adjusting your search filters'
              : 'No agents are currently registered'
            }
          </p>
        </div>
      )}
    </div>
  );
};

export default AgentList;