import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import AdminNavbar from '../../components/AdminNavbar';
import Pagination from '../../components/Pagination';
import ConfirmModal from '../../components/ConfirmModal';
import { adminAPI } from '../../utils/api';
import { useGuide, useWarn } from '../../components/GuideModal';
import { Plus, Trash2, Search, X, Loader2, Eye, ScanLine, Upload, KeyRound } from 'lucide-react';
import ImportSheet from '../../components/ImportSheet';

const emptyPersonal = { fullName: '', email: '', phone: '', cnic: '', dob: '', gender: '', address: '' };
const emptyParent = { fatherName: '', parentCnic: '', parentOccupation: '', parentContact: '', emergencyContact: '' };
const emptyAcademic = { registrationNumber: '', program: '', semester: '', session: '', previousQualification: '', previousInstitute: '', previousMarks: '' };

const AdminStudents = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { say } = useGuide();
  const warn = useWarn();
  const [students, setStudents] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState(params.get('q') || '');
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [tab, setTab] = useState('personal');
  const [personal, setPersonal] = useState(emptyPersonal);
  const [parent, setParent] = useState(emptyParent);
  const [academic, setAcademic] = useState(emptyAcademic);
  const [saving, setSaving] = useState(false);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [importOpen, setImportOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await adminAPI.getStudents({ page, search, limit: 10 });
      setStudents(data.students || data.data || []);
      setTotalPages(data.totalPages || 1);
    } catch {
      warn('Failed to load students');
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => { load(); }, [load]);

  const openAdd = () => {
    setPersonal(emptyPersonal);
    setParent(emptyParent);
    setAcademic(emptyAcademic);
    setTab('personal');
    setModalOpen(true);
  };

  const closeModal = () => { setModalOpen(false); };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!personal.fullName || !personal.email) return warn('Name and email are required');
    if (!academic.registrationNumber) return warn('Registration number is required');
    setSaving(true);
    try {
      await adminAPI.createStudent({ ...personal, ...parent, ...academic });
      say({ title: 'Done', body: 'Student created', action: 'OK' });
      closeModal();
      load();
    } catch (err) {
      warn(err.response?.data?.message || 'Failed to create student');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async (student) => {
    try {
      const { data } = await adminAPI.resetStudentPassword(student.id || student._id);
      const password = data.data?.password;
      const emailed = data.data?.emailed;
      say({
        title: 'Password reset',
        body: emailed
          ? `Emailed to ${student.email}. New password: ${password}`
          : `Email failed. New password: ${password}`,
        action: 'OK',
      });
    } catch (err) {
      warn(err.response?.data?.message || 'Could not reset password');
    }
  };

  const handleDelete = async () => {
    try {
      await adminAPI.deleteStudent(deleteTarget.id || deleteTarget._id);
      say({ title: 'Done', body: 'Student deleted', action: 'OK' });
      setDeleteTarget(null);
      load();
    } catch (err) {
      warn(err.response?.data?.message || 'Failed to delete');
    }
  };

  const setP = (k, v) => setPersonal((p) => ({ ...p, [k]: v }));
  const setPr = (k, v) => setParent((p) => ({ ...p, [k]: v }));
  const setA = (k, v) => setAcademic((p) => ({ ...p, [k]: v }));

  const handleCnicUpload = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setOcrLoading(true);
    try {
      const form = new FormData();
      form.append('cnic', file);
      const { data } = await adminAPI.ocrCnic(form);
      const fields = data.data || data;
      setPersonal((p) => ({
        ...p,
        fullName: fields.fullName || p.fullName,
        cnic: fields.cnic || p.cnic,
        dob: fields.dob ? String(fields.dob).slice(0, 10) : p.dob,
        gender: fields.gender || p.gender,
        address: fields.address || p.address,
      }));
      setTab('personal');
      say({ title: 'Done', body: 'CNIC fields autofilled — review before saving', action: 'OK' });
    } catch (err) {
      warn(err.response?.data?.message || 'CNIC OCR failed');
    } finally {
      setOcrLoading(false);
    }
  };

  const tabs = [
    { id: 'personal', label: 'Personal' },
    { id: 'parent', label: 'Parent' },
    { id: 'academic', label: 'Academic' },
  ];

  return (
    <div className="n-page">
      <AdminNavbar />
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-2xl font-bold tracking-tight">Students</h1>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => setImportOpen(true)} className="n-btn-secondary"><Upload size={16} /> Upload</button>
            <button onClick={openAdd} className="n-btn"><Plus size={16} /> Add Student</button>
          </div>
        </div>

        <div className="relative mb-4 max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-notion-muted" />
          <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Search students…" className="n-input pl-9" />
        </div>

        {loading ? (
          <div className="flex justify-center py-20"><Loader2 size={24} className="animate-spin text-notion-muted" /></div>
        ) : students.length === 0 ? (
          <div className="n-card p-12 text-center text-sm text-notion-muted">No students found</div>
        ) : (
          <>
            <div className="hidden md:block n-card overflow-hidden">
              <table className="w-full">
                <thead><tr className="bg-notion-surface">
                  <th className="n-th">Reg No</th><th className="n-th">Name</th><th className="n-th">Email</th>
                  <th className="n-th">Program</th><th className="n-th">Semester</th><th className="n-th">Branch</th>
                  <th className="n-th">DateSheet</th><th className="n-th text-right">Actions</th>
                </tr></thead>
                <tbody>
                  {students.map((s) => (
                    <tr key={s.id || s._id} className="hover:bg-notion-surface/50 transition-colors cursor-pointer" onClick={() => navigate(`/admin/students/${s.id || s._id}`)}>
                      <td className="n-td font-medium">{s.registrationNumber}</td>
                      <td className="n-td">{s.fullName}</td>
                      <td className="n-td text-notion-muted">{s.email}</td>
                      <td className="n-td">{s.program}</td>
                      <td className="n-td">{s.semester}</td>
                      <td className="n-td">{s.branch?.name || '—'}</td>
                      <td className="n-td">
                        <span className={`n-tag ${s.dateSheetSaved ? 'bg-notion-green-soft text-notion-green' : 'bg-notion-yellow-soft text-notion-yellow'}`}>
                          {s.dateSheetSaved ? 'Saved' : 'Pending'}
                        </span>
                      </td>
                      <td className="n-td text-right" onClick={(e) => e.stopPropagation()}>
                        <button onClick={() => handleReset(s)} className="n-btn-ghost p-1.5" title="Reset password"><KeyRound size={14} /></button>
                        <button onClick={() => navigate(`/admin/students/${s.id || s._id}`)} className="n-btn-ghost p-1.5"><Eye size={14} /></button>
                        <button onClick={() => setDeleteTarget(s)} className="n-btn-ghost p-1.5 text-notion-red"><Trash2 size={14} /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex flex-col gap-3 md:hidden">
              {students.map((s) => (
                <div key={s.id || s._id} className="n-card p-4 cursor-pointer" onClick={() => navigate(`/admin/students/${s.id || s._id}`)}>
                  <div className="mb-1 flex items-center justify-between">
                    <span className="font-semibold">{s.fullName}</span>
                    <span className={`n-tag ${s.dateSheetSaved ? 'bg-notion-green-soft text-notion-green' : 'bg-notion-yellow-soft text-notion-yellow'}`}>
                      {s.dateSheetSaved ? 'Saved' : 'Pending'}
                    </span>
                  </div>
                  <p className="text-xs text-notion-muted">{s.registrationNumber} · {s.email}</p>
                  <p className="text-xs text-notion-muted">{s.program} · Sem {s.semester} · {s.branch?.name || 'No branch'}</p>
                  <div className="mt-3 flex gap-2" onClick={(e) => e.stopPropagation()}>
                    <button onClick={() => setDeleteTarget(s)} className="n-btn-danger py-1 px-2 text-xs"><Trash2 size={12} /> Delete</button>
                  </div>
                </div>
              ))}
            </div>

            <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
          </>
        )}
      </div>

      {/* Add Student Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={closeModal} />
          <div className="relative mx-4 w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-in fade-in slide-in-from-bottom-2 rounded-notion-lg bg-white p-6 shadow-notion-lg">
            <button onClick={closeModal} className="absolute right-4 top-4 text-notion-muted hover:text-notion-text"><X size={18} /></button>
            <h2 className="mb-4 text-lg font-semibold">Add Student</h2>

            <div className="mb-4 flex gap-1 rounded-notion bg-notion-surface p-1">
              {tabs.map((t) => (
                <button key={t.id} onClick={() => setTab(t.id)}
                  className={`flex-1 rounded-notion px-3 py-1.5 text-sm font-medium transition-colors ${tab === t.id ? 'bg-white shadow-sm' : 'text-notion-muted hover:text-notion-text'}`}>
                  {t.label}
                </button>
              ))}
            </div>

            <form onSubmit={handleSave} className="space-y-3">
              {tab === 'personal' && (
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="sm:col-span-2 flex flex-wrap items-center gap-2 rounded-notion border border-dashed border-notion-border bg-notion-surface p-3">
                    <ScanLine size={16} className="text-notion-muted" />
                    <span className="text-sm text-notion-muted">Autofill from CNIC image</span>
                    <label className="n-btn-secondary cursor-pointer text-xs">
                      {ocrLoading ? <Loader2 size={14} className="animate-spin" /> : 'Upload CNIC'}
                      <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" disabled={ocrLoading} onChange={handleCnicUpload} />
                    </label>
                  </div>
                  <div><label className="n-label">Full Name *</label><input value={personal.fullName} onChange={(e) => setP('fullName', e.target.value)} className="n-input" /></div>
                  <div><label className="n-label">Email *</label><input type="email" value={personal.email} onChange={(e) => setP('email', e.target.value)} className="n-input" /></div>
                  <div><label className="n-label">Phone</label><input value={personal.phone} onChange={(e) => setP('phone', e.target.value)} className="n-input" /></div>
                  <div><label className="n-label">CNIC</label><input value={personal.cnic} onChange={(e) => setP('cnic', e.target.value)} className="n-input" placeholder="12345-1234567-1" /></div>
                  <div><label className="n-label">Date of Birth</label><input type="date" value={personal.dob} onChange={(e) => setP('dob', e.target.value)} className="n-input" /></div>
                  <div><label className="n-label">Gender</label>
                    <select value={personal.gender} onChange={(e) => setP('gender', e.target.value)} className="n-input">
                      <option value="">Select</option><option value="Male">Male</option><option value="Female">Female</option><option value="Other">Other</option>
                    </select>
                  </div>
                  <div className="sm:col-span-2"><label className="n-label">Address</label><input value={personal.address} onChange={(e) => setP('address', e.target.value)} className="n-input" /></div>
                </div>
              )}
              {tab === 'parent' && (
                <div className="grid gap-3 sm:grid-cols-2">
                  <div><label className="n-label">Father's Name</label><input value={parent.fatherName} onChange={(e) => setPr('fatherName', e.target.value)} className="n-input" /></div>
                  <div><label className="n-label">Parent CNIC</label><input value={parent.parentCnic} onChange={(e) => setPr('parentCnic', e.target.value)} className="n-input" /></div>
                  <div><label className="n-label">Occupation</label><input value={parent.parentOccupation} onChange={(e) => setPr('parentOccupation', e.target.value)} className="n-input" /></div>
                  <div><label className="n-label">Parent Contact</label><input value={parent.parentContact} onChange={(e) => setPr('parentContact', e.target.value)} className="n-input" /></div>
                  <div><label className="n-label">Emergency Contact</label><input value={parent.emergencyContact} onChange={(e) => setPr('emergencyContact', e.target.value)} className="n-input" /></div>
                </div>
              )}
              {tab === 'academic' && (
                <div className="grid gap-3 sm:grid-cols-2">
                  <div><label className="n-label">Registration Number *</label><input value={academic.registrationNumber} onChange={(e) => setA('registrationNumber', e.target.value)} className="n-input" /></div>
                  <div><label className="n-label">Program</label><input value={academic.program} onChange={(e) => setA('program', e.target.value)} className="n-input" placeholder="e.g. BSCS" /></div>
                  <div><label className="n-label">Semester</label><input value={academic.semester} onChange={(e) => setA('semester', e.target.value)} className="n-input" /></div>
                  <div><label className="n-label">Session</label><input value={academic.session} onChange={(e) => setA('session', e.target.value)} className="n-input" placeholder="e.g. Fall 2026" /></div>
                  <div><label className="n-label">Previous Qualification</label><input value={academic.previousQualification} onChange={(e) => setA('previousQualification', e.target.value)} className="n-input" /></div>
                  <div><label className="n-label">Previous Institute</label><input value={academic.previousInstitute} onChange={(e) => setA('previousInstitute', e.target.value)} className="n-input" /></div>
                  <div><label className="n-label">Previous Marks / %</label><input value={academic.previousMarks} onChange={(e) => setA('previousMarks', e.target.value)} className="n-input" /></div>
                </div>
              )}
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={closeModal} className="n-btn-secondary">Cancel</button>
                <button type="submit" disabled={saving} className="n-btn">
                  {saving ? <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" /> : 'Create Student'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmModal isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={handleDelete} title="Delete Student" message={`Delete "${deleteTarget?.fullName}"? This cannot be undone.`} confirmText="Delete" danger />
      {importOpen && (
        <ImportSheet
          kind="students"
          onClose={() => setImportOpen(false)}
          onDone={(result) => {
            setImportOpen(false);
            say({ title: 'Import finished', body: `Added ${result.created || 0}. Skipped ${result.skipped || 0}.`, action: 'OK' });
            load();
          }}
        />
      )}
    </div>
  );
};

export default AdminStudents;
