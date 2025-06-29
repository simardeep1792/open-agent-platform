import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Server, MapPin, Activity, Users } from 'lucide-react';
import { registryApi } from '../services/api';

const ClusterView: React.FC = () => {
  const { isLoading } = useQuery({
    queryKey: ['clusters'],
    queryFn: registryApi.getClusters,
  });

  // const clusters = clustersData?.clusters || [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Clusters</h2>
        <p className="text-gray-600">Multi-cluster agent coordination and management</p>
      </div>

      {/* Coming Soon Notice */}
      <div className="card bg-primary-50 border-primary-200">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-primary-100 rounded-lg">
            <Server className="w-6 h-6 text-primary-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-primary-900">Multi-Cluster Coordination</h3>
            <p className="text-primary-700">
              Advanced multi-cluster capabilities are being developed. This will enable agents to communicate 
              and coordinate across different Kubernetes clusters and cloud regions.
            </p>
          </div>
        </div>
      </div>

      {/* Current Cluster Info */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Current Cluster</h3>
        <div className="flex items-center space-x-4">
          <div className="p-3 bg-success-100 rounded-lg">
            <Server className="w-8 h-8 text-success-600" />
          </div>
          <div>
            <h4 className="font-medium text-gray-900">Primary Cluster</h4>
            <p className="text-gray-600">Local development cluster</p>
            <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
              <div className="flex items-center space-x-1">
                <MapPin className="w-4 h-4" />
                <span>localhost</span>
              </div>
              <div className="flex items-center space-x-1">
                <Activity className="w-4 h-4" />
                <span className="text-success-600">Healthy</span>
              </div>
              <div className="flex items-center space-x-1">
                <Users className="w-4 h-4" />
                <span>3 agents</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Planned Features */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Planned Features</h3>
          <ul className="space-y-3">
            <li className="flex items-start space-x-3">
              <div className="w-2 h-2 bg-primary-500 rounded-full mt-2"></div>
              <div>
                <p className="font-medium text-gray-900">Cross-Cluster Discovery</p>
                <p className="text-sm text-gray-600">Agents can discover and communicate across clusters</p>
              </div>
            </li>
            <li className="flex items-start space-x-3">
              <div className="w-2 h-2 bg-primary-500 rounded-full mt-2"></div>
              <div>
                <p className="font-medium text-gray-900">Load Balancing</p>
                <p className="text-sm text-gray-600">Intelligent routing of agent requests across clusters</p>
              </div>
            </li>
            <li className="flex items-start space-x-3">
              <div className="w-2 h-2 bg-primary-500 rounded-full mt-2"></div>
              <div>
                <p className="font-medium text-gray-900">Failover Support</p>
                <p className="text-sm text-gray-600">Automatic failover to healthy clusters</p>
              </div>
            </li>
            <li className="flex items-start space-x-3">
              <div className="w-2 h-2 bg-primary-500 rounded-full mt-2"></div>
              <div>
                <p className="font-medium text-gray-900">Global Orchestration</p>
                <p className="text-sm text-gray-600">Workflows spanning multiple clusters</p>
              </div>
            </li>
          </ul>
        </div>

        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Architecture Overview</h3>
          <div className="space-y-4">
            <div className="p-3 bg-gray-50 rounded-lg">
              <h4 className="font-medium text-gray-900">Registry Federation</h4>
              <p className="text-sm text-gray-600">
                Agent registries will sync across clusters using CNCF standards
              </p>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg">
              <h4 className="font-medium text-gray-900">Service Mesh Integration</h4>
              <p className="text-sm text-gray-600">
                Leverage Istio/Linkerd for secure inter-cluster communication
              </p>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg">
              <h4 className="font-medium text-gray-900">Kubernetes Native</h4>
              <p className="text-sm text-gray-600">
                Built using Kubernetes CRDs and operators
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClusterView;