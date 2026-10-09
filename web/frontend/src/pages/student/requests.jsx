import { useState, useEffect } from 'react';
import StudentNavbar from '../../components/StudentNavbar';
import { studentAPI, unwrap } from '../../utils/api';
import { useGuide, useWarn } from '../../components/GuideModal';
import { Loader2, X, GitBranch, CalendarDays } from 'lucide-react';

const statusColors = {
  PENDING: 'bg-notion-yellow-soft text-notion-yellow',
  APPROVED: 'bg-notion-green-soft text-notion-green',
  REJECTED: 'bg-notion-red-soft text-notion-red',
};

const StudentRequests = () => {
  const { say } = useGuide();
  const warn = useWarn();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    try {
      const { data } = await studentAPI.getMyRequests();
      const list = unwrap(data);
      setRequests(Array.isArray(list) ? list : []);
    } catch {
      warn('Failed to load requests');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const hasPending = (type) =>
    Array.isArray(requests) && requests.some((r) => r.type === type && r.status === 'PENDING');

  const openModal = (type) => {
    setModalType(type);
    setReason('');
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    if (!reason.trim()) return warn('Please provide a reason');
    setSubmitting(true);
    try {
      await studentAPI.createRequest({ type: modalType, reason: reason.trim() });
      say({ title: 'Request Submitted', body: 'Your request has been submitted for review.', action: 'OK' });
      setModalOpen(false);
      setLoading(true);
      load();
    } catch (err) {
      warn(err.response?.data?.message || 'Failed to submit request');
    } finally {
      setSubmitting(false);
    }
  };

  const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-PK', { year: 'numeric', month: 'short', day: 'numeric' }) : '—';

  return (
    <div className="n-page">
      <StudentNavbar />
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <h1 className="mb-2 text-2xl font-bold tracking-tight">Need Help</h1>
        <p className="mb-6 text-sm text-notion-muted">Submit a request if you need to change your branch or date sheet.</p>

        <div className="mb-8 flex flex-wrap gap-3">
          <button
            onClick={() => openModal('CHANGE_BRANCH')}
            disabled={hasPending('CHANGE_BRANCH')}
            className="n-btn-secondary"
          >
            <GitBranch size={16} /> Request Branch Change
          </button>
          <button
            onClick={() => openModal('CHANGE_DATESHEET')}
            disabled={hasPending('CHANGE_DATESHEET')}
            className="n-btn-secondary"
          >
            <CalendarDays size={16} /> Request Date Sheet Change
          </button>
        </div>

        {hasPending('CHANGE_BRANCH') && (
          <p className="mb-2 text-xs text-notion-yellow">You already have a pending branch change request.</p>
        )}
        {hasPending('CHANGE_DATESHEET') && (
          <p className="mb-4 text-xs text-notion-yellow">You already have a pending date sheet change request.</p>
        )}

        <h2 className="mb-3 text-lg font-semibold">Your Requests</h2>

        {loading ? (
          <div className="flex justify-center py-12"><Loader2 size={24} className="animate-spin text-notion-muted" /></div>
        ) : !Array.isArray(requests) || requests.length === 0 ? (
          <div className="n-card p-12 text-center text-sm text-notion-muted">No requests yet</div>
        ) : (
          <div className="space-y-3">
            {requests.map((r) => (
              <div key={r.id || r._id} className="n-card p-4">
                <div className="mb-1 flex items-center justify-between">
                  <span className="n-tag bg-notion-surface text-notion-text">{r.type?.replace('_', ' ')}</span>
                  <span className={`n-tag ${statusColors[r.status] || ''}`}>{r.status}</span>
                </div>
                <p className="mt-2 text-sm">{r.reason}</p>
                {r.remark && (
                  <div className="mt-2 rounded-notion bg-notion-surface p-2 text-xs text-notion-muted">
                    <strong>Admin remark:</strong> {r.remark}
                  </div>
                )}
                <p className="mt-2 text-xs text-notion-muted">{fmtDate(r.createdAt)}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Request Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setModalOpen(false)} />
          <div className="relative mx-4 w-full max-w-md animate-in fade-in slide-in-from-bottom-2 rounded-notion-lg bg-white p-6 shadow-notion-lg">
            <button onClick={() => setModalOpen(false)} className="absolute right-4 top-4 text-notion-muted hover:text-notion-text"><X size={18} /></button>
            <h2 className="mb-2 text-lg font-semibold">
              {modalType === 'CHANGE_BRANCH' ? 'Request Branch Change' : 'Request Date Sheet Change'}
            </h2>
            <p className="mb-4 text-sm text-notion-muted">
              Please explain why you need this change. An admin will review your request.
            </p>
            <div className="mb-4">
              <label className="n-label">Reason *</label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={4}
                className="n-input resize-none"
                placeholder="Describe your reason…"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setModalOpen(false)} className="n-btn-secondary">Cancel</button>
              <button onClick={handleSubmit} disabled={submitting || !reason.trim()} className="n-btn">
                {submitting ? <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" /> : 'Submit Request'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentRequests;
