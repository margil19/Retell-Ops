import { useState } from 'react';
import { Loader2, CheckCircle, AlertTriangle, XCircle, Download, ArrowRight } from 'lucide-react';
import { callClaude, parseJSON } from '../lib/claude';
import { useApp } from '../context/AppContext';
import InfoPopover from '../components/InfoPopover';

const INDUSTRIES = ['Healthcare', 'Finance', 'Insurance', 'Retail', 'Other'];
const TONES = ['Professional', 'Friendly', 'Concise'];

const TEMPLATES = [
  {
    id: 'risky',
    badge: '⚠️ Pricing & Treatment Info',
    badgeStyle: 'bg-amber-50 border-amber-300 text-amber-700',
    description: 'Handles patient questions about whitening treatment and costs',
    industry: 'Healthcare',
    tone: 'Friendly',
    text: "If a patient calls asking about our teeth whitening treatment, tell them it is completely safe for everyone and guaranteed to work within 2 weeks. Let them know their insurance will most likely cover it and the out of pocket cost is around $200 but we can work something out if they can't afford it. If they ask about side effects just tell them there are none and not to worry about it. Also tell them Dr. Johnson personally recommends it to all his patients and they should book immediately before spots run out.",
  },
  {
    id: 'clean',
    badge: '✅ Appointment Scheduling',
    badgeStyle: 'bg-green-50 border-green-300 text-green-700',
    description: 'Handles inbound appointment booking for new and existing patients',
    industry: 'Healthcare',
    tone: 'Professional',
    text: "When a patient calls to book an appointment, ask for their full name and whether they are a new or existing patient. For new patients, let them know a standard cleaning and exam takes about 60 minutes and costs $150 if paying out of pocket, and that we recommend they contact their insurance provider beforehand to confirm their coverage. For existing patients, pull up their last visit and suggest scheduling within the recommended timeframe. Always confirm the appointment date, time, and location before ending the call, and let them know they will receive a confirmation text within 10 minutes.",
  },
];

const SCRIPT_SYSTEM_PROMPT = `You are a voice AI prompt engineer. A non-technical ops manager has written the following instruction for their AI voice agent. Rewrite it as a production-safe agent prompt and identify any compliance or quality issues.

Return a JSON object with this exact structure:
{
  "rewritten_prompt": "<the production-safe version>",
  "flags": [
    {
      "severity": "<warning|error>",
      "original_text": "<the problematic phrase>",
      "reason": "<why it's an issue>",
      "suggestion": "<what to say instead>"
    }
  ],
  "simulated_exchange": [
    {"speaker": "Caller", "text": "<realistic caller message>"},
    {"speaker": "Agent", "text": "<agent response using the rewritten prompt>"},
    {"speaker": "Caller", "text": "<follow-up>"},
    {"speaker": "Agent", "text": "<agent follow-up response>"}
  ]
}
Return only the JSON object, no other text.`;

