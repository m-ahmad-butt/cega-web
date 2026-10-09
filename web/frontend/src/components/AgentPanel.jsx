import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { studentAPI, unwrap } from '../utils/api';
import { useGuide, useWarn } from './GuideModal';
import {
  Loader2, Send, RotateCcw, Check, X, MessageCircle, ChevronDown, Sparkles, ArrowRight,
} from 'lucide-react';

const PREF_CHIPS = [
  { id: 'morning', label: 'Morning' },
  { id: 'afternoon', label: 'Afternoon' },
  { id: 'min_gap', label: 'Min gap' },
  { id: 'max_gap', label: 'Max gap / rest' },
  { id: 'hardest_first', label: 'Hardest first' },
  { id: 'alternate_difficulty', label: 'Hard–easy alternate' },
  { id: 'hard_more_gap', label: 'More gap for hard' },
  { id: 'fewer_visits', label: 'Fewer campus visits' },
];

const AgentPanelContext = createContext({
  open: false,
  openAgent: () => {},
  closeAgent: () => {},
});

export const useAgentPanel = () => useContext(AgentPanelContext);

export const AgentPanelProvider = ({ children }) => {
  const [open, setOpen] = useState(false);
  const openAgent = useCallback(() => setOpen(true), []);
  const closeAgent = useCallback(() => setOpen(false), []);

  return (
    <AgentPanelContext.Provider value={{ open, openAgent, closeAgent }}>
      {children}
      <AgentPanel open={open} onClose={closeAgent} />
    </AgentPanelContext.Provider>
  );
};

