import { useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import { AuthCard } from '../../components/AuthCard'
import { Alert } from '../../components/ui/alert'
import { Button } from '../../components/ui/button'
import { Field } from '../../components/ui/field'
import { Input } from '../../components/ui/input'
import { appUrl, supabase } from '../../lib/supabase'

export const MIN_PASSWORD_LENGTH = 8

export function Signup() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    if (!email) return setError('Enter your email address.')
    if (password.length < MIN_PASSWORD_LENGTH) return setError(`Use at least ${MIN_PASSWORD_LENGTH} characters for your password.`)
    if (password !== confirm) return setError('Passwords don’t match.')

    setSubmitting(true)
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: appUrl('/onboarding') },
    })
    setSubmitting(false)
    if (error) return setError(error.message)
    setSent(true)
  }

  return (
    <AuthCard
      subtitle="Create your account"
      onSubmit={handleSubmit}
      footer={
        <>
          Already have an account? <Link to="/login" className="text-primary hover:underline">Sign in</Link>
        </>
      }
    >
      {sent ? (
        <Alert tone="success">Account created. Check your email for a link to confirm it.</Alert>
      ) : (
        <>
          <Field label="Email" htmlFor="email">
            <Input id="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </Field>
          <Field label="Password" htmlFor="password" hint={`At least ${MIN_PASSWORD_LENGTH} characters.`}>
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </Field>
          <Field label="Confirm password" htmlFor="confirm">
            <Input
              id="confirm"
              type="password"
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
            />
          </Field>
          {error && <Alert tone="error">{error}</Alert>}
          <Button type="submit" size="lg" disabled={submitting}>
            {submitting ? 'Creating account…' : 'Create account'}
          </Button>
        </>
      )}
    </AuthCard>
  )
}