export default function ScriptEditor() {
  const { setActiveTab, setPendingScript, nodes } = useApp();
  const [input, setInput] = useState('');
  const [industry, setIndustry] = useState('Healthcare');
  const [tone, setTone] = useState('Professional');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const [selectedNodeId, setSelectedNodeId] = useState(nodes[0]?.id ?? '');

  async function handleRewrite() {
    if (!input.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const text = await callClaude({
        system: SCRIPT_SYSTEM_PROMPT,
        prompt: `Industry: ${industry}\nTone: ${tone}\nOriginal instruction: ${input}`,
      });
      setResult(parseJSON(text));
    } catch (e) {
      setError(e.message || 'Something went wrong. Try again.');
    } finally {
      setLoading(false);
    }
  }

  function handleUseTemplate(tpl) {
    setInput(tpl.text);
    setIndustry(tpl.industry);
    setTone(tpl.tone);
    setResult(null);
    setError(null);
  }

  function handleExport() {
    const payload = { rewritten_prompt: result?.rewritten_prompt, industry, tone, timestamp: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `retell-script-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleSendToAgentBuilder() {
    if (!result?.rewritten_prompt || !selectedNodeId) return;
    setPendingScript({ nodeId: selectedNodeId, script: result.rewritten_prompt });
    setActiveTab('agent-builder');
  }

  const hasFlags = result && result.flags?.length > 0;
  const flagCount = result?.flags?.length ?? 0;

  return (
    <div className="space-y-6">
      {/* ── Step 1: Input ── */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-6 h-6 rounded-full bg-[#1A6BFF] text-white text-xs font-bold flex items-center justify-center">1</div>
          <div className="flex items-center gap-1.5">
            <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">Describe Your Instruction</h2>
            <InfoPopover
              painPoint="Ops managers know what they want the agent to say but can't write a production prompt"
              intent="Remove the technical barrier between intent and implementation"
              whatItDoes="Takes a plain English instruction and rewrites it into a structured agent prompt automatically"
            />
          </div>
        </div>

        {/* Templates */}
        <div className="mb-5">
          <p className="text-xs font-medium text-gray-500 mb-3">Start from a template or write your own.</p>
          <div className="grid grid-cols-2 gap-3">
            {TEMPLATES.map(tpl => (
              <div key={tpl.id} className={`rounded-xl border p-4 flex flex-col gap-2 ${tpl.badgeStyle}`}>
                <span className="text-xs font-bold">{tpl.badge}</span>
                <p className="text-xs leading-relaxed opacity-80">{tpl.description}</p>
                <button
                  onClick={() => handleUseTemplate(tpl)}
                  className="self-start mt-1 text-xs font-semibold border border-current rounded-lg px-3 py-1.5 hover:opacity-70 transition-opacity"
                >
                  Use This
                </button>
              </div>
            ))}
          </div>
        </div>

        <textarea
          className="w-full border border-gray-200 rounded-xl p-4 text-sm text-gray-700 resize-none outline-none focus:border-[#1A6BFF] transition-colors h-36 mb-4"
          placeholder="e.g. If the patient asks about pricing, tell them a cleaning costs $150 and we offer payment plans"
          value={input}
          onChange={e => setInput(e.target.value)}
        />

        <div className="flex gap-4 mb-5">
          <div className="flex-1">
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Industry</label>
            <select
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 outline-none focus:border-[#1A6BFF] bg-white"
              value={industry}
              onChange={e => setIndustry(e.target.value)}
            >
              {INDUSTRIES.map(i => <option key={i}>{i}</option>)}
            </select>
          </div>
          <div className="flex-1">
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Tone</label>
            <select
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 outline-none focus:border-[#1A6BFF] bg-white"
              value={tone}
              onChange={e => setTone(e.target.value)}
            >
              {TONES.map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>
        )}

        <button
          onClick={handleRewrite}
          disabled={loading || !input.trim()}
          className="flex items-center gap-2 bg-[#1A6BFF] text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? <><Loader2 size={15} className="animate-spin" />Rewriting prompt...</> : 'Rewrite & Check'}
        </button>
      </div>

      {/* ── Step 2: AI Rewrite + Guardrails ── */}
      {result && (
        <>
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-6 h-6 rounded-full bg-[#1A6BFF] text-white text-xs font-bold flex items-center justify-center">2</div>
              <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">AI Rewrite + Guardrails</h2>
            </div>

            {/* Result banner */}
            {hasFlags ? (
              <div className="flex items-center gap-2 p-3 mb-5 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 font-medium">
                <AlertTriangle size={16} className="text-red-500 flex-shrink-0" />
                ⚠️ {flagCount} compliance issue{flagCount !== 1 ? 's' : ''} found — review before approving
              </div>
            ) : (
              <div className="flex items-center gap-2 p-3 mb-5 bg-green-50 border border-green-200 rounded-xl text-sm text-green-700 font-medium">
                <CheckCircle size={16} className="text-green-500 flex-shrink-0" />
                ✅ No compliance issues found — ready to approve
              </div>
            )}

            {/* Side-by-side */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="rounded-xl bg-gray-50 border border-gray-200 p-4">
                <div className="text-xs font-semibold text-gray-500 uppercase mb-3">Original</div>
                <p className="text-sm text-gray-600 leading-relaxed">{input}</p>
              </div>
              <div className="rounded-xl bg-blue-50 border border-blue-200 p-4">
                <div className="text-xs font-semibold text-[#1A6BFF] uppercase mb-3">Rewritten</div>
                <p className="text-sm text-blue-900 leading-relaxed">{result.rewritten_prompt}</p>
              </div>
            </div>

            {/* Compliance Flags */}
            {hasFlags && (
              <div className="space-y-3">
                <div className="flex items-center gap-1.5">
                  <div className="text-sm font-semibold text-gray-700">Flags</div>
                  <InfoPopover
                    painPoint="Risky language goes live on calls without anyone catching it until there's a complaint"
                    intent="Catch compliance issues before they reach a real caller"
                    whatItDoes="Scans the rewritten prompt and flags anything legally or medically risky with a specific fix"
                  />
                </div>
                {result.flags.map((flag, i) => (
                  <div key={i} className={`p-4 rounded-xl border ${flag.severity === 'error' ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200'}`}>
                    <div className="flex items-center gap-2 mb-2">
                      {flag.severity === 'error'
                        ? <XCircle size={15} className="text-red-500" />
                        : <AlertTriangle size={15} className="text-amber-500" />}
                      <span className={`text-xs font-semibold uppercase ${flag.severity === 'error' ? 'text-red-600' : 'text-amber-600'}`}>
                        {flag.severity}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500 mb-1">
                      Original: <span className="line-through text-red-400">{flag.original_text}</span>
                    </div>
                    <div className="text-xs text-gray-600 mb-1">{flag.reason}</div>
                    <div className="text-xs text-green-700 font-medium">→ {flag.suggestion}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── Step 3: Simulated Call Preview ── */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <div className="flex items-center gap-2 mb-5">
              <div className="w-6 h-6 rounded-full bg-[#1A6BFF] text-white text-xs font-bold flex items-center justify-center">3</div>
              <div className="flex items-center gap-1.5">
                <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">Simulated Call Preview</h2>
                <InfoPopover
                  painPoint="Ops managers can't hear how the agent will sound until it's already live"
                  intent="Let the ops manager experience the call before approving it"
                  whatItDoes="Shows a realistic 4-line call exchange using the new prompt so tone and accuracy can be verified"
                />
              </div>
            </div>

            <div className="space-y-4 mb-6">
              {result.simulated_exchange?.map((turn, i) => {
                const isCaller = turn.speaker === 'Caller';
                return (
                  <div key={i} className={`flex flex-col ${isCaller ? 'items-start' : 'items-end'}`}>
                    <span className="text-xs text-gray-400 mb-1 px-1">{turn.speaker}</span>
                    <div className={`max-w-[70%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                      isCaller ? 'bg-gray-100 text-gray-800 rounded-tl-sm' : 'bg-[#1A6BFF] text-white rounded-tr-sm'
                    }`}>
                      {turn.text}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Actions */}
            <div className="flex flex-wrap items-center gap-3 pt-4 border-t border-gray-100">
              {/* Export */}
              <div className="flex items-center gap-1.5">
                <button
                  onClick={handleExport}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    hasFlags
                      ? 'bg-amber-50 border border-amber-300 text-amber-700 hover:bg-amber-100'
                      : 'bg-green-50 border border-green-300 text-green-700 hover:bg-green-100'
                  }`}
                >
                  <Download size={15} />
                  {hasFlags ? 'Approve with Warnings' : 'Approve & Export'}
                </button>
                <InfoPopover
                  painPoint="Even after writing a great prompt the ops manager still needs an engineer to deploy it"
                  intent="Make the ops manager fully self-sufficient end to end"
                  whatItDoes="Downloads a structured JSON file ready for the Retell API — no engineer required"
                />
              </div>

              {/* Send to Agent Builder */}
              <div className="flex items-center gap-1.5">
                <select
                  className="border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-700 outline-none focus:border-[#1A6BFF] bg-white"
                  value={selectedNodeId}
                  onChange={e => setSelectedNodeId(e.target.value)}
                >
                  {nodes.map(n => <option key={n.id} value={n.id}>{n.title}</option>)}
                </select>
                <button
                  onClick={handleSendToAgentBuilder}
                  className="flex items-center gap-2 bg-[#1A6BFF] text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                >
                  Send to Agent Builder
                  <ArrowRight size={14} />
                </button>
                <InfoPopover
                  painPoint="Getting an approved script into the right node requires copying, switching tabs, and finding the right place manually"
                  intent="Make the handoff from writing to deploying a single click"
                  whatItDoes="Pushes the approved prompt directly into the selected node in Tab 1 with no manual steps"
                />
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
