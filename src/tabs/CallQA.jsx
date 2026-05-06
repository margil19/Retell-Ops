import { useState, useRef } from 'react';
import { Upload, AlertTriangle, Lightbulb, Loader2, FileText, ExternalLink, ClipboardList } from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ReferenceLine, ResponsiveContainer, Label,
} from 'recharts';
import { callClaude, parseJSON } from '../lib/claude';
import { useApp } from '../context/AppContext';
import InfoPopover from '../components/InfoPopover';

// ─── Sample transcript ────────────────────────────────────────────────────────
const SAMPLE_TRANSCRIPT = `Call ID: DEN-2024-0892
Date: May 6, 2026
Time: 10:14 AM
Duration: 3m 42s
Agent: Retell AI Voice Agent (Bright Smile Dental)
Caller: Inbound patient

---

Agent: Thank you for calling Bright Smile Dental. My name is Maya. How can I help you today?

Caller: Hi yeah I've been having some pretty bad tooth pain on my lower left side since yesterday. It's like a throbbing kind of pain.

Agent: I'm sorry to hear that. Throbbing pain can sometimes indicate an infection or an issue with the tooth root. I want to make sure we get you seen as soon as possible. Can I get your full name please?

Caller: Yeah it's Sandra Collins.

Agent: Thank you Sandra. Are you an existing patient with us?

Caller: Yes I came in about eight months ago for a cleaning.

Agent: Perfect. And on a scale of 1 to 10 how would you rate the pain right now?

Caller: Honestly like a 7. It kept me up last night.

Agent: I understand. A pain level of 7 that is affecting your sleep is something we treat as urgent. I want to book you in for an emergency appointment. We have availability today at 2:15 PM or tomorrow morning at 9:00 AM. Which would work better for you?

Caller: Today works. 2:15 is fine.

Agent: Great. I have you booked for today at 2:15 PM with Dr. Patel for an emergency exam. Can I confirm your date of birth for the record?

Caller: Sure it's March 12 1988.

Agent: Perfect. And the best callback number for you?

Caller: 512-334-7821.

Agent: Got it. You will receive a confirmation text within the next 10 minutes at that number. A couple of things to note before your visit — if the pain becomes severe or you notice swelling in your jaw or face before your appointment please go to urgent care immediately as that can indicate a spreading infection. Do you have any questions for me before I let you go?

Caller: Yeah actually — will my insurance cover this? I have Delta Dental.

Agent: That is a great question. Emergency exams are typically covered under most Delta Dental plans however coverage can vary depending on your specific plan tier. I would recommend calling Delta Dental directly at the number on the back of your insurance card to confirm your benefits before your visit. We will also do a quick insurance verification on our end when you arrive.

Caller: Okay and what if it turns out I need a root canal or something? Is that covered too?

Agent: Root canal coverage also varies by plan — some Delta Dental plans cover 50 to 80 percent of endodontic procedures after your deductible. Again I would recommend confirming directly with Delta Dental. If there are any out of pocket costs Dr. Patel will walk you through all your options before any treatment begins so there are no surprises.

Caller: Okay that makes sense. One more thing — I'm a little nervous about the pain during the procedure if it comes to that.

Agent: That is completely understandable. Dr. Patel is very experienced with anxious patients and will ensure you are fully comfortable before beginning any treatment. Local anesthesia is standard for all procedures involving tooth pain and you will always be told exactly what is happening before anything is done. You are in good hands.

Caller: Okay that makes me feel better. Thank you.

Agent: Of course Sandra. We will see you today at 2:15 PM. You will get that confirmation text shortly. Take care and if anything changes before then do not hesitate to call us back.

Caller: Thanks bye.

Agent: Goodbye and feel better soon.

---

End of call
Resolution: Appointment booked
Transfer to human: No
Call outcome: Resolved`;

