import { LogOut } from 'lucide-react';

const UserLogout = ({ user, onLogout, align = 'end' }) => {
  const name = user?.fullName || user?.email || 'Account';
  const isAdminUser = user?.role === 'ADMIN';
  const subtitle = isAdminUser
    ? 'Admin · ExamSlot'
    : [user?.program || 'Student', user?.registrationNumber || 'ExamSlot'].join(' · ');

  return (
    <div className={`flex items-center gap-3 ${align === 'start' ? 'justify-start' : 'justify-end'}`}>
      <div className="min-w-0 leading-tight">
        <p className="truncate text-sm font-semibold text-notion-text">{name}</p>
        <p className="truncate text-xs text-notion-muted">{subtitle}</p>
      </div>
      <button
        type="button"
        onClick={onLogout}
        className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-notion-border text-notion-muted transition-colors hover:bg-notion-hover hover:text-notion-text"
        aria-label="Logout"
        title="Logout"
      >
        <LogOut size={16} />
      </button>
    </div>
  );
};

export default UserLogout;
