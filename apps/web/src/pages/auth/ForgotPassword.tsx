import { useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import { AuthCard } from '../../components/AuthCard'
import { Alert } from '../../components/ui/alert'
import { Button } from '../../components/ui/button'
import { Field } from '../../components/ui/field'
import { Input } from '../../components/ui/input'
import { appUrl, supabase } from '../../lib/supabase'

export function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    if (!email) return setError('Enter your email address.')
    setSubmitting(true)
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: appUrl('/reset-password') })
    setSubmitting(false)
    if (error) return setError(error.message)
    setSent(true)
  }

  return (
    <AuthCard
      subtitle="Reset your password"
      onSubmit={handleSubmit}
      footer={
        <>
          Remembered it? <Link to="/login" className="text-primary hover:underline">Sign in</Link>
        </>
      }
    >
      {sent ? (
        <Alert tone="success">If that email has an account, a reset link is on its way.</Alert>
      ) : (
        <>
          <Field label="Email" htmlFor="email">
            <Input id="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </Field>
          {error && <Alert tone="error">{error}</Alert>}
          <Button type="submit" size="lg" disabled={submitting}>
            {submitting ? 'Sending…' : 'Send reset link'}
          </Button>
        </>
      )}
    </AuthCard>
  )
}
