import { useState, useEffect, useCallback } from 'react';
import AdminNavbar from '../../components/AdminNavbar';
import Pagination from '../../components/Pagination';
import { adminAPI } from '../../utils/api';
import { useGuide, useWarn } from '../../components/GuideModal';
import { Loader2, CheckCircle, XCircle, X } from 'lucide-react';

const statusColors = {
  PENDING: 'bg-notion-yellow-soft text-notion-yellow',
  APPROVED: 'bg-notion-green-soft text-notion-green',
  REJECTED: 'bg-notion-red-soft text-notion-red',
};

const AdminRequests = () => {
  const { say } = useGuide();
  const warn = useWarn();
  const [requests, setRequests] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [actionModal, setActionModal] = useState(null); // { request, action: 'APPROVED'|'REJECTED' }
  const [remark, setRemark] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: 10 };
      if (statusFilter) params.status = statusFilter;
      if (typeFilter) params.type = typeFilter;
      const { data } = await adminAPI.getRequests(params);
      setRequests(data.requests || data.data || []);
      setTotalPages(data.totalPages || 1);
    } catch {
      warn('Failed to load requests');
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, typeFilter]);

  useEffect(() => { load(); }, [load]);

  const openAction = (request, action) => {
    setActionModal({ request, action });
    setRemark('');
  };

  const handleAction = async () => {
    if (!actionModal) return;
    setSubmitting(true);
    try {
      await adminAPI.handleRequest(actionModal.request._id, {
        status: actionModal.action,
        remark,
      });
      say({ title: 'Done', body: `Request ${actionModal.action.toLowerCase()}`, action: 'OK' });
      setActionModal(null);
      load();
    } catch (err) {
      warn(err.response?.data?.message || 'Failed to process request');
    } finally {
      setSubmitting(false);
    }
  };

  const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-PK', { year: 'numeric', month: 'short', day: 'numeric' }) : '—';

  return (
    <div className="n-page">
      <AdminNavbar />
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <h1 className="mb-6 text-2xl font-bold tracking-tight">Student Requests</h1>

        <div className="mb-4 flex flex-wrap gap-3">
          <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} className="n-input max-w-[160px]">
            <option value="">All Status</option>
            <option value="PENDING">Pending</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
          </select>
          <select value={typeFilter} onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }} className="n-input max-w-[200px]">
            <option value="">All Types</option>
            <option value="CHANGE_BRANCH">Change Branch</option>
            <option value="CHANGE_DATESHEET">Change DateSheet</option>
          </select>
        </div>

        {loading ? (
          <div className="flex justify-center py-20"><Loader2 size={24} className="animate-spin text-notion-muted" /></div>
        ) : requests.length === 0 ? (
          <div className="n-card p-12 text-center text-sm text-notion-muted">No requests found</div>
        ) : (
          <>
            <div className="hidden md:block n-card overflow-hidden">
              <table className="w-full">
                <thead><tr className="bg-notion-surface">
                  <th className="n-th">Student</th><th className="n-th">Reg No</th><th className="n-th">Type</th>
                  <th className="n-th">Reason</th><th className="n-th">Date</th><th className="n-th">Status</th>
                  <th className="n-th text-right">Actions</th>
                </tr></thead>
                <tbody>
                  {requests.map((r) => (
                    <tr key={r._id} className="hover:bg-notion-surface/50 transition-colors">
                      <td className="n-td font-medium">{r.student?.fullName || '—'}</td>
                      <td className="n-td">{r.student?.registrationNumber || '—'}</td>
                      <td className="n-td"><span className="n-tag bg-notion-surface text-notion-text">{r.type?.replace('_', ' ')}</span></td>
                      <td className="n-td max-w-[200px] truncate">{r.reason}</td>
                      <td className="n-td">{fmtDate(r.createdAt)}</td>
                      <td className="n-td"><span className={`n-tag ${statusColors[r.status] || ''}`}>{r.status}</span></td>
                      <td className="n-td text-right">
                        {r.status === 'PENDING' && (
                          <div className="flex justify-end gap-1">
                            <button onClick={() => openAction(r, 'APPROVED')} className="n-btn-ghost p-1.5 text-notion-green" title="Approve"><CheckCircle size={16} /></button>
                            <button onClick={() => openAction(r, 'REJECTED')} className="n-btn-ghost p-1.5 text-notion-red" title="Reject"><XCircle size={16} /></button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex flex-col gap-3 md:hidden">
              {requests.map((r) => (
                <div key={r._id} className="n-card p-4">
                  <div className="mb-1 flex items-center justify-between">
                    <span className="font-semibold text-sm">{r.student?.fullName}</span>
                    <span className={`n-tag ${statusColors[r.status] || ''}`}>{r.status}</span>
                  </div>
                  <p className="text-xs text-notion-muted">{r.student?.registrationNumber} · {r.type?.replace('_', ' ')}</p>
                  <p className="mt-1 text-sm">{r.reason}</p>
                  <p className="text-xs text-notion-muted mt-1">{fmtDate(r.createdAt)}</p>
                  {r.status === 'PENDING' && (
                    <div className="mt-3 flex gap-2">
                      <button onClick={() => openAction(r, 'APPROVED')} className="n-btn py-1 px-3 text-xs bg-notion-green hover:bg-notion-green/90"><CheckCircle size={12} /> Approve</button>
                      <button onClick={() => openAction(r, 'REJECTED')} className="n-btn-danger py-1 px-3 text-xs"><XCircle size={12} /> Reject</button>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
          </>
        )}
      </div>

      {/* Action Modal */}
      {actionModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setActionModal(null)} />
          <div className="relative mx-4 w-full max-w-md animate-in fade-in slide-in-from-bottom-2 rounded-notion-lg bg-white p-6 shadow-notion-lg">
            <button onClick={() => setActionModal(null)} className="absolute right-4 top-4 text-notion-muted hover:text-notion-text"><X size={18} /></button>
            <h2 className="mb-2 text-lg font-semibold">
              {actionModal.action === 'APPROVED' ? 'Approve' : 'Reject'} Request
            </h2>
            <p className="mb-4 text-sm text-notion-muted">
              {actionModal.action === 'APPROVED'
                ? 'This will approve the student\'s request.'
                : 'This will reject the student\'s request.'}
            </p>
            <div className="mb-4">
              <label className="n-label">Remark (optional)</label>
              <textarea
                value={remark}
                onChange={(e) => setRemark(e.target.value)}
                rows={3}
                className="n-input resize-none"
                placeholder="Add a note for the student…"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setActionModal(null)} className="n-btn-secondary">Cancel</button>
              <button onClick={handleAction} disabled={submitting} className={actionModal.action === 'APPROVED' ? 'n-btn' : 'n-btn-danger'}>
                {submitting ? <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" /> : actionModal.action === 'APPROVED' ? 'Approve' : 'Reject'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminRequests;
