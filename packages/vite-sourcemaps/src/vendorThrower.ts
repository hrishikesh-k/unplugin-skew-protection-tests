import { helperValue } from './vendorHelper.ts'

// Statically imported from App.tsx and split into its own chunk via `manualChunks` — exercises
// the *static* cross-chunk import stamping path (see render-chunk.ts), which rewrites the
// specifier text in-place via MagicString rather than at codegen time. It also statically imports
// vendorHelper.ts (also split into its own chunk), so *this* file's own generated code contains a
// stamped import too — not just the entry's import of this chunk — exercising the rewrite+remap on
// the exact file whose sourcemap this test checks.
//
// Padded with these comment lines so the `throw` below sits at a distinctive line number,
// making it easy to confirm in `verify-sourcemaps.mjs` that the sourcemap still resolves the
// *stamped* build output back to this exact original line, not an off-by-N line shifted by the
// query-parameter rewrite.
export function throwFromVendorChunk(): never {
  throw new Error(`thrown from the static-import (manualChunks vendor) chunk, helper said ${helperValue()}`)
}
