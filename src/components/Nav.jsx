import { Phone, BarChart2, FileText } from 'lucide-react';
import { useApp } from '../context/AppContext';

const TABS = [
  { id: 'agent-builder', label: 'Agent Builder', icon: Phone },
  { id: 'call-qa', label: 'Call QA', icon: BarChart2 },
  { id: 'script-editor', label: 'Script Editor', icon: FileText },
];

export default function Nav() {
  const { activeTab, setActiveTab } = useApp();

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-screen-xl mx-auto px-6 flex items-center h-16 gap-8">
        {/* Logo */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="w-8 h-8 rounded-lg bg-[#1A6BFF] flex items-center justify-center">
            <Phone size={16} className="text-white" />
          </div>
          <span className="font-semibold text-gray-900 text-lg">Retell Ops</span>
        </div>

        {/* Tabs */}
        <nav className="flex items-center gap-1">
          {TABS.map(({ id, label, icon: Icon }) => {
            const active = activeTab === id;
            return (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  active
                    ? 'bg-[#1A6BFF] text-white'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                <Icon size={15} />
                {label}
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
