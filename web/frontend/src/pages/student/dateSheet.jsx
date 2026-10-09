import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import StudentNavbar from '../../components/StudentNavbar';
import { studentAPI, unwrap } from '../../utils/api';
import { useWarn } from '../../components/GuideModal';
import { Loader2, Printer, FileText } from 'lucide-react';

const StudentDateSheet = () => {
  const navigate = useNavigate();
  const warn = useWarn();
  const [dateSheet, setDateSheet] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      try {
        const [dsRes, profRes] = await Promise.all([
          studentAPI.getDateSheet(),
          studentAPI.getProfile(),
        ]);
        const envelope = dsRes.data?.data || dsRes.data || {};
        const ds = envelope.selections || envelope.entries || envelope.dateSheet || [];
        const studentInfo = envelope.student || unwrap(profRes.data);
        const prof = {
          ...studentInfo,
          branch: studentInfo.branch || studentInfo.selectedBranch || null,
        };

        if (!Array.isArray(ds) || ds.length === 0) {
          navigate('/student/dashboard');
          return;
        }

        setDateSheet(ds);
        setProfile(prof);
      } catch {
        warn('Failed to load date sheet');
        navigate('/student/dashboard');
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [navigate]);

  const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-PK', { year: 'numeric', month: 'short', day: 'numeric' }) : '—';
  const dayName = (d) => d ? new Date(d).toLocaleDateString('en-PK', { weekday: 'long' }) : '—';

  const sorted = [...(dateSheet || [])].sort((a, b) => new Date(a.date || a.slot?.date) - new Date(b.date || b.slot?.date));

  if (loading) return (
    <div className="n-page"><StudentNavbar />
      <div className="flex justify-center py-20"><Loader2 size={24} className="animate-spin text-notion-muted" /></div>
    </div>
  );

  return (
    <div className="n-page">
      <StudentNavbar />
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <div className="no-print mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold tracking-tight">Date Sheet</h1>
          <div className="flex gap-2">
            <button onClick={() => window.print()} className="n-btn-secondary">
              <Printer size={16} /> Print
            </button>
          </div>
        </div>

        <div className="n-card p-6" id="datesheet-content">
          {/* Header */}
          <div className="mb-6 border-b border-notion-border pb-4 text-center">
            <div className="mb-1">
              <img src="/logo.png" alt="" className="h-8 w-auto object-contain" />
            </div>
            <h2 className="text-xl font-bold">Exam Date Sheet</h2>
            <div className="mt-2 flex flex-wrap justify-center gap-x-6 gap-y-1 text-sm text-notion-muted">
              <span><strong>Name:</strong> {profile?.fullName}</span>
              <span><strong>Reg No:</strong> {profile?.registrationNumber}</span>
              <span><strong>Program:</strong> {profile?.program}</span>
              <span><strong>Branch:</strong> {profile?.branch?.name}</span>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-notion-surface">
                  <th className="n-th">#</th>
                  <th className="n-th">Course Code</th>
                  <th className="n-th">Course Title</th>
                  <th className="n-th">Date</th>
                  <th className="n-th">Day</th>
                  <th className="n-th">Start Time</th>
                  <th className="n-th">End Time</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((entry, i) => {
                  const slot = entry.examSlot || entry.slot || {};
                  const date = entry.date || slot.date;
                  return (
                    <tr key={entry.id || i} className="hover:bg-notion-surface/50">
                      <td className="n-td text-notion-muted">{i + 1}</td>
                      <td className="n-td font-medium">{entry.courseCode || entry.course?.courseCode}</td>
                      <td className="n-td">{entry.courseTitle || entry.course?.title}</td>
                      <td className="n-td">{fmtDate(date)}</td>
                      <td className="n-td">{dayName(date)}</td>
                      <td className="n-td">{entry.startTime || slot.startTime}</td>
                      <td className="n-td">{entry.endTime || slot.endTime}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <p className="mt-6 text-center text-xs text-notion-muted">
            This is a computer-generated date sheet. If you need changes, please submit a request.
          </p>
        </div>
      </div>
    </div>
  );
};

export default StudentDateSheet;
