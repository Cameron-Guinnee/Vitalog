import { useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'
import { AuthCard } from '../../components/AuthCard'
import { Alert } from '../../components/ui/alert'
import { Button } from '../../components/ui/button'
import { Field } from '../../components/ui/field'
import { Input } from '../../components/ui/input'
import { supabase } from '../../lib/supabase'

export function Login() {
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    if (!email || !password) {
      setError('Enter your email and password.')
      return
    }
    setSubmitting(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setSubmitting(false)
    if (error) {
      setError(error.message)
      return
    }
    const from = (location.state as { from?: string } | null)?.from
    navigate(from ?? '/dashboard', { replace: true })
  }

  return (
    <AuthCard
      subtitle="Sign in to your account"
      onSubmit={handleSubmit}
      footer={
        <>
          Don’t have an account? <Link to="/signup" className="text-primary hover:underline">Sign up</Link>
        </>
      }
    >
      <Field label="Email" htmlFor="email">
        <Input id="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      </Field>
      <Field label="Password" htmlFor="password">
        <Input
          id="password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </Field>
      <Link to="/forgot-password" className="self-end text-sm text-primary hover:underline">
        Forgot password?
      </Link>
      {error && <Alert tone="error">{error}</Alert>}
      <Button type="submit" size="lg" disabled={submitting}>
        {submitting ? 'Signing in…' : 'Sign in'}
      </Button>
    </AuthCard>
  )
}
