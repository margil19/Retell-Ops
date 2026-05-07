import { useEffect } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import Nav from './components/Nav';
import WelcomeModal from './components/WelcomeModal';
import GuidedSteps from './components/GuidedSteps';
import AgentBuilder from './tabs/AgentBuilder';
import CallQA from './tabs/CallQA';
import ScriptEditor from './tabs/ScriptEditor';
import { Analytics } from '@vercel/analytics/react';
import './index.css';

function TabRouter() {
  const { activeTab } = useApp();
  if (activeTab === 'agent-builder') return <AgentBuilder />;
  if (activeTab === 'call-qa') return <CallQA />;
  if (activeTab === 'script-editor') return <ScriptEditor />;
  return null;
}

// Inner shell — lives inside AppProvider so it can use context
function AppShell() {
  const { activeTab, markTabVisited } = useApp();

  // Track tab visits as the user navigates
  useEffect(() => {
    markTabVisited(activeTab);
  }, [activeTab]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Onboarding overlays */}
      <WelcomeModal />

      {/* Slim guided-steps bar sits above the nav */}
      <GuidedSteps />

      <Nav />
      <main className="max-w-screen-xl mx-auto px-6 py-6">
        <TabRouter />
      </main>
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppShell />
      <Analytics />
    </AppProvider>
  );
}
