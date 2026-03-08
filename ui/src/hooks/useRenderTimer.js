import { useEffect } from 'react'

export function useRenderTimer(label) {
  useEffect(() => {
    const start = performance.now()
    const end = performance.now()
    const duration = Math.round((end - start) * 100) / 100
    const prefix = label.startsWith('Node:')
      ? 'node rendering time'
      : label.startsWith('Waveform')
        ? 'waveform rendering time'
        : `${label} render`
    console.log(`[perf] ${prefix} ${duration}ms`)
  })
}
