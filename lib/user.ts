export interface AppUser {
  name: string
}

export function getStoredUser(): AppUser | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem('arcade-user')
    return raw ? (JSON.parse(raw) as AppUser) : null
  } catch {
    return null
  }
}

export function storeUser(user: AppUser): void {
  localStorage.setItem('arcade-user', JSON.stringify(user))
}

export function removeUser(): void {
  localStorage.removeItem('arcade-user')
}
