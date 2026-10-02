import { Component, type ErrorInfo, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { AlertTriangle, House } from 'lucide-react'

interface Props { children: ReactNode }
interface State { hasError: boolean }

export class RouteErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Page render failed', error, info.componentStack)
  }

  render() {
    if (this.state.hasError) {
      return (
        <main className="mx-auto max-w-xl px-4 py-20 text-center" role="alert">
          <AlertTriangle size={28} className="mx-auto text-amber" />
          <h1 className="mt-4 font-display text-2xl font-semibold text-ink">This page couldn’t load</h1>
          <p className="mt-2 text-sm text-ink-soft">Try reloading, or return to the OFFlet home page.</p>
          <div className="mt-5 flex justify-center gap-3">
            <button type="button" onClick={() => window.location.reload()} className="h-10 border border-border px-4 text-sm font-semibold text-ink">Reload</button>
            <Link to="/" className="inline-flex h-10 items-center gap-2 bg-marigold px-4 text-sm font-semibold text-white"><House size={15} /> Home</Link>
          </div>
        </main>
      )
    }
    return this.props.children
  }
}