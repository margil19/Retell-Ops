import { AppProvider, useApp } from './context/AppContext';
import Nav from './components/Nav';
import AgentBuilder from './tabs/AgentBuilder';
import CallQA from './tabs/CallQA';
import ScriptEditor from './tabs/ScriptEditor';
import './index.css';

function TabRouter() {
  const { activeTab } = useApp();
  if (activeTab === 'agent-builder') return <AgentBuilder />;
  if (activeTab === 'call-qa') return <CallQA />;
  if (activeTab === 'script-editor') return <ScriptEditor />;
  return null;
}

export default function App() {
  return (
    <AppProvider>
      <div className="min-h-screen bg-gray-50">
        <Nav />
        <main className="max-w-screen-xl mx-auto px-6 py-6">
          <TabRouter />
        </main>
      </div>
    </AppProvider>
  );
}
