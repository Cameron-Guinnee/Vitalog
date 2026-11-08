import { Link } from 'react-router'

export function NotFound() {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-3 px-4">
      <h1 className="text-2xl font-semibold">Page not found</h1>
      <Link to="/" className="text-primary hover:underline">
        Back to Vitalog
      </Link>
    </main>
  )
}
