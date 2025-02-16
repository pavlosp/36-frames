import { StrictMode } from 'react'
import {
  type RenderToPipeableStreamOptions,
  renderToPipeableStream,
} from 'react-dom/server'
import App from './App'
import { Router } from 'wouter'

export function render(_url: string, options?: RenderToPipeableStreamOptions) {
  return renderToPipeableStream(
    <StrictMode>
      <Router ssrPath='/'>
        <App />
      </Router>
    </StrictMode>,
    options,
  )
}
