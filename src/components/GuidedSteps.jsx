import { Check } from 'lucide-react';
import { useApp } from '../context/AppContext';

const STEPS = [
  { id: 'agent-builder', label: 'Agent Builder', num: '①' },
  { id: 'script-editor', label: 'Script Editor', num: '②' },
  { id: 'call-qa',       label: 'Call QA',       num: '③' },
];

export default function GuidedSteps() {
  const { guideDismissed, dismissGuide, visitedTabs, activeTab, welcomeDismissed } = useApp();

  // Don't show until welcome is dismissed, and hide once guide is dismissed
  if (!welcomeDismissed || guideDismissed) return null;

  // Auto-hide when all tabs have been visited
  const allVisited = STEPS.every(s => visitedTabs.includes(s.id));
  if (allVisited) return null;

  return (
    <div className="bg-white border-b border-gray-100 px-6 py-2 flex items-center gap-1 text-sm">
      <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide mr-2 flex-shrink-0">
        Getting started:
      </span>

      <div className="flex items-center gap-4 flex-1">
        {STEPS.map((step, i) => {
          const visited = visitedTabs.includes(step.id);
          const active = activeTab === step.id;
          return (
            <div key={step.id} className="flex items-center gap-1.5">
              {i > 0 && <span className="text-gray-200 mr-2">·</span>}
              {visited
                ? <Check size={12} className="text-green-500 flex-shrink-0" />
                : <span className="text-gray-300 text-xs">{step.num}</span>}
              <span className={`text-sm ${
                active    ? 'text-[#1A6BFF] font-semibold' :
                visited   ? 'text-gray-400 line-through'   :
                            'text-gray-600'
              }`}>
                {step.label}
              </span>
            </div>
          );
        })}
      </div>

      <button
        onClick={dismissGuide}
        className="ml-4 text-xs text-gray-400 hover:text-gray-600 underline underline-offset-2 flex-shrink-0 transition-colors"
      >
        Dismiss guide
      </button>
    </div>
  );
}
