import { useState, useEffect } from 'react'
import { useBrokerStore } from '../store/brokerStore'
import { useUIStore } from '../store/uiStore'
import { useTopicStore } from '../store/topicStore'

const TEMPLATES = [
  { label: 'Simple value', payload: '{"value": 0, "timestamp": ""}' },
  { label: 'Status update', payload: '{"status": "online", "message": ""}' },
  { label: 'Sensor reading', payload: '{"tag": "temperature", "value": 25.0, "unit": "°C", "quality": "good"}' },
  { label: 'Command', payload: '{"command": "start", "params": {}}' },
]

export function PublishPanel() {
  const { brokers, profiles } = useBrokerStore()
  const { setShowPublishPanel } = useUIStore()
  const { selectedTopic } = useTopicStore()
  const [brokerId, setBrokerId] = useState('')
  const [topic, setTopic] = useState('')
  const [payload, setPayload] = useState('')
  const [qos, setQos] = useState<0 | 1 | 2>(0)
  const [retain, setRetain] = useState(false)
  const [result, setResult] = useState<{ ok: boolean; msg: string } | null>(null)
  const [publishing, setPublishing] = useState(false)

  const connectedProfiles = profiles.filter((p) => brokers.get(p.id)?.status === 'connected')

  // Pre-fill broker/topic from selection on first open
  useEffect(() => {
    if (selectedTopic) {
      const [bid, tpath] = selectedTopic.split('::')
      setBrokerId(bid)
      setTopic(tpath)
    } else if (connectedProfiles.length > 0 && !brokerId) {
      setBrokerId(connectedProfiles[0].id)
    }
  }, [selectedTopic])

  const handlePublish = async () => {
    if (!brokerId || !topic.trim()) {
      setResult({ ok: false, msg: 'Broker and topic are required.' })
      return
    }
    setPublishing(true)
    setResult(null)
    const res = await window.electronAPI.publish({ brokerId, topic: topic.trim(), payload, qos, retain })
    setResult({ ok: res.ok, msg: res.ok ? 'Message published successfully.' : res.error ?? 'Unknown error' })
    setPublishing(false)
  }

  return (
    <div className="flex flex-col h-full overflow-auto p-4 gap-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-red-400 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          Publish Mode Active
        </h3>
        <button
          className="text-xs text-gray-500 hover:text-gray-300"
          onClick={() => setShowPublishPanel(false)}
        >
          ✕ Close
        </button>
      </div>

      <div className="bg-red-950/30 border border-red-900/50 rounded-lg px-3 py-2">
        <p className="text-xs text-red-300">
          ⚠ You are in write mode. Messages published here will be sent to the broker.
        </p>
      </div>

      {/* Broker selector */}
      <div>
        <label className="text-xs text-gray-400 mb-1 block">Broker</label>
        <select
          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
          value={brokerId}
          onChange={(e) => setBrokerId(e.target.value)}
        >
          <option value="">Select broker…</option>
          {connectedProfiles.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </div>

      {/* Topic */}
      <div>
        <label className="text-xs text-gray-400 mb-1 block">Topic</label>
        <input
          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-blue-500"
          placeholder="e.g. Factory/Site1/Area2/Line3/sensor/temp"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
        />
      </div>

      {/* Templates */}
      <div>
        <label className="text-xs text-gray-400 mb-1 block">Templates</label>
        <div className="flex flex-wrap gap-1">
          {TEMPLATES.map((t) => (
            <button
              key={t.label}
              className="text-xs bg-gray-800 hover:bg-gray-700 text-gray-300 px-2 py-1 rounded-md transition-colors"
              onClick={() => setPayload(t.payload)}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Payload */}
      <div className="flex-1">
        <label className="text-xs text-gray-400 mb-1 block">Payload</label>
        <textarea
          className="w-full h-36 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-blue-500 resize-none"
          placeholder='{"value": 42}'
          value={payload}
          onChange={(e) => setPayload(e.target.value)}
        />
      </div>

      {/* QoS + Retain */}
      <div className="flex gap-4 items-center">
        <div>
          <label className="text-xs text-gray-400 mb-1 block">QoS</label>
          <div className="flex gap-1">
            {([0, 1, 2] as const).map((q) => (
              <button
                key={q}
                className={`px-2 py-1 text-xs rounded-md transition-colors ${
                  qos === q ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                }`}
                onClick={() => setQos(q)}
              >
                {q}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2 mt-4">
          <input
            type="checkbox"
            id="retain"
            checked={retain}
            onChange={(e) => setRetain(e.target.checked)}
            className="accent-blue-500"
          />
          <label htmlFor="retain" className="text-xs text-gray-400">Retain</label>
        </div>
      </div>

      {result && (
        <div className={`text-xs px-3 py-2 rounded-lg ${result.ok ? 'bg-green-900/30 text-green-400' : 'bg-red-900/30 text-red-400'}`}>
          {result.msg}
        </div>
      )}

      <button
        className="w-full py-2 bg-red-700 hover:bg-red-600 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50"
        onClick={handlePublish}
        disabled={publishing}
      >
        {publishing ? 'Publishing…' : '⬆ Publish Message'}
      </button>
    </div>
  )
}
