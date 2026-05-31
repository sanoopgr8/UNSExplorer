import { useEffect } from 'react'
import { useBrokerStore } from '../store/brokerStore'
import { useTopicStore } from '../store/topicStore'
import type { MqttMessage } from '../types'

let bridgeInstalled = false

export function useMqttBridge() {
  const { setStatus, setLatency, setInfo, incrementMessages } = useBrokerStore()
  const { ingestMessage, clearBroker } = useTopicStore()

  useEffect(() => {
    if (bridgeInstalled) return
    bridgeInstalled = true

    window.electronAPI.onBrokerConnected(({ brokerId }) => {
      setStatus(brokerId, 'connected')
    })

    window.electronAPI.onBrokerDisconnected(({ brokerId }) => {
      setStatus(brokerId, 'disconnected')
    })

    window.electronAPI.onBrokerReconnecting(({ brokerId }) => {
      setStatus(brokerId, 'reconnecting')
    })

    window.electronAPI.onBrokerError(({ brokerId, error }) => {
      setStatus(brokerId, 'error', error)
    })

    window.electronAPI.onBrokerLatency(({ brokerId, latency }) => {
      setLatency(brokerId, latency)
    })

    window.electronAPI.onBrokerInfo(({ brokerId, message }) => {
      setInfo(brokerId, message)
    })

    window.electronAPI.onMessage((raw) => {
      const msg = raw as { brokerId: string; topic: string; payload: string; qos: 0|1|2; retain: boolean; timestamp: number }
      incrementMessages(msg.brokerId)
      ingestMessage({
        id: `${msg.brokerId}-${msg.timestamp}-${Math.random()}`,
        brokerId: msg.brokerId,
        topic: msg.topic,
        payload: msg.payload,
        qos: msg.qos,
        retain: msg.retain,
        timestamp: msg.timestamp,
      })
    })

    return () => { bridgeInstalled = false }
  }, [])
}
