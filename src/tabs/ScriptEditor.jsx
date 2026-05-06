import { useState } from 'react';
import { Loader2, CheckCircle, AlertTriangle, XCircle, Download, ArrowRight } from 'lucide-react';
import { callClaude, parseJSON } from '../lib/claude';
import { useApp } from '../context/AppContext';

const INDUSTRIES = ['Healthcare', 'Finance', 'Insurance', 'Retail', 'Other'];
const TONES = ['Professional', 'Friendly', 'Concise'];

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

  function handleExport() {
    const payload = {
      rewritten_prompt: result?.rewritten_prompt,
      industry,
      tone,
      timestamp: new Date().toISOString(),
    };
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

  return (
    <div className="space-y-6">
      {/* ── Step 1: Input ── */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-6 h-6 rounded-full bg-[#1A6BFF] text-white text-xs font-bold flex items-center justify-center">1</div>
          <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">Describe Your Instruction</h2>
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
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            {error}
          </div>
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
            <div className="flex items-center gap-2 mb-5">
              <div className="w-6 h-6 rounded-full bg-[#1A6BFF] text-white text-xs font-bold flex items-center justify-center">2</div>
              <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">AI Rewrite + Guardrails</h2>
            </div>

            {/* Side-by-side comparison */}
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

            {/* Flags */}
            {result.flags?.length === 0 ? (
              <div className="flex items-center gap-2 p-4 bg-green-50 border border-green-200 rounded-xl text-sm text-green-700">
                <CheckCircle size={18} className="text-green-500" />
                No compliance or quality issues found.
              </div>
            ) : (
              <div className="space-y-3">
                <div className="text-sm font-semibold text-gray-700">Flags</div>
                {result.flags?.map((flag, i) => (
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
              <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">Simulated Call Preview</h2>
            </div>

            <div className="space-y-4 mb-6">
              {result.simulated_exchange?.map((turn, i) => {
                const isCaller = turn.speaker === 'Caller';
                return (
                  <div key={i} className={`flex flex-col ${isCaller ? 'items-start' : 'items-end'}`}>
                    <span className="text-xs text-gray-400 mb-1 px-1">{turn.speaker}</span>
                    <div className={`max-w-[70%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                      isCaller
                        ? 'bg-gray-100 text-gray-800 rounded-tl-sm'
                        : 'bg-[#1A6BFF] text-white rounded-tr-sm'
                    }`}>
                      {turn.text}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Actions */}
            <div className="flex flex-wrap items-center gap-3 pt-4 border-t border-gray-100">
              <button
                onClick={handleExport}
                className="flex items-center gap-2 border border-gray-300 text-gray-700 px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
              >
                <Download size={15} />
                Approve & Export
              </button>

              <div className="flex items-center gap-2">
                <select
                  className="border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-700 outline-none focus:border-[#1A6BFF] bg-white"
                  value={selectedNodeId}
                  onChange={e => setSelectedNodeId(e.target.value)}
                >
                  {nodes.map(n => (
                    <option key={n.id} value={n.id}>{n.title}</option>
                  ))}
                </select>
                <button
                  onClick={handleSendToAgentBuilder}
                  className="flex items-center gap-2 bg-[#1A6BFF] text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                >
                  Send to Agent Builder
                  <ArrowRight size={14} />
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
