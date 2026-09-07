import { formatGreeting } from './shared'

export default function Lazy2() {
  return (
    <div className="lazy-panel">
      <p>{formatGreeting('Lazy2')}</p>
      <p>
        A second lazy chunk that imports the same <code>shared.ts</code> module as <code>Lazy.tsx</code> — Rollup
        should split it into its own shared chunk, statically imported from both.
      </p>
    </div>
  )
}
