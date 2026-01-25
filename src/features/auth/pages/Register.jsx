import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthLayout } from '../components/AuthLayout.jsx';
import { Input } from '../../../shared/components/ui/Input.jsx';
import { Button } from '../../../shared/components/ui/Button.jsx';
import { Select } from '../../../shared/components/ui/Select.jsx';
import { useToast } from '../../../shared/components/ui/Toast.jsx';
import { useAuth } from '../../../shared/hooks/useAuth.js';
import { CURRENCIES } from '../../../app/constants/currencies.js';
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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  return (
    <AuthLayout title="Create organization" subtitle="Creates an org and initial admin user">
      <form
        className="space-y-4"
        onSubmit={async (e) => {
          e.preventDefault();
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
        <Select
          label="Base currency"
          value={baseCurrencyCode}
          onChange={(e) => setBaseCurrencyCode(e.target.value)}
          options={CURRENCIES.map((c) => ({ value: c.code, label: `${c.code} — ${c.name}` }))}
        />
        <Input label="Admin email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <Input label="Password (min 10 chars)" type="password" value={password} onChange={(e) => setPassword(e.target.value)} minLength={10} required />

        {error ? <div className="text-sm text-red-600">{error.message}</div> : null}

        <Button className="w-full" type="submit" disabled={loading}>
          {loading ? 'Creating…' : 'Create org'}
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
