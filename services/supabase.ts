
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://jxexuygomrdhdsseorhi.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp4ZXh1eWdvbXJkaGRzc2VvcmhpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUwOTEzMTUsImV4cCI6MjA4MDY2NzMxNX0.4cGLQa1F1CUsETuLz-Y1TEsM_g5qQbEDt479KtUTzLI';

export const supabase = createClient(supabaseUrl, supabaseKey);
