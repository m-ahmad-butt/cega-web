import { useState, useEffect, useCallback } from 'react';
import AdminNavbar from '../../components/AdminNavbar';
import Pagination from '../../components/Pagination';
import ConfirmModal from '../../components/ConfirmModal';
import { adminAPI } from '../../utils/api';
import { useGuide, useWarn } from '../../components/GuideModal';
import { Plus, Pencil, Trash2, X, Loader2, Filter } from 'lucide-react';

const empty = { courseId: '', date: '', startTime: '', endTime: '', capacity: 30 };

const AdminSlots = () => {
  const { say } = useGuide();
  const warn = useWarn();
  const [slots, setSlots] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [courses, setCourses] = useState([]);
  const [filterCourse, setFilterCourse] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(empty);
  const [editId, setEditId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const { data } = await adminAPI.getCourses({ limit: 200 });
        setCourses(data.courses || data.data || []);
      } catch { /* ignore */ }
    };
    fetchCourses();
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: 10 };
      if (filterCourse) params.courseId = filterCourse;
      const { data } = await adminAPI.getSlots(params);
      setSlots(data.slots || data.data || []);
      setTotalPages(data.totalPages || 1);
    } catch {
      warn('Failed to load slots');
    } finally {
      setLoading(false);
    }
  }, [page, filterCourse]);

  useEffect(() => { load(); }, [load]);

  const openAdd = () => { setForm(empty); setEditId(null); setModalOpen(true); };
  const openEdit = (s) => {
    setForm({
      courseId: s.course?._id || s.courseId || '',
      date: s.date ? s.date.slice(0, 10) : '',
      startTime: s.startTime || '',
      endTime: s.endTime || '',
      capacity: s.capacity || 30,
    });
    setEditId(s._id);
    setModalOpen(true);
  };
  const closeModal = () => { setModalOpen(false); setForm(empty); setEditId(null); };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.courseId || !form.date || !form.startTime || !form.endTime) return warn('All fields are required');
    setSaving(true);
    try {
      if (editId) {
        await adminAPI.updateSlot(editId, form);
        say({ title: 'Done', body: 'Slot updated', action: 'OK' });
      } else {
        await adminAPI.createSlot(form);
        say({ title: 'Done', body: 'Slot created', action: 'OK' });
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
    if ((deleteTarget?.booked || 0) > 0) return warn('Cannot delete a slot that has bookings');
    try {
      await adminAPI.deleteSlot(deleteTarget._id);
      say({ title: 'Done', body: 'Slot deleted', action: 'OK' });
      setDeleteTarget(null);
      load();
    } catch (err) {
      warn(err.response?.data?.message || 'Failed to delete');
    }
  };

  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-PK', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' }) : '—';

  return (
    <div className="n-page">
      <AdminNavbar />
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-2xl font-bold tracking-tight">Exam Slots</h1>
          <button onClick={openAdd} className="n-btn"><Plus size={16} /> Add Slot</button>
        </div>

        <div className="mb-4 flex items-center gap-2 max-w-sm">
          <Filter size={16} className="text-notion-muted" />
          <select value={filterCourse} onChange={(e) => { setFilterCourse(e.target.value); setPage(1); }} className="n-input">
            <option value="">All Courses</option>
            {courses.map((c) => <option key={c._id} value={c._id}>{c.courseCode} — {c.title}</option>)}
          </select>
        </div>

        {loading ? (
          <div className="flex justify-center py-20"><Loader2 size={24} className="animate-spin text-notion-muted" /></div>
        ) : slots.length === 0 ? (
          <div className="n-card p-12 text-center text-sm text-notion-muted">No exam slots found</div>
        ) : (
          <>
            <div className="hidden md:block n-card overflow-hidden">
              <table className="w-full">
                <thead><tr className="bg-notion-surface">
                  <th className="n-th">Course</th><th className="n-th">Date</th><th className="n-th">Start</th>
                  <th className="n-th">End</th><th className="n-th">Capacity</th><th className="n-th">Booked</th>
                  <th className="n-th text-right">Actions</th>
                </tr></thead>
                <tbody>
                  {slots.map((s) => (
                    <tr key={s._id} className="hover:bg-notion-surface/50 transition-colors">
                      <td className="n-td font-medium">{s.course?.courseCode || '—'} <span className="text-notion-muted font-normal">— {s.course?.title}</span></td>
                      <td className="n-td">{fmtDate(s.date)}</td>
                      <td className="n-td">{s.startTime}</td>
                      <td className="n-td">{s.endTime}</td>
                      <td className="n-td">{s.capacity}</td>
                      <td className="n-td">{s.booked || 0}</td>
                      <td className="n-td text-right">
                        <button onClick={() => openEdit(s)} className="n-btn-ghost p-1.5"><Pencil size={14} /></button>
                        <button onClick={() => setDeleteTarget(s)} className="n-btn-ghost p-1.5 text-notion-red" disabled={(s.booked || 0) > 0}><Trash2 size={14} /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex flex-col gap-3 md:hidden">
              {slots.map((s) => (
                <div key={s._id} className="n-card p-4">
                  <div className="mb-1 font-semibold text-sm">{s.course?.courseCode} — {s.course?.title}</div>
                  <p className="text-xs text-notion-muted">{fmtDate(s.date)} · {s.startTime} – {s.endTime}</p>
                  <p className="text-xs text-notion-muted">Capacity: {s.capacity} · Booked: {s.booked || 0}</p>
                  <div className="mt-3 flex gap-2">
                    <button onClick={() => openEdit(s)} className="n-btn-secondary py-1 px-2 text-xs"><Pencil size={12} /> Edit</button>
                    <button onClick={() => setDeleteTarget(s)} className="n-btn-danger py-1 px-2 text-xs" disabled={(s.booked || 0) > 0}><Trash2 size={12} /> Delete</button>
                  </div>
                </div>
              ))}
            </div>

            <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
          </>
        )}
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={closeModal} />
          <div className="relative mx-4 w-full max-w-lg animate-in fade-in slide-in-from-bottom-2 rounded-notion-lg bg-white p-6 shadow-notion-lg">
            <button onClick={closeModal} className="absolute right-4 top-4 text-notion-muted hover:text-notion-text"><X size={18} /></button>
            <h2 className="mb-4 text-lg font-semibold">{editId ? 'Edit Slot' : 'Add Slot'}</h2>
            <form onSubmit={handleSave} className="space-y-3">
              <div>
                <label className="n-label">Course *</label>
                <select value={form.courseId} onChange={(e) => set('courseId', e.target.value)} className="n-input">
                  <option value="">Select course…</option>
                  {courses.map((c) => <option key={c._id} value={c._id}>{c.courseCode} — {c.title}</option>)}
                </select>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <div><label className="n-label">Date *</label><input type="date" value={form.date} onChange={(e) => set('date', e.target.value)} className="n-input" /></div>
                <div><label className="n-label">Start Time *</label><input type="time" value={form.startTime} onChange={(e) => set('startTime', e.target.value)} className="n-input" /></div>
                <div><label className="n-label">End Time *</label><input type="time" value={form.endTime} onChange={(e) => set('endTime', e.target.value)} className="n-input" /></div>
              </div>
              <div><label className="n-label">Capacity</label><input type="number" min="1" value={form.capacity} onChange={(e) => set('capacity', Number(e.target.value))} className="n-input" /></div>
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

      <ConfirmModal isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={handleDelete} title="Delete Slot" message="Are you sure you want to delete this exam slot?" confirmText="Delete" danger />
    </div>
  );
};

export default AdminSlots;
