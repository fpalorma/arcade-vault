import { createClient } from './server'

export interface Game {
  id: string
  title: string
  short: string
  long: string
  cat: string
  cover: string
  color: string
  best: number
  plays: string
}

export interface Score {
  id: string
  game_id: string
  player_name: string
  score: number
  level: number
  created_at: string
}

export interface ScoreWithGame extends Score {
  games: { title: string }
}

export async function getGames(): Promise<Game[]> {
  const supabase = await createClient()
  const { data, error } = await supabase.from('games').select('*')
  if (error) throw error
  return data as Game[]
}

export async function getGame(id: string): Promise<Game | null> {
  const supabase = await createClient()
  const { data, error } = await supabase.from('games').select('*').eq('id', id).single()
  if (error) return null
  return data as Game
}

export async function getTopScores(limit = 10): Promise<ScoreWithGame[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('scores')
    .select('*, games(title)')
    .order('score', { ascending: false })
    .limit(limit)
  if (error) throw error
  return data as ScoreWithGame[]
}

export async function getTopScoresByGame(gameId: string, limit = 10): Promise<Score[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('scores')
    .select('*')
    .eq('game_id', gameId)
    .order('score', { ascending: false })
    .limit(limit)
  if (error) throw error
  return data as Score[]
}

export async function saveScore(data: {
  game_id: string
  player_name: string
  score: number
  level: number
}): Promise<Score> {
  const supabase = await createClient()
  const { data: inserted, error } = await supabase
    .from('scores')
    .insert(data)
    .select()
    .single()
  if (error) throw error
  return inserted as Score
}
