import React, { useState } from 'react'; 
import { Link } from 'react-router-dom'; 
import { AuthLayout } from '../components/AuthLayout.jsx'; 
import { Input } from '../../../shared/components/ui/Input.jsx'; 
import { Button } from '../../../shared/components/ui/Button.jsx'; 
import { useAuth } from '../../../shared/hooks/useAuth.js'; 
import { useToast } from '../../../shared/components/ui/Toast.jsx'; 
import { normalizeError } from '../../../shared/api/errors.js'; 
import { ROUTES } from '../../../app/constants/routes.js'; 

export default function ForgotPassword() {
  const { forgotPassword } = useAuth(); 
  const toast = useToast(); 
  const [email, setEmail] = useState(''); 
  const [loading, setLoading] = useState(false); 
  const [response, setResponse] = useState(null); 

  return (
    <AuthLayout title="Forgot password" subtitle="We will send a reset link if the account exists">
      <form
        className="space-y-4"
        onSubmit={async (e) => {
          e.preventDefault(); 
          setLoading(true); 
          setResponse(null); 
          try {
            const res = await forgotPassword({ email }); 
            setResponse(res); 
            toast.success('If your email exists, you will receive reset instructions.'); 
          } catch (e2) {
            const ne = normalizeError(e2); 
            toast.error(ne.message); 
          } finally {
            setLoading(false); 
          }
        }}
      >
        <Input label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <Button className="w-full" type="submit" disabled={loading}>
          {loading ? 'Sending…' : 'Send reset instructions'}
        </Button>

        {response?.issued?.length ? (
          <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            Dev mode: reset token returned in response. Use it on the reset page.
          </div>
        ) : null}

        <div className="text-center text-sm">
          <Link className="text-brand-primary hover:underline" to={ROUTES.login}>
            Back to sign in
          </Link>
        </div>
      </form>
    </AuthLayout>
  ); 
}
