import { getGames } from '@/lib/supabase/queries'
import HomeClient from './_home-client'

export default async function HomePage() {
  const games = await getGames()
  return <HomeClient games={games} />
}
