import { useMemo } from 'react'
import { useTopicStore } from '../store/topicStore'
import { useBrokerStore } from '../store/brokerStore'
import type { TopicNode } from '../types'
import { formatRelative } from '../lib/payload'

interface NodeProps {
  node: TopicNode
  depth: number
  brokerColor: string
}

function TreeNode({ node, depth, brokerColor }: NodeProps) {
  const { selectedTopic, expandedPaths, pinnedTopics, selectTopic, toggleExpand, togglePin } =
    useTopicStore()

  const childList = Array.from(node.children.values()).sort((a, b) =>
    a.segment.localeCompare(b.segment),
  )
  const hasChildren = childList.length > 0
  const expanded = expandedPaths.has(`${node.brokerId}::${node.fullPath}`)
  const selected = selectedTopic === `${node.brokerId}::${node.fullPath}`
  const pinned = pinnedTopics.has(`${node.brokerId}::${node.fullPath}`)

  const handleClick = () => {
    selectTopic(`${node.brokerId}::${node.fullPath}`)
    if (hasChildren) toggleExpand(`${node.brokerId}::${node.fullPath}`)
  }

  // ISA-95 level labels
  const levelLabels = ['ENT', 'SITE', 'AREA', 'LINE', 'CELL', 'DEV', '']
  const levelColors = [
    'text-purple-400', 'text-blue-400', 'text-cyan-400',
    'text-teal-400', 'text-green-400', 'text-yellow-400', 'text-gray-400',
  ]
  const levelLabel = depth < levelLabels.length ? levelLabels[depth] : ''
  const levelColor = depth < levelColors.length ? levelColors[depth] : 'text-gray-400'

  return (
    <div>
      <div
        className={`group flex items-center gap-1 px-2 py-1 rounded cursor-pointer select-none hover:bg-gray-800/60 transition-colors ${
          selected ? 'bg-blue-900/30 border-l-2 border-blue-500' : 'border-l-2 border-transparent'
        }`}
        style={{ paddingLeft: `${8 + depth * 16}px` }}
        onClick={handleClick}
      >
        {/* Expand icon */}
        <span className="w-3 text-gray-600 text-xs flex-shrink-0">
          {hasChildren ? (expanded ? '▾' : '▸') : ''}
        </span>

        {/* Color dot */}
        <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: brokerColor }} />

        {/* Segment name */}
        <span className={`flex-1 text-sm truncate ${selected ? 'text-blue-300' : 'text-gray-200'}`}>
          {node.segment}
        </span>

        {/* ISA-95 level badge */}
        {levelLabel && depth <= 5 && (
          <span className={`text-xs ${levelColor} opacity-50 group-hover:opacity-100 flex-shrink-0`}>
            {levelLabel}
          </span>
        )}

        {/* Message count badge */}
        {node.messageCount > 0 && (
          <span className="text-xs bg-gray-700 text-gray-400 px-1 rounded flex-shrink-0">
            {node.messageCount > 9999 ? '9999+' : node.messageCount}
          </span>
        )}

        {/* Pin button */}
        <button
          className="opacity-0 group-hover:opacity-100 text-xs text-gray-500 hover:text-yellow-400 transition-all"
          onClick={(e) => { e.stopPropagation(); togglePin(`${node.brokerId}::${node.fullPath}`) }}
          title={pinned ? 'Unpin' : 'Pin topic'}
        >
          {pinned ? '★' : '☆'}
        </button>
      </div>

      {/* Last message preview */}
      {selected && node.isLeaf && node.lastMessage && (
        <div
          className="mx-2 mb-1 px-2 py-1 bg-gray-800/50 rounded text-xs text-gray-500 font-mono truncate"
          style={{ marginLeft: `${16 + depth * 16}px` }}
        >
          {node.lastMessage.payload.slice(0, 80)}
          {node.lastMessage.payload.length > 80 && '…'}
        </div>
      )}

      {/* Children */}
      {expanded && childList.map((child) => (
        <TreeNode key={child.fullPath} node={child} depth={depth + 1} brokerColor={brokerColor} />
      ))}
    </div>
  )
}

export function TopicTree() {
  const { roots, pinnedTopics } = useTopicStore()
  const { brokers, profiles } = useBrokerStore()

  const connectedProfiles = useMemo(
    () => profiles.filter((p) => brokers.get(p.id)?.status === 'connected'),
    [profiles, brokers],
  )

  if (connectedProfiles.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center px-4">
        <div className="text-4xl mb-3 opacity-20">⬡</div>
        <p className="text-sm text-gray-500">No brokers connected.</p>
        <p className="text-xs text-gray-600 mt-1">Connect a broker to explore the UNS hierarchy.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Pinned topics */}
      {pinnedTopics.size > 0 && (
        <div className="px-2 py-1 border-b border-gray-800">
          <p className="text-xs text-yellow-500/70 mb-1 px-1">★ Pinned</p>
          {/* Pinned topics shown at top */}
        </div>
      )}

      <div className="flex-1 overflow-y-auto py-1 scrollbar-thin">
        {connectedProfiles.map((profile) => {
          const brokerRoot = roots.get(profile.id)
          const rootNodes = brokerRoot ? Array.from(brokerRoot.values()).sort((a, b) => a.segment.localeCompare(b.segment)) : []
          return (
            <div key={profile.id} className="mb-2">
              {/* Broker header */}
              <div className="flex items-center gap-2 px-3 py-1.5 sticky top-0 bg-gray-950/95 z-10">
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: profile.color }} />
                <span className="text-xs font-semibold text-gray-400 truncate">{profile.name}</span>
                <span className="text-xs text-gray-600 ml-auto">{rootNodes.length} roots</span>
              </div>
              {rootNodes.length === 0 ? (
                <p className="text-xs text-gray-600 px-4 py-2">Waiting for messages…</p>
              ) : (
                rootNodes.map((node) => (
                  <TreeNode key={node.fullPath} node={node} depth={0} brokerColor={profile.color} />
                ))
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
