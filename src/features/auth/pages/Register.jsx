import React, { useMemo, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthLayout } from '../components/AuthLayout.jsx';
import { Input } from '../../../shared/components/ui/Input.jsx';
import { Button } from '../../../shared/components/ui/Button.jsx';
import { useToast } from '../../../shared/components/ui/Toast.jsx';
import { useAuth } from '../../../shared/hooks/useAuth.js';
import { CurrencySelect } from '../../../shared/components/forms/CurrencySelect.jsx';
import { normalizeError } from '../../../shared/api/errors.js';
import { ROUTES } from '../../../app/constants/routes.js';

export default function Register() {
  const { register } = useAuth();
  const nav = useNavigate();
  const toast = useToast();

  const [organizationName, setOrganizationName] = useState('');
  const [baseCurrencyCode, setBaseCurrencyCode] = useState('GHS');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const passwordMismatch = useMemo(() => {
    if (!confirmPassword) return false;
    return password !== confirmPassword;
  }, [password, confirmPassword]);

  const canSubmit = organizationName.trim() && email.trim() && password.length >= 10 && !passwordMismatch;

  return (
    <AuthLayout title="Create organization" subtitle="Create the organization and its initial admin account">
      <form
        className="space-y-4"
        onSubmit={async (e) => {
          e.preventDefault();
          if (password !== confirmPassword) {
            setError({ message: 'Passwords do not match.' });
            toast.error('Passwords do not match.');
            return;
          }
          setLoading(true);
          setError(null);
          try {
            await register({ organizationName, baseCurrencyCode, email, password });
            toast.success('Organization created. You are signed in.');
            nav(ROUTES.dashboard, { replace: true });
          } catch (e2) {
            const ne = normalizeError(e2);
            setError(ne);
            toast.error(ne.message);
          } finally {
            setLoading(false);
          }
        }}
      >
        <Input label="Organization name" value={organizationName} onChange={(e) => setOrganizationName(e.target.value)} required />
        <CurrencySelect label="Base currency" value={baseCurrencyCode} onChange={(e) => setBaseCurrencyCode(e.target.value)} />
        <Input label="Admin email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <Input label="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} minLength={10} required helperText="Minimum 10 characters required" />
        <Input label="Confirm password" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required error={passwordMismatch ? 'Passwords do not match' : undefined} />

        {error ? <div className="text-sm text-red-600">{error.message}</div> : null}

        <Button className="w-full" type="submit" disabled={loading || !canSubmit}>
          {loading ? 'Creating…' : 'Create organization'}
        </Button>

        <div className="text-center text-sm">
          <Link className="text-brand-primary hover:underline" to={ROUTES.login}>
            Already have an account? Sign in
          </Link>
        </div>
      </form>
    </AuthLayout>
  );
}
