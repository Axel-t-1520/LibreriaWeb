import { supabase } from "../config/db.js";


export const ventasRealizadas = async (req, res) => {
  const { id } = req.params;
  //verificar que existe el vendedor con el id
  const { data: vendedor, error: errorVendedor } = await supabase
    .from("Vendedor")
    .select("nombre, apellido")
    .eq("id", parseInt(id))
    .single();

  if (!vendedor === 0 || errorVendedor) {
    return res.status(404).json({
      message: `el vendedor con id ${id} no existe`,
    });
  }

  const { data, error } = await supabase
    .from("Factura")
    .select("fecha")
    .eq("id_vendedor", parseInt(id))
    .order("fecha", { ascending: false });

  if (!data || data.length === 0) {
    return res.status(200).json({
      message: "no existen ventas del vendedor",
    });
  }

  const ventasHechas = data.length;
  console.log("Total ventas:", ventasHechas);

  return res.status(200).json({
    message: `Ventas realizadas por ${vendedor.nombre} ${vendedor.apellido}`,
    vendedor: {
      id: vendedor.id,
      nombre: `${vendedor.nombre} ${vendedor.apellido}`,
    },
    total_ventas: ventasHechas,
    ventas: data,
  });
};


// Registrar vendedor (crea usuario en Auth + registro en tabla Vendedor)
export const registrarVendedor = async (req, res) => {
  try {
    const { nombre, apellido, email, password } = req.body;

    if (!nombre || !apellido || !email || !password) {
      return res.status(400).json({
        message: "Todos los campos son requeridos",
      });
    }

    // Limpiar cualquier registro previo con ese email
    const { data: vendedorAnterior } = await supabase
      .from("Vendedor")
      .select("*")
      .eq("email", email)
      .maybeSingle();

    if (vendedorAnterior) {
      return res.status(409).json({
        message: "El email ya está registrado",
      });
    }

    // Crear usuario en Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: email,
      password: password,
      options: {
        data: {
          nombre: nombre,
          apellido: apellido,
        },
      },
    });

    if (authError) {
      console.error("Error Auth:", authError);
      return res.status(500).json({
        message: "Error al registrar usuario",
        error: authError.message,
        details: authError,
      });
    }

    if (!authData.user) {
      return res.status(500).json({
        message: "No se pudo crear el usuario",
      });
    }

    console.log("Usuario creado con ID:", authData.user.id);

    // Esperar un poco
    await new Promise((resolve) => setTimeout(resolve, 1500));

    // Crear vendedor manualmente
    const { data: vendedor, error: vendedorError } = await supabase
      .from("Vendedor")
      .insert({
        auth_id: authData.user.id,
        nombre: nombre,
        apellido: apellido,
        email: email,
      })
      .select()
      .single();

    if (vendedorError) {
      console.error("Error Vendedor:", vendedorError);
      return res.status(500).json({
        message:
          "Usuario de Auth creado pero error al crear vendedor en la tabla",
        error: vendedorError.message,
        auth_user_id: authData.user.id,
      });
    }

    return res.status(201).json({
      message: "Vendedor registrado exitosamente",
      vendedor: vendedor,
      requiere_confirmacion: !authData.user.confirmed_at,
    });
  } catch (error) {
    console.error("Error general:", error);
    return res.status(500).json({
      message: "Error del servidor",
      error: error.message,
      stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
    });
  }
};
// Login de vendedor
export const loginVendedor = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: "Email y contraseña son requeridos",
      });
    }

    // Autenticar con Supabase Auth
    const { data: authData, error: authError } =
      await supabase.auth.signInWithPassword({
        email: email,
        password: password,
      });

    if (authError) {
      return res.status(401).json({
        message: "Credenciales incorrectas",
        error: authError.message,
      });
    }

    // Obtener datos completos del vendedor
    const { data: vendedor, error: vendedorError } = await supabase
      .from("Vendedor")
      .select("*")
      .eq("auth_id", authData.user.id)
      .single();

    if (vendedorError) {
      return res.status(500).json({
        message: "Error al obtener datos del vendedor",
        error: vendedorError.message,
      });
    }

    return res.status(200).json({
      message: "Login exitoso",
      vendedor: {
        id: vendedor.id,
        codigo: vendedor.codigo,
        nombre: vendedor.nombre,
        apellido: vendedor.apellido,
        email: vendedor.email,
      },
      session: {
        access_token: authData.session.access_token,
        refresh_token: authData.session.refresh_token,
        expires_at: authData.session.expires_at,
      },
    });
  } catch (error) {
    return res.status(500).json({
      message: "Error del servidor",
      error: error.message,
    });
  }
};

// Cerrar sesión
export const logoutVendedor = async (req, res) => {
  try {
    const { error } = await supabase.auth.signOut();

    if (error) {
      return res.status(500).json({
        message: "Error al cerrar sesión",
        error: error.message,
      });
    }

    return res.status(200).json({
      message: "Sesión cerrada exitosamente",
    });
  } catch (error) {
    return res.status(500).json({
      message: "Error del servidor",
      error: error.message,
    });
  }
};

// Obtener vendedor actual (requiere token)
export const getVendedorActual = async (req, res) => {
  try {
    // 1. NO llames a supabase.auth.getUser() aquí.
    // El middleware 'verificarToken' ya lo hizo y guardó el usuario en req.user
    const user = req.user; 

    if (!user) {
      return res.status(401).json({ message: "Usuario no identificado en el request" });
    }

    // 2. Obtener datos de la tabla Vendedor usando el ID del usuario autenticado
    const { data: vendedor, error: vendedorError } = await supabase
      .from("Vendedor")
      .select("*")
      .eq("auth_id", user.id)
      .single();

    if (vendedorError || !vendedor) {
      return res.status(404).json({
        message: "Perfil de vendedor no encontrado",
      });
    }

    // 3. IMPORTANTE: Devolver el objeto directo
    // Si devuelves { vendedor: vendedor }, en el frontend tendrás data.vendedor
    // Si tu AuthContext hace setVendedor(data), es mejor devolver el objeto limpio:
    return res.status(200).json(vendedor); 

  } catch (error) {
    console.error("Error en getVendedorActual:", error);
    return res.status(500).json({
      message: "Error del servidor",
      error: error.message,
    });
  }
};
// Cambiar contraseña
export const cambiarPassword = async (req, res) => {
  try {
    const { passwordActual, passwordNuevo } = req.body;

    if (!passwordActual || !passwordNuevo) {
      return res.status(400).json({
        message: "Contraseña actual y nueva son requeridas",
      });
    }

    if (passwordNuevo.length < 6) {
      return res.status(400).json({
        message: "La nueva contraseña debe tener al menos 6 caracteres",
      });
    }

    const { error } = await supabase.auth.updateUser({
      password: passwordNuevo,
    });

    if (error) {
      return res.status(500).json({
        message: "Error al cambiar contraseña",
        error: error.message,
      });
    }

    return res.status(200).json({
      message: "Contraseña actualizada exitosamente",
    });
  } catch (error) {
    return res.status(500).json({
      message: "Error del servidor",
      error: error.message,
    });
  }
};

// Recuperar contraseña
export const recuperarPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        message: "Email es requerido",
      });
    }

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: "http://tu-sitio.com/reset-password",
    });

    if (error) {
      return res.status(500).json({
        message: "Error al enviar email de recuperación",
        error: error.message,
      });
    }

    return res.status(200).json({
      message: "Se ha enviado un email para recuperar tu contraseña",
    });
  } catch (error) {
    return res.status(500).json({
      message: "Error del servidor",
      error: error.message,
    });
  }
};

