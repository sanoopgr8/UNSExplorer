import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MiniSparkline, SparklineTab } from '../Sparkline'
import type { MqttMessage } from '../../types'

function makeMsg(payload: string, timestamp: number): MqttMessage {
  return {
    id: String(timestamp),
    brokerId: 'b1',
    topic: 'test',
    payload,
    qos: 0,
    retain: false,
    timestamp,
  }
}

const numericHistory = [
  makeMsg('{"value":30}', 3000),
  makeMsg('{"value":20}', 2000),
  makeMsg('{"value":10}', 1000),
]

describe('MiniSparkline', () => {
  it('renders nothing for empty history', () => {
    const { container } = render(<MiniSparkline history={[]} />)
    expect(container.firstChild).toBeNull()
  })

  it('renders nothing for non-numeric payloads', () => {
    const history = [makeMsg('hello', 1000), makeMsg('world', 2000)]
    const { container } = render(<MiniSparkline history={history} />)
    expect(container.firstChild).toBeNull()
  })

  it('renders an SVG for numeric history with 2+ points', () => {
    const { container } = render(<MiniSparkline history={numericHistory} />)
    const svg = container.querySelector('svg')
    expect(svg).not.toBeNull()
  })

  it('uses provided width and height on the SVG', () => {
    const { container } = render(<MiniSparkline history={numericHistory} width={80} height={24} />)
    const svg = container.querySelector('svg')!
    expect(svg.getAttribute('width')).toBe('80')
    expect(svg.getAttribute('height')).toBe('24')
  })

  it('renders a path element', () => {
    const { container } = render(<MiniSparkline history={numericHistory} />)
    expect(container.querySelector('path')).not.toBeNull()
  })
})

describe('SparklineTab', () => {
  it('shows empty state for non-numeric history', () => {
    const history = [makeMsg('text payload', 1000), makeMsg('more text', 2000)]
    render(<SparklineTab history={history} />)
    expect(screen.getByText(/no numeric values/i)).toBeInTheDocument()
  })

  it('shows empty state for empty history', () => {
    render(<SparklineTab history={[]} />)
    expect(screen.getByText(/no numeric values/i)).toBeInTheDocument()
  })

  it('renders stats grid with Last, Min, Max, Avg for numeric history', () => {
    render(<SparklineTab history={numericHistory} />)
    expect(screen.getByText('Last')).toBeInTheDocument()
    expect(screen.getByText('Min')).toBeInTheDocument()
    expect(screen.getByText('Max')).toBeInTheDocument()
    expect(screen.getByText('Avg')).toBeInTheDocument()
  })

  it('renders an SVG chart for numeric history', () => {
    const { container } = render(<SparklineTab history={numericHistory} />)
    expect(container.querySelector('svg')).not.toBeNull()
  })

  it('shows data point count', () => {
    render(<SparklineTab history={numericHistory} />)
    expect(screen.getByText(/3 data points/i)).toBeInTheDocument()
  })

  it('shows field selector buttons when multiple numeric fields exist', () => {
    const multiFieldHistory = [
      makeMsg('{"temp":25,"humidity":60}', 1000),
      makeMsg('{"temp":26,"humidity":61}', 2000),
    ]
    render(<SparklineTab history={multiFieldHistory} />)
    expect(screen.getByRole('button', { name: 'temp' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'humidity' })).toBeInTheDocument()
  })

  it('does not show field selector for single numeric field', () => {
    render(<SparklineTab history={numericHistory} />)
    expect(screen.queryByRole('button', { name: 'value' })).toBeNull()
  })

  it('switches active field when a field button is clicked', async () => {
    const user = userEvent.setup()
    const multiFieldHistory = [
      makeMsg('{"temp":25,"humidity":60}', 1000),
      makeMsg('{"temp":26,"humidity":61}', 2000),
    ]
    render(<SparklineTab history={multiFieldHistory} />)
    const humidityBtn = screen.getByRole('button', { name: 'humidity' })
    await user.click(humidityBtn)
    // After clicking humidity, it should be highlighted (has bg-blue-600 class)
    expect(humidityBtn.className).toContain('bg-blue-600')
  })

  it('shows the field name label above the chart', () => {
    render(<SparklineTab history={numericHistory} />)
    expect(screen.getByText('value')).toBeInTheDocument()
  })
})
