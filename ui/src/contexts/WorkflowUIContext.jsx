import { createContext, useContext } from 'react'

export const WorkflowUIContext = createContext(null)

export function useWorkflowUI() {
  return useContext(WorkflowUIContext)
}
