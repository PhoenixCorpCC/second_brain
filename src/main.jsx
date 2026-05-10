import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { seedIfEmpty } from './lib/db.js'

seedIfEmpty()

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    import('./sw-register.js')
  })
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
)
