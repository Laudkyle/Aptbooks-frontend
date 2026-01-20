import React, { useMemo, useState } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { AuthLayout } from '../components/AuthLayout.jsx';
import { Input } from '../../../shared/components/ui/Input.jsx';
import { Button } from '../../../shared/components/ui/Button.jsx';
import { useAuth } from '../../../shared/hooks/useAuth.js';
import { ROUTES } from '../../../app/constants/routes.js';
import { normalizeError } from '../../../shared/api/errors.js';
import { useToast } from '../../../shared/components/ui/Toast.jsx';

export default function Login() {
  const { login } = useAuth();
  const nav = useNavigate();
  const location = useLocation();
  const toast = useToast();

  const from = location.state?.from?.pathname ?? ROUTES.dashboard;

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const showOtp = useMemo(() => {
    return Boolean(otp) || error?.status === 401;
  }, [otp, error]);

  return (
    <AuthLayout title="Sign in" subtitle="Use your organization account">
      <form
        className="space-y-4"
        onSubmit={async (e) => {
          e.preventDefault();
          setLoading(true);
          setError(null);
          try {
            await login({ email, password, ...(otp ? { otp } : {}) });
            toast.success('Signed in successfully.');
            nav(from, { replace: true });
          } catch (e2) {
            const ne = normalizeError(e2);
            setError(ne);
            if (ne.status === 401) {
              toast.error(ne.message || 'Authentication failed. If 2FA is enabled, enter your OTP code.');
            } else {
              toast.error(ne.message || 'Sign in failed.');
            }
          } finally {
            setLoading(false);
          }
        }}
      >
        <Input label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <Input label="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        {showOtp ? (
          <Input label="OTP (2FA)" value={otp} onChange={(e) => setOtp(e.target.value)} placeholder="123456" />
        ) : null}

        {error ? <div className="text-sm text-red-600">{error.message}</div> : null}

        <Button className="w-full" type="submit" disabled={loading}>
          {loading ? 'Signing in…' : 'Sign in'}
        </Button>

        <div className="flex items-center justify-between text-sm">
          <Link className="text-brand-primary hover:underline" to={ROUTES.forgotPassword}>
            Forgot password?
          </Link>
          <Link className="text-brand-primary hover:underline" to={ROUTES.register}>
            Create org
          </Link>
        </div>
      </form>
    </AuthLayout>
  );
}
