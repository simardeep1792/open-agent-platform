import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  Users, 
  Server, 
  Activity, 
  Zap,
  TrendingUp,
  Clock,
  CheckCircle,
  AlertTriangle,
  XCircle
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { agentsApi, registryApi } from '../services/api';
import { RegistryStats } from '../types';

const Dashboard: React.FC = () => {
  const { data: stats } = useQuery<RegistryStats>({
    queryKey: ['registry-stats'],
    queryFn: registryApi.getStats,
  });

  const { data: agentsData } = useQuery({
    queryKey: ['agents'],
    queryFn: agentsApi.getAll,
  });

  const { data: clustersData } = useQuery({
    queryKey: ['clusters'],
    queryFn: registryApi.getClusters,
  });

  const agents = agentsData?.agents || [];
  const clusters = clustersData?.clusters || [];

  // Sample activity data for charts
  const activityData = [
    { time: '00:00', requests: 45, responses: 42 },
    { time: '04:00', requests: 32, responses: 30 },
    { time: '08:00', requests: 78, responses: 75 },
    { time: '12:00', requests: 120, responses: 118 },
    { time: '16:00', requests: 95, responses: 92 },
    { time: '20:00', requests: 67, responses: 65 },
  ];

  const healthData = [
    { name: 'Healthy', value: stats?.healthy_agents || 0, color: '#22c55e' },
    { name: 'Degraded', value: stats?.degraded_agents || 0, color: '#f59e0b' },
    { name: 'Unhealthy', value: stats?.unhealthy_agents || 0, color: '#ef4444' },
  ];

  const StatCard: React.FC<{
    title: string;
    value: string | number;
    change?: string;
    changeType?: 'positive' | 'negative' | 'neutral';
    icon: React.ReactNode;
    color: string;
  }> = ({ title, value, change, changeType = 'neutral', icon, color }) => (
    <div className="card">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">{value}</p>
          {change && (
            <div className={`flex items-center mt-2 text-sm ${
              changeType === 'positive' ? 'text-success-600' :
              changeType === 'negative' ? 'text-danger-600' : 'text-gray-600'
            }`}>
              <TrendingUp className="w-4 h-4 mr-1" />
              {change}
            </div>
          )}
        </div>
        <div className={`p-3 rounded-lg ${color}`}>
          {icon}
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Agents"
          value={stats?.total_agents || 0}
          change="+2 this hour"
          changeType="positive"
          icon={<Users className="w-6 h-6 text-white" />}
          color="bg-primary-500"
        />
        
        <StatCard
          title="Active Clusters"
          value={clusters.length}
          change="All operational"
          changeType="positive"
          icon={<Server className="w-6 h-6 text-white" />}
          color="bg-success-500"
        />
        
        <StatCard
          title="Total Capabilities"
          value={stats?.total_capabilities || 0}
          change="+5 new today"
          changeType="positive"
          icon={<Zap className="w-6 h-6 text-white" />}
          color="bg-warning-500"
        />
        
        <StatCard
          title="Health Score"
          value="98.5%"
          change="+0.2% from yesterday"
          changeType="positive"
          icon={<Activity className="w-6 h-6 text-white" />}
          color="bg-success-500"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Activity Chart */}
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Agent Activity</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={activityData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="time" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="requests" fill="#3b82f6" name="Requests" />
              <Bar dataKey="responses" fill="#22c55e" name="Responses" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Health Distribution */}
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Agent Health Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={healthData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={120}
                paddingAngle={5}
                dataKey="value"
              >
                {healthData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex justify-center space-x-4 mt-4">
            {healthData.map((entry, index) => (
              <div key={index} className="flex items-center">
                <div
                  className="w-3 h-3 rounded-full mr-2"
                  style={{ backgroundColor: entry.color }}
                />
                <span className="text-sm text-gray-600">
                  {entry.name}: {entry.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Activity and Agent Status */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
          <div className="space-y-4">
            {[
              { type: 'agent_registered', agent: 'Cloudy Agent', time: '2 minutes ago', status: 'success' },
              { type: 'capability_added', agent: 'Data Agent', time: '5 minutes ago', status: 'info' },
              { type: 'health_degraded', agent: 'Security Agent', time: '12 minutes ago', status: 'warning' },
              { type: 'workflow_completed', agent: 'Workflow Agent', time: '18 minutes ago', status: 'success' },
            ].map((activity, index) => (
              <div key={index} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                <div className={`p-2 rounded-full ${
                  activity.status === 'success' ? 'bg-success-100 text-success-600' :
                  activity.status === 'warning' ? 'bg-warning-100 text-warning-600' :
                  activity.status === 'error' ? 'bg-danger-100 text-danger-600' :
                  'bg-primary-100 text-primary-600'
                }`}>
                  {activity.status === 'success' ? <CheckCircle className="w-4 h-4" /> :
                   activity.status === 'warning' ? <AlertTriangle className="w-4 h-4" /> :
                   activity.status === 'error' ? <XCircle className="w-4 h-4" /> :
                   <Activity className="w-4 h-4" />}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">
                    {activity.type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </p>
                  <p className="text-sm text-gray-600">{activity.agent}</p>
                </div>
                <div className="flex items-center text-xs text-gray-500">
                  <Clock className="w-3 h-3 mr-1" />
                  {activity.time}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Agents */}
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Agent Status</h3>
          <div className="space-y-4">
            {agents.slice(0, 5).map((agent) => (
              <div key={agent.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className={`w-3 h-3 rounded-full ${
                    agent.health === 'healthy' ? 'bg-success-500' :
                    agent.health === 'degraded' ? 'bg-warning-500' :
                    agent.health === 'unhealthy' ? 'bg-danger-500' :
                    'bg-gray-400'
                  }`} />
                  <div>
                    <p className="text-sm font-medium text-gray-900">{agent.name}</p>
                    <p className="text-xs text-gray-600">{agent.capabilities.length} capabilities</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full status-${agent.health}`}>
                    {agent.health}
                  </span>
                  <p className="text-xs text-gray-500 mt-1">v{agent.version}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;