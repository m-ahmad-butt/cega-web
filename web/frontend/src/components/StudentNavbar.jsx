import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { logout } from '../store/slices/authSlice';
import BrandLogo from './BrandLogo';
import UserLogout from './UserLogout';
import { useAgentPanel } from './AgentPanel';
import { LayoutDashboard, CalendarDays, HelpCircle, Menu, X, Bot } from 'lucide-react';

const links = [
  { to: '/student/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/student/datesheet', label: 'Date Sheet', icon: CalendarDays },
  { id: 'agent', label: 'Agent', icon: Bot },
  { to: '/student/requests', label: 'Need Help', icon: HelpCircle },
];

const StudentNavbar = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);
  const { open: agentOpen, openAgent } = useAgentPanel();

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
  };

  const isActive = (to) => location.pathname === to;

  return (
    <nav className="n-nav no-print">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-2.5 sm:px-6">
        <BrandLogo to="/student/dashboard" imgClassName="h-8 w-auto" />

        <div className="hidden items-center gap-1 md:flex">
          {links.map((l) =>
            l.id === 'agent' ? (
              <button
                key="agent"
                type="button"
                onClick={openAgent}
                className={`n-btn-ghost py-1.5 px-3 text-xs ${agentOpen ? 'bg-notion-hover font-semibold' : 'text-notion-muted'}`}
              >
                <l.icon size={15} />
                {l.label}
              </button>
            ) : (
              <Link
                key={l.to}
                to={l.to}
                className={`n-btn-ghost py-1.5 px-3 text-xs ${isActive(l.to) ? 'bg-notion-hover font-semibold' : 'text-notion-muted'}`}
              >
                <l.icon size={15} />
                {l.label}
              </Link>
            )
          )}
        </div>

        <div className="hidden md:flex items-center">
          <UserLogout user={user} onLogout={handleLogout} />
        </div>

        <button onClick={() => setMenuOpen(!menuOpen)} className="n-btn-ghost md:hidden p-2">
          {menuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {menuOpen && (
        <div className="border-t border-notion-border md:hidden">
          <div className="flex flex-col px-4 py-2 gap-1">
            <div className="px-3 py-2">
              <UserLogout user={user} onLogout={handleLogout} align="start" />
            </div>
            {links.map((l) =>
              l.id === 'agent' ? (
                <button
                  key="agent"
                  type="button"
                  onClick={() => { setMenuOpen(false); openAgent(); }}
                  className={`n-btn-ghost justify-start text-sm ${agentOpen ? 'bg-notion-hover font-semibold' : 'text-notion-muted'}`}
                >
                  <l.icon size={16} />
                  {l.label}
                </button>
              ) : (
                <Link
                  key={l.to}
                  to={l.to}
                  onClick={() => setMenuOpen(false)}
                  className={`n-btn-ghost justify-start text-sm ${isActive(l.to) ? 'bg-notion-hover font-semibold' : 'text-notion-muted'}`}
                >
                  <l.icon size={16} />
                  {l.label}
                </Link>
              )
            )}
          </div>
        </div>
      )}
    </nav>
  );
};

export default StudentNavbar;
