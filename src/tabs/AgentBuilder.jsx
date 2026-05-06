import { useState } from 'react';
import {
  TrendingUp, TrendingDown, GripVertical, Plus, AlertCircle,
  CheckCircle, Clock, PhoneCall, X, Save, FlaskConical, Radio
} from 'lucide-react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useApp } from '../context/AppContext';
import InfoPopover from '../components/InfoPopover';

// ─── KPI Data ────────────────────────────────────────────────────────────────
const KPI_DATA = [
  { label: 'Resolution Rate', value: '74%', change: '+2.3%', up: true, icon: CheckCircle, color: 'text-green-600' },
  { label: 'Transfer Rate', value: '18%', change: '-1.1%', up: false, color: 'text-blue-600', icon: PhoneCall },
  { label: 'Avg Handle Time', value: '2m 34s', change: '-8s', up: false, color: 'text-purple-600', icon: Clock },
  { label: 'Calls Today', value: '1,284', change: '+142', up: true, color: 'text-orange-600', icon: TrendingUp },
];

const FAILED_CALLS = [
  { id: 'fc1', time: '10:42 AM', reason: 'Caller asked about billing — intent not recognized → transferred', nodeId: '3' },
  { id: 'fc2', time: '10:17 AM', reason: 'Insurance verification question triggered fallback — no match in KB', nodeId: '3' },
  { id: 'fc3', time: '9:55 AM', reason: 'Patient asked about payment plans — agent gave incorrect pricing', nodeId: '4' },
  { id: 'fc4', time: '9:31 AM', reason: 'After-hours scheduling request — agent failed to offer callback', nodeId: '1' },
  { id: 'fc5', time: '9:08 AM', reason: 'Dental emergency question escalated — transfer path not triggered', nodeId: '4' },
];

const INITIAL_VERSIONS = [
  { id: 'v3', label: 'v3', time: 'Today, 9:00 AM', author: 'Ops Manager', live: true },
  { id: 'v2', label: 'v2', time: 'Yesterday, 3:14 PM', author: 'Ops Manager', live: false },
  { id: 'v1', label: 'v1', time: 'May 4, 11:22 AM', author: 'Ops Manager', live: false },
];

const STATUS_COLORS = { active: 'bg-green-500', warning: 'bg-amber-400', error: 'bg-red-500' };

