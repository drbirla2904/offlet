import { useNavigate } from 'react-router-dom'
import { Link } from 'react-router-dom'
import { PhoneOtpForm } from '../components/PhoneOtpForm'
import type { User } from '../types'

export function LoginPage() {
  const navigate = useNavigate()

  const handleSuccess = (user: User, created: boolean) => {
    if (user.role === 'shopkeeper') {
      navigate(created ? '/dashboard/setup' : '/dashboard')
    } else {
      navigate('/')
    }
  }

  return (
    <div className="max-w-sm mx-auto px-4 pt-10 pb-20">
      <h1 className="font-display text-2xl font-semibold text-ink mb-1">Welcome</h1>
      <p className="text-sm text-ink-soft mb-5">
        No password to remember — we'll text you a one-time code.
      </p>

      <PhoneOtpForm onSuccess={handleSuccess} />
      <p className="mt-5 text-xs leading-5 text-ink-soft">
        By creating an account, you agree to our <Link to="/terms" className="font-semibold text-teal underline">Terms of Service</Link> and acknowledge the <Link to="/privacy" className="font-semibold text-teal underline">Privacy Policy</Link>.
      </p>
    </div>
  )
}
