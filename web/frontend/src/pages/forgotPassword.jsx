import { useState } from 'react';
import { Link } from 'react-router-dom';
import { authAPI } from '../utils/api';
import { useWarn } from '../components/GuideModal';
import BrandLogo from '../components/BrandLogo';
import { Mail, ArrowLeft, CheckCircle } from 'lucide-react';

const ForgotPasswordPage = () => {
  const warn = useWarn();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) return warn('Please enter your email');

    setLoading(true);
    try {
      await authAPI.forgotPassword({ email });
      setSent(true);
    } catch (err) {
      warn(err.response?.data?.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="n-page flex min-h-screen items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex justify-center">
          <BrandLogo to="/login" imgClassName="h-9 w-auto" />
        </div>
        {sent ? (
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-notion-green-soft">
              <CheckCircle size={24} className="text-notion-green" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight">Check your email</h1>
            <p className="mt-2 text-sm text-notion-muted">
              If an account exists for <strong>{email}</strong>, we've sent a password reset link.
            </p>
            <Link to="/login" className="n-btn mt-6 inline-flex">
              <ArrowLeft size={16} /> Back to login
            </Link>
          </div>
        ) : (
          <>
            <div className="mb-8 text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-notion-surface">
                <Mail size={24} className="text-notion-text" />
              </div>
              <h1 className="text-2xl font-bold tracking-tight">Forgot password?</h1>
              <p className="mt-1 text-sm text-notion-muted">Enter your email and we'll send a reset link</p>
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

              <button type="submit" disabled={loading} className="n-btn w-full">
                {loading ? (
                  <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : (
                  'Send Reset Link'
                )}
              </button>
            </form>

            <p className="mt-6 text-center text-xs text-notion-muted">
              <Link to="/login" className="font-medium text-notion-text hover:underline">
                <ArrowLeft size={12} className="mr-1 inline" />Back to login
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
