import { useState, useEffect, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import StudentNavbar from '../../components/StudentNavbar';
import { studentAPI, unwrap } from '../../utils/api';
import { useGuide, useWarn } from '../../components/GuideModal';
import { useAgentPanel } from '../../components/AgentPanel';
import { Loader2, CalendarDays, AlertTriangle, CheckCircle, HelpCircle, Bot, Download } from 'lucide-react';

const levelLabel = (value) => (value === 'easy' ? 'Easy' : value === 'hard' ? 'Hard' : 'Medium');
const suggestedGap = { easy: 1, medium: 3, hard: 7 };

const StudentDashboard = () => {
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);
  const { say } = useGuide();
  const warn = useWarn();
  const { openAgent } = useAgentPanel();
  const [profile, setProfile] = useState(null);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selections, setSelections] = useState({}); // { courseId: slotId }
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const init = async () => {
      try {
        const { data: profileData } = await studentAPI.getProfile();
        const p = unwrap(profileData);
        const branch = p.selectedBranch || p.branch || null;
        setProfile({ ...p, branch });

        if (!branch && !p.branchLocked) {
          navigate('/student/select-branch');
          return;
        }

        const { data: courseData } = await studentAPI.getAssignedCourses();
        const rows = unwrap(courseData);
        const list = (Array.isArray(rows) ? rows : []).map((row) => {
          const course = row.course || row;
          return {
            ...course,
            _id: course.id || course._id,
            slots: (row.slots || course.slots || []).map((s) => ({
              ...s,
              _id: s.id || s._id,
            })),
          };
        });
        setCourses(list);
      } catch (err) {
        warn('Failed to load profile');
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [navigate]);

  const handleSelectSlot = (courseId, slotId) => {
    setSelections((prev) => ({ ...prev, [courseId]: slotId }));
  };

  const allSlotsById = useMemo(() => {
    const map = {};
    courses.forEach((c) => {
      (c.slots || []).forEach((s) => { map[s._id] = s; });
    });
    return map;
  }, [courses]);

  const conflicts = useMemo(() => {
    const selected = Object.entries(selections).map(([courseId, slotId]) => ({
      courseId,
      slot: allSlotsById[slotId],
    })).filter((s) => s.slot);

    const conflictSet = new Set();
    for (let i = 0; i < selected.length; i++) {
      for (let j = i + 1; j < selected.length; j++) {
        const a = selected[i].slot;
        const b = selected[j].slot;
        const sameDate = a.date?.slice(0, 10) === b.date?.slice(0, 10);
        if (sameDate && a.startTime < b.endTime && b.startTime < a.endTime) {
          conflictSet.add(selected[i].courseId);
          conflictSet.add(selected[j].courseId);
        }
      }
    }
    return conflictSet;
  }, [selections, allSlotsById]);

  const allSelected = courses.length > 0 && courses.every((c) => selections[c._id || c.courseId]);
  const hasConflicts = conflicts.size > 0;

  const handleSave = async () => {
    if (!allSelected) return warn('Please select a slot for every course');
    if (hasConflicts) return warn('Please resolve slot conflicts before saving');

    const entries = Object.entries(selections).map(([courseId, slotId]) => ({ courseId, slotId }));
    setSaving(true);
    try {
      const { data } = await studentAPI.saveDateSheet({ selections: entries });
      say({ title: 'Date sheet saved', body: data.message || 'Your date sheet has been saved.', action: 'OK' });
      navigate('/student/datesheet');
    } catch (err) {
      warn(err.response?.data?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-PK', { weekday: 'short', month: 'short', day: 'numeric' }) : 'Not set';

  const plan = useMemo(() => {
    const picked = courses.map((course) => {
      const id = course._id || course.courseId;
      const slot = allSlotsById[selections[id]];
      if (!slot) return null;
      return { course, slot };
    }).filter(Boolean).sort((a, b) => new Date(a.slot.date) - new Date(b.slot.date));

    return picked.map((item, index) => {
      const previous = picked[index - 1];
      if (!previous) return { ...item, gap: null };
      const current = new Date(item.slot.date);
      const prior = new Date(previous.slot.date);
      const utc = (date) => Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
      return { ...item, gap: Math.round((utc(current) - utc(prior)) / 86400000) };
    });
  }, [courses, selections, allSlotsById]);

  const downloadCourses = () => {
    const header = 'course code,title,department,level,credit hours';
    const lines = courses.map((course) => [course.courseCode, course.title, course.department, levelLabel(course.difficulty), course.creditHours]
      .map((value) => `"${String(value ?? '').replace(/"/g, '""')}"`)
      .join(','));
    const blob = new Blob([[header, ...lines].join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'registered-courses.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  if (loading) return (
    <div className="n-page"><StudentNavbar />
      <div className="flex justify-center py-20"><Loader2 size={24} className="animate-spin text-notion-muted" /></div>
    </div>
  );

  if (!profile) return null;

  return (
    <div className="n-page">
      <StudentNavbar />
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <h1 className="mb-6 text-2xl font-bold tracking-tight">Dashboard</h1>

        <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {[
            ['Personal', [
              ['Name', profile.fullName],
              ['Email', profile.email],
              ['Phone', profile.phone],
            ]],
            ['Parent', [
              ['Father', profile.fatherName],
              ['Contact', profile.parentContact],
            ]],
            ['Academic', [
              ['Roll', profile.registrationNumber],
              ['Program', profile.program],
              ['Semester', profile.semester],
            ]],
            ['Branch', [
              ['Name', profile.branch?.name],
              ['City', profile.branch?.city],
            ]],
          ].map(([title, rows]) => (
            <div key={title} className="n-card min-w-0 p-4">
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-notion-muted">{title}</h3>
              <dl className="space-y-2">
                {rows.map(([label, value]) => (
                  <div key={label} className="min-w-0">
                    <dt className="text-[11px] text-notion-muted">{label}</dt>
                    <dd className={`break-words text-sm ${value ? 'font-medium' : 'text-notion-muted'}`}>{value || 'Not set'}</dd>
                  </div>
                ))}
              </dl>
            </div>
          ))}
        </div>

        <div className="mb-8">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-semibold">Registered courses</h2>
            {courses.length > 0 && (
              <button type="button" onClick={downloadCourses} className="n-btn-secondary">
                <Download size={16} /> Download CSV
              </button>
            )}
          </div>
          {courses.length === 0 ? (
            <div className="n-card p-6 text-sm text-notion-muted">No courses are registered yet. An admin assigns them before exam slots appear here.</div>
          ) : (
            <div className="n-card overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="bg-notion-surface">
                    <th className="n-th">Code</th>
                    <th className="n-th">Title</th>
                    <th className="n-th">Department</th>
                    <th className="n-th">Level</th>
                  </tr>
                </thead>
                <tbody>
                  {courses.map((course) => (
                    <tr key={course._id || course.courseCode}>
                      <td className="n-td font-medium">{course.courseCode}</td>
                      <td className="n-td">{course.title}</td>
                      <td className="n-td">{course.department}</td>
                      <td className="n-td">{levelLabel(course.difficulty)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Date sheet status */}
        {profile.dateSheetSaved ? (
          <div className="n-card p-6 text-center">
            <CheckCircle size={40} className="mx-auto mb-3 text-notion-green" />
            <h2 className="text-lg font-semibold mb-1">Date Sheet Saved</h2>
            <p className="text-sm text-notion-muted mb-4">Your exam schedule is confirmed. Open it to download the PDF.</p>
            <Link to="/student/datesheet" className="n-btn"><CalendarDays size={16} /> View Date Sheet</Link>
          </div>
        ) : courses.length === 0 ? null : (
          <div>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-lg font-semibold">Select Exam Slots</h2>
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={openAgent} className="n-btn text-xs">
                  <Bot size={14} /> Agent
                </button>
                <Link to="/student/requests" className="n-btn-ghost text-xs"><HelpCircle size={14} /> Need Help</Link>
              </div>
            </div>

            <>
                {hasConflicts && (
                  <div className="mb-4 flex items-center gap-2 rounded-notion bg-notion-red-soft p-3 text-sm text-notion-red">
                    <AlertTriangle size={16} /> Some selected slots have time conflicts. Please resolve them.
                  </div>
                )}

                <div className="space-y-6">
                  {courses.map((course) => {
                    const cid = course._id || course.courseId;
                    const isConflict = conflicts.has(cid);
                    return (
                      <div key={cid} className={`n-card p-5 ${isConflict ? 'ring-2 ring-notion-red' : ''}`}>
                        <div className="mb-3 flex items-center justify-between">
                          <div>
                            <span className="font-semibold">{course.courseCode}</span>
                            <span className="ml-2 text-notion-muted">{course.title}</span>
                            <p className="mt-1 text-xs text-notion-muted">
                              {levelLabel(course.difficulty)}. Suggested gap of {suggestedGap[course.difficulty] || 3} day{(suggestedGap[course.difficulty] || 3) === 1 ? '' : 's'}.
                            </p>
                          </div>
                          {selections[cid] && !isConflict && (
                            <span className="n-chip"><CheckCircle size={12} /> Selected</span>
                          )}
                          {isConflict && (
                            <span className="n-tag bg-notion-red-soft text-notion-red"><AlertTriangle size={12} /> Conflict</span>
                          )}
                        </div>

                        {(!course.slots || course.slots.length === 0) ? (
                          <p className="text-sm text-notion-muted py-4 text-center">No slots available for this course</p>
                        ) : (
                          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                            {course.slots.map((slot) => {
                              const isSelected = selections[cid] === slot._id;
                              const remaining = (slot.capacity || 0) - (slot.booked || 0);
                              const isFull = remaining <= 0;
                              return (
                                <button
                                  key={slot._id}
                                  onClick={() => !isFull && handleSelectSlot(cid, slot._id)}
                                  disabled={isFull}
                                  className={`rounded-notion border p-3 text-left text-sm transition-all ${
                                    isSelected
                                      ? 'border-notion-text bg-notion-text text-white shadow-notion'
                                      : isFull
                                      ? 'border-notion-border bg-notion-surface opacity-50 cursor-not-allowed'
                                      : 'border-notion-border hover:border-notion-text hover:shadow-sm'
                                  }`}
                                >
                                  <div className="font-medium">{fmtDate(slot.date)}</div>
                                  <div className={`text-xs ${isSelected ? 'text-white/80' : 'text-notion-muted'}`}>
                                    {slot.startTime} to {slot.endTime}
                                  </div>
                                  <div className={`text-xs mt-1 ${isSelected ? 'text-white/70' : isFull ? 'text-notion-red' : 'text-notion-muted'}`}>
                                    {isFull ? 'Full' : `${remaining} seats left`}
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {plan.length > 0 && (
                  <div className="n-card mt-6 p-5">
                    <h3 className="text-sm font-semibold">Selected spacing</h3>
                    <p className="mt-1 text-xs text-notion-muted">Easy papers should sit closer together. Hard papers should have a longer gap.</p>
                    <ul className="mt-3 space-y-2 text-sm">
                      {plan.map((item) => (
                        <li key={item.course._id || item.course.courseCode} className="flex flex-wrap justify-between gap-2 border-t border-notion-border pt-2 first:border-t-0 first:pt-0">
                          <span>{item.course.courseCode} ({levelLabel(item.course.difficulty)})</span>
                          <span className="text-notion-muted">
                            {fmtDate(item.slot.date)}
                            {item.gap == null ? '. First paper.' : `. ${item.gap} day${item.gap === 1 ? '' : 's'} after the previous paper.`}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="mt-6 flex justify-end">
                  <button
                    onClick={handleSave}
                    disabled={saving || !allSelected || hasConflicts}
                    className="n-btn px-8"
                  >
                    {saving ? (
                      <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    ) : (
                      <>Save Date Sheet</>
                    )}
                  </button>
                </div>
            </>
          </div>
        )}
      </div>
    </div>
  );
};

export default StudentDashboard;
