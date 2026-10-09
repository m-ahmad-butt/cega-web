import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import AdminNavbar from '../../components/AdminNavbar';
import ConfirmModal from '../../components/ConfirmModal';
import { adminAPI } from '../../utils/api';
import { useGuide, useWarn } from '../../components/GuideModal';
import { ArrowLeft, Plus, Trash2, Loader2, X, AlertTriangle } from 'lucide-react';

const AdminStudentDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { say } = useGuide();
  const warn = useWarn();
  const [student, setStudent] = useState(null);
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [courses, setCourses] = useState([]);
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState('');
  const [assigning, setAssigning] = useState(false);
  const [removeTarget, setRemoveTarget] = useState(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [editSaving, setEditSaving] = useState(false);

  const loadStudent = useCallback(async () => {
    try {
      const { data } = await adminAPI.getStudent(id);
      setStudent(data.student || data);
    } catch {
      warn('Failed to load student');
      navigate('/admin/students');
    }
  }, [id, navigate]);

  const loadAssignments = useCallback(async () => {
    try {
      const { data } = await adminAPI.getStudentAssignments(id);
      setAssignments(data.assignments || data || []);
    } catch {
      /* ignore */
    }
  }, [id]);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await Promise.all([loadStudent(), loadAssignments()]);
      setLoading(false);
    };
    init();
  }, [loadStudent, loadAssignments]);

  const openAssignModal = async () => {
    try {
      const { data } = await adminAPI.getCourses({ limit: 200 });
      setCourses(data.courses || data.data || []);
    } catch {
      warn('Failed to load courses');
    }
    setSelectedCourse('');
    setAssignModalOpen(true);
  };

  const handleAssign = async () => {
    if (!selectedCourse) return warn('Select a course');
    setAssigning(true);
    try {
      await adminAPI.assignCourse({ studentId: id, courseId: selectedCourse });
      say({ title: 'Done', body: 'Course assigned', action: 'OK' });
      setAssignModalOpen(false);
      loadAssignments();
    } catch (err) {
      warn(err.response?.data?.message || 'Failed to assign');
    } finally {
      setAssigning(false);
    }
  };

  const handleRemove = async () => {
    try {
      await adminAPI.removeAssignment(removeTarget._id);
      say({ title: 'Done', body: 'Assignment removed', action: 'OK' });
      setRemoveTarget(null);
      loadAssignments();
    } catch (err) {
      warn(err.response?.data?.message || 'Failed to remove');
    }
  };

  const openEditModal = () => {
    setEditForm({
      fullName: student.fullName || '',
      phone: student.phone || '',
      cnic: student.cnic || '',
      dob: student.dob ? student.dob.slice(0, 10) : '',
      gender: student.gender || '',
      address: student.address || '',
      fatherName: student.fatherName || '',
      parentCnic: student.parentCnic || '',
      parentOccupation: student.parentOccupation || '',
      parentContact: student.parentContact || '',
      emergencyContact: student.emergencyContact || '',
      program: student.program || '',
      semester: student.semester || '',
      session: student.session || '',
    });
    setEditModalOpen(true);
  };

  const handleEditSave = async (e) => {
    e.preventDefault();
    setEditSaving(true);
    try {
      await adminAPI.updateStudent(id, editForm);
      say({ title: 'Done', body: 'Student updated', action: 'OK' });
      setEditModalOpen(false);
      loadStudent();
    } catch (err) {
      warn(err.response?.data?.message || 'Failed to update');
    } finally {
      setEditSaving(false);
    }
  };

  const setE = (k, v) => setEditForm((p) => ({ ...p, [k]: v }));

  const assignedIds = assignments.map((a) => a.course?._id || a.courseId);

  if (loading) return (
    <div className="n-page">
      <AdminNavbar />
      <div className="flex justify-center py-20"><Loader2 size={24} className="animate-spin text-notion-muted" /></div>
    </div>
  );

  if (!student) return null;

  const count = assignments.length;

  return (
    <div className="n-page">
      <AdminNavbar />
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <div className="mb-6 flex items-center gap-3">
          <button onClick={() => navigate('/admin/students')} className="n-btn-ghost p-2"><ArrowLeft size={18} /></button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold tracking-tight">{student.fullName}</h1>
            <p className="text-sm text-notion-muted">{student.registrationNumber} · {student.email}</p>
          </div>
          <button onClick={openEditModal} className="n-btn-secondary">Edit</button>
        </div>

        <div className="grid gap-4 md:grid-cols-3 mb-8">
          <div className="n-card p-5">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-notion-muted">Personal</h3>
            <dl className="space-y-2 text-sm">
              <div><dt className="text-notion-muted text-xs">Phone</dt><dd>{student.phone || '—'}</dd></div>
              <div><dt className="text-notion-muted text-xs">CNIC</dt><dd>{student.cnic || '—'}</dd></div>
              <div><dt className="text-notion-muted text-xs">DOB</dt><dd>{student.dob ? new Date(student.dob).toLocaleDateString() : '—'}</dd></div>
              <div><dt className="text-notion-muted text-xs">Gender</dt><dd>{student.gender || '—'}</dd></div>
              <div><dt className="text-notion-muted text-xs">Address</dt><dd>{student.address || '—'}</dd></div>
            </dl>
          </div>
          <div className="n-card p-5">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-notion-muted">Parent / Guardian</h3>
            <dl className="space-y-2 text-sm">
              <div><dt className="text-notion-muted text-xs">Father&apos;s Name</dt><dd>{student.fatherName || '—'}</dd></div>
              <div><dt className="text-notion-muted text-xs">Parent CNIC</dt><dd>{student.parentCnic || '—'}</dd></div>
              <div><dt className="text-notion-muted text-xs">Occupation</dt><dd>{student.parentOccupation || '—'}</dd></div>
              <div><dt className="text-notion-muted text-xs">Contact</dt><dd>{student.parentContact || '—'}</dd></div>
              <div><dt className="text-notion-muted text-xs">Emergency</dt><dd>{student.emergencyContact || '—'}</dd></div>
            </dl>
          </div>
          <div className="n-card p-5">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-notion-muted">Academic</h3>
            <dl className="space-y-2 text-sm">
              <div><dt className="text-notion-muted text-xs">Program</dt><dd>{student.program || '—'}</dd></div>
              <div><dt className="text-notion-muted text-xs">Semester</dt><dd>{student.semester || '—'}</dd></div>
              <div><dt className="text-notion-muted text-xs">Session</dt><dd>{student.session || '—'}</dd></div>
              <div><dt className="text-notion-muted text-xs">Branch</dt><dd>{student.branch?.name || '—'}</dd></div>
              <div><dt className="text-notion-muted text-xs">Date Sheet</dt>
                <dd><span className={`n-tag ${student.dateSheetSaved ? 'bg-notion-green-soft text-notion-green' : 'bg-notion-yellow-soft text-notion-yellow'}`}>{student.dateSheetSaved ? 'Saved' : 'Pending'}</span></dd>
              </div>
            </dl>
          </div>
        </div>

        {/* Course Assignments */}
        <div className="n-card p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">Course Assignments</h3>
              <p className="text-sm text-notion-muted">{count}/6 courses assigned</p>
            </div>
            <button onClick={openAssignModal} disabled={count >= 6} className="n-btn text-xs"><Plus size={14} /> Assign Course</button>
          </div>

          {(count < 4 || count > 6) && (
            <div className={`mb-4 flex items-center gap-2 rounded-notion p-3 text-sm ${count < 4 ? 'bg-notion-yellow-soft text-notion-yellow' : 'bg-notion-red-soft text-notion-red'}`}>
              <AlertTriangle size={16} />
              {count < 4 ? 'Student has less than 4 courses assigned' : 'Student has more than 6 courses assigned'}
            </div>
          )}

          <div className="w-full mb-2 h-2 rounded-full bg-notion-surface overflow-hidden">
            <div className={`h-full rounded-full transition-all ${count >= 4 && count <= 6 ? 'bg-notion-green' : count < 4 ? 'bg-notion-yellow' : 'bg-notion-red'}`} style={{ width: `${Math.min((count / 6) * 100, 100)}%` }} />
          </div>

          {assignments.length === 0 ? (
            <p className="py-6 text-center text-sm text-notion-muted">No courses assigned yet</p>
          ) : (
            <div className="mt-4 space-y-2">
              {assignments.map((a) => (
                <div key={a._id} className="flex items-center justify-between rounded-notion border border-notion-border px-4 py-3">
                  <div>
                    <span className="font-medium text-sm">{a.course?.courseCode || a.courseCode}</span>
                    <span className="ml-2 text-sm text-notion-muted">{a.course?.title || a.courseTitle}</span>
                  </div>
                  <button onClick={() => setRemoveTarget(a)} className="n-btn-ghost p-1.5 text-notion-red"><Trash2 size={14} /></button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Assign Course Modal */}
      {assignModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setAssignModalOpen(false)} />
          <div className="relative mx-4 w-full max-w-md animate-in fade-in slide-in-from-bottom-2 rounded-notion-lg bg-white p-6 shadow-notion-lg">
            <button onClick={() => setAssignModalOpen(false)} className="absolute right-4 top-4 text-notion-muted hover:text-notion-text"><X size={18} /></button>
            <h2 className="mb-4 text-lg font-semibold">Assign Course</h2>
            <select value={selectedCourse} onChange={(e) => setSelectedCourse(e.target.value)} className="n-input mb-4">
              <option value="">Select a course…</option>
              {courses.filter((c) => !assignedIds.includes(c._id)).map((c) => (
                <option key={c._id} value={c._id}>{c.courseCode} — {c.title}</option>
              ))}
            </select>
            <div className="flex justify-end gap-2">
              <button onClick={() => setAssignModalOpen(false)} className="n-btn-secondary">Cancel</button>
              <button onClick={handleAssign} disabled={assigning || !selectedCourse} className="n-btn">
                {assigning ? <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" /> : 'Assign'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Student Modal */}
      {editModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setEditModalOpen(false)} />
          <div className="relative mx-4 w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-in fade-in slide-in-from-bottom-2 rounded-notion-lg bg-white p-6 shadow-notion-lg">
            <button onClick={() => setEditModalOpen(false)} className="absolute right-4 top-4 text-notion-muted hover:text-notion-text"><X size={18} /></button>
            <h2 className="mb-4 text-lg font-semibold">Edit Student</h2>
            <form onSubmit={handleEditSave} className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <div><label className="n-label">Full Name</label><input value={editForm.fullName} onChange={(e) => setE('fullName', e.target.value)} className="n-input" /></div>
                <div><label className="n-label">Phone</label><input value={editForm.phone} onChange={(e) => setE('phone', e.target.value)} className="n-input" /></div>
                <div><label className="n-label">CNIC</label><input value={editForm.cnic} onChange={(e) => setE('cnic', e.target.value)} className="n-input" /></div>
                <div><label className="n-label">DOB</label><input type="date" value={editForm.dob} onChange={(e) => setE('dob', e.target.value)} className="n-input" /></div>
                <div><label className="n-label">Gender</label>
                  <select value={editForm.gender} onChange={(e) => setE('gender', e.target.value)} className="n-input">
                    <option value="">Select</option><option value="Male">Male</option><option value="Female">Female</option><option value="Other">Other</option>
                  </select>
                </div>
                <div><label className="n-label">Program</label><input value={editForm.program} onChange={(e) => setE('program', e.target.value)} className="n-input" /></div>
                <div><label className="n-label">Semester</label><input value={editForm.semester} onChange={(e) => setE('semester', e.target.value)} className="n-input" /></div>
                <div><label className="n-label">Session</label><input value={editForm.session} onChange={(e) => setE('session', e.target.value)} className="n-input" /></div>
                <div><label className="n-label">Father's Name</label><input value={editForm.fatherName} onChange={(e) => setE('fatherName', e.target.value)} className="n-input" /></div>
                <div><label className="n-label">Parent Contact</label><input value={editForm.parentContact} onChange={(e) => setE('parentContact', e.target.value)} className="n-input" /></div>
              </div>
              <div><label className="n-label">Address</label><input value={editForm.address} onChange={(e) => setE('address', e.target.value)} className="n-input" /></div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setEditModalOpen(false)} className="n-btn-secondary">Cancel</button>
                <button type="submit" disabled={editSaving} className="n-btn">
                  {editSaving ? <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" /> : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmModal isOpen={!!removeTarget} onClose={() => setRemoveTarget(null)} onConfirm={handleRemove} title="Remove Assignment" message={`Remove "${removeTarget?.course?.title || removeTarget?.courseTitle}" from this student?`} confirmText="Remove" danger />
    </div>
  );
};

export default AdminStudentDetail;
