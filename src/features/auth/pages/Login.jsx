import React, { useMemo, useState } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { AuthLayout } from '../components/AuthLayout.jsx';
import { Input } from '../../../shared/components/ui/Input.jsx';
import { Button } from '../../../shared/components/ui/Button.jsx';
import { Modal } from '../../../shared/components/ui/Modal.jsx';
import { Select } from '../../../shared/components/ui/Select.jsx';
import { useAuth } from '../../../shared/hooks/useAuth.js';
import { useOrg } from '../../../shared/hooks/useOrg.js';
import { ROUTES } from '../../../app/constants/routes.js';
import { normalizeError } from '../../../shared/api/errors.js';
import { useToast } from '../../../shared/components/ui/Toast.jsx';
import { ApiContext } from '../../../app/providers/AppProviders.jsx';
import { endpoints } from '../../../shared/api/endpoints.js';

export default function Login() {
  const { login } = useAuth();
  const { switchOrganization } = useOrg();
  const { http } = React.useContext(ApiContext);
  const nav = useNavigate();
  const location = useLocation();
  const toast = useToast();

  const from = location.state?.from?.pathname ?? ROUTES.dashboard;

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [organizationOptions, setOrganizationOptions] = useState([]);
  const [selectedOrganizationId, setSelectedOrganizationId] = useState('');
  const [organizationModalOpen, setOrganizationModalOpen] = useState(false);
  const [finishingLogin, setFinishingLogin] = useState(false);

  const showOtp = useMemo(() => Boolean(otp) || error?.status === 401, [otp, error]);

  const organizationSelectOptions = useMemo(() => {
    const options = [{ value: '', label: 'Select organization…' }];
    for (const org of organizationOptions) {
      options.push({
        value: org.id,
        label: org.is_current ? `${org.name} (current)` : org.name
      });
    }
    return options;
  }, [organizationOptions]);

  async function completeLogin() {
    try {
      setFinishingLogin(true);
      if (!selectedOrganizationId) {
        toast.error('Select an organization to continue.');
        return;
      }

      const currentOrg = organizationOptions.find((org) => org.is_current);
      if (!currentOrg || currentOrg.id !== selectedOrganizationId) {
        await switchOrganization(selectedOrganizationId);
      }

      toast.success('Signed in successfully.');
      setOrganizationModalOpen(false);
      nav(from, { replace: true });
    } catch (e2) {
      const ne = normalizeError(e2);
      setError(ne);
      toast.error(ne.message || 'Could not switch organization.');
    } finally {
      setFinishingLogin(false);
    }
  }

  return (
    <>
      <AuthLayout title="Sign in" subtitle="Use your organization account">
        <form
          className="space-y-4"
          onSubmit={async (e) => {
            e.preventDefault();
            setLoading(true);
            setError(null);
            try {
              await login({ email, password, ...(otp ? { otp } : {}) });
              const orgRes = await http.get(endpoints.core.users.meOrganizations);
              const organizations = orgRes.data?.organizations ?? [];
              const current = organizations.find((org) => org.is_current) ?? organizations[0] ?? null;

              if (organizations.length > 1) {
                setOrganizationOptions(organizations);
                setSelectedOrganizationId(current?.id ?? '');
                setOrganizationModalOpen(true);
              } else {
                toast.success('Signed in successfully.');
                nav(from, { replace: true });
              }
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
          {showOtp ? <Input label="OTP (2FA)" value={otp} onChange={(e) => setOtp(e.target.value)} placeholder="123456" /> : null}

          {error ? <div className="text-sm text-red-600">{error.message}</div> : null}

          <Button className="w-full" type="submit" disabled={loading}>
            {loading ? 'Signing in…' : 'Sign in'}
          </Button>

          <div className="flex items-center justify-between text-sm">
            <Link className="text-brand-primary hover:underline" to={ROUTES.forgotPassword}>
              Forgot password?
            </Link>
            <Link className="text-brand-primary hover:underline" to={ROUTES.register}>
              Create organization
            </Link>
          </div>
        </form>
      </AuthLayout>

      <Modal
        open={organizationModalOpen}
        title="Choose organization"
        onClose={() => setOrganizationModalOpen(false)}
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setOrganizationModalOpen(false)} disabled={finishingLogin}>
              Cancel
            </Button>
            <Button onClick={completeLogin} loading={finishingLogin} disabled={!selectedOrganizationId}>
              Continue
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
            Your account belongs to more than one organization. Select the organization by name to continue. Users do not need to enter any UUIDs.
          </div>
          <Select
            label="Organization"
            value={selectedOrganizationId}
            onChange={(e) => setSelectedOrganizationId(e.target.value)}
            options={organizationSelectOptions}
          />
        </div>
      </Modal>
    </>
  );
}
