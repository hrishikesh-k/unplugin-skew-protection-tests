import { StrictMode } from 'react'
import { renderToString } from 'react-dom/server'
import App from './App.tsx'

export function render(): { html: string } {
  const html = renderToString(
    <StrictMode>
      <App />
    </StrictMode>,
  )
  return { html }
}
