import './Lazy.css'

export default function Lazy() {
  return (
    <div className="lazy-panel">
      <p>
        This panel (and its CSS) was loaded via a dynamic <code>import()</code>, client-side, after hydration.
      </p>
      <p>
        Open the Network tab: the request for this chunk should carry a <code>?nfdpl=&lt;token&gt;</code> query
        parameter when <code>NETLIFY_SKEW_PROTECTION_TOKEN</code> was set at build time.
      </p>
    </div>
  )
}
