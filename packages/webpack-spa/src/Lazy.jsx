import './Lazy.css'

export default function Lazy() {
  return (
    <div className="lazy-panel">
      <p>
        This panel was loaded via a dynamic <code>import()</code>. Webpack splits both its JS chunk and its CSS
        chunk (via mini-css-extract-plugin) — open the Network tab: both requests should carry a{' '}
        <code>?nfdpl=&lt;token&gt;</code> query parameter when skew protection is active.
      </p>
    </div>
  )
}
