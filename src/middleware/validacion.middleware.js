// middlewares/validacion.middleware.js

// Validar que los campos requeridos existan
export const validarCamposRequeridos = (campos) => {
  return (req, res, next) => {
    const camposFaltantes = [];
    
    campos.forEach(campo => {
      if (!req.body[campo] || req.body[campo] === '') {
        camposFaltantes.push(campo);
      }
    });
    
    if (camposFaltantes.length > 0) {
      return res.status(400).json({
        message: 'Campos requeridos faltantes',
        campos_faltantes: camposFaltantes
      });
    }
    
    next();
  };
};

// Validar email
export const validarEmail = (req, res, next) => {
  const { email } = req.body;
  
  if (!email) {
    return next(); // Otro middleware validará si es requerido
  }
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  
  if (!emailRegex.test(email)) {
    return res.status(400).json({
      message: 'Email inválido'
    });
  }
  
  next();
};

// Validar que un número sea positivo
export const validarNumeroPositivo = (campo) => {
  return (req, res, next) => {
    const valor = req.body[campo];
    
    if (valor && (isNaN(valor) || parseFloat(valor) <= 0)) {
      return res.status(400).json({
        message: `El campo ${campo} debe ser un número positivo`
      });
    }
    
    next();
  };
};

// Validar password
export const validarPassword = (req, res, next) => {
  const { password } = req.body;
  
  if (!password) {
    return next();
  }
  
  if (password.length < 6 && !/[A-Z]/.test(password) || !/[0-9]/.test(password)) {
    return res.status(400).json({
      message: `La contraseña debe tener al menos 6 caracteres
                y contener al menos una letra mayuscula y un numero`
    });
  }
  
  next();
};

// Validar que productos sea un array
export const validarProductosArray = (req, res, next) => {
  const { productos } = req.body;
  
  if (!productos) {
    return res.status(400).json({
      message: 'Se requiere un array de productos'
    });
  }
  
  if (!Array.isArray(productos)) {
    return res.status(400).json({
      message: 'Productos debe ser un array'
    });
  }
  
  if (productos.length === 0) {
    return res.status(400).json({
      message: 'Debe incluir al menos un producto'
    });
  }
  
  // Validar estructura de cada producto
  for (let i = 0; i < productos.length; i++) {
    const prod = productos[i];
    
    if (!prod.id_producto || !prod.cantidad) {
      return res.status(400).json({
        message: `Producto en posición ${i + 1} debe tener id_producto y cantidad`
      });
    }
    
    if (prod.cantidad <= 0) {
      return res.status(400).json({
        message: `La cantidad del producto en posición ${i + 1} debe ser mayor a 0`
      });
    }
  }
  
  next();
};