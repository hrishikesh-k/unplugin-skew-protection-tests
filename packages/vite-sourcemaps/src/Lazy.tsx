// Dynamically imported (`React.lazy(() => import('./Lazy.tsx'))`) — exercises the *dynamic*
// `import()` stamping path, the original (and simpler) case `render-chunk.ts` handles: the
// specifier is rewritten as a whole quoted-string replacement rather than an in-place overwrite.
//
// Padded with these comment lines for the same reason as vendorThrower.ts: so the `throw` below
// sits at a distinctive, easy-to-check original line number.
export default function Lazy() {
  return (
    <div>
      <p>Loaded via a dynamic import() — click the button to throw from this chunk.</p>
    </div>
  )
}

export function throwFromLazyChunk(): never {
  throw new Error('thrown from the dynamic-import (lazy) chunk')
}
