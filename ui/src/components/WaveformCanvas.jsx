import { memo, useEffect, useRef } from 'react'
import { useRenderTimer } from '../hooks/useRenderTimer'

function drawWaveform(ctx, data, width, height, color) {
  ctx.clearRect(0, 0, width, height)
  ctx.fillStyle = 'transparent'
  ctx.fillRect(0, 0, width, height)
  ctx.lineWidth = 2
  ctx.strokeStyle = color
  ctx.beginPath()
  const mid = height / 2
  const step = Math.max(1, Math.floor(data.length / width))
  for (let i = 0; i < width; i++) {
    const start = i * step
    const end = Math.min(start + step, data.length)
    let min = 1
    let max = -1
    for (let j = start; j < end; j += 1) {
      const value = data[j]
      if (value < min) min = value
      if (value > max) max = value
    }
    ctx.moveTo(i, mid + min * mid)
    ctx.lineTo(i, mid + max * mid)
  }
  ctx.stroke()
}

function WaveformCanvas({
  source,
  stream,
  height = 120,
  color = 'rgba(56, 189, 248, 0.9)',
  className = '',
}) {
  const canvasRef = useRef(null)
  useRenderTimer(`WaveformCanvas`)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let rafId = null
    let audioCtx = null
    let cancelled = false
    const dpi = window.devicePixelRatio || 1
    const resize = () => {
      const rect = canvas.getBoundingClientRect()
      canvas.width = rect.width * dpi
      canvas.height = rect.height * dpi
      ctx.setTransform(dpi, 0, 0, dpi, 0, 0)
    }
    resize()

    const width = () => canvas.width / dpi
    const heightPx = () => canvas.height / dpi

    const drawEmpty = () => {
      ctx.clearRect(0, 0, width(), heightPx())
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.35)'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(0, heightPx() / 2)
      ctx.lineTo(width(), heightPx() / 2)
      ctx.stroke()
    }

    if (stream) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext
      if (!AudioCtx) {
        drawEmpty()
        return () => {}
      }
      audioCtx = new AudioCtx()
      const analyser = audioCtx.createAnalyser()
      analyser.fftSize = 2048
      const dataArray = new Uint8Array(analyser.fftSize)
      const sourceNode = audioCtx.createMediaStreamSource(stream)
      sourceNode.connect(analyser)
      let logged = false

      const draw = () => {
        const drawStart = performance.now()
        if (cancelled) return
        analyser.getByteTimeDomainData(dataArray)
        ctx.clearRect(0, 0, width(), heightPx())
        ctx.strokeStyle = color
        ctx.lineWidth = 2
        ctx.beginPath()
        const sliceWidth = width() / dataArray.length
        let x = 0
        for (let i = 0; i < dataArray.length; i += 1) {
          const v = dataArray[i] / 128.0
          const y = (v * heightPx()) / 2
          if (i === 0) {
            ctx.moveTo(x, y)
          } else {
            ctx.lineTo(x, y)
          }
          x += sliceWidth
        }
        ctx.lineTo(width(), heightPx() / 2)
        ctx.stroke()
        const drawEnd = performance.now()
        if (!logged) {
          // eslint-disable-next-line no-console
          console.log(
            `[perf] waveform live draw ${Math.round((drawEnd - drawStart) * 100) / 100}ms`
          )
          logged = true
        }
        rafId = requestAnimationFrame(draw)
      }
      draw()
    } else if (source) {
      const load = async () => {
        try {
          const decodeStart = performance.now()
          const AudioCtx = window.AudioContext || window.webkitAudioContext
          if (!AudioCtx) {
            drawEmpty()
            return
          }
          const buffer =
            source instanceof File
              ? await source.arrayBuffer()
              : await fetch(source).then((res) => res.arrayBuffer())
          if (cancelled) return
          audioCtx = new AudioCtx()
          const audioBuffer = await audioCtx.decodeAudioData(buffer)
          if (cancelled) return
          const channelData = audioBuffer.getChannelData(0)
          drawWaveform(ctx, channelData, width(), heightPx(), color)
          const decodeEnd = performance.now()
          // eslint-disable-next-line no-console
          console.log(
            `[perf] waveform decode+draw ${Math.round((decodeEnd - decodeStart) * 100) / 100}ms`
          )
        } catch {
          drawEmpty()
        }
      }
      load()
    } else {
      drawEmpty()
    }

    return () => {
      cancelled = true
      if (rafId) cancelAnimationFrame(rafId)
      if (audioCtx) {
        const closeResult = audioCtx.close()
        if (closeResult && typeof closeResult.catch === 'function') {
          closeResult.catch(() => {})
        }
      }
    }
  }, [color, source, stream])

  return <canvas ref={canvasRef} className={className} style={{ width: '100%', height }} />
}

export default memo(WaveformCanvas)
