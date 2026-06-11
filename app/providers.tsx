'use client'

import { createContext, useContext, useState } from 'react'
import { AppUser, getStoredUser } from '@/lib/user'

interface UserContextValue {
  user: AppUser | null
  setUser: (user: AppUser | null) => void
}

const UserContext = createContext<UserContextValue>({
  user: null,
  setUser: () => {},
})

export function useUser() {
  return useContext(UserContext)
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(getStoredUser)

  return (
    <UserContext.Provider value={{ user, setUser }}>
      {children}
    </UserContext.Provider>
  )
}
