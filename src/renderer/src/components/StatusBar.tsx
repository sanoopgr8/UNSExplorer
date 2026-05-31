import { useMemo } from 'react'
import { useBrokerStore } from '../store/brokerStore'
import { useTopicStore } from '../store/topicStore'
import { useUIStore } from '../store/uiStore'

export function StatusBar() {
  const { brokers, profiles } = useBrokerStore()
  const { nodes } = useTopicStore()
  const { writeMode, setWriteMode, setSearchOpen } = useUIStore()

  const connected = useMemo(
    () => profiles.filter((p) => brokers.get(p.id)?.status === 'connected'),
    [profiles, brokers],
  )
  const totalMsgs = useMemo(
    () => Array.from(brokers.values()).reduce((sum, b) => sum + b.messageCount, 0),
    [brokers],
  )
  const topicCount = useMemo(() => {
    let count = 0
    for (const node of nodes.values()) if (node.isLeaf) count++
    return count
  }, [nodes])

  return (
    <div className="flex items-center gap-4 px-4 h-7 border-t border-gray-800 bg-gray-950 text-xs text-gray-500 flex-shrink-0">
      {/* Connection status */}
      <span>
        <span className={connected.length > 0 ? 'text-green-400' : ''}>●</span>
        {' '}{connected.length} broker{connected.length !== 1 ? 's' : ''} connected
      </span>

      <span className="text-gray-700">|</span>
      <span>{topicCount.toLocaleString()} topics</span>

      <span className="text-gray-700">|</span>
      <span>{totalMsgs.toLocaleString()} messages</span>

      {/* Keyboard hint */}
      <span className="ml-auto">
        <kbd
          className="bg-gray-800 px-1.5 py-0.5 rounded text-xs cursor-pointer hover:bg-gray-700 transition-colors"
          onClick={() => setSearchOpen(true)}
        >
          Ctrl+K
        </kbd>
        {' '}search
      </span>

      {/* Write mode toggle */}
      <button
        className={`flex items-center gap-1.5 px-2 py-0.5 rounded transition-colors ${
          writeMode
            ? 'bg-red-900/50 text-red-400 hover:bg-red-900/70'
            : 'bg-gray-800 text-gray-500 hover:bg-gray-700 hover:text-gray-300'
        }`}
        onClick={() => {
          if (!writeMode) {
            if (window.confirm('Enable write mode? You will be able to publish messages to connected brokers.')) {
              setWriteMode(true)
            }
          } else {
            setWriteMode(false)
          }
        }}
      >
        <span className={`w-1.5 h-1.5 rounded-full ${writeMode ? 'bg-red-500 animate-pulse' : 'bg-gray-600'}`} />
        {writeMode ? 'Write Mode ON' : 'Read Only'}
      </button>
    </div>
  )
}
