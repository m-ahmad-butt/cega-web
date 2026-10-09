import { useState, useEffect, useCallback } from 'react';
import AdminNavbar from '../../components/AdminNavbar';
import Pagination from '../../components/Pagination';
import ConfirmModal from '../../components/ConfirmModal';
import { adminAPI } from '../../utils/api';
import { useGuide, useWarn } from '../../components/GuideModal';
import { Plus, Pencil, Trash2, Search, X, Loader2, Upload } from 'lucide-react';
import ImportSheet from '../../components/ImportSheet';

const empty = { name: '', code: '', city: '', address: '', contactNumber: '', status: 'ACTIVE' };

const AdminBranches = () => {
  const { say } = useGuide();
  const warn = useWarn();
  const [branches, setBranches] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(empty);
  const [editId, setEditId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [importOpen, setImportOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await adminAPI.getBranches({ page, search, limit: 10 });
      setBranches(data.branches || data.data || []);
      setTotalPages(data.totalPages || 1);
    } catch {
      warn('Failed to load branches');
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => { load(); }, [load]);

  const openAdd = () => { setForm(empty); setEditId(null); setModalOpen(true); };
  const openEdit = (b) => { setForm({ name: b.name, code: b.code, city: b.city || '', address: b.address || '', contactNumber: b.contactNumber || '', status: b.status || 'ACTIVE' }); setEditId(b.id || b._id); setModalOpen(true); };
  const closeModal = () => { setModalOpen(false); setForm(empty); setEditId(null); };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.name || !form.code) return warn('Name and code are required');
    setSaving(true);
    try {
      if (editId) {
        await adminAPI.updateBranch(editId, form);
        say({ title: 'Done', body: 'Branch updated', action: 'OK' });
      } else {
        await adminAPI.createBranch(form);
        say({ title: 'Done', body: 'Branch created', action: 'OK' });
      }
      closeModal();
      load();
    } catch (err) {
      warn(err.response?.data?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      await adminAPI.deleteBranch(deleteTarget.id || deleteTarget._id);
      say({ title: 'Done', body: 'Branch deleted', action: 'OK' });
      setDeleteTarget(null);
      load();
    } catch (err) {
      warn(err.response?.data?.message || 'Failed to delete');
    }
  };

  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  return (
    <div className="n-page">
      <AdminNavbar />
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-2xl font-bold tracking-tight">Branches</h1>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => setImportOpen(true)} className="n-btn-secondary"><Upload size={16} /> Upload</button>
            <button onClick={openAdd} className="n-btn"><Plus size={16} /> Add Branch</button>
          </div>
        </div>

        <div className="relative mb-4 max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-notion-muted" />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search branches…"
            className="n-input pl-9"
          />
        </div>

        {loading ? (
          <div className="flex justify-center py-20"><Loader2 size={24} className="animate-spin text-notion-muted" /></div>
        ) : branches.length === 0 ? (
          <div className="n-card p-12 text-center text-sm text-notion-muted">No branches found</div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block n-card overflow-hidden">
              <table className="w-full">
                <thead><tr className="bg-notion-surface">
                  <th className="n-th">Name</th><th className="n-th">Code</th><th className="n-th">City</th>
                  <th className="n-th">Contact</th><th className="n-th">Status</th><th className="n-th text-right">Actions</th>
                </tr></thead>
                <tbody>
                  {branches.map((b) => (
                    <tr key={b.id || b._id} className="hover:bg-notion-surface/50 transition-colors">
                      <td className="n-td font-medium">{b.name}</td>
                      <td className="n-td">{b.code}</td>
                      <td className="n-td">{b.city}</td>
                      <td className="n-td">{b.contactNumber}</td>
                      <td className="n-td">
                        <span className={`n-tag ${b.status === 'ACTIVE' ? 'bg-notion-green-soft text-notion-green' : 'bg-notion-red-soft text-notion-red'}`}>
                          {b.status}
                        </span>
                      </td>
                      <td className="n-td text-right">
                        <button onClick={() => openEdit(b)} className="n-btn-ghost p-1.5"><Pencil size={14} /></button>
                        <button onClick={() => setDeleteTarget(b)} className="n-btn-ghost p-1.5 text-notion-red"><Trash2 size={14} /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="flex flex-col gap-3 md:hidden">
              {branches.map((b) => (
                <div key={b.id || b._id} className="n-card p-4">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="font-semibold">{b.name}</span>
                    <span className={`n-tag ${b.status === 'ACTIVE' ? 'bg-notion-green-soft text-notion-green' : 'bg-notion-red-soft text-notion-red'}`}>{b.status}</span>
                  </div>
                  <p className="text-xs text-notion-muted">Code: {b.code} · City: {b.city}</p>
                  <p className="text-xs text-notion-muted">Contact: {b.contactNumber}</p>
                  <div className="mt-3 flex gap-2">
                    <button onClick={() => openEdit(b)} className="n-btn-secondary py-1 px-2 text-xs"><Pencil size={12} /> Edit</button>
                    <button onClick={() => setDeleteTarget(b)} className="n-btn-danger py-1 px-2 text-xs"><Trash2 size={12} /> Delete</button>
                  </div>
                </div>
              ))}
            </div>

            <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
          </>
        )}
      </div>

      {/* Add/Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={closeModal} />
          <div className="relative mx-4 w-full max-w-lg animate-in fade-in slide-in-from-bottom-2 rounded-notion-lg bg-white p-6 shadow-notion-lg">
            <button onClick={closeModal} className="absolute right-4 top-4 text-notion-muted hover:text-notion-text"><X size={18} /></button>
            <h2 className="mb-4 text-lg font-semibold">{editId ? 'Edit Branch' : 'Add Branch'}</h2>
            <form onSubmit={handleSave} className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <div><label className="n-label">Name *</label><input value={form.name} onChange={(e) => set('name', e.target.value)} className="n-input" /></div>
                <div><label className="n-label">Code *</label><input value={form.code} onChange={(e) => set('code', e.target.value)} className="n-input" /></div>
                <div><label className="n-label">City</label><input value={form.city} onChange={(e) => set('city', e.target.value)} className="n-input" /></div>
                <div><label className="n-label">Contact Number</label><input value={form.contactNumber} onChange={(e) => set('contactNumber', e.target.value)} className="n-input" /></div>
              </div>
              <div><label className="n-label">Address</label><input value={form.address} onChange={(e) => set('address', e.target.value)} className="n-input" /></div>
              <div>
                <label className="n-label">Status</label>
                <select value={form.status} onChange={(e) => set('status', e.target.value)} className="n-input">
                  <option value="ACTIVE">Active</option><option value="INACTIVE">Inactive</option>
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={closeModal} className="n-btn-secondary">Cancel</button>
                <button type="submit" disabled={saving} className="n-btn">
                  {saving ? <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" /> : editId ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete Branch"
        message={`Are you sure you want to delete "${deleteTarget?.name}"? This cannot be undone.`}
        confirmText="Delete"
        danger
      />
      {importOpen && (
        <ImportSheet
          kind="branches"
          onClose={() => setImportOpen(false)}
          onDone={(result) => {
            setImportOpen(false);
            say({ title: 'Import finished', body: `Saved ${result.created || 0}. Skipped ${result.skipped || 0}.`, action: 'OK' });
            load();
          }}
        />
      )}
    </div>
  );
};

export default AdminBranches;
