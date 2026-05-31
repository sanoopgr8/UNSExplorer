import { useMemo } from 'react'
import { useTopicStore } from '../store/topicStore'
import { useBrokerStore } from '../store/brokerStore'
import { decodePayload, formatTimestamp, formatRelative } from '../lib/payload'

export function MetadataPanel() {
  const { selectedTopic, nodes, getHistory } = useTopicStore()
  const { profiles, brokers } = useBrokerStore()

  const [brokerId, topicPath] = selectedTopic ? selectedTopic.split('::') : [null, null]
  const node = selectedTopic ? nodes.get(selectedTopic) : undefined
  const brokerProfile = profiles.find((p) => p.id === brokerId)
  const brokerState = brokerId ? brokers.get(brokerId) : undefined
  const history = topicPath ? getHistory(topicPath) : []
  const latestMsg = history[0]
  const decoded = useMemo(() => latestMsg ? decodePayload(latestMsg.payload) : null, [latestMsg])

  // Connection overview when no topic selected
  if (!selectedTopic) {
    const connected = profiles.filter((p) => brokers.get(p.id)?.status === 'connected')
    return (
      <div className="flex flex-col h-full overflow-auto p-4 gap-4">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Connection Overview</h3>
        {connected.length === 0 ? (
          <p className="text-xs text-gray-600">No brokers connected.</p>
        ) : (
          <>{connected.map((p) => {
            const s = brokers.get(p.id)!
            return (
              <div key={p.id} className="bg-gray-800/40 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
                  <span className="text-sm font-medium text-white">{p.name}</span>
                </div>
                <div className="space-y-1">
                  <Row label="Status" value={s.status} valueClass="text-green-400" />
                  <Row label="Host" value={`${p.protocol}://${p.host}:${p.port}`} mono />
                  <Row label="Messages" value={s.messageCount.toLocaleString()} />
                  {s.latency > 0 && <Row label="Latency" value={`${s.latency} ms`} />}
                  {s.connectedAt && <Row label="Connected" value={formatRelative(s.connectedAt)} />}
                </div>
              </div>
            )
          })}</>
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full overflow-auto">
      <div className="px-4 py-3 border-b border-gray-800">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Topic Metadata</h3>
      </div>

      <div className="p-4 space-y-4">
        {/* Topic info */}
        <Section title="Topic">
          <Row label="Path" value={topicPath ?? ''} mono />
          {brokerProfile && <Row label="Broker" value={brokerProfile.name} />}
          {node && <Row label="Msg Count" value={node.messageCount.toLocaleString()} />}
          {node?.lastSeen && <Row label="Last Seen" value={formatRelative(node.lastSeen)} />}
          {node?.lastSeen && <Row label="Timestamp" value={formatTimestamp(node.lastSeen)} />}
        </Section>

        {/* Latest payload metadata */}
        {latestMsg && decoded && (
          <Section title="Latest Payload">
            <Row label="Type" value={decoded.type.toUpperCase()} />
            <Row label="Size" value={`${latestMsg.payload.length} bytes`} />
            <Row label="QoS" value={`${latestMsg.qos}`} />
            <Row label="Retain" value={latestMsg.retain ? 'Yes' : 'No'} />
          </Section>
        )}

        {/* JSON fields */}
        {decoded?.type === 'json' && decoded.parsed && typeof decoded.parsed === 'object' && (
          <Section title="JSON Fields">
            {Object.entries(decoded.parsed as Record<string, unknown>)
              .slice(0, 20)
              .map(([k, v]) => (
                <Row
                  key={k}
                  label={k}
                  value={typeof v === 'object' ? JSON.stringify(v) : String(v ?? '')}
                  mono
                />
              ))}
          </Section>
        )}

        {/* Broker connection */}
        {brokerState && (
          <Section title="Broker">
            <Row label="Status" value={brokerState.status} valueClass="text-green-400" />
            {brokerState.latency > 0 && <Row label="Latency" value={`${brokerState.latency} ms`} />}
            <Row label="Total Msgs" value={brokerState.messageCount.toLocaleString()} />
          </Section>
        )}
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">{title}</h4>
      <div className="space-y-1.5">{children}</div>
    </div>
  )
}

function Row({
  label,
  value,
  mono = false,
  valueClass = 'text-gray-300',
}: {
  label: string
  value: string
  mono?: boolean
  valueClass?: string
}) {
  return (
    <div className="flex items-start gap-2">
      <span className="text-xs text-gray-500 w-24 flex-shrink-0 pt-0.5">{label}</span>
      <span className={`text-xs ${valueClass} ${mono ? 'font-mono' : ''} break-all flex-1`}>{value}</span>
    </div>
  )
}
