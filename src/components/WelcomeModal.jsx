import { createPortal } from 'react-dom';
import { useApp } from '../context/AppContext';

export default function WelcomeModal() {
  const { welcomeDismissed, dismissWelcome } = useApp();
  if (welcomeDismissed) return null;

  return createPortal(
    <div className="fixed inset-0 flex items-center justify-center z-[9998]" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className="bg-white rounded-2xl shadow-2xl p-8 mx-4" style={{ maxWidth: 480, width: '100%' }}>
        {/* Header */}
        <div className="mb-5">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">👋 Welcome to Retell Ops</h2>
          <p className="text-sm text-gray-600 leading-relaxed">
            This is a product demo built to show what Retell AI's platform could look like when designed for ops managers — not just engineers.
          </p>
        </div>

        {/* Steps */}
        <div className="bg-gray-50 rounded-xl p-5 mb-6 space-y-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Here's how to get the most out of it</p>

          <div className="flex gap-3">
            <span className="text-lg flex-shrink-0">①</span>
            <div>
              <div className="text-sm font-semibold text-gray-900 mb-0.5">Look for the ℹ️ icon next to every feature</div>
              <div className="text-sm text-gray-500">Click it to see the pain point it solves and why it matters</div>
            </div>
          </div>

          <div className="flex gap-3">
            <span className="text-lg flex-shrink-0">②</span>
            <div>
              <div className="text-sm font-semibold text-gray-900 mb-0.5">Start in Agent Builder</div>
              <div className="text-sm text-gray-500">See the full call flow, test mode, and version control</div>
            </div>
          </div>

          <div className="flex gap-3">
            <span className="text-lg flex-shrink-0">③</span>
            <div>
              <div className="text-sm font-semibold text-gray-900 mb-0.5">Try Script Editor</div>
              <div className="text-sm text-gray-500">Use the risky template to see compliance flags in action</div>
            </div>
          </div>

          <div className="flex gap-3">
            <span className="text-lg flex-shrink-0">④</span>
            <div>
              <div className="text-sm font-semibold text-gray-900 mb-0.5">Check Call QA</div>
              <div className="text-sm text-gray-500">Upload a transcript or use the sample to see AI scoring</div>
            </div>
          </div>
        </div>

        <button
          onClick={dismissWelcome}
          className="w-full bg-[#1A6BFF] hover:bg-blue-700 text-white font-medium py-3 rounded-xl text-sm transition-colors"
        >
          Got it — show me the demo
        </button>
      </div>
    </div>,
    document.body
  );
}
