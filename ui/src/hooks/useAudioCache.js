import { useCallback, useEffect, useRef, useState } from 'react'

export function useAudioCache({ resolveApiUrl, t, showModal, outputUrls, nodeOutputs }) {
  const audioCacheRef = useRef(new Map())
  const audioCacheOrderRef = useRef([])
  const [audioCacheVersion, setAudioCacheVersion] = useState(0)

  const clearAudioCache = useCallback(() => {
    audioCacheRef.current.forEach((blobUrl) => URL.revokeObjectURL(blobUrl))
    audioCacheRef.current.clear()
    audioCacheOrderRef.current = []
    setAudioCacheVersion((version) => version + 1)
  }, [])

  const cacheAudioUrl = useCallback(
    async (url, { signal } = {}) => {
      if (!url) return null
      const resolved = resolveApiUrl(url)
      if (!resolved || resolved.startsWith('blob:')) return resolved
      const cached = audioCacheRef.current.get(resolved)
      if (cached) return cached
      const response = await fetch(resolved, { signal })
      if (!response.ok) throw new Error(`Audio fetch failed: ${response.status}`)
      const blob = await response.blob()
      const blobUrl = URL.createObjectURL(blob)
      audioCacheRef.current.set(resolved, blobUrl)
      audioCacheOrderRef.current.push(resolved)
      const maxEntries = 8
      while (audioCacheOrderRef.current.length > maxEntries) {
        const oldest = audioCacheOrderRef.current.shift()
        if (!oldest) break
        const oldUrl = audioCacheRef.current.get(oldest)
        if (oldUrl) URL.revokeObjectURL(oldUrl)
        audioCacheRef.current.delete(oldest)
      }
      setAudioCacheVersion((version) => version + 1)
      return blobUrl
    },
    [resolveApiUrl]
  )

  const getCachedUrl = useCallback(
    (url) => {
      if (!url) return null
      const resolved = resolveApiUrl(url)
      const cached = audioCacheRef.current.get(resolved)
      return cached || resolved
    },
    [audioCacheVersion, resolveApiUrl]
  )

  const downloadAudio = useCallback(
    async (url, filename) => {
      if (!url) return
      const resolved = resolveApiUrl(url)
      try {
        const blobUrl = await cacheAudioUrl(resolved)
        if (!blobUrl) return
        const name = filename || resolved.split('/').pop() || 'audio_output.wav'
        const link = document.createElement('a')
        link.href = blobUrl
        link.download = name
        link.click()
      } catch {
        showModal(t('popup_fail_title'), t('popup_fail_body'))
      }
    },
    [cacheAudioUrl, resolveApiUrl, showModal, t]
  )

  useEffect(() => {
    const urls = new Set()
    if (outputUrls) {
      Object.values(outputUrls).forEach((value) => {
        if (typeof value === 'string' && value) urls.add(value)
      })
    }
    Object.values(nodeOutputs || {}).forEach((payload) => {
      Object.values(payload || {}).forEach((value) => {
        if (typeof value === 'string' && value) urls.add(value)
      })
    })
    if (urls.size === 0) return undefined
    const controller = new AbortController()
    urls.forEach((url) => {
      cacheAudioUrl(url, { signal: controller.signal }).catch(() => {})
    })
    return () => controller.abort()
  }, [cacheAudioUrl, nodeOutputs, outputUrls])

  return {
    getCachedUrl,
    cacheAudioUrl,
    downloadAudio,
    clearAudioCache,
  }
}
