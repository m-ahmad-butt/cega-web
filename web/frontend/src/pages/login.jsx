import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { setCredentials } from '../store/slices/authSlice';
import { authAPI } from '../utils/api';
import { homePathFor, isAdmin } from '../utils/roles';
import { useGuide } from '../components/GuideModal';
import toast from 'react-hot-toast';
import BrandLogo from '../components/BrandLogo';
import { LogIn, Eye, EyeOff, ArrowLeft } from 'lucide-react';

const AVATARS = [
  '/notion/pile-1.webp',
  '/notion/pile-2.webp',
  '/notion/pile-3.webp',
  '/notion/pile-4.webp',
];

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { say } = useGuide();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) return toast.error('Please fill in all fields');

    setLoading(true);
    try {
      const { data } = await authAPI.login({ email, password });
      dispatch(setCredentials({ user: data.user, token: data.token }));

      const firstName = (data.user.fullName || data.user.email).split(' ')[0];

      if (isAdmin(data.user)) {
        say({
          title: `Welcome, ${firstName}.`,
          kicker: 'Admin desk',
          body: 'Branches, courses, students, exam slots and requests are all here.',
          hint: 'Start by checking the dashboard for an overview.',
          action: 'Let\'s go',
        });
      } else {
        const hasBranch = data.user.branchLocked;
        const hasDateSheet = data.user.dateSheetSaved;

        if (!hasBranch) {
          say({
            title: `Welcome, ${firstName}.`,
            kicker: 'Action needed',
            body: 'You haven\'t selected your exam branch yet.',
            hint: 'Pick the campus where you want to sit your papers. This is a one-time choice.',
            action: 'Got it',
          });
        } else if (!hasDateSheet) {
          say({
            title: `Welcome back, ${firstName}.`,
            kicker: 'Next step',
            body: 'Branch selected. Now pick exam slots for each of your courses.',
            hint: 'Go to Dashboard and choose a date and time for every assigned course.',
            action: 'Let\'s go',
          });
        } else {
          say({
            title: `Welcome back, ${firstName}.`,
            kicker: 'All set',
            body: 'Your date sheet is saved. You can view or print it anytime.',
            hint: 'Need to change something? Use the Need Help page to raise a request.',
            action: 'Got it',
          });
        }
      }

      navigate(homePathFor(data.user));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-white font-sans text-notion-text">
      {/* Form side — centered */}
      <div className="flex w-full flex-col px-6 py-8 lg:w-[48%] lg:px-20">
        <Link
          to="/"
          className="inline-flex w-fit items-center gap-1.5 py-1 text-sm font-medium text-notion-muted hover:text-notion-text"
        >
          <ArrowLeft size={16} />
          Back
        </Link>

        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-sm">
            <div className="mb-8">
              <BrandLogo to={null} className="mb-6" imgClassName="h-10 w-auto" />
              <h1 className="text-2xl font-bold tracking-tight">Welcome back</h1>
              <p className="mt-1 text-sm text-notion-muted">Sign in with your university email.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="n-label">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@university.edu"
                  className="n-input"
                  autoComplete="email"
                />
              </div>

              <div>
                <label className="n-label">Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="n-input pr-10"
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-notion-muted hover:text-notion-text"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div className="flex justify-end">
                <Link to="/forgot-password" className="text-xs text-notion-muted hover:text-notion-text transition-colors">
                  Forgot password?
                </Link>
              </div>

              <button type="submit" disabled={loading} className="n-btn w-full">
                {loading ? (
                  <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : (
                  <>
                    <LogIn size={16} /> Sign in
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Side panel — exact no-cap AuthSidePanel layout */}
      <div className="relative hidden overflow-hidden border-l border-notion-border bg-notion-surface lg:flex lg:w-[52%] lg:items-center lg:justify-center">
        <div className="relative z-10 w-full max-w-xl px-14">
          <span className="n-chip mb-6">Virtual University Exam System</span>
          <div className="mb-4 flex items-start gap-3">
            <div className="relative h-[132px] w-[132px] shrink-0">
              {AVATARS.map((src, i) => (
                <img
                  key={src}
                  src={src}
                  alt=""
                  className="absolute h-[76px] w-[76px] rounded-full border-2 border-notion-surface bg-white object-cover"
                  style={{
                    left: (i % 2) * 52,
                    top: Math.floor(i / 2) * 52,
                    zIndex: i + 1,
                  }}
                />
              ))}
            </div>
            <h3 className="min-w-0 flex-1 text-4xl font-bold leading-[1.15] tracking-tight text-notion-text">
              <span className="block whitespace-nowrap">Self-service</span>
              <span className="block whitespace-nowrap">exam scheduling</span>
              <span className="block whitespace-nowrap">for every student.</span>
            </h3>
          </div>
          <p className="text-base leading-relaxed text-notion-muted">
            Pick your exam branch, choose dates and times for each course, and print a clean, conflict-free date sheet.
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