// ─── Sortable Node Card ───────────────────────────────────────────────────────
function NodeCard({ node, highlightedNodeId, onEditScript, onEditTitle, pendingScript }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: node.id });
  const style = { transform: CSS.Transform.toString(transform), transition };
  const isHighlighted = highlightedNodeId === node.id;
  const hasPending = pendingScript?.nodeId === node.id;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`bg-white rounded-xl border-2 p-4 transition-all ${
        isDragging ? 'opacity-50 shadow-xl' : 'shadow-sm'
      } ${isHighlighted ? 'border-amber-400 animate-pulse' : hasPending ? 'border-[#1A6BFF]' : 'border-gray-200'}`}
    >
      <div className="flex items-start gap-3">
        <button
          className="mt-1 text-gray-300 hover:text-gray-500 cursor-grab active:cursor-grabbing flex-shrink-0"
          {...attributes}
          {...listeners}
        >
          <GripVertical size={18} />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${STATUS_COLORS[node.status]}`} />
            <input
              className="font-semibold text-gray-900 text-sm bg-transparent border-none outline-none w-full cursor-text hover:bg-gray-50 rounded px-1 -ml-1"
              value={node.title}
              onChange={e => onEditTitle(node.id, e.target.value)}
            />
          </div>
          <textarea
            className="w-full text-xs text-gray-500 bg-gray-50 rounded-lg p-2 border border-gray-200 resize-none outline-none focus:border-[#1A6BFF] focus:bg-white transition-colors"
            rows={2}
            value={hasPending ? pendingScript.script : node.script}
            onChange={e => onEditScript(node.id, e.target.value)}
          />
          {hasPending && (
            <div className="mt-1 text-xs text-[#1A6BFF] font-medium">← Injected from Script Editor</div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function AgentBuilder() {
  const { nodes, setNodes, pendingScript, setPendingScript } = useApp();
  const [highlightedNodeId, setHighlightedNodeId] = useState(null);
  const [versions, setVersions] = useState(INITIAL_VERSIONS);
  const [showGoLiveModal, setShowGoLiveModal] = useState(false);
  const [goLiveTarget, setGoLiveTarget] = useState(null);
  const [liveVersionLabel, setLiveVersionLabel] = useState(null);
  const [testMode, setTestMode] = useState(false);
  const [hasTestedOnce, setHasTestedOnce] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  function handleDragEnd({ active, over }) {
    if (active.id !== over?.id) {
      const oldIndex = nodes.findIndex(n => n.id === active.id);
      const newIndex = nodes.findIndex(n => n.id === over.id);
      setNodes(arrayMove(nodes, oldIndex, newIndex));
    }
  }

  function handleEditScript(id, value) {
    setNodes(prev => prev.map(n => n.id === id ? { ...n, script: value } : n));
    if (pendingScript?.nodeId === id) setPendingScript(null);
  }

  function handleEditTitle(id, value) {
    setNodes(prev => prev.map(n => n.id === id ? { ...n, title: value } : n));
  }

  function handleAddNode() {
    setNodes(prev => [...prev, {
      id: `node-${Date.now()}`,
      title: 'New Node',
      script: 'Enter the script for this node...',
      status: 'active',
    }]);
  }

  function handleFixThis(nodeId) {
    setHighlightedNodeId(nodeId);
    setTimeout(() => setHighlightedNodeId(null), 3000);
  }

  function handleSaveVersion() {
    const next = `v${versions.length + 1}`;
    setVersions(prev => [{ id: next, label: next, time: 'Just now', author: 'Ops Manager', live: false }, ...prev]);
  }

  function handleStartTest() {
    setTestMode(true);
    setHasTestedOnce(true);
  }

  function handleGoLive(versionId) {
    setGoLiveTarget(versionId);
    setShowGoLiveModal(true);
  }

  function confirmGoLive() {
    setVersions(prev => prev.map(v => ({ ...v, live: v.id === goLiveTarget })));
    setLiveVersionLabel(goLiveTarget);
    setShowGoLiveModal(false);
    setGoLiveTarget(null);
    setTestMode(false);
  }

  const liveVersion = versions.find(v => v.live);

  return (
    <div className="space-y-6">
      {/* ── Live banner (post go-live) ── */}
      {liveVersionLabel && (
        <div className="flex items-center gap-3 px-4 py-3 bg-green-50 border border-green-200 rounded-xl text-sm text-green-800 font-medium">
          <Radio size={16} className="text-green-600 flex-shrink-0" />
          ✅ {liveVersionLabel} is live — monitoring real calls
        </div>
      )}

      {/* ── Section A: KPI Cards ── */}
      <div>
        <div className="flex items-center gap-1.5 mb-3">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">KPI Dashboard</span>
          <InfoPopover
            painPoint="Ops managers have no visibility into whether the agent is working"
            intent="Give the ops manager the 4 numbers that actually matter to them"
            whatItDoes="Shows resolution rate, transfer rate, handle time, and call volume updated in real time"
          />
        </div>
        <div className="grid grid-cols-4 gap-4">
          {KPI_DATA.map(({ label, value, change, up, icon: Icon, color }) => (
            <div key={label} className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</span>
                <Icon size={16} className={color} />
              </div>
              <div className="text-2xl font-bold text-gray-900 mb-1">{value}</div>
              <div className={`flex items-center gap-1 text-xs font-medium ${up ? 'text-green-600' : 'text-red-500'}`}>
                {up ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                {change} vs yesterday
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Section B: Visual Call Flow ── */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-1.5">
            <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">Call Flow</h2>
            <InfoPopover
              painPoint="Ops managers can't see or change how the agent thinks without an engineer"
              intent="Give full ownership of the agent's logic to a non-technical user"
              whatItDoes="Drag-and-drop canvas where every step the agent takes can be edited, reordered, or removed"
            />
          </div>
          <span className="text-xs text-gray-400">{nodes.length} nodes · drag to reorder</span>
        </div>

        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={nodes.map(n => n.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-3">
              {nodes.map((node, i) => (
                <div key={node.id}>
                  <NodeCard
                    node={node}
                    highlightedNodeId={highlightedNodeId}
                    onEditScript={handleEditScript}
                    onEditTitle={handleEditTitle}
                    pendingScript={pendingScript}
                  />
                  {i < nodes.length - 1 && (
                    <div className="flex justify-center py-1">
                      <div className="w-px h-4 bg-gray-300" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </SortableContext>
        </DndContext>

        <button
          onClick={handleAddNode}
          className="mt-4 w-full flex items-center justify-center gap-2 border-2 border-dashed border-gray-300 rounded-xl py-3 text-sm text-gray-500 hover:border-[#1A6BFF] hover:text-[#1A6BFF] transition-colors"
        >
          <Plus size={16} />
          Add Node
        </button>
      </div>

      {/* ── Section C: Bottom Panels ── */}
      <div className="grid grid-cols-2 gap-4">
        {/* Failed Calls Feed */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-1.5">
            <AlertCircle size={15} className="text-red-500" />
            Failed Calls
            <InfoPopover
              painPoint="No one knows why calls are failing until a customer complains"
              intent="Surface failures immediately with enough context to fix them"
              whatItDoes="Lists every failed call with a one-line reason and a direct link to the broken node"
            />
          </h3>
          <div className="space-y-3">
            {FAILED_CALLS.map(call => (
              <div key={call.id} className="flex items-start gap-3 p-3 rounded-lg bg-gray-50 border border-gray-100">
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-gray-400 mb-1">{call.time}</div>
                  <div className="text-xs text-gray-700 leading-relaxed">{call.reason}</div>
                </div>
                <button
                  onClick={() => handleFixThis(call.nodeId)}
                  className="flex-shrink-0 text-xs bg-amber-50 text-amber-700 border border-amber-200 rounded-lg px-3 py-1.5 hover:bg-amber-100 transition-colors font-medium"
                >
                  Fix This
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Version History */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-1.5">
              <Clock size={15} className="text-gray-400" />
              Version History
              <InfoPopover
                painPoint="Ops managers are scared to make changes because they can't undo them"
                intent="Make experimentation safe by making every change reversible"
                whatItDoes="Saves every version with a timestamp and one-click rollback"
              />
            </h3>
            <button
              onClick={handleSaveVersion}
              className="flex items-center gap-1.5 text-xs bg-[#1A6BFF] text-white rounded-lg px-3 py-1.5 hover:bg-blue-700 transition-colors font-medium"
            >
              <Save size={12} />
              Save Version
            </button>
          </div>

          <div className="space-y-3 mb-4">
            {versions.map(ver => (
              <div key={ver.id} className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 border border-gray-100">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-sm font-semibold text-gray-900">{ver.label}</span>
                    {ver.live && (
                      <span className="text-xs bg-green-100 text-green-700 border border-green-200 rounded-full px-2 py-0.5 font-medium">
                        Live
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-gray-400">{ver.time} · Saved by: {ver.author}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Test + Go Live controls */}
          <div className="flex flex-col gap-2 pt-3 border-t border-gray-100">
            {/* Run in Test Mode */}
            <div className="flex items-center gap-1.5">
              {testMode ? (
                <div className="flex-1 flex items-center gap-2 py-2.5 px-3 rounded-lg bg-green-50 border border-green-200">
                  <span className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0" />
                  <span className="text-sm font-medium text-green-700">Test Running</span>
                </div>
              ) : (
                <button
                  onClick={handleStartTest}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg border-2 border-amber-400 bg-amber-50 text-amber-700 text-sm font-medium hover:bg-amber-100 transition-colors"
                >
                  <FlaskConical size={15} />
                  Run in Test Mode
                </button>
              )}
              <InfoPopover
                painPoint="Changes go live on real calls before anyone has tested them"
                intent="Give ops managers a safe space to validate changes before they affect real callers"
                whatItDoes="Activates a sandboxed state where the flow can be reviewed and approved before pushing live"
              />
            </div>

            {/* Go Live */}
            <div className="flex items-center gap-1.5">
              <div className="relative group flex-1">
                <button
                  onClick={() => liveVersion && handleGoLive(liveVersion.id)}
                  disabled={!hasTestedOnce}
                  className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    hasTestedOnce
                      ? 'bg-[#1A6BFF] text-white hover:bg-blue-700'
                      : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  <Radio size={15} />
                  Go Live
                </button>
                {!hasTestedOnce && (
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-gray-800 text-white text-xs rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                    Run a test first before going live
                    <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-800" />
                  </div>
                )}
              </div>
              <InfoPopover
                painPoint="There is no controlled process for pushing agent changes to production"
                intent="Create a deliberate gate between testing and live deployment"
                whatItDoes="Pushes the approved version to all new incoming calls with a confirmation step and instant rollback option"
              />
            </div>
          </div>
        </div>
      </div>

      {/* ── Go Live Modal ── */}
      {showGoLiveModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full mx-4">
            <div className="flex items-center justify-between mb-1">
              <h3 className="font-semibold text-gray-900">You're about to push {goLiveTarget} live</h3>
              <button onClick={() => setShowGoLiveModal(false)} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>
            <p className="text-sm text-gray-600 mb-2 mt-3">
              New calls will use this version going forward. Calls already in progress won't be affected.
            </p>
            <p className="text-sm text-gray-500 mb-6">
              You can roll back instantly from Version History if anything looks off.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowGoLiveModal(false)}
                className="flex-1 py-2.5 rounded-lg border border-gray-300 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmGoLive}
                className="flex-1 py-2.5 rounded-lg bg-[#1A6BFF] text-white text-sm font-medium hover:bg-blue-700 transition-colors"
              >
                Push Live
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
