import { getGames } from '@/lib/supabase/queries'
import SalonClient from './_client'

export default async function SalonPage() {
  const games = await getGames()
  return <SalonClient games={games} />
}
