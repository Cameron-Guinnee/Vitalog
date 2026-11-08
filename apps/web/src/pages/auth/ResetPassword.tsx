import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router'
import { useAuth } from '../../auth/AuthProvider'
import { AuthCard } from '../../components/AuthCard'
import { Alert } from '../../components/ui/alert'
import { Button } from '../../components/ui/button'
import { Field } from '../../components/ui/field'
import { Input } from '../../components/ui/input'
import { supabase } from '../../lib/supabase'
import { MIN_PASSWORD_LENGTH } from './Signup'

// The reset email links here with a one-time code; the Supabase client exchanges it
// for a short-lived session on load, which is what lets updateUser set the password.
export function ResetPassword() {
  const navigate = useNavigate()
  const { session, loading } = useAuth()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    if (password.length < MIN_PASSWORD_LENGTH) return setError(`Use at least ${MIN_PASSWORD_LENGTH} characters for your password.`)
    if (password !== confirm) return setError('Passwords don’t match.')
    setSubmitting(true)
    const { error } = await supabase.auth.updateUser({ password })
    setSubmitting(false)
    if (error) return setError(error.message)
    navigate('/dashboard', { replace: true })
  }

  const footer = (
    <Link to="/login" className="text-primary hover:underline">
      Back to sign in
    </Link>
  )

  if (!loading && !session) {
    return (
      <AuthCard subtitle="Set a new password" onSubmit={(e) => e.preventDefault()} footer={footer}>
        <Alert tone="error">This reset link is invalid or has expired.</Alert>
        <Link to="/forgot-password" className="text-sm text-primary hover:underline">
          Request a new link
        </Link>
      </AuthCard>
    )
  }

  return (
    <AuthCard subtitle="Set a new password" onSubmit={handleSubmit} footer={footer}>
      <Field label="New password" htmlFor="password" hint={`At least ${MIN_PASSWORD_LENGTH} characters.`}>
        <Input id="password" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
      </Field>
      <Field label="Confirm new password" htmlFor="confirm">
        <Input id="confirm" type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
      </Field>
      {error && <Alert tone="error">{error}</Alert>}
      <Button type="submit" size="lg" disabled={submitting || loading}>
        {submitting ? 'Saving…' : 'Update password'}
      </Button>
    </AuthCard>
  )
}
