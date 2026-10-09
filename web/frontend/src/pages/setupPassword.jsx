import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { authAPI } from '../utils/api';
import { useGuide, useWarn } from '../components/GuideModal';
import BrandLogo from '../components/BrandLogo';
import { KeyRound, Eye, EyeOff } from 'lucide-react';

const SetupPasswordPage = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const { say } = useGuide();
  const warn = useWarn();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const valid = password.length >= 8 && password === confirmPassword;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password.length < 8) return warn('Password must be at least 8 characters');
    if (password !== confirmPassword) return warn('Passwords do not match');

    setLoading(true);
    try {
      await authAPI.setupPassword({ token, password });
      say({ title: 'Password Set', body: 'Password set successfully! Please sign in.', action: 'OK' });
      navigate('/login');
    } catch (err) {
      warn(err.response?.data?.message || 'Failed to set password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="n-page flex min-h-screen items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mb-6 flex justify-center">
            <BrandLogo to={null} imgClassName="h-9 w-auto" />
          </div>
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-notion-surface">
            <KeyRound size={24} className="text-notion-text" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Set Your Password</h1>
          <p className="mt-1 text-sm text-notion-muted">Create a secure password for your account</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="n-label">New Password</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min 8 characters"
                className="n-input pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-notion-muted hover:text-notion-text"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {password && password.length < 8 && (
              <p className="mt-1 text-xs text-notion-red">Must be at least 8 characters</p>
            )}
          </div>

          <div>
            <label className="n-label">Confirm Password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter password"
              className="n-input"
            />
            {confirmPassword && password !== confirmPassword && (
              <p className="mt-1 text-xs text-notion-red">Passwords do not match</p>
            )}
          </div>

          <button type="submit" disabled={loading || !valid} className="n-btn w-full">
            {loading ? (
              <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : (
              'Set Password'
            )}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-notion-muted">
          Already have an account?{' '}
          <Link to="/login" className="font-medium text-notion-text hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  );
};

export default SetupPasswordPage;
