import { createClient } from '@supabase/supabase-js';

// Erstellt den Supabase-Client aus den ENV-Variablen (CLAUDE.md §6).
// Ohne vollständige Konfiguration bleibt der Client null, dataService
// fällt dann auf den lokalen Demo-Modus zurück, nichts crasht.
const url = import.meta.env.VITE_SUPABASE_URL;
const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export const supabase = url && publishableKey ? createClient(url, publishableKey) : null;
