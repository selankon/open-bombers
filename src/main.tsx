import React from 'react'
import ReactDOM from 'react-dom/client'
import './i18n'
import './index.css'
import { Providers } from './Providers'
import { registerServiceWorker } from './registerSW'
import { requestPersistentStorage } from './services/storage'

// Register service worker
registerServiceWorker()

// Ask the browser not to evict our local data
requestPersistentStorage()

const container = document.getElementById('root')
if (!container) throw new Error('Failed to find the root element')
const root = ReactDOM.createRoot(container)

root.render(
  <React.StrictMode>
    <Providers />
  </React.StrictMode>
)
