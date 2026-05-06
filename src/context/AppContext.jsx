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
  const [nodes, setNodes] = useState(DEFAULT_NODES);
  const [currentScript, setCurrentScript] = useState('');
  const [qaScores, setQaScores] = useState(null);
  const [activeTab, setActiveTab] = useState('agent-builder');
  const [pendingScript, setPendingScript] = useState(null); // script to inject into a node

  return (
    <AppContext.Provider value={{
      nodes, setNodes,
      currentScript, setCurrentScript,
      qaScores, setQaScores,
      activeTab, setActiveTab,
      pendingScript, setPendingScript,
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
