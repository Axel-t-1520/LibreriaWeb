import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

// Validación mejorada
if (!supabaseUrl || !supabaseKey) {
  console.error('❌ ERROR: Faltan variables de entorno de Supabase');
  console.log('SUPABASE_URL:', supabaseUrl ? 'EXISTE' : 'FALTA');
  console.log('SUPABASE_KEY:', supabaseKey ? 'EXISTE' : 'FALTA');
  throw new Error('Configuración de Supabase incompleta');
} else {
  console.log('✅ Supabase configurado correctamente');
  console.log('URL:', supabaseUrl);
}

// Crear cliente con opciones de reconexión
export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false, // No persistir sesión en servidor
    autoRefreshToken: true, // Auto-renovar tokens
  },
  db: {
    schema: 'public'
  },
  global: {
    headers: {
      'x-application-name': 'libreria-backend'
    }
  }
});

// Test de conexión al iniciar
supabase
  .from('Producto')
  .select('count')
  .limit(1)
  .then(({ data, error }) => {
    if (error) {
      console.error('❌ Error al conectar con Supabase:', error.message);
    } else {
      console.log('✅ Conexión a Supabase exitosa');
    }
  });