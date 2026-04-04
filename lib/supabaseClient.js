import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY

console.log("URL:", supabaseUrl)
console.log("KEY:", supabaseKey)

export const supabase = createClient(supabaseUrl, supabaseKey)