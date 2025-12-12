// Supabase Configuration
const SUPABASE_URL = 'https://yjwaamgydtdqlkhmwkyt.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlqd2FhbWd5ZHRkcWxraG13a3l0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU1NTkwMzUsImV4cCI6MjA4MTEzNTAzNX0.7Lf3wq6AglPzin7WUDCt-10jyWbeOace-l_InA-ypQM';

let supabase;

if (typeof createClient !== 'undefined') {
    supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
} else if (window.supabase) {
    supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
}
