import { lazy, Suspense, useState } from 'react'

const AboutLazy = lazy(() => import('./AboutLazy.tsx'))

export default function AboutApp() {
  const [showLazy, setShowLazy] = useState(false)

  return (
    <section style={{ maxWidth: '40rem', margin: '3rem auto', textAlign: 'center' }}>
      <h1>About page</h1>
      <p>This is the second entry point in this Vite MPA build (input: `about`).</p>
      <button type="button" onClick={() => setShowLazy(true)}>
        Load lazy chunk
      </button>
      {showLazy && (
        <Suspense fallback={<p>Loading…</p>}>
          <AboutLazy />
        </Suspense>
      )}
    </section>
  )
}
