import type { FormEvent, ReactNode } from 'react'

type AuthCardProps = {
  subtitle: string
  onSubmit: (e: FormEvent<HTMLFormElement>) => void
  children: ReactNode
  footer?: ReactNode
}

export function AuthCard({ subtitle, onSubmit, children, footer }: AuthCardProps) {
  return (
    <main className="flex min-h-svh items-center justify-center px-4 py-10">
      <form onSubmit={onSubmit} noValidate className="flex w-full max-w-sm flex-col gap-4 rounded-xl bg-surface p-8">
        <header>
          <h1 className="text-2xl font-semibold">Vitalog</h1>
          <p className="text-sm text-muted">{subtitle}</p>
        </header>
        {children}
        {footer && <div className="text-center text-sm text-muted">{footer}</div>}
      </form>
    </main>
  )
}
