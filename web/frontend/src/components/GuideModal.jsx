import { createContext, useCallback, useContext, useEffect, useState } from 'react';

/**
 * GuideModal — speech-bubble notification system (ported from no-cap).
 *
 * Usage:
 *   import { useGuide, useWarn } from '../components/GuideModal';
 *
 *   const { say } = useGuide();
 *   say({ title: 'Welcome!', body: 'Your account is ready.', action: 'Let\'s go' });
 *
 *   const warn = useWarn();
 *   warn('That email is already taken.');
 */

const GuideContext = createContext(null);

export function useGuide() {
  const value = useContext(GuideContext);
  if (!value) throw new Error('useGuide must be used inside GuideProvider');
  return value;
}

export function useWarn() {
  const { say } = useGuide();
  return useCallback(
    (body) => {
      say({ title: 'Check that again', body, action: 'Got it', isError: true });
    },
    [say],
  );
}

// Pre-arm a note to show after navigation
let _pendingNote = null;

export function armGuideNote(note) {
  _pendingNote = note;
}

function GuideDialog({ note, onClose }) {
  // Close on Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[999] overflow-hidden bg-[#37352f]/10 backdrop-blur-[1px]">
      <div className="absolute right-5 top-1/2 w-[min(30rem,calc(100%-2.5rem))] -translate-y-1/2 sm:right-8">
        <div
          role="dialog"
          aria-modal="true"
          className="guide-slide flex items-end gap-3"
        >
          {/* Avatar */}
          <img
            src="/notion/pile-2.webp"
            alt=""
            className="h-[68px] w-[68px] shrink-0 rounded-full bg-white object-cover shadow-notion-lg select-none"
          />

          {/* Speech bubble */}
          <div className="relative rounded-[10px] border border-notion-border bg-white px-5 py-4 shadow-notion-lg">
            {/* Tail pointing left toward the avatar */}
            <span className="absolute -left-1.5 bottom-7 h-3 w-3 rotate-45 border-b border-l border-notion-border bg-white" />

            {/* Header row */}
            <div className="flex items-start justify-between gap-4">
              <h2 className="text-base font-semibold tracking-tight text-notion-text">
                {note.title}
              </h2>
              {note.kicker && (
                <span
                  className={`shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.1em] ${
                    note.isError
                      ? 'bg-notion-red-soft text-notion-red'
                      : 'border border-[#d3d1cb] text-notion-muted'
                  }`}
                >
                  {note.kicker}
                </span>
              )}
            </div>

            {/* Body */}
            <p className="mt-2 text-sm leading-relaxed text-notion-muted">
              {note.body}
            </p>

            {/* Hint */}
            {note.hint && (
              <p className="mt-3 text-sm font-medium text-notion-text">
                {note.hint}
              </p>
            )}

            {/* CTA */}
            <button type="button" className="n-btn mt-4" onClick={onClose}>
              {note.action ?? 'Got it'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function GuideProvider({ children }) {
  const [queue, setQueue] = useState([]);
  const current = queue[0] ?? null;

  const say = useCallback((note) => {
    setQueue((items) => [...items, note]);
  }, []);

  const close = useCallback(() => {
    setQueue((items) => items.slice(1));
  }, []);

  // Flush any pre-armed note
  useEffect(() => {
    if (_pendingNote) {
      say(_pendingNote);
      _pendingNote = null;
    }
  }, [say]);

  return (
    <GuideContext.Provider value={{ say }}>
      {children}
      {current ? <GuideDialog note={current} onClose={close} /> : null}
    </GuideContext.Provider>
  );
}
