import { createClient } from '@supabase/supabase-js'

// 환경 변수가 없으면 빈 문자열("") 대신 "https://placeholder.co" 같은 가짜 값을 넣어서
// 빌드 에러(supabaseUrl is required)를 방지합니다.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co"
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-key"

export const supabase = createClient(supabaseUrl, supabaseKey)