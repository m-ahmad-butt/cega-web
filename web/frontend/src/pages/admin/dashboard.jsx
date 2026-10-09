import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import AdminNavbar from '../../components/AdminNavbar';
import { adminAPI } from '../../utils/api';
import { useWarn } from '../../components/GuideModal';
import { Search, Loader2, ArrowUpRight, ArrowDownRight } from 'lucide-react';

const niceCeil = (value) => {
  if (value <= 1) return 1;
  const pow = 10 ** Math.floor(Math.log10(value));
  const n = value / pow;
  const step = n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10;
  return step * pow;
};

const smoothPath = (points) => {
  if (!points.length) return '';
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;
  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 0; i < points.length - 1; i += 1) {
    const p0 = points[i === 0 ? i : i - 1];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] || p2;
    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
  }
  return d;
};

const fmtDate = (d) => (
  d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'
);

const typeLabel = (type) => {
  if (type === 'CHANGE_BRANCH') return 'Change branch';
  if (type === 'CHANGE_DATESHEET') return 'Change date sheet';
  return type || 'Request';
};

const statusStyle = {
  PENDING: 'bg-notion-yellow-soft text-notion-yellow',
  APPROVED: 'bg-notion-green-soft text-notion-green',
  REJECTED: 'bg-notion-red-soft text-notion-red',
};

function TrendChart({ trend }) {
  const [hover, setHover] = useState(null);
  const w = 640;
  const h = 220;
  const padL = 40;
  const padR = 8;
  const padT = 18;
  const padB = 32;
  const max = Math.max(1, ...trend.map((t) => Math.max(t.students, t.requests)));
  const top = niceCeil(max);
  const innerW = w - padL - padR;
  const innerH = h - padT - padB;
  const xAt = (i) => padL + (trend.length <= 1 ? innerW / 2 : (i / (trend.length - 1)) * innerW);
  const yAt = (v) => padT + innerH - (v / top) * innerH;
  const students = trend.map((t, i) => ({ x: xAt(i), y: yAt(t.students) }));
  const requests = trend.map((t, i) => ({ x: xAt(i), y: yAt(t.requests) }));
  const studentPath = smoothPath(students);
  const requestPath = smoothPath(requests);
  const baseline = yAt(0);
  const area = students.length
    ? `${studentPath} L ${students[students.length - 1].x} ${baseline} L ${students[0].x} ${baseline} Z`
    : '';
  const ticks = [top, Math.round(top / 2), 0];
  const active = hover == null ? null : trend[hover];

  const onMove = (event) => {
    if (!trend.length) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const rel = ((event.clientX - rect.left) / rect.width) * w;
    let nearest = 0;
    let best = Infinity;
    trend.forEach((_, i) => {
      const dist = Math.abs(xAt(i) - rel);
      if (dist < best) {
        best = dist;
        nearest = i;
      }
    });
    setHover(nearest);
  };

  return (
    <div className="relative min-w-0">
      <svg
        viewBox={`0 0 ${w} ${h}`}
        className="h-[220px] w-full"
        onMouseMove={onMove}
        onMouseLeave={() => setHover(null)}
      >
        <defs>
          <linearGradient id="studentFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#37352f" stopOpacity="0.14" />
            <stop offset="100%" stopColor="#37352f" stopOpacity="0" />
          </linearGradient>
        </defs>
        {ticks.map((tick) => (
          <g key={tick}>
            <line x1={padL} x2={w - padR} y1={yAt(tick)} y2={yAt(tick)} stroke="#e9e9e7" strokeWidth="1" />
            <text x={padL - 8} y={yAt(tick) + 4} textAnchor="end" fontSize="11" fill="#9b9a97">
              {tick}
            </text>
          </g>
        ))}
        <path d={area} fill="url(#studentFill)" />
        <path d={requestPath} fill="none" stroke="#448361" strokeWidth="2.4" strokeLinejoin="round" strokeLinecap="round" />
        <path d={studentPath} fill="none" stroke="#37352f" strokeWidth="2.4" strokeLinejoin="round" strokeLinecap="round" />
        {hover != null && (
          <g>
            <line x1={xAt(hover)} x2={xAt(hover)} y1={padT} y2={baseline} stroke="#d3d1cb" strokeDasharray="3 3" />
            <circle cx={students[hover].x} cy={students[hover].y} r="4.5" fill="#37352f" stroke="#fff" strokeWidth="2" />
            <circle cx={requests[hover].x} cy={requests[hover].y} r="4.5" fill="#448361" stroke="#fff" strokeWidth="2" />
          </g>
        )}
        {trend.map((t, i) => (
          <text key={`${t.year}-${t.month}`} x={xAt(i)} y={h - 8} textAnchor="middle" fontSize="10" fill="#9b9a97">
            {t.label}
          </text>
        ))}
      </svg>
      {active && (
        <div
          className="n-card pointer-events-none absolute z-10 w-[168px] px-3.5 py-2.5 shadow-notion-lg"
          style={{
            left: `${Math.min(78, Math.max(8, (xAt(hover) / w) * 100 - 8))}%`,
            top: 8,
          }}
        >
          <p className="mb-1.5 text-xs font-semibold text-notion-text">
            {active.label.charAt(0) + active.label.slice(1).toLowerCase()} {active.year}
          </p>
          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-1.5 text-notion-muted">
              <span className="h-1.5 w-1.5 rounded-full bg-notion-text" /> Students
            </span>
            <span className="font-semibold text-notion-text">{active.students.toLocaleString()}</span>
          </div>
          <div className="mt-1 flex items-center justify-between text-xs">
            <span className="flex items-center gap-1.5 text-notion-muted">
              <span className="h-1.5 w-1.5 rounded-full bg-notion-green" /> Requests
            </span>
            <span className="font-semibold text-notion-text">{active.requests.toLocaleString()}</span>
          </div>
        </div>
      )}
    </div>
  );
}