// ─── Hardcoded trend / change log data ───────────────────────────────────────
const TREND_DATA = [
  { call: 'Call 1', score: 82 },
  { call: 'Call 2', score: 76 },
  { call: 'Call 3', score: 79 },
  { call: 'Call 4', score: 88 },
  { call: 'Call 5', score: 71 },
  { call: 'Call 6', score: 85 },
  { call: 'Call 7', score: 90 },
];

const CHANGE_LOG = [
  { call: 1, date: 'May 1', score: 82, issue: 'Greeting too abrupt', action: 'Updated greeting script' },
  { call: 2, date: 'May 1', score: 76, issue: 'Intent not captured on billing query', action: 'Added billing intent examples' },
  { call: 3, date: 'May 2', score: 79, issue: 'KB miss on crown pricing', action: 'Updated pricing KB entry' },
  { call: 4, date: 'May 2', score: 88, issue: 'Minor compliance phrasing', action: 'Reviewed with compliance team' },
  { call: 5, date: 'May 3', score: 71, issue: 'Transfer not triggered on emergency', action: 'Fixed emergency routing node' },
  { call: 6, date: 'May 4', score: 85, issue: 'Slight delay in resolution', action: 'Optimized KB lookup flow' },
  { call: 7, date: 'May 5', score: 90, issue: 'None significant', action: 'No changes needed' },
];

const QA_SYSTEM_PROMPT = `You are a call quality analyst for an AI voice agent platform. Analyze the following call transcript and return a JSON object with this exact structure:
{
  "overall_score": <number 0-100>,
  "pass": <boolean>,
  "categories": [
    {"name": "Greeting", "score": <0-100>, "pass": <boolean>, "note": "<one line>"},
    {"name": "Intent capture", "score": <0-100>, "pass": <boolean>, "note": "<one line>"},
    {"name": "Knowledge accuracy", "score": <0-100>, "pass": <boolean>, "note": "<one line>"},
    {"name": "Resolution", "score": <0-100>, "pass": <boolean>, "note": "<one line>"},
    {"name": "Compliance", "score": <0-100>, "pass": <boolean>, "note": "<one line>"}
  ],
  "top_issue": "<one sentence summary of the biggest problem>",
  "recommendation": "<one sentence fix>"
}
Return only the JSON object, no other text.`;

