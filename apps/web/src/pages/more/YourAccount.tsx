import { useQueryClient } from '@tanstack/react-query'
import { isPro } from '@vitalog/shared'
import { useState, type FormEvent, type ReactNode } from 'react'
import { useNavigate } from 'react-router'
import { useAuth, useUserId } from '../../auth/AuthProvider'
import { Alert } from '../../components/ui/alert'
import { Button } from '../../components/ui/button'
import { Dialog } from '../../components/ui/dialog'
import { Field } from '../../components/ui/field'
import { Input } from '../../components/ui/input'
import { profileQueryKey, useProfile } from '../../features/profile/useProfile'
import { supabase } from '../../lib/supabase'
import { MIN_PASSWORD_LENGTH } from '../auth/Signup'

function Section({ title, children, danger }: { title: string; children: ReactNode; danger?: boolean }) {
  return (
    <section aria-label={title} className={`flex flex-col gap-4 rounded-xl bg-surface p-5 ${danger ? 'border border-danger/40' : ''}`}>
      <h2 className={`font-medium ${danger ? 'text-danger' : ''}`}>{title}</h2>
      {children}
    </section>
  )
}

export function YourAccount() {
  const userId = useUserId()
  const email = useAuth().session?.user.email ?? ''
  const profile = useProfile(userId)
  if (profile.isError) return <Alert tone="error">Couldn’t load your account. Refresh to try again.</Alert>
  if (!profile.data) return <p className="text-sm text-muted">Loading…</p>
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
      <AccountDetails userId={userId} email={email} displayName={profile.data.display_name ?? ''} tier={profile.data.subscription_tier} />
      <ChangePassword email={email} />
      <DeleteAccount />
    </div>
  )
}

function AccountDetails({ userId, email, displayName, tier }: { userId: string; email: string; displayName: string; tier: string }) {
  const queryClient = useQueryClient()
  const [name, setName] = useState(displayName)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [saving, setSaving] = useState(false)

  async function save(e: FormEvent) {
    e.preventDefault()
    setSuccess('')
    if (!name.trim()) return setError('Enter a display name.')
    setError('')
    setSaving(true)
    try {
      const { error: saveError } = await supabase
        .from('profiles')
        .update({ display_name: name.trim(), updated_at: new Date().toISOString() })
        .eq('id', userId)
      if (saveError) throw saveError
      await queryClient.invalidateQueries({ queryKey: profileQueryKey(userId) })
      setSuccess('Your display name is saved.')
    } catch (err) {
      console.error(err)
      setError('Couldn’t save your display name. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Section title="Account">
      <form onSubmit={save} noValidate className="flex flex-col gap-4">
        <Field label="Display name" htmlFor="displayName">
          <Input id="displayName" value={name} maxLength={60} onChange={(e) => (setSuccess(''), setName(e.target.value))} />
        </Field>
        <Field label="Email" htmlFor="email" hint="Contact support to change the email you sign in with.">
          <Input id="email" type="email" value={email} readOnly className="text-muted" />
        </Field>
        <Field label="Plan">
          <p className="flex flex-wrap items-center gap-2 text-sm">
            <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${isPro(tier) ? 'bg-primary/15 text-primary' : 'bg-surface-raised'}`}>
              Vitalog {isPro(tier) ? 'Pro' : 'Free'}
            </span>
            {!isPro(tier) && <span className="text-muted">Upgrading to Pro will be available here soon.</span>}
          </p>
        </Field>
        {error && <Alert tone="error">{error}</Alert>}
        {success && <Alert tone="success">{success}</Alert>}
        <Button type="submit" disabled={saving} className="self-end">
          {saving ? 'Saving…' : 'Save changes'}
        </Button>
      </form>
    </Section>
  )
}

function ChangePassword({ email }: { email: string }) {
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [saving, setSaving] = useState(false)

  async function save(e: FormEvent) {
    e.preventDefault()
    setSuccess('')
    if (!current) return setError('Enter your current password.')
    if (next.length < MIN_PASSWORD_LENGTH) return setError(`Use at least ${MIN_PASSWORD_LENGTH} characters for your new password.`)
    if (next !== confirm) return setError('The new passwords don’t match.')
    setError('')
    setSaving(true)
    try {
      // Check the current password first, so someone at an unlocked screen can't change it.
      const check = await supabase.auth.signInWithPassword({ email, password: current })
      if (check.error) return setError('Your current password isn’t right.')
      const { error: updateError } = await supabase.auth.updateUser({ password: next })
      if (updateError) return setError(updateError.message)
      setCurrent('')
      setNext('')
      setConfirm('')
      setSuccess('Your password is changed.')
    } catch (err) {
      console.error(err)
      setError('Couldn’t change your password. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Section title="Change password">
      <form onSubmit={save} noValidate className="flex flex-col gap-4">
        <Field label="Current password" htmlFor="currentPassword">
          <Input id="currentPassword" type="password" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} />
        </Field>
        <Field label="New password" htmlFor="newPassword" hint={`At least ${MIN_PASSWORD_LENGTH} characters.`}>
          <Input id="newPassword" type="password" autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} />
        </Field>
        <Field label="Confirm new password" htmlFor="confirmPassword">
          <Input id="confirmPassword" type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
        </Field>
        {error && <Alert tone="error">{error}</Alert>}
        {success && <Alert tone="success">{success}</Alert>}
        <Button type="submit" disabled={saving} className="self-end">
          {saving ? 'Changing…' : 'Change password'}
        </Button>
      </form>
    </Section>
  )
}

function DeleteAccount() {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [typed, setTyped] = useState('')
  const [error, setError] = useState('')
  const [deleting, setDeleting] = useState(false)

  function close() {
    setOpen(false)
    setTyped('')
    setError('')
  }

  async function remove() {
    setDeleting(true)
    setError('')
    try {
      const { error: deleteError } = await supabase.rpc('delete_own_account')
      if (deleteError) throw deleteError
      // The account is gone, so only clear this browser's session.
      await supabase.auth.signOut({ scope: 'local' })
      navigate('/login', { replace: true })
    } catch (err) {
      console.error(err)
      setError('Couldn’t delete your account. Nothing was removed. Please try again.')
      setDeleting(false)
    }
  }

  return (
    <Section title="Delete account" danger>
      <p className="text-sm text-muted">
        This permanently deletes your account and everything in it: your diary, biometrics, fasts, custom foods, meals, recipes and settings. It can’t be undone.
      </p>
      <Button onClick={() => setOpen(true)} className="self-start bg-danger text-white hover:bg-danger/90">
        Delete account
      </Button>
      <Dialog open={open} onClose={close} title="Delete your account?">
        <p className="text-sm text-muted">Everything in your account will be deleted straight away. Type DELETE to confirm.</p>
        <Input aria-label="Type DELETE to confirm" value={typed} onChange={(e) => setTyped(e.target.value)} placeholder="DELETE" autoComplete="off" />
        {error && <Alert tone="error">{error}</Alert>}
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={close}>
            Cancel
          </Button>
          <Button onClick={remove} disabled={typed !== 'DELETE' || deleting} className="bg-danger text-white hover:bg-danger/90">
            {deleting ? 'Deleting…' : 'Delete my account'}
          </Button>
        </div>
      </Dialog>
    </Section>
  )
}
