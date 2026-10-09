import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { updateUser } from '../../store/slices/authSlice';
import StudentNavbar from '../../components/StudentNavbar';
import ConfirmModal from '../../components/ConfirmModal';
import { studentAPI, unwrap } from '../../utils/api';
import { useGuide, useWarn } from '../../components/GuideModal';
import { MapPin, Phone, Building, Loader2 } from 'lucide-react';

const StudentSelectBranch = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const { say } = useGuide();
  const warn = useWarn();
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (user?.selectedBranch || user?.branch) {
      navigate('/student/dashboard');
      return;
    }
    const fetchBranches = async () => {
      try {
        const { data } = await studentAPI.getBranches();
        const list = unwrap(data);
        setBranches(Array.isArray(list) ? list : []);
      } catch {
        warn('Failed to load branches');
      } finally {
        setLoading(false);
      }
    };
    fetchBranches();
  }, [user, navigate]);

  const handleSelect = (branch) => {
    setSelected(branch);
    setConfirmOpen(true);
  };

  const handleConfirm = async () => {
    setSubmitting(true);
    try {
      await studentAPI.selectBranch({ branchId: selected.id || selected._id });
      dispatch(updateUser({ selectedBranch: selected, branch: selected, branchLocked: true }));
      say({ title: 'Branch Selected', body: 'Branch selected successfully!', action: 'OK' });
      setConfirmOpen(false);
      navigate('/student/dashboard');
    } catch (err) {
      warn(err.response?.data?.message || 'Failed to select branch');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="n-page">
      <StudentNavbar />
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold tracking-tight">Select Your Exam Branch</h1>
          <p className="mt-2 text-sm text-notion-muted max-w-lg mx-auto">
            Choose the branch where you will appear for your exams. This selection can only be made once, so please choose carefully.
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center py-20"><Loader2 size={24} className="animate-spin text-notion-muted" /></div>
        ) : branches.length === 0 ? (
          <div className="n-card p-12 text-center text-sm text-notion-muted">No branches available at the moment</div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {branches.map((b) => (
              <div key={b.id || b._id} className="n-card p-5 flex flex-col hover:shadow-notion-lg transition-shadow">
                <h3 className="text-lg font-semibold mb-1">{b.name}</h3>
                <p className="text-xs font-medium text-notion-muted mb-3">{b.code}</p>
                <div className="space-y-2 flex-1 text-sm text-notion-muted">
                  <div className="flex items-center gap-2"><MapPin size={14} /> {b.city || 'N/A'}</div>
                  <div className="flex items-start gap-2"><Building size={14} className="mt-0.5 shrink-0" /> {b.address || 'N/A'}</div>
                  <div className="flex items-center gap-2"><Phone size={14} /> {b.contactNumber || 'N/A'}</div>
                </div>
                <button onClick={() => handleSelect(b)} className="n-btn mt-4 w-full">Select Branch</button>
              </div>
            ))}
          </div>
        )}
      </div>

      <ConfirmModal
        isOpen={confirmOpen}
        onClose={() => { setConfirmOpen(false); setSelected(null); }}
        onConfirm={handleConfirm}
        title="Confirm Branch Selection"
        message={`You are about to select "${selected?.name}" as your exam branch. This can only be done once and cannot be changed later (unless you submit a request). Are you sure?`}
        confirmText={submitting ? 'Selecting…' : 'Yes, Select'}
      />
    </div>
  );
};

export default StudentSelectBranch;
