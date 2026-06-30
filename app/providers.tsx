'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export interface AppUser {
  id: string
  name: string
  email: string
}

interface UserContextValue {
  user: AppUser | null
  signOut: () => Promise<void>
}

const UserContext = createContext<UserContextValue>({
  user: null,
  signOut: async () => {},
})

export function useUser() {
  return useContext(UserContext)
}

function deriveAppUser(supabaseUser: { id: string; email?: string; user_metadata?: Record<string, string> }): AppUser {
  const meta = supabaseUser.user_metadata ?? {}
  const rawName = meta.player_name ?? meta.full_name ?? meta.login ?? supabaseUser.email ?? 'PLAYER'
  return {
    id: supabaseUser.id,
    name: rawName.toUpperCase().slice(0, 10),
    email: supabaseUser.email ?? '',
  }
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null)
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ? deriveAppUser(session.user) : null)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ? deriveAppUser(session.user) : null)
    })

    return () => subscription.unsubscribe()
  }, [])

  async function signOut() {
    await supabase.auth.signOut()
  }

  return (
    <UserContext.Provider value={{ user, signOut }}>
      {children}
    </UserContext.Provider>
  )
}
