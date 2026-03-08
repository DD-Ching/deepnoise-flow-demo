import { useCallback, useEffect, useRef, useState } from 'react'
import { io } from 'socket.io-client'

const WS_URL = import.meta.env.VITE_WS_BASE_URL || 'http://127.0.0.1:8000'

export function useRealtimeAudio() {
  const [enabled, setEnabled] = useState(false)
  const [status, setStatus] = useState('Disconnected')
  const socketRef = useRef(null)
  const audioStreamRef = useRef(null)
  const audioContextRef = useRef(null)
  const processorRef = useRef(null)
  const sourceRef = useRef(null)
  const gainRef = useRef(null)

  const stop = useCallback(() => {
    if (processorRef.current) {
      processorRef.current.disconnect()
      processorRef.current.onaudioprocess = null
      processorRef.current = null
    }
    if (sourceRef.current) {
      sourceRef.current.disconnect()
      sourceRef.current = null
    }
    if (gainRef.current) {
      gainRef.current.disconnect()
      gainRef.current = null
    }
    if (audioContextRef.current) {
      audioContextRef.current.close()
      audioContextRef.current = null
    }
    if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach((track) => track.stop())
      audioStreamRef.current = null
    }
    if (socketRef.current) {
      socketRef.current.off()
      socketRef.current.disconnect()
      socketRef.current = null
    }
    setEnabled(false)
    setStatus('Disconnected')
  }, [])

  const start = useCallback(async () => {
    if (enabled) return
    try {
      setStatus('Connecting...')
      const socket = io(WS_URL, { transports: ['websocket'] })
      socketRef.current = socket

      socket.on('connect', () => setStatus('Streaming'))
      socket.on('status', (payload) => {
        if (payload?.state) setStatus(payload.state)
      })
      socket.on('connect_error', (error) => {
        setStatus(`Socket error: ${error.message || 'failed to connect'}`)
      })

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      audioStreamRef.current = stream

      const audioContext = new AudioContext()
      audioContextRef.current = audioContext

      const source = audioContext.createMediaStreamSource(stream)
      sourceRef.current = source

      const processor = audioContext.createScriptProcessor(1024, 1, 1)
      processor.onaudioprocess = (event) => {
        const input = event.inputBuffer.getChannelData(0)
        socket.emit('audio_chunk', input)
        const output = event.outputBuffer.getChannelData(0)
        output.fill(0)
      }

      const silence = audioContext.createGain()
      silence.gain.value = 0
      gainRef.current = silence

      source.connect(processor)
      processor.connect(silence)
      silence.connect(audioContext.destination)

      processorRef.current = processor
      setEnabled(true)
    } catch (error) {
      setStatus(`Realtime error: ${error.message || 'unknown error'}`)
      stop()
    }
  }, [enabled, stop])

  useEffect(() => () => stop(), [stop])

  return { enabled, status, start, stop }
}
