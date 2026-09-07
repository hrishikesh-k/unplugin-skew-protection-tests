import './AboutLazy.css'

export default function AboutLazy() {
  return (
    <div className="about-lazy-panel">
      <p>
        About page lazy chunk, loaded via a dynamic <code>import()</code>. Its request should carry{' '}
        <code>?nfdpl=&lt;token&gt;</code> when skew protection is active.
      </p>
    </div>
  )
}
