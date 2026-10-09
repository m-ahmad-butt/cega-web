import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { logout } from '../store/slices/authSlice';
import BrandLogo from './BrandLogo';
import UserLogout from './UserLogout';
import { LayoutDashboard, GitBranch, BookOpen, Users, CalendarClock, MessageSquare, Menu, X } from 'lucide-react';

const links = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/admin/branches', label: 'Branches', icon: GitBranch },
  { to: '/admin/courses', label: 'Courses', icon: BookOpen },
  { to: '/admin/students', label: 'Students', icon: Users },
  { to: '/admin/slots', label: 'Slots', icon: CalendarClock },
  { to: '/admin/requests', label: 'Requests', icon: MessageSquare },
];

const AdminNavbar = () => {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
  };

  const isActive = (to) => {
    if (to === '/admin') return location.pathname === '/admin';
    return location.pathname.startsWith(to);
  };

  return (
    <nav className="n-nav no-print">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-2.5 sm:px-6">
        <BrandLogo to="/admin" imgClassName="h-8 w-auto" />

        <div className="hidden items-center gap-1 md:flex">
          {links.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className={`n-btn-ghost py-1.5 px-3 text-xs ${isActive(l.to) ? 'bg-notion-hover font-semibold' : 'text-notion-muted'}`}
            >
              <l.icon size={15} />
              {l.label}
            </Link>
          ))}
        </div>

        <div className="hidden md:flex items-center">
          <UserLogout user={user} onLogout={handleLogout} />
        </div>

        <button onClick={() => setOpen(!open)} className="n-btn-ghost md:hidden p-2">
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {open && (
        <div className="border-t border-notion-border md:hidden">
          <div className="flex flex-col px-4 py-2 gap-1">
            <div className="px-3 py-2">
              <UserLogout user={user} onLogout={handleLogout} align="start" />
            </div>
            {links.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                onClick={() => setOpen(false)}
                className={`n-btn-ghost justify-start text-sm ${isActive(l.to) ? 'bg-notion-hover font-semibold' : 'text-notion-muted'}`}
              >
                <l.icon size={16} />
                {l.label}
              </Link>
            ))}
          </div>
        </div>
      )}
    </nav>
  );
};

export default AdminNavbar;
