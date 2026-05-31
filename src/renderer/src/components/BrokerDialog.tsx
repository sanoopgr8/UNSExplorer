import { useState, useEffect } from 'react'
import { useBrokerStore } from '../store/brokerStore'
import { useUIStore } from '../store/uiStore'
import type { BrokerProfile } from '../types'
import { BROKER_COLORS } from '../types'

function randomId() {
  return Math.random().toString(36).slice(2, 10)
}

function randomClientId() {
  return `uns-explorer-${Math.random().toString(36).slice(2, 8)}`
}

const PRESET_FILTERS = ['#', 'spBv1.0/#', 'factory/#', 'sensor/#', 'testtopic/#', '$SYS/#']

const DEFAULT: BrokerProfile = {
  id: '',
  name: '',
  host: 'localhost',
  port: 1883,
  protocol: 'mqtt',
  username: '',
  password: '',
  clientId: randomClientId(),
  color: BROKER_COLORS[0],
  subscriptions: [],
}

export function BrokerDialog() {
  const { profiles, saveProfile } = useBrokerStore()
  const { showBrokerDialog, editingProfile, setShowBrokerDialog } = useUIStore()
  const [form, setForm] = useState<BrokerProfile>({ ...DEFAULT, id: randomId() })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [newFilter, setNewFilter] = useState('')

  useEffect(() => {
    if (!showBrokerDialog) return
    if (editingProfile) {
      const p = profiles.find((p) => p.id === editingProfile)
      if (p) setForm({ ...p })
    } else {
      setForm({ ...DEFAULT, id: randomId(), clientId: randomClientId() })
    }
    setError('')
  }, [showBrokerDialog, editingProfile])

  if (!showBrokerDialog) return null

  const set = (k: keyof BrokerProfile, v: string | number) =>
    setForm((f) => ({ ...f, [k]: v }))

  const addFilter = (f: string) => {
    const t = f.trim()
    if (!t || form.subscriptions.includes(t)) return
    setForm((prev) => ({ ...prev, subscriptions: [...prev.subscriptions, t] }))
    setNewFilter('')
  }

  const removeFilter = (f: string) =>
    setForm((prev) => ({ ...prev, subscriptions: prev.subscriptions.filter(s => s !== f) }))

  const handleSave = async () => {
    if (!form.name.trim()) { setError('Name is required'); return }
    if (!form.host.trim()) { setError('Host is required'); return }
    setSaving(true)
    await saveProfile(form)
    setSaving(false)
    setShowBrokerDialog(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-gray-900 border border-gray-700 rounded-xl shadow-2xl w-[480px] p-6">
        <h2 className="text-lg font-semibold text-white mb-5">
          {editingProfile ? 'Edit Broker' : 'New Broker Profile'}
        </h2>

        <div className="space-y-3">
          {/* Name */}
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Profile Name</label>
            <input
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
              placeholder="e.g. Production Broker"
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
            />
          </div>

          {/* Protocol + Host + Port */}
          <div className="flex gap-2">
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Protocol</label>
              <select
                className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                value={form.protocol}
                onChange={(e) => set('protocol', e.target.value)}
              >
                <option value="mqtt">mqtt</option>
                <option value="mqtts">mqtts</option>
                <option value="ws">ws</option>
                <option value="wss">wss</option>
              </select>
            </div>
            <div className="flex-1">
              <label className="text-xs text-gray-400 mb-1 block">Host</label>
              <input
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                placeholder="localhost"
                value={form.host}
                onChange={(e) => set('host', e.target.value)}
              />
            </div>
            <div className="w-24">
              <label className="text-xs text-gray-400 mb-1 block">Port</label>
              <input
                type="number"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                value={form.port}
                onChange={(e) => set('port', parseInt(e.target.value) || 1883)}
              />
            </div>
          </div>

          {/* Auth */}
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="text-xs text-gray-400 mb-1 block">Username (optional)</label>
              <input
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                placeholder="username"
                value={form.username ?? ''}
                onChange={(e) => set('username', e.target.value)}
              />
            </div>
            <div className="flex-1">
              <label className="text-xs text-gray-400 mb-1 block">Password (optional)</label>
              <input
                type="password"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                placeholder="password"
                value={form.password ?? ''}
                onChange={(e) => set('password', e.target.value)}
              />
            </div>
          </div>

          {/* Client ID */}
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Client ID</label>
            <input
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500 font-mono"
              value={form.clientId}
              onChange={(e) => set('clientId', e.target.value)}
            />
          </div>

          {/* Topic Subscriptions */}
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Topic Subscriptions</label>
            {/* Presets */}
            <div className="flex flex-wrap gap-1 mb-2">
              {PRESET_FILTERS.map(p => (
                <button
                  key={p}
                  type="button"
                  className={`text-xs px-2 py-0.5 rounded-md border transition-colors font-mono ${
                    form.subscriptions.includes(p)
                      ? 'bg-blue-700 border-blue-500 text-white'
                      : 'bg-gray-800 border-gray-600 text-gray-400 hover:border-blue-500 hover:text-white'
                  }`}
                  onClick={() => form.subscriptions.includes(p) ? removeFilter(p) : addFilter(p)}
                >
                  {p}
                </button>
              ))}
            </div>
            {/* Custom input */}
            <div className="flex gap-2">
              <input
                className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-white font-mono focus:outline-none focus:border-blue-500"
                placeholder="e.g. Acme/Detroit/# or sensor/+/temp"
                value={newFilter}
                onChange={e => setNewFilter(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addFilter(newFilter) } }}
              />
              <button
                type="button"
                className="px-3 py-1.5 text-sm bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
                onClick={() => addFilter(newFilter)}
              >Add</button>
            </div>
            {/* Active filters */}
            {form.subscriptions.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {form.subscriptions.map(f => (
                  <span key={f} className="flex items-center gap-1 text-xs bg-blue-900/40 text-blue-300 px-2 py-0.5 rounded-full font-mono">
                    {f}
                    <button type="button" className="hover:text-red-400 leading-none" onClick={() => removeFilter(f)}>×</button>
                  </span>
                ))}
              </div>
            )}
            {form.subscriptions.length === 0 && (
              <p className="text-xs text-yellow-500/70 mt-1">⚠ No subscriptions — connect will succeed but no messages will arrive until you add topics.</p>
            )}
          </div>

          {/* Color */}
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Color</label>
            <div className="flex gap-2">
              {BROKER_COLORS.map((c) => (
                <button
                  key={c}
                  className={`w-7 h-7 rounded-full border-2 transition-all ${form.color === c ? 'border-white scale-110' : 'border-transparent hover:scale-105'}`}
                  style={{ backgroundColor: c }}
                  onClick={() => set('color', c)}
                />
              ))}
            </div>
          </div>
        </div>

        {error && <p className="mt-3 text-xs text-red-400">{error}</p>}

        <div className="flex justify-end gap-2 mt-6">
          <button
            className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
            onClick={() => setShowBrokerDialog(false)}
          >
            Cancel
          </button>
          <button
            className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? 'Saving…' : 'Save Profile'}
          </button>
        </div>
      </div>
    </div>
  )
}