const AgentPanel = ({ open, onClose }) => {
  const navigate = useNavigate();
  const { say } = useGuide();
  const warn = useWarn();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [prefs, setPrefs] = useState([]);
  const [prefsOpen, setPrefsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [booted, setBooted] = useState(false);
  const [phase, setPhase] = useState('');
  const [proposal, setProposal] = useState(null);
  const [proposedSelections, setProposedSelections] = useState(null);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  const push = (role, content) => {
    setMessages((m) => [...m, { role, content, at: Date.now() }]);
  };

  useEffect(() => {
    if (open) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
      setTimeout(() => inputRef.current?.focus(), 200);
    }
  }, [messages, proposal, loading, open]);

  useEffect(() => {
    if (!open || booted) return;
    let cancelled = false;

    const boot = async () => {
      setLoading(true);
      try {
        const { data: profileData } = await studentAPI.getProfile();
        const p = unwrap(profileData);
        if (cancelled) return;

        if (p.dateSheetSaved) {
          push('assistant', 'Your date sheet is already saved. Open Date Sheet to view it, or use Need Help to request a change.');
          setBooted(true);
          return;
        }
        if (!p.selectedBranch && !p.branch) {
          push('assistant', 'Select an exam branch first. Then open the agent again and I can build your date sheet.');
          setBooted(true);
          return;
        }

        const { data } = await studentAPI.agentChat({ message: 'hello', preferences: [] });
        if (cancelled) return;
        const payload = unwrap(data);
        push('assistant', payload.reply || 'Ask me to build your exam date sheet. Pick preferences below, then send.');
        setPhase(payload.phase || '');
        if (payload.proposedRows) {
          setProposal(payload.proposedRows);
          setProposedSelections(payload.proposedSelections);
        }
        setBooted(true);
      } catch (err) {
        if (!cancelled) {
          warn(err.response?.data?.message || 'Failed to start agent');
          push('assistant', 'Agent is unavailable. Check that the agent service is running.');
          setBooted(true);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    boot();
    return () => { cancelled = true; };
  }, [open, booted, warn]);

  const togglePref = (id) => {
    setPrefs((prev) => (prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]));
    setPrefsOpen(false); // hide dropdown after choosing a preference
  };

  const send = async ({ message, action } = {}) => {
    const text = (message ?? input).trim();
    if (!action && !text && !prefs.length) return;

    if (text) push('user', text);
    if (action === 'accept') push('user', 'Accept plan');
    if (action === 'reject') push('user', 'Reject plan');

    setInput('');
    setLoading(true);
    try {
      const { data } = await studentAPI.agentChat({
        message: text,
        preferences: prefs,
        action: action || undefined,
      });
      const payload = unwrap(data);
      push('assistant', payload.reply || '');
      setPhase(payload.phase || '');
      if (payload.proposedRows?.length) {
        setProposal(payload.proposedRows);
        setProposedSelections(payload.proposedSelections);
      } else if (payload.phase === 'resolve' || action === 'reject') {
        setProposal(null);
        setProposedSelections(null);
      }
      if (payload.preferences?.length) setPrefs(payload.preferences);

      if (action === 'accept' && (payload.proposedSelections || proposedSelections)) {
        const map = payload.proposedSelections || proposedSelections;
        await studentAPI.agentApply({ selections: map });
        say({ title: 'Date sheet saved', body: 'The agent plan was applied to your date sheet.', action: 'OK' });
        onClose();
        navigate('/student/datesheet');
      }
    } catch (err) {
      warn(err.response?.data?.message || 'Agent error');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async () => {
    setLoading(true);
    try {
      await studentAPI.agentReset({});
      setMessages([]);
      setProposal(null);
      setProposedSelections(null);
      setPrefs([]);
      setPhase('');
      setBooted(false);
    } catch {
      warn('Reset failed');
    } finally {
      setLoading(false);
    }
  };

  const prefLabel =
    prefs.length === 0
      ? 'Schedule preferences'
      : prefs.length === 1
        ? PREF_CHIPS.find((c) => c.id === prefs[0])?.label || '1 selected'
        : `${prefs.length} preferences`;

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[200] flex justify-end no-print">
      <button
        type="button"
        aria-label="Close agent"
        className="absolute inset-0 bg-black/25 backdrop-blur-[1px]"
        onClick={onClose}
      />

      <aside className="relative flex h-full w-full max-w-md flex-col bg-white shadow-2xl animate-in slide-in-from-right duration-200 sm:max-w-[420px]">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-[#ebeae8] px-5 py-4">
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-[#191919]">Agent</h2>
            <p className="mt-0.5 text-sm text-[#787774]">
              Schedule builder{phase ? ` · ${phase.replace(/_/g, ' ')}` : ''}
            </p>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handleReset}
              className="rounded-md p-2 text-[#787774] hover:bg-[#f6f5f4] hover:text-[#191919]"
              title="Reset chat"
            >
              <RotateCcw size={16} />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-md p-2 text-[#787774] hover:bg-[#f6f5f4] hover:text-[#191919]"
              aria-label="Close"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 space-y-3 overflow-y-auto px-5 py-4">
          {messages.map((m) => (
            <div
              key={`${m.at}-${m.role}-${m.content.slice(0, 16)}`}
              className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[92%] whitespace-pre-wrap rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                  m.role === 'user'
                    ? 'bg-[#191919] text-white'
                    : 'bg-[#f3f2f0] text-[#37352f]'
                }`}
              >
                {m.content}
              </div>
            </div>
          ))}

          {proposal?.length > 0 && (
            <div className="rounded-2xl border border-[#ebeae8] bg-[#fafafa] p-3">
              <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-[#787774]">
                <Sparkles size={12} /> Proposed date sheet
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="text-[#787774]">
                    <tr>
                      <th className="py-1 pr-2 font-medium">Course</th>
                      <th className="py-1 pr-2 font-medium">Diff</th>
                      <th className="py-1 pr-2 font-medium">Date</th>
                      <th className="py-1 font-medium">Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {proposal.map((r) => (
                      <tr key={r.courseId} className="border-t border-[#ebeae8]">
                        <td className="py-1.5 pr-2 font-medium text-[#191919]">
                          {r.courseCode || r.courseId}
                        </td>
                        <td className="py-1.5 pr-2 capitalize text-[#787774]">{r.difficulty || '—'}</td>
                        <td className="py-1.5 pr-2 text-[#37352f]">{(r.date || '').slice(0, 10)}</td>
                        <td className="py-1.5 text-[#37352f]">
                          {r.startTime}
                          {r.endTime ? `–${r.endTime}` : ''}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => send({ action: 'accept', message: '' })}
                  className="inline-flex items-center gap-1 rounded-full bg-[#191919] px-3.5 py-1.5 text-xs font-medium text-white hover:bg-black disabled:opacity-50"
                >
                  <Check size={13} /> Accept
                </button>
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => send({ action: 'reject', message: 'reject' })}
                  className="inline-flex items-center gap-1 rounded-full border border-[#ebeae8] bg-white px-3.5 py-1.5 text-xs font-medium text-[#37352f] hover:bg-[#f6f5f4] disabled:opacity-50"
                >
                  <X size={13} /> Reject
                </button>
              </div>
            </div>
          )}

          {loading && (
            <div className="flex items-center gap-2 text-xs text-[#787774]">
              <Loader2 size={14} className="animate-spin" /> Thinking…
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Composer */}
        <div className="border-t border-[#ebeae8] bg-white px-4 py-3">
          <div className="relative mb-2">
            <button
              type="button"
              onClick={() => setPrefsOpen((v) => !v)}
              className="inline-flex items-center gap-1.5 rounded-full border border-[#ebeae8] bg-[#f6f5f4] px-3 py-1.5 text-xs font-medium text-[#37352f] hover:bg-[#efeeeb]"
            >
              <MessageCircle size={13} />
              {prefLabel}
              <ChevronDown size={13} className={`transition ${prefsOpen ? 'rotate-180' : ''}`} />
            </button>

            {prefsOpen && (
              <div className="absolute bottom-full left-0 z-10 mb-2 w-64 rounded-xl border border-[#ebeae8] bg-white p-2 shadow-lg">
                {PREF_CHIPS.map((c) => {
                  const on = prefs.includes(c.id);
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => togglePref(c.id)}
                      className={`flex w-full items-center rounded-lg px-2.5 py-2 text-left text-xs ${
                        on ? 'bg-[#191919] text-white' : 'text-[#37352f] hover:bg-[#f6f5f4]'
                      }`}
                    >
                      {c.label}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <form
            className="relative"
            onSubmit={(e) => {
              e.preventDefault();
              send({ message: input });
            }}
          >
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Morning, hardest first, fewer visits…"
              className="w-full rounded-2xl border border-transparent bg-[#f3f2f0] py-3 pl-4 pr-24 text-sm text-[#191919] outline-none placeholder:text-[#9b9a97] focus:border-[#d3d1cb] focus:bg-white"
              disabled={loading}
            />
            <button
              type="submit"
              disabled={loading}
              className="absolute right-1.5 top-1/2 inline-flex -translate-y-1/2 items-center gap-1 rounded-full bg-[#191919] px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-black disabled:opacity-50"
            >
              Send <ArrowRight size={13} />
            </button>
          </form>
        </div>
      </aside>
    </div>
  );
};

export default AgentPanel;
