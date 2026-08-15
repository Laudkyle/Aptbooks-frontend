import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { MailCheck, ShieldCheck } from 'lucide-react';
import { ApiContext } from '../app/providers/AppProviders.jsx';
import { endpoints } from '../shared/api/endpoints.js';
import { ContentCard } from '../shared/components/layout/ContentCard.jsx';
import { Button } from '../shared/components/ui/Button.jsx';
import { Input } from '../shared/components/ui/Input.jsx';
import { useAuth } from '../shared/hooks/useAuth.js';
import { useOrg } from '../shared/hooks/useOrg.js';
import { useToast } from '../shared/components/ui/Toast.jsx';
import { normalizeError } from '../shared/api/errors.js';

export default function Me() {
  const { http } = React.useContext(ApiContext);
  const toast = useToast();
  const auth = useAuth();
  const { currentOrg } = useOrg();
  const [enableOtp, setEnableOtp] = useState('');
  const [enableChallenge, setEnableChallenge] = useState(null);
  const [disablePassword, setDisablePassword] = useState('');
  const [disableOtp, setDisableOtp] = useState('');
  const [disableChallenge, setDisableChallenge] = useState(null);
  const [busy, setBusy] = useState(false);
  const twoFactorEnabled = Boolean(auth.user?.two_factor_enabled);

  const loginHistoryQuery = useQuery({
    queryKey: ['me', 'loginHistory', 50],
    queryFn: async () => (await http.get(endpoints.core.users.meLoginHistory(50))).data
  });

  async function sendEnableCode() {
    try {
      setBusy(true);
      const res = await auth.enroll2fa();
      setEnableChallenge(res);
      setEnableOtp('');
      toast.success(`Verification code sent to ${res.maskedEmail || auth.user?.email}.`);
    } catch (e) { toast.error(normalizeError(e).message); }
    finally { setBusy(false); }
  }

  async function enableTwoFactor() {
    try {
      setBusy(true);
      await auth.verify2fa({ challengeId: enableChallenge?.challengeId, otp: enableOtp });
      setEnableChallenge(null);
      setEnableOtp('');
      toast.success('Email verification enabled.');
    } catch (e) { toast.error(normalizeError(e).message); }
    finally { setBusy(false); }
  }

  async function sendDisableCode() {
    try {
      setBusy(true);
      const res = await auth.requestDisable2fa({ password: disablePassword });
      setDisableChallenge(res);
      setDisableOtp('');
      toast.success(`Disable code sent to ${res.maskedEmail || auth.user?.email}.`);
    } catch (e) { toast.error(normalizeError(e).message); }
    finally { setBusy(false); }
  }

  async function disableTwoFactor() {
    try {
      setBusy(true);
      await auth.disable2fa({ password: disablePassword, challengeId: disableChallenge?.challengeId, otp: disableOtp });
      setDisableChallenge(null);
      setDisablePassword('');
      setDisableOtp('');
      toast.success('Email verification disabled.');
    } catch (e) { toast.error(normalizeError(e).message); }
    finally { setBusy(false); }
  }

  return (
    <div className="space-y-4">
      <div className="text-2xl font-semibold text-brand-deep">My profile</div>

      <ContentCard title="Account">
        <div className="grid gap-2 text-sm">
          <div><span className="text-slate-500">Email:</span> {auth.user?.email}</div>
          <div><span className="text-slate-500">User ID:</span> {auth.user?.id}</div>
          <div><span className="text-slate-500">Active organization:</span> {currentOrg?.name || auth.user?.organization_id}</div>
          {currentOrg?.base_currency_code ? <div><span className="text-slate-500">Base currency:</span> {currentOrg.base_currency_code}</div> : null}
        </div>
      </ContentCard>

      <ContentCard title="Two-step verification by email">
        <div className="space-y-4">
          <div className={`flex items-start gap-3 rounded-2xl border p-4 ${twoFactorEnabled ? 'border-emerald-200 bg-emerald-50' : 'border-slate-200 bg-slate-50'}`}>
            {twoFactorEnabled ? <ShieldCheck className="mt-0.5 h-5 w-5 text-emerald-700" /> : <MailCheck className="mt-0.5 h-5 w-5 text-slate-600" />}
            <div>
              <div className="text-sm font-semibold text-slate-900">{twoFactorEnabled ? 'Enabled' : 'Not enabled'}</div>
              <div className="mt-1 text-xs leading-5 text-slate-600">When enabled, AptBooks sends a one-time 6-digit code to <strong>{auth.user?.email}</strong> after your password is verified. No authenticator app is required.</div>
            </div>
          </div>

          {!twoFactorEnabled ? (
            <div className="space-y-3">
              {!enableChallenge ? <Button onClick={sendEnableCode} loading={busy}>Send verification code</Button> : (
                <div className="grid gap-3 md:grid-cols-[1fr_auto]">
                  <Input label={`Code sent to ${enableChallenge.maskedEmail || auth.user?.email}`} inputMode="numeric" autoComplete="one-time-code" value={enableOtp} onChange={(e) => setEnableOtp(e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="123456" />
                  <div className="flex items-end gap-2"><Button variant="secondary" onClick={sendEnableCode} disabled={busy}>Resend</Button><Button onClick={enableTwoFactor} loading={busy} disabled={enableOtp.length !== 6}>Verify & enable</Button></div>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3 border-t border-slate-200 pt-4">
              <div className="text-sm font-semibold text-slate-900">Disable email verification</div>
              <div className="grid gap-3 md:grid-cols-2">
                <Input label="Current password" type="password" value={disablePassword} onChange={(e) => { setDisablePassword(e.target.value); setDisableChallenge(null); setDisableOtp(''); }} />
                {!disableChallenge ? <div className="flex items-end"><Button variant="secondary" onClick={sendDisableCode} loading={busy} disabled={!disablePassword}>Send disable code</Button></div> : <Input label={`Email code · ${disableChallenge.maskedEmail || auth.user?.email}`} inputMode="numeric" value={disableOtp} onChange={(e) => setDisableOtp(e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="123456" />}
              </div>
              {disableChallenge ? <div className="flex gap-2"><Button variant="secondary" onClick={sendDisableCode} disabled={busy}>Resend code</Button><Button variant="danger" onClick={disableTwoFactor} loading={busy} disabled={disableOtp.length !== 6}>Disable verification</Button></div> : null}
            </div>
          )}
        </div>
      </ContentCard>

      <ContentCard title="Login history">
        {loginHistoryQuery.isLoading ? <div className="text-sm text-slate-600">Loading…</div> : null}
        {loginHistoryQuery.error ? <div className="text-sm text-red-600">{normalizeError(loginHistoryQuery.error).message}</div> : null}
        <div className="overflow-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-slate-500"><tr><th className="py-2">When</th><th className="py-2">Success</th><th className="py-2">IP</th><th className="py-2">Agent</th><th className="py-2">Reason</th></tr></thead>
            <tbody>{(loginHistoryQuery.data?.data ?? []).map((r) => <tr key={r.id} className="border-t border-slate-100"><td className="py-2">{r.created_at}</td><td className="py-2">{r.success ? 'Yes' : 'No'}</td><td className="py-2">{r.ip ?? ''}</td><td className="py-2 max-w-[24rem] truncate">{r.user_agent ?? ''}</td><td className="py-2">{r.failure_reason ?? ''}</td></tr>)}</tbody>
          </table>
        </div>
      </ContentCard>
    </div>
  );
}
