import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import AgentList from './components/AgentList';
import AgentDetail from './components/AgentDetail';
import ClusterView from './components/ClusterView';
import WorkflowManager from './components/WorkflowManager';

function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/agents" element={<AgentList />} />
        <Route path="/agents/:id" element={<AgentDetail />} />
        <Route path="/clusters" element={<ClusterView />} />
        <Route path="/workflows" element={<WorkflowManager />} />
      </Routes>
    </Layout>
  );
}

export default App;