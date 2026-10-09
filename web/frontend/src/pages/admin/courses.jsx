import { useState, useEffect, useCallback } from 'react';
import AdminNavbar from '../../components/AdminNavbar';
import Pagination from '../../components/Pagination';
import ConfirmModal from '../../components/ConfirmModal';
import { adminAPI } from '../../utils/api';
import { useGuide, useWarn } from '../../components/GuideModal';
import { Plus, Pencil, Trash2, Search, X, Loader2, Upload } from 'lucide-react';
import ImportSheet from '../../components/ImportSheet';

const DEPARTMENTS = [
  'Computer Science',
  'Software Engineering',
  'Artificial Intelligence',
  'Data Science',
  'Business Administration',
  'Mathematics',
  'Electrical Engineering',
];

const empty = { courseCode: '', title: '', creditHours: 3, department: 'Computer Science', difficulty: 'medium', status: 'active' };
const isActive = (value) => String(value || '').toLowerCase() !== 'inactive';
const statusLabel = (value) => (isActive(value) ? 'Active' : 'Inactive');
const levelLabel = (value) => (value === 'easy' ? 'Easy' : value === 'hard' ? 'Hard' : 'Medium');

const AdminCourses = () => {
  const { say } = useGuide();
  const warn = useWarn();
  const [courses, setCourses] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [department, setDepartment] = useState('');
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
      const { data } = await adminAPI.getCourses({ page, pageSize: 10, search, department });
      setCourses(data.courses || data.data || []);
      setTotalPages(data.totalPages || 1);
    } catch {
      warn('Failed to load courses');
    } finally {
      setLoading(false);
    }
  }, [page, search, department]);

  useEffect(() => { load(); }, [load]);

  const openAdd = () => { setForm(empty); setEditId(null); setModalOpen(true); };
  const openEdit = (c) => {
    setForm({
      courseCode: c.courseCode,
      title: c.title,
      creditHours: c.creditHours || 3,
      department: c.department || 'Computer Science',
      difficulty: c.difficulty || 'medium',
      status: isActive(c.status) ? 'active' : 'inactive',
    });
    setEditId(c.id || c._id);
    setModalOpen(true);
  };
  const closeModal = () => { setModalOpen(false); setForm(empty); setEditId(null); };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.courseCode || !form.title) return warn('Course code and title are required');
    setSaving(true);
    try {
      if (editId) {
        await adminAPI.updateCourse(editId, form);
        say({ title: 'Done', body: 'Course updated', action: 'OK' });
      } else {
        await adminAPI.createCourse(form);
        say({ title: 'Done', body: 'Course created', action: 'OK' });
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
      await adminAPI.deleteCourse(deleteTarget.id || deleteTarget._id);
      say({ title: 'Done', body: 'Course deleted', action: 'OK' });
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
          <h1 className="text-2xl font-bold tracking-tight">Courses</h1>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => setImportOpen(true)} className="n-btn-secondary"><Upload size={16} /> Upload</button>
            <button onClick={openAdd} className="n-btn"><Plus size={16} /> Add Course</button>
          </div>
        </div>

        <div className="mb-4 flex flex-col gap-2 sm:flex-row">
          <div className="relative max-w-sm flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-notion-muted" />
            <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Search courses" className="n-input pl-9" />
          </div>
          <select
            value={department}
            onChange={(e) => { setDepartment(e.target.value); setPage(1); }}
            className="n-input sm:max-w-xs"
          >
            <option value="">All departments</option>
            {DEPARTMENTS.map((name) => <option key={name} value={name}>{name}</option>)}
          </select>
        </div>

        {loading ? (
          <div className="flex justify-center py-20"><Loader2 size={24} className="animate-spin text-notion-muted" /></div>
        ) : courses.length === 0 ? (
          <div className="n-card p-12 text-center text-sm text-notion-muted">No courses found</div>
        ) : (
          <>
            <div className="hidden md:block n-card overflow-hidden">
              <table className="w-full">
                <thead><tr className="bg-notion-surface">
                  <th className="n-th">Code</th><th className="n-th">Title</th><th className="n-th">Credit Hrs</th>
                  <th className="n-th">Department</th><th className="n-th">Level</th><th className="n-th">Status</th><th className="n-th text-right">Actions</th>
                </tr></thead>
                <tbody>
                  {courses.map((c) => (
                    <tr key={c.id || c._id} className="hover:bg-notion-surface/50 transition-colors">
                      <td className="n-td font-medium">{c.courseCode}</td>
                      <td className="n-td">{c.title}</td>
                      <td className="n-td">{c.creditHours}</td>
                      <td className="n-td">{c.department}</td>
                      <td className="n-td">{levelLabel(c.difficulty)}</td>
                      <td className="n-td">
                        <span className={`n-tag ${isActive(c.status) ? 'bg-notion-green-soft text-notion-green' : 'bg-notion-red-soft text-notion-red'}`}>{statusLabel(c.status)}</span>
                      </td>
                      <td className="n-td text-right">
                        <button onClick={() => openEdit(c)} className="n-btn-ghost p-1.5"><Pencil size={14} /></button>
                        <button onClick={() => setDeleteTarget(c)} className="n-btn-ghost p-1.5 text-notion-red"><Trash2 size={14} /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex flex-col gap-3 md:hidden">
              {courses.map((c) => (
                <div key={c.id || c._id} className="n-card p-4">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="font-semibold">{c.courseCode}</span>
                    <span className={`n-tag ${isActive(c.status) ? 'bg-notion-green-soft text-notion-green' : 'bg-notion-red-soft text-notion-red'}`}>{statusLabel(c.status)}</span>
                  </div>
                  <p className="text-sm">{c.title}</p>
                  <p className="text-xs text-notion-muted">{c.creditHours} credit hours, {c.department}, {levelLabel(c.difficulty)}</p>
                  <div className="mt-3 flex gap-2">
                    <button onClick={() => openEdit(c)} className="n-btn-secondary py-1 px-2 text-xs"><Pencil size={12} /> Edit</button>
                    <button onClick={() => setDeleteTarget(c)} className="n-btn-danger py-1 px-2 text-xs"><Trash2 size={12} /> Delete</button>
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
            <h2 className="mb-4 text-lg font-semibold">{editId ? 'Edit Course' : 'Add Course'}</h2>
            <form onSubmit={handleSave} className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <div><label className="n-label">Course Code *</label><input value={form.courseCode} onChange={(e) => set('courseCode', e.target.value)} className="n-input" /></div>
                <div><label className="n-label">Title *</label><input value={form.title} onChange={(e) => set('title', e.target.value)} className="n-input" /></div>
                <div><label className="n-label">Credit Hours</label><input type="number" min="1" max="6" value={form.creditHours} onChange={(e) => set('creditHours', Number(e.target.value))} className="n-input" /></div>
                <div>
                  <label className="n-label">Department</label>
                  <select value={form.department} onChange={(e) => set('department', e.target.value)} className="n-input">
                    {DEPARTMENTS.map((name) => <option key={name} value={name}>{name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="n-label">Level</label>
                  <select value={form.difficulty} onChange={(e) => set('difficulty', e.target.value)} className="n-input">
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="n-label">Status</label>
                <select value={form.status} onChange={(e) => set('status', e.target.value)} className="n-input">
                  <option value="active">Active</option><option value="inactive">Inactive</option>
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

      <ConfirmModal isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={handleDelete} title="Delete Course" message={`Delete "${deleteTarget?.title}"? This cannot be undone.`} confirmText="Delete" danger />
      {importOpen && (
        <ImportSheet
          kind="courses"
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

export default AdminCourses;
