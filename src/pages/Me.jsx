import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ApiContext } from '../app/providers/AppProviders.jsx';
import { endpoints } from '../shared/api/endpoints.js';
import { qk } from '../shared/query/keys.js';
import { ContentCard } from '../shared/components/layout/ContentCard.jsx';
import { Button } from '../shared/components/ui/Button.jsx';
import { Input } from '../shared/components/ui/Input.jsx';
import { useAuth } from '../shared/hooks/useAuth.js';
import { useToast } from '../shared/components/ui/Toast.jsx';
import { normalizeError } from '../shared/api/errors.js';

export default function Me() {
  const { http } = React.useContext(ApiContext);
  const toast = useToast();
  const auth = useAuth();
  const [otp, setOtp] = useState('');
  const [disablePassword, setDisablePassword] = useState('');

  const loginHistoryQuery = useQuery({
    queryKey: ['me', 'loginHistory', 50],
    queryFn: async () => {
      const res = await http.get(endpoints.core.users.meLoginHistory(50));
      return res.data;
    }
  });

  return (
    <div className="space-y-4">
      <div className="text-2xl font-semibold text-brand-deep">My profile</div>

      <ContentCard title="Account">
        <div className="grid gap-2 text-sm">
          <div><span className="text-slate-500">Email:</span> {auth.user?.email}</div>
          <div><span className="text-slate-500">User ID:</span> {auth.user?.id}</div>
          <div><span className="text-slate-500">Organization:</span> {auth.user?.organization_id}</div>
        </div>
      </ContentCard>

      <ContentCard title="Two-factor authentication (TOTP)">
        <div className="grid gap-3 md:grid-cols-3">
          <div className="md:col-span-1">
            <Button
              variant="secondary"
              onClick={async () => {
                try {
                  const res = await auth.enroll2fa();
                  toast.success('2FA secret issued. Scan with authenticator app.');
                  window.prompt('TOTP secret (store in authenticator):', res.secret);
                } catch (e) {
                  toast.error(normalizeError(e).message);
                }
              }}
            >
              Enroll
            </Button>
          </div>
          <div className="md:col-span-2 space-y-2">
            <div className="grid gap-2 md:grid-cols-2">
              <Input label="OTP" value={otp} onChange={(e) => setOtp(e.target.value)} placeholder="123456" />
              <Button
                onClick={async () => {
                  try {
                    await auth.verify2fa({ otp });
                    toast.success('2FA enabled.');
                    setOtp('');
                  } catch (e) {
                    toast.error(normalizeError(e).message);
                  }
                }}
              >
                Verify / Enable
              </Button>
            </div>
            <div className="grid gap-2 md:grid-cols-3">
              <Input
                label="Password"
                type="password"
                value={disablePassword}
                onChange={(e) => setDisablePassword(e.target.value)}
              />
              <Input label="OTP" value={otp} onChange={(e) => setOtp(e.target.value)} placeholder="123456" />
              <Button
                variant="danger"
                onClick={async () => {
                  try {
                    await auth.disable2fa({ password: disablePassword, otp });
                    toast.success('2FA disabled.');
                    setDisablePassword('');
                    setOtp('');
                  } catch (e) {
                    toast.error(normalizeError(e).message);
                  }
                }}
              >
                Disable
              </Button>
            </div>
          </div>
        </div>
      </ContentCard>

      <ContentCard title="Login history">
        {loginHistoryQuery.isLoading ? <div className="text-sm text-slate-600">Loading…</div> : null}
        {loginHistoryQuery.error ? <div className="text-sm text-red-600">{normalizeError(loginHistoryQuery.error).message}</div> : null}
        <div className="overflow-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-slate-500">
              <tr>
                <th className="py-2">When</th>
                <th className="py-2">Success</th>
                <th className="py-2">IP</th>
                <th className="py-2">Agent</th>
                <th className="py-2">Reason</th>
              </tr>
            </thead>
            <tbody>
              {(loginHistoryQuery.data?.data ?? []).map((r) => (
                <tr key={r.id} className="border-t border-slate-100">
                  <td className="py-2">{r.created_at}</td>
                  <td className="py-2">{r.success ? 'Yes' : 'No'}</td>
                  <td className="py-2">{r.ip ?? ''}</td>
                  <td className="py-2 max-w-[24rem] truncate">{r.user_agent ?? ''}</td>
                  <td className="py-2">{r.failure_reason ?? ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ContentCard>
    </div>
  );
}
