import { useState } from 'react'
import { useBrokerStore } from '../store/brokerStore'
import { useUIStore } from '../store/uiStore'
import type { BrokerProfile, BrokerState } from '../types'

function StatusDot({ status }: { status: BrokerState['status'] }) {
  const cls =
    status === 'connected' ? 'bg-green-400 shadow-green-400/50 shadow-sm' :
    status === 'connecting' || status === 'reconnecting' ? 'bg-yellow-400 animate-pulse' :
    status === 'error' ? 'bg-red-400' :
    'bg-gray-600'
  return <span className={`inline-block w-2 h-2 rounded-full ${cls}`} />
}

function SubscriptionRow({
  filter,
  brokerId,
  connected,
  onRemove,
}: {
  filter: string
  brokerId: string
  connected: boolean
  onRemove: (f: string) => void
}) {
  return (
    <div className="flex items-center gap-1 group/sub">
      <span className="text-xs font-mono text-gray-400 truncate flex-1">{filter}</span>
      <button
        className="opacity-0 group-hover/sub:opacity-100 text-gray-600 hover:text-red-400 text-xs leading-none transition-all"
        title="Remove subscription"
        onClick={() => onRemove(filter)}
      >×</button>
    </div>
  )
}

function BrokerRow({ profile }: { profile: BrokerProfile }) {
  const { brokers, connect, disconnect, deleteProfile, saveProfile } = useBrokerStore()
  const { setShowBrokerDialog } = useUIStore()
  const [expanded, setExpanded] = useState(false)
  const [newFilter, setNewFilter] = useState('')
  const [adding, setAdding] = useState(false)

  const state = brokers.get(profile.id)
  const status = state?.status ?? 'disconnected'
  const isConnected = status === 'connected' || status === 'reconnecting'

  const handleToggle = async () => {
    if (isConnected) await disconnect(profile.id)
    else await connect(profile)
  }

  const handleAddFilter = async () => {
    const t = newFilter.trim()
    if (!t) return
    const updated: BrokerProfile = {
      ...profile,
      subscriptions: [...(profile.subscriptions ?? []), t],
    }
    await saveProfile(updated)
    setNewFilter('')
    setAdding(false)
    // If connected, subscribe immediately
    if (isConnected) {
      await window.electronAPI.updateSubscriptions({ brokerId: profile.id, add: [t] })
    }
  }

  const handleRemoveFilter = async (filter: string) => {
    const updated: BrokerProfile = {
      ...profile,
      subscriptions: (profile.subscriptions ?? []).filter(s => s !== filter),
    }
    await saveProfile(updated)
    if (isConnected) {
      await window.electronAPI.updateSubscriptions({ brokerId: profile.id, remove: [filter] })
    }
  }

  const subs = profile.subscriptions ?? []

  return (
    <div className="mx-1 my-0.5 rounded-lg overflow-hidden">
      {/* Header row */}
      <div className="group px-3 py-2.5 hover:bg-gray-800/60 cursor-pointer rounded-lg"
        onClick={() => setExpanded(e => !e)}>
        <div className="flex items-center gap-2">
          <span className="text-gray-600 text-xs w-3">{expanded ? '▾' : '▸'}</span>
          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: profile.color }} />
          <StatusDot status={status} />
          <span className="flex-1 text-sm text-white truncate">{profile.name}</span>
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              className="text-xs text-gray-500 hover:text-gray-300 px-1"
              onClick={e => { e.stopPropagation(); setShowBrokerDialog(true, profile.id) }}
              title="Edit"
            >✎</button>
            {!isConnected && (
              <button
                className="text-xs text-gray-500 hover:text-red-400 px-1"
                onClick={e => { e.stopPropagation(); deleteProfile(profile.id) }}
                title="Delete"
              >✕</button>
            )}
          </div>
        </div>
        <div className="flex items-center justify-between mt-1.5 ml-5">
          <span className="text-xs text-gray-500 font-mono truncate">
            {profile.protocol}://{profile.host}:{profile.port}
          </span>
          <button
            className={`text-xs px-2 py-0.5 rounded-md font-medium transition-colors ${
              isConnected ? 'bg-red-900/40 text-red-400 hover:bg-red-900/60' :
              status === 'connecting' ? 'bg-yellow-900/40 text-yellow-400 cursor-not-allowed' :
              'bg-blue-900/40 text-blue-400 hover:bg-blue-900/60'
            }`}
            onClick={e => { e.stopPropagation(); handleToggle() }}
            disabled={status === 'connecting'}
          >
            {isConnected ? 'Disconnect' : status === 'connecting' ? 'Connecting…' : 'Connect'}
          </button>
        </div>

        {/* Stats */}
        {isConnected && (
          <div className="flex gap-3 mt-1 ml-5">
            <span className="text-xs text-gray-600">{state?.messageCount.toLocaleString()} msgs</span>
            {(state?.latency ?? 0) > 0 && <span className="text-xs text-gray-600">{state?.latency}ms</span>}
          </div>
        )}

        {/* Error */}
        {state?.status === 'error' && (
          <p className="text-xs text-red-400 mt-1 ml-5 truncate">{state.error}</p>
        )}

        {/* Info */}
        {state?.info && state.status !== 'error' && (
          <p className="text-xs text-yellow-400/80 mt-1 ml-5 leading-tight">{state.info}</p>
        )}
      </div>

      {/* Expanded: subscriptions */}
      {expanded && (
        <div className="bg-gray-900/60 border border-gray-800/60 rounded-b-lg mx-0.5 px-3 py-2">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs text-gray-500 uppercase tracking-wider">Subscriptions</span>
            <button
              className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
              onClick={() => setAdding(a => !a)}
            >{adding ? 'Cancel' : '+ Add'}</button>
          </div>

          {/* Add filter input */}
          {adding && (
            <div className="flex gap-1 mb-2">
              <input
                autoFocus
                className="flex-1 bg-gray-800 border border-gray-700 rounded px-2 py-1 text-xs text-white font-mono focus:outline-none focus:border-blue-500"
                placeholder="e.g. factory/# or sensor/+/temp"
                value={newFilter}
                onChange={e => setNewFilter(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleAddFilter() }}
              />
              <button
                className="text-xs bg-blue-700 hover:bg-blue-600 text-white px-2 rounded transition-colors"
                onClick={handleAddFilter}
              >Add</button>
            </div>
          )}

          {/* Subscription list */}
          {subs.length === 0 ? (
            <p className="text-xs text-gray-600 italic">No subscriptions. Click + Add to subscribe to topics.</p>
          ) : (
            <div className="space-y-1">
              {subs.map(f => (
                <SubscriptionRow
                  key={f}
                  filter={f}
                  brokerId={profile.id}
                  connected={isConnected}
                  onRemove={handleRemoveFilter}
                />
              ))}
            </div>
          )}

          {/* Quick presets when nothing added yet */}
          {subs.length === 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {['#', 'spBv1.0/#', 'factory/#', 'sensor/#'].map(p => (
                <button
                  key={p}
                  className="text-xs bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white px-1.5 py-0.5 rounded font-mono transition-colors"
                  onClick={() => { setNewFilter(p); setAdding(true) }}
                >{p}</button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export function BrokerSidebar() {
  const { profiles } = useBrokerStore()
  const { setShowBrokerDialog } = useUIStore()

  return (
    <div className="flex flex-col h-full">
      <div className="px-3 py-2 flex items-center justify-between border-b border-gray-800 flex-shrink-0">
        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Brokers</span>
        <button
          className="text-gray-400 hover:text-white text-lg leading-none transition-colors"
          title="Add broker"
          onClick={() => setShowBrokerDialog(true)}
        >+</button>
      </div>

      <div className="flex-1 overflow-y-auto py-1">
        {profiles.length === 0 && (
          <div className="px-3 py-6 text-center">
            <p className="text-xs text-gray-500">No brokers configured.</p>
            <button
              className="mt-2 text-xs text-blue-400 hover:text-blue-300 underline"
              onClick={() => setShowBrokerDialog(true)}
            >Add your first broker</button>
          </div>
        )}
        {profiles.map(profile => (
          <BrokerRow key={profile.id} profile={profile} />
        ))}
      </div>
    </div>
  )
}
