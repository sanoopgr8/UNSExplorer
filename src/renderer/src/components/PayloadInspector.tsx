import { useMemo, useState } from 'react'
import { useTopicStore } from '../store/topicStore'
import { useBrokerStore } from '../store/brokerStore'
import { decodePayload, formatTimestamp } from '../lib/payload'
import type { MqttMessage } from '../types'

function JsonHighlight({ json }: { json: string }) {
  const html = json
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(
      /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g,
      (match) => {
        let cls = 'text-cyan-300'
        if (/^"/.test(match)) {
          cls = /:$/.test(match) ? 'text-blue-300' : 'text-green-300'
        } else if (/true|false/.test(match)) {
          cls = 'text-yellow-300'
        } else if (/null/.test(match)) {
          cls = 'text-red-300'
        } else {
          cls = 'text-orange-300'
        }
        return `<span class="${cls}">${match}</span>`
      },
    )
  return (
    <pre
      className="text-xs font-mono leading-relaxed whitespace-pre-wrap break-all"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}

function MessageRow({ msg, selected, onClick }: { msg: MqttMessage; selected: boolean; onClick: () => void }) {
  const decoded = useMemo(() => decodePayload(msg.payload), [msg.payload])
  const preview = decoded.formatted?.slice(0, 60) ?? msg.payload.slice(0, 60)
  return (
    <div
      className={`px-3 py-2 cursor-pointer border-l-2 hover:bg-gray-800/40 transition-colors ${
        selected ? 'border-blue-500 bg-gray-800/40' : 'border-transparent'
      }`}
      onClick={onClick}
    >
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-500 font-mono flex-shrink-0">
          {formatTimestamp(msg.timestamp)}
        </span>
        <span className={`text-xs px-1 rounded flex-shrink-0 ${
          decoded.type === 'json' ? 'bg-blue-900/50 text-blue-300' :
          decoded.type === 'binary' ? 'bg-red-900/50 text-red-300' :
          'bg-gray-800 text-gray-400'
        }`}>
          {decoded.type.toUpperCase()}
        </span>
        {msg.retain && <span className="text-xs bg-yellow-900/40 text-yellow-400 px-1 rounded">RETAIN</span>}
        <span className="text-xs bg-gray-800 text-gray-500 px-1 rounded">QoS {msg.qos}</span>
      </div>
      <p className="text-xs text-gray-400 font-mono mt-0.5 truncate">{preview}{(preview?.length ?? 0) >= 60 ? '…' : ''}</p>
    </div>
  )
}

export function PayloadInspector() {
  const { selectedTopic, getHistory } = useTopicStore()
  const { profiles } = useBrokerStore()
  const [activeTab, setActiveTab] = useState<'payload' | 'history'>('payload')
  const [selectedMsgIdx, setSelectedMsgIdx] = useState(0)
  const [copied, setCopied] = useState(false)
  const [rawView, setRawView] = useState(false)

  const [brokerId, topicPath] = selectedTopic ? selectedTopic.split('::') : [null, null]
  const brokerProfile = profiles.find((p) => p.id === brokerId)
  const history = topicPath ? getHistory(topicPath) : []
  const activeMsg: MqttMessage | undefined = history[selectedMsgIdx]
  const decoded = useMemo(() => activeMsg ? decodePayload(activeMsg.payload) : null, [activeMsg])

  const handleCopy = () => {
    if (!activeMsg) return
    navigator.clipboard.writeText(activeMsg.payload)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  if (!selectedTopic || !topicPath) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center px-6">
        <div className="text-5xl mb-4 opacity-10">{ }</div>
        <p className="text-sm text-gray-500">Select a topic in the tree to inspect its payload.</p>
      </div>
    )
  }

  const segments = topicPath.split('/')
  const isa95Labels = ['Enterprise', 'Site', 'Area', 'Line', 'Cell', 'Device']

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Breadcrumb header */}
      <div className="px-4 py-3 border-b border-gray-800 bg-gray-900/50">
        <div className="flex items-center gap-1 flex-wrap">
          {brokerProfile && (
            <>
              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: brokerProfile.color }} />
              <span className="text-xs text-gray-500">{brokerProfile.name}</span>
              <span className="text-gray-700">/</span>
            </>
          )}
          {segments.map((seg, i) => (
            <span key={i} className="flex items-center gap-1">
              <span className="text-sm text-gray-200 font-mono">{seg}</span>
              {i < segments.length - 1 && <span className="text-gray-600">/</span>}
              {i < isa95Labels.length && (
                <span className="text-xs text-gray-600 hidden xl:inline">({isa95Labels[i]})</span>
              )}
            </span>
          ))}
        </div>
        <div className="flex items-center gap-2 mt-2">
          <span className="text-xs text-gray-500">{history.length} message{history.length !== 1 ? 's' : ''}</span>
          {activeMsg && (
            <span className="text-xs text-gray-600">· latest {formatTimestamp(activeMsg.timestamp)}</span>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-800">
        {(['payload', 'history'] as const).map((tab) => (
          <button
            key={tab}
            className={`px-4 py-2 text-xs font-medium capitalize transition-colors ${
              activeTab === tab
                ? 'text-blue-400 border-b-2 border-blue-500'
                : 'text-gray-500 hover:text-gray-300'
            }`}
            onClick={() => setActiveTab(tab)}
          >
            {tab}
            {tab === 'history' && history.length > 0 && (
              <span className="ml-1 bg-gray-700 text-gray-400 text-xs px-1 rounded">{history.length}</span>
            )}
          </button>
        ))}
        <div className="ml-auto flex items-center gap-2 px-3">
          <button
            className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
            onClick={() => setRawView((v) => !v)}
          >
            {rawView ? 'Formatted' : 'Raw'}
          </button>
          <button
            className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
            onClick={handleCopy}
          >
            {copied ? '✓ Copied' : 'Copy'}
          </button>
        </div>
      </div>

      {history.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-sm text-gray-600">No messages received yet.</p>
        </div>
      ) : activeTab === 'payload' ? (
        <div className="flex-1 overflow-auto p-4">
          {decoded?.type === 'json' && !rawView ? (
            <JsonHighlight json={decoded.formatted ?? decoded.raw} />
          ) : (
            <pre className="text-xs font-mono text-gray-300 whitespace-pre-wrap break-all leading-relaxed">
              {rawView ? decoded?.raw : decoded?.formatted ?? decoded?.raw}
            </pre>
          )}
        </div>
      ) : (
        <div className="flex flex-col h-full overflow-hidden">
          <div className="flex-1 overflow-y-auto divide-y divide-gray-800/50">
            {history.map((msg, i) => (
              <MessageRow
                key={msg.id}
                msg={msg}
                selected={i === selectedMsgIdx}
                onClick={() => { setSelectedMsgIdx(i); setActiveTab('payload') }}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
