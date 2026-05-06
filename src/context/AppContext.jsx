import { createContext, useContext, useState } from 'react';

const DEFAULT_NODES = [
  {
    id: '1',
    title: 'Greeting',
    script: "Hello, thank you for calling Bright Smile Dental! My name is Aria. How can I help you today?",
    status: 'active',
  },
  {
    id: '2',
    title: 'Capture Intent',
    script: "I'd be happy to help with that. Can you tell me a little more about what you're looking for — is this about scheduling, billing, or something else?",
    status: 'active',
  },
  {
    id: '3',
    title: 'Check Knowledge Base',
    script: "Let me look that up for you right now. We do offer a range of dental services including cleanings, whitening, and orthodontics.",
    status: 'warning',
  },
  {
    id: '4',
    title: 'Resolve or Transfer',
    script: "Based on what you've shared, I can help you schedule an appointment. If your question is about insurance billing, I'll connect you with our billing team.",
    status: 'active',
  },
  {
    id: '5',
    title: 'End Call',
    script: "Is there anything else I can help you with today? Thank you for calling Bright Smile Dental — have a wonderful day!",
    status: 'active',
  },
];

const AppContext = createContext(null);

export function AppProvider({ children }) {
  // ── Core app state ─────────────────────────────────────────────────────────
  const [nodes, setNodes] = useState(DEFAULT_NODES);
  const [currentScript, setCurrentScript] = useState('');
  const [qaScores, setQaScores] = useState(null);
  const [activeTab, setActiveTab] = useState('agent-builder');
  const [pendingScript, setPendingScript] = useState(null);

  // ── Onboarding state ───────────────────────────────────────────────────────
  const [welcomeDismissed, setWelcomeDismissed] = useState(
    () => localStorage.getItem('retell_ops_welcomed') === 'true'
  );
  const [showPulse, setShowPulse] = useState(false);
  const [firstInfoClicked, setFirstInfoClicked] = useState(
    () => localStorage.getItem('retell_ops_first_info_clicked') === 'true'
  );
  const [visitedTabs, setVisitedTabs] = useState(() => {
    try { return JSON.parse(localStorage.getItem('retell_ops_visited_tabs') || '[]'); }
    catch { return []; }
  });
  const [guideDismissed, setGuideDismissed] = useState(
    () => localStorage.getItem('retell_ops_guide_dismissed') === 'true'
  );

  // ── Onboarding actions ─────────────────────────────────────────────────────
  function dismissWelcome() {
    setWelcomeDismissed(true);
    localStorage.setItem('retell_ops_welcomed', 'true');
    // Start 30-second pulse only if user hasn't clicked an info icon yet
    if (localStorage.getItem('retell_ops_first_info_clicked') !== 'true') {
      setShowPulse(true);
      setTimeout(() => setShowPulse(false), 30000);
    }
  }

  function markInfoClicked() {
    if (!firstInfoClicked) {
      setFirstInfoClicked(true);
      setShowPulse(false);
      localStorage.setItem('retell_ops_first_info_clicked', 'true');
    }
  }

  function markTabVisited(tab) {
    setVisitedTabs(prev => {
      if (prev.includes(tab)) return prev;
      const next = [...prev, tab];
      localStorage.setItem('retell_ops_visited_tabs', JSON.stringify(next));
      return next;
    });
  }

  function dismissGuide() {
    setGuideDismissed(true);
    localStorage.setItem('retell_ops_guide_dismissed', 'true');
  }

  return (
    <AppContext.Provider value={{
      // Core
      nodes, setNodes,
      currentScript, setCurrentScript,
      qaScores, setQaScores,
      activeTab, setActiveTab,
      pendingScript, setPendingScript,
      // Onboarding
      welcomeDismissed, dismissWelcome,
      showPulse,
      firstInfoClicked, markInfoClicked,
      visitedTabs, markTabVisited,
      guideDismissed, dismissGuide,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
