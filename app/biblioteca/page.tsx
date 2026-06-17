import { getGames } from '@/lib/supabase/queries'
import BibliotecaClient from './_client'

export default async function LibraryPage() {
  const games = await getGames()
  return <BibliotecaClient games={games} />
}