export default function CallQA() {
  const { setActiveTab } = useApp();
  const [transcript, setTranscript] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const [sampleLoaded, setSampleLoaded] = useState(false);
  const [analyzeGlow, setAnalyzeGlow] = useState(false);
  const fileRef = useRef(null);
  const analyzeRef = useRef(null);

  async function handleAnalyze() {
    if (!transcript.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const text = await callClaude({ system: QA_SYSTEM_PROMPT, prompt: `Transcript:\n${transcript}` });
      setResult(parseJSON(text));
    } catch (e) {
      setError(e.message || 'Something went wrong. Try again.');
    } finally {
      setLoading(false);
    }
  }

  function handleFileUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      setTranscript(ev.target.result);
      setSampleLoaded(false);
    };
    reader.readAsText(file);
  }

  function handleUseSample() {
    setTranscript(SAMPLE_TRANSCRIPT);
    setSampleLoaded(true);
    setResult(null);
    setError(null);

    // Scroll to button + one-shot glow
    setTimeout(() => {
      analyzeRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setAnalyzeGlow(true);
      setTimeout(() => setAnalyzeGlow(false), 1000);
    }, 80);
  }

  return (
    <div className="space-y-6">
      {/* ── Upload + Score ── */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <div className="flex items-center gap-1.5 mb-4">
          <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">Analyze Call Transcript</h2>
          <InfoPopover
            painPoint="QA requires humans to manually listen to calls — doesn't scale"
            intent="Replace subjective spot-checking with consistent AI scoring"
            whatItDoes="Upload any transcript or use the sample dental call to see how every category gets scored instantly"
          />
        </div>

        {/* File upload zone */}
        <div
          className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center cursor-pointer hover:border-[#1A6BFF] hover:bg-blue-50/30 transition-colors"
          onClick={() => fileRef.current?.click()}
        >
          <Upload size={24} className="mx-auto text-gray-400 mb-2" />
          <p className="text-sm text-gray-600 font-medium">Drop a .txt file here or click to upload</p>
          <p className="text-xs text-gray-400 mt-1">Supports plain text call transcripts</p>
          <input ref={fileRef} type="file" accept=".txt" className="hidden" onChange={handleFileUpload} />
        </div>

        {/* Divider */}
        <div className="flex items-center gap-3 my-4">
          <div className="flex-1 h-px bg-gray-200" />
          <span className="text-xs text-gray-400 font-medium">or</span>
          <div className="flex-1 h-px bg-gray-200" />
        </div>

        {/* Use Sample Transcript button */}
        <button
          onClick={handleUseSample}
          className="w-full flex items-center justify-center gap-2 border-2 border-[#1A6BFF] text-[#1A6BFF] rounded-xl py-3 text-sm font-medium hover:bg-blue-50 transition-colors mb-4"
        >
          <ClipboardList size={16} />
          Use Sample Transcript
        </button>

        {/* Sample loaded banner */}
        {sampleLoaded && (
          <div className="mb-3 px-4 py-2.5 bg-green-50 border border-green-200 rounded-xl text-sm text-green-700 font-medium">
            ✅ Sample loaded — this is a real inbound dental call. Click Analyze Call to score it.
          </div>
        )}

        {/* Sample metadata strip */}
        {sampleLoaded && (
          <div className="mb-3 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-500 flex items-center gap-1.5 flex-wrap">
            <span>📋 Sample call</span>
            <span className="text-gray-300">•</span>
            <span>Bright Smile Dental</span>
            <span className="text-gray-300">•</span>
            <span>Inbound</span>
            <span className="text-gray-300">•</span>
            <span>3m 42s</span>
            <span className="text-gray-300">•</span>
            <span className="text-green-600 font-medium">Resolved</span>
          </div>
        )}

        {/* Paste textarea */}
        <div className="mb-4">
          <label className="block text-xs font-medium text-gray-500 mb-2">
            {sampleLoaded ? 'Loaded transcript' : 'Or paste transcript below'}
          </label>
          <textarea
            className="w-full border border-gray-200 rounded-xl p-3 text-sm text-gray-700 resize-none outline-none focus:border-[#1A6BFF] transition-colors h-32"
            placeholder="Paste call transcript here..."
            value={transcript}
            onChange={e => { setTranscript(e.target.value); setSampleLoaded(false); }}
          />
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>
        )}

        <button
          ref={analyzeRef}
          onClick={handleAnalyze}
          disabled={loading || !transcript.trim()}
          className={`flex items-center gap-2 bg-[#1A6BFF] text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${analyzeGlow ? 'analyze-pulse' : ''}`}
        >
          {loading
            ? <><Loader2 size={15} className="animate-spin" />Analyzing call...</>
            : <><FileText size={15} />Analyze Call</>}
        </button>
      </div>

      {/* ── Results / Scorecard ── */}
      {result && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-6">
          <div className="flex items-center gap-6">
            <div className={`w-24 h-24 rounded-full flex flex-col items-center justify-center border-4 ${result.pass ? 'border-green-500 bg-green-50' : 'border-red-400 bg-red-50'}`}>
              <span className={`text-3xl font-bold ${result.pass ? 'text-green-600' : 'text-red-500'}`}>{result.overall_score}</span>
              <span className={`text-xs font-medium mt-0.5 ${result.pass ? 'text-green-600' : 'text-red-500'}`}>{result.pass ? 'PASS' : 'FAIL'}</span>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <div className="text-lg font-bold text-gray-900">Overall QA Score</div>
                <InfoPopover
                  painPoint="Call quality is checked manually by humans listening to recordings — doesn't scale"
                  intent="Replace subjective human spot-checking with consistent AI scoring"
                  whatItDoes="Scores every call across 5 categories and flags the exact failure with a fix recommendation"
                />
              </div>
              <div className="text-sm text-gray-500">Out of 100 · Target ≥ 80</div>
            </div>
          </div>

          <div className="space-y-3">
            {result.categories?.map(cat => (
              <div key={cat.name} className="flex items-center gap-3">
                <div className="w-32 text-sm text-gray-600 flex-shrink-0">{cat.name}</div>
                <div className="flex-1 bg-gray-100 rounded-full h-2">
                  <div className={`h-2 rounded-full ${cat.pass ? 'bg-green-500' : 'bg-red-400'}`} style={{ width: `${cat.score}%` }} />
                </div>
                <div className="w-10 text-sm font-semibold text-gray-900 text-right">{cat.score}</div>
                <span className={`flex-shrink-0 text-xs px-2 py-0.5 rounded-full font-medium ${cat.pass ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                  {cat.pass ? 'Pass' : 'Fail'}
                </span>
                <div className="text-xs text-gray-400 flex-1 truncate">{cat.note}</div>
              </div>
            ))}
          </div>

          <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex gap-3">
            <AlertTriangle size={18} className="text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <div className="text-sm font-semibold text-red-700 mb-1">Top Issue</div>
              <div className="text-sm text-red-600">{result.top_issue}</div>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
            <Lightbulb size={18} className="text-[#1A6BFF] flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <div className="text-sm font-semibold text-[#1A6BFF] mb-1">Recommendation</div>
              <div className="text-sm text-blue-700">{result.recommendation}</div>
            </div>
            <button
              onClick={() => setActiveTab('script-editor')}
              className="flex-shrink-0 flex items-center gap-1.5 text-xs bg-[#1A6BFF] text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              <ExternalLink size={12} />
              Fix in Script Editor
            </button>
          </div>
        </div>
      )}

      {/* ── Trend View ── */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <div className="flex items-center gap-1.5 mb-6">
          <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">QA Score Trend — Last 7 Calls</h2>
          <InfoPopover
            painPoint="No one knows if the agent is improving or getting worse over time"
            intent="Make performance trajectory visible at a glance"
            whatItDoes="Charts scores across the last 7 calls against a target threshold so regressions are caught early"
          />
        </div>

        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={TREND_DATA} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="call" tick={{ fontSize: 12, fill: '#6b7280' }} />
            <YAxis domain={[60, 100]} tick={{ fontSize: 12, fill: '#6b7280' }} />
            <Tooltip />
            <ReferenceLine y={80} stroke="#1A6BFF" strokeDasharray="6 3">
              <Label value="Target" position="insideTopRight" fontSize={11} fill="#1A6BFF" />
            </ReferenceLine>
            <Line type="monotone" dataKey="score" stroke="#1A6BFF" strokeWidth={2} dot={{ r: 5, fill: '#1A6BFF' }} />
          </LineChart>
        </ResponsiveContainer>

        <div className="mt-6">
          <div className="flex items-center gap-1.5 mb-3">
            <h3 className="text-sm font-semibold text-gray-700">Change Log</h3>
            <InfoPopover
              painPoint="Changes are made but no one tracks whether they actually helped"
              intent="Connect actions to outcomes so the ops manager knows what works"
              whatItDoes="Links each call score to what was changed before it ran"
            />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500 uppercase">Call #</th>
                  <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500 uppercase">Date</th>
                  <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500 uppercase">Score</th>
                  <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500 uppercase">Top Issue</th>
                  <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500 uppercase">Action Taken</th>
                </tr>
              </thead>
              <tbody>
                {CHANGE_LOG.map(row => (
                  <tr key={row.call} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-2 px-3 font-medium text-gray-900">#{row.call}</td>
                    <td className="py-2 px-3 text-gray-500">{row.date}</td>
                    <td className="py-2 px-3">
                      <span className={`font-semibold ${row.score >= 80 ? 'text-green-600' : 'text-red-500'}`}>{row.score}</span>
                    </td>
                    <td className="py-2 px-3 text-gray-600">{row.issue}</td>
                    <td className="py-2 px-3 text-gray-600">{row.action}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
