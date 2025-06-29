import React from 'react';
import { Workflow, Plus, Play, Pause, Edit, Trash2, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

const WorkflowManager: React.FC = () => {
  // Mock workflow data
  const workflows = [
    {
      id: 'wf-001',
      name: 'Cloud Resource Optimization',
      description: 'Automated workflow to analyze and optimize cloud resource usage',
      status: 'active',
      steps: 4,
      lastRun: '2024-01-15T10:30:00Z',
      nextRun: '2024-01-16T10:30:00Z',
      successRate: 95.2
    },
    {
      id: 'wf-002',
      name: 'Security Compliance Check',
      description: 'Daily security compliance verification across all agents',
      status: 'running',
      steps: 6,
      lastRun: '2024-01-15T12:00:00Z',
      nextRun: '2024-01-16T12:00:00Z',
      successRate: 99.1
    },
    {
      id: 'wf-003',
      name: 'Data Pipeline Sync',
      description: 'Synchronize data between analytics and storage agents',
      status: 'paused',
      steps: 3,
      lastRun: '2024-01-14T15:45:00Z',
      nextRun: null,
      successRate: 87.6
    }
  ];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="w-5 h-5 text-success-500" />;
      case 'running':
        return <Play className="w-5 h-5 text-primary-500" />;
      case 'paused':
        return <Pause className="w-5 h-5 text-warning-500" />;
      case 'failed':
        return <XCircle className="w-5 h-5 text-danger-500" />;
      default:
        return <AlertCircle className="w-5 h-5 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => (
    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
      status === 'active' ? 'bg-success-100 text-success-800' :
      status === 'running' ? 'bg-primary-100 text-primary-800' :
      status === 'paused' ? 'bg-warning-100 text-warning-800' :
      status === 'failed' ? 'bg-danger-100 text-danger-800' :
      'bg-gray-100 text-gray-800'
    }`}>
      {status}
    </span>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Workflow Manager</h2>
          <p className="text-gray-600">Orchestrate complex agent interactions and automations</p>
        </div>
        <button className="btn btn-primary flex items-center space-x-2">
          <Plus className="w-4 h-4" />
          <span>Create Workflow</span>
        </button>
      </div>

      {/* Coming Soon Notice */}
      <div className="card bg-primary-50 border-primary-200">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-primary-100 rounded-lg">
            <Workflow className="w-6 h-6 text-primary-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-primary-900">Advanced Workflow Engine</h3>
            <p className="text-primary-700">
              The workflow engine is in active development. This will enable complex orchestration 
              of agent interactions, conditional logic, and automated decision-making across your agent ecosystem.
            </p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Workflows</p>
              <p className="text-2xl font-bold text-gray-900">{workflows.length}</p>
            </div>
            <div className="p-3 bg-primary-100 rounded-lg">
              <Workflow className="w-6 h-6 text-primary-600" />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Active</p>
              <p className="text-2xl font-bold text-success-600">
                {workflows.filter(w => w.status === 'active').length}
              </p>
            </div>
            <div className="p-3 bg-success-100 rounded-lg">
              <CheckCircle className="w-6 h-6 text-success-600" />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Running</p>
              <p className="text-2xl font-bold text-primary-600">
                {workflows.filter(w => w.status === 'running').length}
              </p>
            </div>
            <div className="p-3 bg-primary-100 rounded-lg">
              <Play className="w-6 h-6 text-primary-600" />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Success Rate</p>
              <p className="text-2xl font-bold text-gray-900">
                {(workflows.reduce((sum, w) => sum + w.successRate, 0) / workflows.length).toFixed(1)}%
              </p>
            </div>
            <div className="p-3 bg-warning-100 rounded-lg">
              <AlertCircle className="w-6 h-6 text-warning-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Workflow List */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Workflows</h3>
        <div className="space-y-4">
          {workflows.map((workflow) => (
            <div key={workflow.id} className="p-4 bg-gray-50 rounded-lg">
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3">
                  {getStatusIcon(workflow.status)}
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h4 className="text-lg font-medium text-gray-900">{workflow.name}</h4>
                      {getStatusBadge(workflow.status)}
                    </div>
                    <p className="text-gray-600 mb-3">{workflow.description}</p>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-gray-500">Steps:</span>
                        <span className="ml-1 font-medium text-gray-900">{workflow.steps}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Success Rate:</span>
                        <span className="ml-1 font-medium text-gray-900">{workflow.successRate}%</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Last Run:</span>
                        <span className="ml-1 font-medium text-gray-900">
                          {new Date(workflow.lastRun).toLocaleDateString()}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-500">Next Run:</span>
                        <span className="ml-1 font-medium text-gray-900">
                          {workflow.nextRun ? new Date(workflow.nextRun).toLocaleDateString() : 'N/A'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <button className="p-2 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-md transition-colors">
                    <Play className="w-4 h-4" />
                  </button>
                  <button className="p-2 text-gray-400 hover:text-warning-600 hover:bg-warning-50 rounded-md transition-colors">
                    <Pause className="w-4 h-4" />
                  </button>
                  <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-colors">
                    <Edit className="w-4 h-4" />
                  </button>
                  <button className="p-2 text-gray-400 hover:text-danger-600 hover:bg-danger-50 rounded-md transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Planned Features */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Workflow Features</h3>
          <ul className="space-y-3">
            <li className="flex items-start space-x-3">
              <div className="w-2 h-2 bg-primary-500 rounded-full mt-2"></div>
              <div>
                <p className="font-medium text-gray-900">Visual Workflow Builder</p>
                <p className="text-sm text-gray-600">Drag-and-drop interface for creating workflows</p>
              </div>
            </li>
            <li className="flex items-start space-x-3">
              <div className="w-2 h-2 bg-primary-500 rounded-full mt-2"></div>
              <div>
                <p className="font-medium text-gray-900">Conditional Logic</p>
                <p className="text-sm text-gray-600">If-then-else conditions and branching</p>
              </div>
            </li>
            <li className="flex items-start space-x-3">
              <div className="w-2 h-2 bg-primary-500 rounded-full mt-2"></div>
              <div>
                <p className="font-medium text-gray-900">Error Handling</p>
                <p className="text-sm text-gray-600">Automatic retries and fallback strategies</p>
              </div>
            </li>
            <li className="flex items-start space-x-3">
              <div className="w-2 h-2 bg-primary-500 rounded-full mt-2"></div>
              <div>
                <p className="font-medium text-gray-900">Scheduling</p>
                <p className="text-sm text-gray-600">Cron-based and event-driven triggers</p>
              </div>
            </li>
          </ul>
        </div>

        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Integration Capabilities</h3>
          <ul className="space-y-3">
            <li className="flex items-start space-x-3">
              <div className="w-2 h-2 bg-success-500 rounded-full mt-2"></div>
              <div>
                <p className="font-medium text-gray-900">Agent Coordination</p>
                <p className="text-sm text-gray-600">Orchestrate multiple agents in sequence or parallel</p>
              </div>
            </li>
            <li className="flex items-start space-x-3">
              <div className="w-2 h-2 bg-success-500 rounded-full mt-2"></div>
              <div>
                <p className="font-medium text-gray-900">External APIs</p>
                <p className="text-sm text-gray-600">Connect to external services and webhooks</p>
              </div>
            </li>
            <li className="flex items-start space-x-3">
              <div className="w-2 h-2 bg-success-500 rounded-full mt-2"></div>
              <div>
                <p className="font-medium text-gray-900">Data Transformation</p>
                <p className="text-sm text-gray-600">Transform data between workflow steps</p>
              </div>
            </li>
            <li className="flex items-start space-x-3">
              <div className="w-2 h-2 bg-success-500 rounded-full mt-2"></div>
              <div>
                <p className="font-medium text-gray-900">Monitoring & Alerts</p>
                <p className="text-sm text-gray-600">Real-time monitoring and failure notifications</p>
              </div>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default WorkflowManager;