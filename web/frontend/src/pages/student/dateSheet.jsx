import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import StudentNavbar from '../../components/StudentNavbar';
import { studentAPI, unwrap } from '../../utils/api';
import { useWarn } from '../../components/GuideModal';
import { Loader2, Printer, Download, CalendarDays } from 'lucide-react';

const levelLabel = (value) => (value === 'easy' ? 'Easy' : value === 'hard' ? 'Hard' : 'Medium');

const StudentDateSheet = () => {
  const warn = useWarn();
  const [dateSheet, setDateSheet] = useState([]);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const init = async () => {
      try {
        const [dsRes, profRes] = await Promise.all([
          studentAPI.getDateSheet(),
          studentAPI.getProfile(),
        ]);
        const envelope = dsRes.data?.data || dsRes.data || {};
        const ds = envelope.selections || envelope.entries || envelope.dateSheet || [];
        const studentInfo = envelope.student || unwrap(profRes.data) || {};
        setDateSheet(Array.isArray(ds) ? ds : []);
        setProfile({
          ...studentInfo,
          branch: studentInfo.branch || studentInfo.selectedBranch || null,
        });
      } catch {
        setFailed(true);
        warn('Failed to load date sheet');
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [warn]);

  const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-PK', { year: 'numeric', month: 'long', day: 'numeric' }) : 'Not set';
  const dayName = (d) => d ? new Date(d).toLocaleDateString('en-PK', { weekday: 'long' }) : 'Not set';

  const sorted = [...(dateSheet || [])].sort((a, b) => {
    const left = a.examSlot?.date || a.date || a.slot?.date;
    const right = b.examSlot?.date || b.date || b.slot?.date;
    return new Date(left) - new Date(right);
  }).map((entry, index, rows) => {
    const slot = entry.examSlot || entry.slot || {};
    const date = entry.date || slot.date;
    const previous = index === 0 ? null : (rows[index - 1].examSlot?.date || rows[index - 1].date || rows[index - 1].slot?.date);
    let gap = 'First paper';
    if (previous && date) {
      const current = new Date(date);
      const prior = new Date(previous);
      const utc = (value) => Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate());
      const days = Math.round((utc(current) - utc(prior)) / 86400000);
      gap = `${days} day${days === 1 ? '' : 's'}`;
    }
    return { entry, slot, date, gap };
  });

  const downloadPdf = async () => {
    try {
      const response = await studentAPI.downloadDateSheet();
      const url = URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = 'Examination-Date-Sheet.pdf';
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      warn('Could not download the date sheet');
    }
  };

  if (loading) return (
    <div className="n-page"><StudentNavbar />
      <div className="flex justify-center py-20"><Loader2 size={24} className="animate-spin text-notion-muted" /></div>
    </div>
  );

  if (failed || dateSheet.length === 0) return (
    <div className="n-page">
      <StudentNavbar />
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <h1 className="mb-6 text-2xl font-bold tracking-tight">Date Sheet</h1>
        <div className="n-card p-6 text-center">
          <CalendarDays size={40} className="mx-auto mb-3 text-notion-muted" />
          <h2 className="text-lg font-semibold mb-1">
            {failed ? 'Date sheet could not be loaded' : 'No date sheet yet'}
          </h2>
          <p className="text-sm text-notion-muted mb-4">
            {failed
              ? 'Try again in a moment. If this keeps happening, go back to the dashboard and save your slots.'
              : 'Choose a slot for each registered course on the dashboard, then save the date sheet.'}
          </p>
          <Link to="/student/dashboard" className="n-btn">Back to Dashboard</Link>
        </div>
      </div>
    </div>
  );

  return (
    <div className="n-page">
      <StudentNavbar />
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <div className="no-print mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold tracking-tight">Date Sheet</h1>
          <div className="flex gap-2">
            <button onClick={downloadPdf} className="n-btn">
              <Download size={16} /> Download PDF
            </button>
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
                  <th className="n-th">No.</th>
                  <th className="n-th">Course Code</th>
                  <th className="n-th">Course Title</th>
                  <th className="n-th">Level</th>
                  <th className="n-th">Date</th>
                  <th className="n-th">Day</th>
                  <th className="n-th">Time</th>
                  <th className="n-th">Gap</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map(({ entry, slot, date, gap }, i) => (
                    <tr key={entry.id || i} className="hover:bg-notion-surface/50">
                      <td className="n-td text-notion-muted">{i + 1}</td>
                      <td className="n-td font-medium">{entry.courseCode || entry.course?.courseCode}</td>
                      <td className="n-td">{entry.courseTitle || entry.course?.title}</td>
                      <td className="n-td">{levelLabel(entry.course?.difficulty)}</td>
                      <td className="n-td">{fmtDate(date)}</td>
                      <td className="n-td">{dayName(date)}</td>
                      <td className="n-td">{entry.startTime || slot.startTime} to {entry.endTime || slot.endTime}</td>
                      <td className="n-td">{gap}</td>
                    </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="mt-6 text-center text-xs text-notion-muted">
            Suggested spacing is 1 day for an easy paper, 3 days for a medium paper, and 7 days for a hard paper. This document was generated by ExamSlot.
          </p>
        </div>
      </div>
    </div>
  );
};

export default StudentDateSheet;
