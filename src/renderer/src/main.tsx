import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import { installMockIfNeeded } from './lib/electronMock'

installMockIfNeeded()

// Expose stores in dev for testing
if ((import.meta as unknown as { env: { DEV: boolean } }).env.DEV) {
  import('./store/topicStore').then(m => { (window as unknown as Record<string,unknown>).__topicStore = m.useTopicStore })
  import('./store/brokerStore').then(m => { (window as unknown as Record<string,unknown>).__brokerStore = m.useBrokerStore })
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
