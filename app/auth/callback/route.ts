import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type') as 'email' | 'recovery' | 'signup' | null

  const supabase = await createClient()

  if (token_hash && type) {
    const { error } = await supabase.auth.verifyOtp({ token_hash, type })
    if (!error) return NextResponse.redirect(`${origin}/`)
    return NextResponse.redirect(`${origin}/auth?error=${encodeURIComponent(error.message)}`)
  }

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) return NextResponse.redirect(`${origin}/`)
    return NextResponse.redirect(`${origin}/auth?error=${encodeURIComponent(error.message)}`)
  }

  return NextResponse.redirect(`${origin}/auth?error=missing_params`)
}
