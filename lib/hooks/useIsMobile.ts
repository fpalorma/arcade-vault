import { useSyncExternalStore } from 'react'

const noSubscribe = () => () => {}

export function useIsMobile() {
  return useSyncExternalStore(
    noSubscribe,
    () => 'ontouchstart' in window,
    () => false,
  )
}
