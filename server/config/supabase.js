const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.warn('⚠️  SUPABASE_URL o SUPABASE_ANON_KEY no configurados en .env');
  console.warn('   La aplicación funcionará pero Supabase no estará disponible');
}

// Cliente base (sin auth) - solo para operaciones públicas
const supabase = supabaseUrl && supabaseKey
  ? createClient(supabaseUrl, supabaseKey)
  : null;

/**
 * Crea un cliente Supabase con el token JWT del usuario.
 * NECESARIO para que RLS funcione — sin esto, PostgreSQL no sabe quién es el usuario.
 */
function getAuthenticatedClient(token) {
  if (!supabaseUrl || !supabaseKey) return null;
  return createClient(supabaseUrl, supabaseKey, {
    global: { headers: { Authorization: `Bearer ${token}` } }
  });
}

module.exports = supabase;
module.exports.getAuthenticatedClient = getAuthenticatedClient;