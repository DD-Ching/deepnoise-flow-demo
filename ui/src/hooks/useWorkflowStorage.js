import { useCallback, useState } from 'react'

const STORAGE_KEY = 'deepnoise.workflow.store'
const STORAGE_VERSION = 1

function readStorage() {
  if (typeof window === 'undefined') return {}
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    if (parsed?.version === STORAGE_VERSION && parsed?.items) {
      return parsed.items
    }
    if (!parsed?.version && typeof parsed === 'object') {
      return parsed
    }
    return {}
  } catch {
    return {}
  }
}

function writeStorage(items) {
  if (typeof window === 'undefined') return
  try {
    const payload = JSON.stringify({ version: STORAGE_VERSION, items })
    localStorage.setItem(STORAGE_KEY, payload)
  } catch {
    // Ignore persistence errors (private mode, quota, etc.)
  }
}

export function useWorkflowStorage() {
  const [workflows, setWorkflows] = useState(() => readStorage())

  const persist = useCallback((next) => {
    setWorkflows(next)
    writeStorage(next)
  }, [])

  const save = useCallback(
    (name, payload) => {
      if (!name) return
      persist({ ...workflows, [name]: payload })
    },
    [persist, workflows]
  )

  const remove = useCallback(
    (name) => {
      if (!workflows[name]) return
      const next = { ...workflows }
      delete next[name]
      persist(next)
    },
    [persist, workflows]
  )

  return { workflows, save, remove }
}
