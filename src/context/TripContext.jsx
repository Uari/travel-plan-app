import { createContext, useContext } from 'react'

export const TripContext = createContext(null)

// TripLayout 하위 페이지들이 user/tripId/membersMap/isAdmin/tripData를
// props drilling 없이 가져다 쓰기 위한 훅.
export function useTripContext() {
  const ctx = useContext(TripContext)
  if (!ctx) {
    throw new Error('useTripContext must be used within a TripContext.Provider')
  }
  return ctx
}
