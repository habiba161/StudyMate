const SUPABASE_URL = "https://jmqaquaodbolaxmocciy.supabase.co";
const SUPABASE_KEY = "sb_publishable_vNEW4_OZgGT9uAVezI0d3Q_WbdL0JxL";

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

export { supabase };