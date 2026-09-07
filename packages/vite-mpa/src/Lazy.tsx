import './Lazy.css'

export default function Lazy() {
  return (
    <div className="lazy-panel">
      <p>
        Home page lazy chunk, loaded via a dynamic <code>import()</code>. Its request should carry{' '}
        <code>?nfdpl=&lt;token&gt;</code> when skew protection is active.
      </p>
    </div>
  )
}
