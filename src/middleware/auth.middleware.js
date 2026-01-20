import { supabase } from '../config/db.js';

export const verificarToken = async (req, res, next) => {
  try {
    console.log('🔒 Verificando token...');
    
    // 1. Obtener token del header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('❌ No hay token');
      return res.status(401).json({
        message: 'Token no proporcionado. Inicia sesión primero.'
      });
    }
    
    // 2. Extraer el token
    const token = authHeader.split(' ')[1];
    
    // 3. Verificar token con Supabase
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      console.log('❌ Token inválido:', error?.message);
      return res.status(401).json({
        message: 'Token inválido o expirado',
        error: error?.message
      });
    }
    
    console.log('✅ Token válido. Usuario:', user.email);
    
    req.user = user;
    
    next();
    
  } catch (error) {
    console.error('❌ Error en middleware:', error);
    return res.status(500).json({
      message: 'Error al verificar token',
      error: error.message
    });
  }
};

//verificar que sea vendedor
export const verificarVendedor = async (req, res, next) => {
  try {
    const userId = req.user.id; // Viene del middleware anterior
    
    // Verificar que existe en la tabla Vendedor
    const { data: vendedor, error } = await supabase
      .from('Vendedor')
      .select('id, nombre, apellido')
      .eq('auth_id', userId)
      .single();
    
    if (error || !vendedor) {
      return res.status(403).json({
        message: 'No tienes permisos de vendedor'
      });
    }
    
    // Agregar datos del vendedor a la petición
    req.vendedor = vendedor;
    
    next();
    
  } catch (error) {
    return res.status(500).json({
      message: 'Error al verificar vendedor',
      error: error.message
    });
  }
};