const AdminDashboard = () => {
  const warn = useWarn();
  const navigate = useNavigate();
  const user = useSelector((s) => s.auth.user);
  const [stats, setStats] = useState(null);
  const [requests, setRequests] = useState([]);
  const [students, setStudents] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [tab, setTab] = useState('recent');

  useEffect(() => {
    const load = async () => {
      try {
        const [statsRes, reqRes, stuRes, branchRes] = await Promise.all([
          adminAPI.getStats(),
          adminAPI.getRequests({ page: 1, pageSize: 8 }),
          adminAPI.getStudents({ page: 1, pageSize: 5 }),
          adminAPI.getBranches({ page: 1, pageSize: 4 }),
        ]);
        setStats(statsRes.data?.data || statsRes.data);
        setRequests(reqRes.data?.data || reqRes.data?.requests || []);
        setStudents(stuRes.data?.data || stuRes.data?.students || []);
        setBranches(branchRes.data?.data || branchRes.data?.branches || []);
      } catch {
        warn('Failed to load dashboard');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const firstName = (user?.fullName || user?.email || 'Admin').split(/[\s@]/)[0];
  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long', month: 'short', day: 'numeric', year: 'numeric',
  });
  const monthLabel = new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' });

  const saved = stats?.studentsWithDateSheet ?? 0;
  const total = stats?.totalStudents ?? 0;
  const pending = stats?.pendingRequests ?? 0;
  const approved = stats?.approvedRequests ?? 0;
  const rejected = stats?.rejectedRequests ?? 0;
  const savedPct = total ? Math.round((saved / total) * 100) : 0;
  const requestTotal = pending + approved + rejected;
  const requestParts = [
    { label: 'pending', value: pending, bar: 'bg-notion-yellow', text: 'text-notion-yellow' },
    { label: 'approved', value: approved, bar: 'bg-notion-green', text: 'text-notion-green' },
    { label: 'rejected', value: rejected, bar: 'bg-notion-red', text: 'text-notion-red' },
  ];
  const biggestRequest = [...requestParts].sort((a, b) => b.value - a.value)[0];
  const biggestPct = requestTotal ? Math.round((biggestRequest.value / requestTotal) * 100) : 0;

  const visibleRequests = useMemo(
    () => (tab === 'pending' ? requests.filter((r) => r.status === 'PENDING') : requests),
    [requests, tab],
  );

  const onSearch = (e) => {
    e.preventDefault();
    const q = query.trim();
    navigate(q ? `/admin/students?q=${encodeURIComponent(q)}` : '/admin/students');
  };

  const insight = total
    ? `${savedPct}% of students have a saved date sheet. ${pending} request${pending === 1 ? '' : 's'} still need a decision.`
    : 'Add students, then assign courses and open exam slots so date sheets can be saved.';

  return (
    <div className="n-page">
      <AdminNavbar />
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-notion-muted">{today}</p>
            <h1 className="text-2xl font-bold tracking-tight">Welcome back, {firstName}</h1>
          </div>
          <form onSubmit={onSearch} className="relative w-full max-w-xs">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-notion-muted" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search students…"
              className="n-input pl-9"
            />
          </form>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 size={24} className="animate-spin text-notion-muted" />
          </div>
        ) : (
          <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_300px]">
            <div className="space-y-4">
              <section className="n-card p-5 sm:p-6">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-sm font-semibold">Overview</h2>
                  <span className="text-xs text-notion-muted">{stats?.totalCourses ?? 0} courses · {stats?.totalSlots ?? 0} slots</span>
                </div>
                <div className="grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)] lg:items-center">
                  <div>
                    <p className="text-sm text-notion-muted">Students enrolled</p>
                    <p className="mt-1 text-3xl font-bold tracking-tight">{total.toLocaleString()}</p>
                    <div className="mt-3 flex flex-wrap items-center gap-3 text-sm font-medium">
                      <span className="inline-flex items-center gap-1 text-notion-green">
                        <ArrowUpRight size={15} /> {saved.toLocaleString()} saved
                      </span>
                      <span className="inline-flex items-center gap-1 text-notion-red">
                        <ArrowDownRight size={15} /> {pending.toLocaleString()} pending
                      </span>
                    </div>
                    <p className="mt-4 text-sm leading-5 text-notion-muted">{insight}</p>
                  </div>
                  <TrendChart trend={stats?.trend || []} />
                </div>
              </section>

              <section className="n-card p-5 sm:p-6">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-sm font-semibold">Coverage</h2>
                  <span className="n-tag bg-notion-surface text-notion-muted">{monthLabel}</span>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="n-surface p-4">
                    <div className="mb-3 flex items-start justify-between">
                      <p className="text-sm text-notion-muted">Date sheets</p>
                      <Link to="/admin/students" className="text-xs font-medium text-notion-muted hover:text-notion-text">View</Link>
                    </div>
                    <p className="text-2xl font-bold tracking-tight">{saved.toLocaleString()}</p>
                    <div className="mt-4 flex h-2.5 overflow-hidden rounded-full bg-notion-hover">
                      <div className="h-full rounded-full bg-notion-text" style={{ width: `${savedPct}%` }} />
                    </div>
                    <p className="mt-3 text-sm leading-5 text-notion-muted">
                      Saved date sheets cover <span className="font-semibold text-notion-text">{savedPct}%</span> of enrolled students.
                    </p>
                  </div>
                  <div className="n-surface p-4">
                    <div className="mb-3 flex items-start justify-between">
                      <p className="text-sm text-notion-muted">Requests</p>
                      <Link to="/admin/requests" className="text-xs font-medium text-notion-muted hover:text-notion-text">View</Link>
                    </div>
                    <p className="text-2xl font-bold tracking-tight">{requestTotal.toLocaleString()}</p>
                    <div className="mt-4 flex h-2.5 overflow-hidden rounded-full bg-notion-hover">
                      {requestTotal === 0 ? null : requestParts.map((part) => (
                        <div
                          key={part.label}
                          className={`h-full ${part.bar}`}
                          style={{ width: `${(part.value / requestTotal) * 100}%` }}
                        />
                      ))}
                    </div>
                    <p className="mt-3 text-sm leading-5 text-notion-muted">
                      {requestTotal === 0
                        ? 'No change requests yet.'
                        : <>The biggest share is <span className={`font-semibold ${biggestRequest.text}`}>{biggestRequest.label}</span> at {biggestPct}%.</>}
                    </p>
                  </div>
                </div>
              </section>

              <section className="n-card p-5 sm:p-6">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <h2 className="text-sm font-semibold">Requests</h2>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => setTab('recent')}
                      className={`n-btn-ghost py-1.5 px-3 text-xs ${tab === 'recent' ? 'bg-notion-hover font-semibold' : 'text-notion-muted'}`}
                    >
                      Recent
                    </button>
                    <button
                      type="button"
                      onClick={() => setTab('pending')}
                      className={`n-btn-ghost py-1.5 px-3 text-xs ${tab === 'pending' ? 'bg-notion-hover font-semibold' : 'text-notion-muted'}`}
                    >
                      Pending
                    </button>
                  </div>
                </div>
                {visibleRequests.length === 0 ? (
                  <p className="py-8 text-center text-sm text-notion-muted">No requests in this view.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[560px]">
                      <thead>
                        <tr className="bg-notion-surface">
                          <th className="n-th">Date</th>
                          <th className="n-th">Student</th>
                          <th className="n-th">Type</th>
                          <th className="n-th">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {visibleRequests.map((r) => {
                          const studentId = r.student?.id || r.student?._id;
                          const name = r.student?.fullName || 'Student';
                          return (
                            <tr
                              key={r.id || r._id}
                              className="cursor-pointer hover:bg-notion-surface/50"
                              onClick={() => navigate('/admin/requests')}
                            >
                              <td className="n-td text-notion-muted">{fmtDate(r.createdAt)}</td>
                              <td className="n-td font-medium">
                                {studentId ? (
                                  <Link to={`/admin/students/${studentId}`} onClick={(e) => e.stopPropagation()} className="hover:underline">
                                    {name}
                                  </Link>
                                ) : name}
                              </td>
                              <td className="n-td text-notion-muted">{typeLabel(r.type)}</td>
                              <td className="n-td">
                                <span className={`n-tag ${statusStyle[r.status] || 'bg-notion-surface text-notion-muted'}`}>
                                  {r.status === 'APPROVED' ? 'Approved' : r.status === 'REJECTED' ? 'Rejected' : 'Pending'}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            </div>

            <aside className="space-y-4">
              <section className="n-card p-5">
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="text-sm font-semibold">Branches</h2>
                  <Link to="/admin/branches" className="text-xs font-medium text-notion-muted hover:text-notion-text">View all</Link>
                </div>
                {branches.length === 0 ? (
                  <p className="py-6 text-center text-sm text-notion-muted">No branches yet.</p>
                ) : (
                  <ul>
                    {branches.map((b) => (
                      <li key={b.id || b._id} className="border-t border-notion-border first:border-t-0">
                        <Link to="/admin/branches" className="flex items-center gap-3 py-3">
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium">{b.name}</p>
                            <p className="truncate text-xs text-notion-muted">{b.city || 'Campus'} · {b.code}</p>
                          </div>
                          <span className={`n-tag ${b.status === 'inactive' ? 'bg-notion-surface text-notion-muted' : 'bg-notion-green-soft text-notion-green'}`}>
                            {b.status === 'inactive' ? 'Inactive' : 'Active'}
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <section className="n-card p-5">
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="text-sm font-semibold">Students</h2>
                  <Link to="/admin/students" className="text-xs font-medium text-notion-muted hover:text-notion-text">View all</Link>
                </div>
                {students.length === 0 ? (
                  <p className="py-6 text-center text-sm text-notion-muted">No students yet.</p>
                ) : (
                  <ul>
                    {students.map((s) => (
                      <li key={s.id || s._id} className="border-t border-notion-border first:border-t-0">
                        <Link to={`/admin/students/${s.id || s._id}`} className="flex items-center gap-3 py-3">
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium">{s.fullName}</p>
                            <p className="truncate text-xs text-notion-muted">{s.registrationNumber || s.program || s.email}</p>
                          </div>
                          <span className={`n-tag ${s.dateSheetSaved ? 'bg-notion-green-soft text-notion-green' : 'bg-notion-yellow-soft text-notion-yellow'}`}>
                            {s.dateSheetSaved ? 'Saved' : 'Open'}
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </aside>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
