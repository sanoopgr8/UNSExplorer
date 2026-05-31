import { useEffect, useCallback } from 'react'
import { useBrokerStore } from './store/brokerStore'
import { useUIStore } from './store/uiStore'
import { useMqttBridge } from './hooks/useMqttBridge'
import { BrokerSidebar } from './components/BrokerSidebar'
import { TopicTree } from './components/TopicTree'
import { PayloadInspector } from './components/PayloadInspector'
import { MetadataPanel } from './components/MetadataPanel'
import { PublishPanel } from './components/PublishPanel'
import { GlobalSearch } from './components/GlobalSearch'
import { BrokerDialog } from './components/BrokerDialog'
import { StatusBar } from './components/StatusBar'

// Detect if running inside Electron renderer
const isElectron = typeof window !== 'undefined' &&
  typeof (window as unknown as { process?: { type?: string } }).process?.type === 'string'

export default function App() {
  useMqttBridge()
  const { loadProfiles } = useBrokerStore()
  const { writeMode, searchOpen, showPublishPanel, rightPanelOpen,
    setSearchOpen, setShowPublishPanel, setRightPanelOpen } = useUIStore()

  useEffect(() => { loadProfiles() }, [])

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault()
      setSearchOpen(true)
    }
    if (e.key === 'Escape' && searchOpen) setSearchOpen(false)
  }, [searchOpen, setSearchOpen])

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  return (
    <div className={`flex flex-col bg-gray-950 text-white overflow-hidden ${writeMode ? 'ring-2 ring-red-600 ring-inset' : ''}`}
      style={{ height: '100dvh' }}>

      {/* Electron titlebar drag region */}
      {isElectron && (
        <div className="h-8 flex-shrink-0 select-none"
          style={{ WebkitAppRegion: 'drag' } as React.CSSProperties} />
      )}

      {/* Write mode banner */}
      {writeMode && (
        <div className="flex-shrink-0 bg-red-950/80 border-b border-red-800 px-4 py-1 text-xs text-red-300 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          Write mode active — messages published here will be sent to the broker
        </div>
      )}

      {/* ── Three-panel main layout ── */}
      <div className="flex flex-1 min-h-0">

        {/* ── LEFT PANEL: Brokers + Topic Tree (256px fixed) ── */}
        <div className="w-56 flex-shrink-0 flex flex-col border-r border-gray-800 bg-gray-950 min-h-0">

          {/* Broker list */}
          <div className="flex-shrink-0 overflow-y-auto" style={{ maxHeight: '220px' }}>
            <BrokerSidebar />
          </div>

          <div className="h-px bg-gray-800 flex-shrink-0" />

          {/* Topic tree header */}
          <div className="flex items-center justify-between px-3 py-2 border-b border-gray-800 flex-shrink-0">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Topics</span>
            <button
              className="text-base text-gray-500 hover:text-gray-300 transition-colors leading-none"
              onClick={() => setSearchOpen(true)}
              title="Search topics (Ctrl+K)"
            >⌕</button>
          </div>

          {/* Topic tree (scrollable) */}
          <div className="flex-1 min-h-0 overflow-hidden">
            <TopicTree />
          </div>
        </div>

        {/* ── CENTER PANEL: Payload Inspector (flex-1) ── */}
        <div className="flex-1 min-w-0 flex flex-col min-h-0 bg-[#0b0f1a]">
          <div className="flex-shrink-0 flex items-center justify-between px-4 py-2 border-b border-gray-800">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Payload Inspector</span>
            <div className="flex items-center gap-2">
              {writeMode && (
                <button
                  className="text-xs bg-red-900/40 text-red-400 hover:bg-red-900/60 px-2 py-1 rounded-md transition-colors"
                  onClick={() => setShowPublishPanel(!showPublishPanel)}
                >
                  ⬆ Publish
                </button>
              )}
              <button
                className="text-xs text-gray-500 hover:text-gray-300 transition-colors px-1"
                onClick={() => setRightPanelOpen(!rightPanelOpen)}
                title="Toggle metadata panel"
              >
                {rightPanelOpen ? '⊞' : '⊟'}
              </button>
            </div>
          </div>
          <div className="flex-1 min-h-0 overflow-hidden">
            <PayloadInspector />
          </div>
        </div>

        {/* ── RIGHT PANEL: Metadata / Publish (288px fixed) ── */}
        {rightPanelOpen && (
          <div className="w-64 flex-shrink-0 border-l border-gray-800 bg-gray-950 flex flex-col min-h-0 overflow-hidden">
            {showPublishPanel && writeMode
              ? <PublishPanel />
              : <MetadataPanel />}
          </div>
        )}
      </div>

      {/* ── Status bar ── */}
      <StatusBar />

      {/* ── Overlays ── */}
      <GlobalSearch />
      <BrokerDialog />
    </div>
  )
}
