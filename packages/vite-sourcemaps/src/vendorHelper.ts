// Statically imported by vendorThrower.ts and split into its *own* chunk (separate from
// vendorThrower.ts's), so vendor-thrower.js's own generated code contains a stamped static
// cross-chunk import too — not just the entry's import of vendor-thrower.js. `Date.now()` (rather
// than a plain literal) keeps Rollup from inlining this across chunks and erasing the import.
export function helperValue(): number {
  return Date.now()
}
