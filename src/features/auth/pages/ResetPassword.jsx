import React, { useState } from 'react'; 
import { Link, useNavigate, useSearchParams } from 'react-router-dom'; 
import { AuthLayout } from '../components/AuthLayout.jsx'; 
import { Input } from '../../../shared/components/ui/Input.jsx'; 
import { Button } from '../../../shared/components/ui/Button.jsx'; 
import { useAuth } from '../../../shared/hooks/useAuth.js'; 
import { useToast } from '../../../shared/components/ui/Toast.jsx'; 
import { normalizeError } from '../../../shared/api/errors.js'; 
import { ROUTES } from '../../../app/constants/routes.js'; 

export default function ResetPassword() {
  const { resetPassword } = useAuth(); 
  const toast = useToast(); 
  const nav = useNavigate(); 
  const [sp] = useSearchParams(); 

  const [token, setToken] = useState(sp.get('token') ?? ''); 
  const [newPassword, setNewPassword] = useState(''); 
  const [loading, setLoading] = useState(false); 

  return (
    <AuthLayout title="Reset password" subtitle="Set a new password for your account">
      <form
        className="space-y-4"
        onSubmit={async (e) => {
          e.preventDefault(); 
          setLoading(true); 
          try {
            await resetPassword({ token, newPassword }); 
            toast.success('Password reset. You can now sign in.'); 
            nav(ROUTES.login, { replace: true }); 
          } catch (e2) {
            const ne = normalizeError(e2); 
            toast.error(ne.message); 
          } finally {
            setLoading(false); 
          }
        }}
      >
        <Input label="Reset token" value={token} onChange={(e) => setToken(e.target.value)} required />
        <Input label="New password (min 10 chars)" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} minLength={10} required />
        <Button className="w-full" type="submit" disabled={loading}>
          {loading ? 'Resetting…' : 'Reset password'}
        </Button>
        <div className="text-center text-sm">
          <Link className="text-brand-primary hover:underline" to={ROUTES.login}>
            Back to sign in
          </Link>
        </div>
      </form>
    </AuthLayout>
  ); 
}
