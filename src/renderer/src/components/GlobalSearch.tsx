import { useEffect, useRef, useState, useMemo } from 'react'
import Fuse from 'fuse.js'
import { useTopicStore } from '../store/topicStore'
import { useBrokerStore } from '../store/brokerStore'
import { useUIStore } from '../store/uiStore'

interface SearchItem {
  key: string       // brokerId::topicPath
  topic: string
  brokerName: string
  brokerColor: string
  lastPayload: string
}

export function GlobalSearch() {
  const { searchOpen, searchQuery, setSearchOpen, setSearchQuery } = useUIStore()
  const { nodes } = useTopicStore()
  const { profiles } = useBrokerStore()
  const { selectTopic } = useTopicStore()
  const inputRef = useRef<HTMLInputElement>(null)
  const [cursor, setCursor] = useState(0)

  useEffect(() => {
    if (searchOpen) { setTimeout(() => inputRef.current?.focus(), 50); setCursor(0) }
  }, [searchOpen])

  // Build searchable items from leaf nodes
  const items = useMemo<SearchItem[]>(() => {
    const out: SearchItem[] = []
    for (const [key, node] of nodes) {
      if (!node.isLeaf) continue
      const profile = profiles.find((p) => p.id === node.brokerId)
      out.push({
        key,
        topic: node.fullPath,
        brokerName: profile?.name ?? node.brokerId,
        brokerColor: profile?.color ?? '#6b7280',
        lastPayload: node.lastMessage?.payload ?? '',
      })
    }
    return out
  }, [nodes, profiles])

  const fuse = useMemo(
    () => new Fuse(items, { keys: ['topic', 'lastPayload'], threshold: 0.4, includeScore: true }),
    [items],
  )

  const results = useMemo(() => {
    const q = searchQuery.trim()
    if (!q) return items.slice(0, 50)
    const terms = q.split(/\s+/)
    if (terms.length === 1) {
      return fuse.search(q).slice(0, 50).map((r) => r.item)
    }
    // Multi-word: AND-filter — each term must appear somewhere in topic or payload
    return items
      .filter((item) =>
        terms.every((t) =>
          item.topic.toLowerCase().includes(t.toLowerCase()) ||
          item.lastPayload.toLowerCase().includes(t.toLowerCase()),
        ),
      )
      .slice(0, 50)
  }, [searchQuery, fuse, items])

  useEffect(() => { setCursor(0) }, [results])

  const handleSelect = (item: SearchItem) => {
    selectTopic(item.key)
    setSearchOpen(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') setSearchOpen(false)
    if (e.key === 'ArrowDown') { e.preventDefault(); setCursor((c) => Math.min(c + 1, results.length - 1)) }
    if (e.key === 'ArrowUp') { e.preventDefault(); setCursor((c) => Math.max(c - 1, 0)) }
    if (e.key === 'Enter' && results[cursor]) handleSelect(results[cursor])
  }

  if (!searchOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 bg-black/60 backdrop-blur-sm">
      <div className="w-[600px] bg-gray-900 border border-gray-700 rounded-xl shadow-2xl overflow-hidden">
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-800">
          <span className="text-gray-500">⌕</span>
          <input
            ref={inputRef}
            className="flex-1 bg-transparent text-white text-sm focus:outline-none placeholder-gray-600"
            placeholder="Search topics and payloads…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <span className="text-xs text-gray-600">{results.length} results</span>
          <button
            className="text-xs text-gray-500 hover:text-gray-300 px-1"
            onClick={() => setSearchOpen(false)}
          >
            ESC
          </button>
        </div>

        {/* Results */}
        <div className="max-h-80 overflow-y-auto">
          {results.length === 0 ? (
            <div className="px-4 py-6 text-center text-sm text-gray-600">No matching topics found</div>
          ) : (
            results.map((item, i) => (
              <div
                key={item.key}
                className={`px-4 py-2.5 cursor-pointer flex items-start gap-3 ${
                  i === cursor ? 'bg-blue-900/30' : 'hover:bg-gray-800/60'
                }`}
                onClick={() => handleSelect(item)}
                onMouseEnter={() => setCursor(i)}
              >
                <span className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0" style={{ backgroundColor: item.brokerColor }} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-200 font-mono truncate">
                    {highlight(item.topic, searchQuery)}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-gray-500">{item.brokerName}</span>
                    {item.lastPayload && (
                      <span className="text-xs text-gray-600 font-mono truncate max-w-xs">
                        {item.lastPayload.slice(0, 60)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="px-4 py-2 border-t border-gray-800 flex gap-4 text-xs text-gray-600">
          <span>↑↓ navigate</span>
          <span>↵ select</span>
          <span>ESC close</span>
        </div>
      </div>
    </div>
  )
}

function highlight(text: string, query: string): React.ReactNode {
  if (!query.trim()) return text
  const idx = text.toLowerCase().indexOf(query.toLowerCase())
  if (idx === -1) return text
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-yellow-400/20 text-yellow-300 rounded">{text.slice(idx, idx + query.length)}</mark>
      {text.slice(idx + query.length)}
    </>
  )
}
