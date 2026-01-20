import { supabase } from "../config/db.js";
import {v4 as uuidv4} from 'uuid'

export const registerProduct = async (req, res) => {
  try {
    const {
      nombre,
      descripcion,
      precio_unitario,
      stock,
      precio_venta,
      categoria,
    } = req.body;
    
    const imagen = req.file; // Viene de multer si se subió archivo

    // ============================================
    // PASO 1: Validar campos requeridos
    // ============================================
    if (!nombre || !precio_unitario || !stock || !precio_venta) {
      return res.status(400).json({
        message: "Los campos nombre, precio_unitario, stock y precio_venta son requeridos"
      });
    }

    // ============================================
    // PASO 2: Subir imagen SI existe (OPCIONAL)
    // ============================================
    let imagenUrl = null; // Por defecto, sin imagen

    if (imagen) {
      console.log('📸 Imagen detectada, subiendo a Supabase Storage...');
      
      // Generar nombre único para el archivo
      const fileExt = imagen.originalname.split('.').pop(); // Extensión (.jpg, .png, etc)
      const fileName = `${uuidv4()}.${fileExt}`; // Ejemplo: "a1b2c3d4-e5f6.jpg"
      const filePath = `productos/${fileName}`; // Ruta en el bucket

      // Subir archivo a Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('productos') // ← Nombre del bucket (debes crearlo en Supabase)
        .upload(filePath, imagen.buffer, {
          contentType: imagen.mimetype, // image/jpeg, image/png, etc
          cacheControl: '3600' // Cache de 1 hora
        });

      if (uploadError) {
        console.error('❌ Error al subir imagen:', uploadError);
        return res.status(500).json({
          message: 'Error al subir la imagen',
          error: uploadError.message
        });
      }

      // Obtener URL pública de la imagen
      const { data: urlData } = supabase.storage
        .from('productos')
        .getPublicUrl(filePath);

      imagenUrl = urlData.publicUrl; // Guardar URL
      console.log('✅ Imagen subida:', imagenUrl);
    } else {
      console.log('ℹ️ No se proporcionó imagen, continuando sin ella...');
    }

    // ============================================
    // PASO 3: Crear producto en la base de datos
    // ============================================
    const { data, error } = await supabase
      .from("Producto")
      .insert([{
        nombre,
        descripcion,
        precio_unitario: parseFloat(precio_unitario), // Convertir a número
        stock: parseInt(stock),
        precio_venta: parseFloat(precio_venta),
        categoria,
        imagen_url: imagenUrl // ← Guardar URL (puede ser null si no hay imagen)
      }])
      .select();

    if (error) {
      console.error('❌ Error al registrar producto:', error);
      
      // Si subimos imagen pero falló el producto, eliminar imagen
      if (imagenUrl) {
        const filePath = imagenUrl.split('/').pop();
        await supabase.storage
          .from('productos')
          .remove([`productos/${filePath}`]);
        console.log('🗑️ Imagen eliminada por error en registro');
      }
      
      return res.status(500).json({
        message: "No se pudo registrar el producto",
        error: error.message
      });
    }

    // ============================================
    // PASO 4: Respuesta exitosa
    // ============================================
    return res.status(201).json({
      message: "Producto registrado exitosamente",
      producto: data[0]
    });

  } catch (error) {
    console.error('❌ Error del servidor:', error);
    return res.status(500).json({
      message: "Error del servidor",
      error: error.message
    });
  }
};
export const getProd = async (req, res) => {
  const { data, error } = await supabase.from("Producto").select("*");
  if (error) {
    return res.status().json({
      message: "no se pudo listar productos",
    });
  }
  console.log(data)
  return res.status(200).json({
    message : `total de productos ${data.length}`,
  data}
  );
};

export const getProductId = async (req, res) => {
  console.log(req.params);
  const { id } = req.params;
  const { data, error } = await supabase
    .from("Producto")
    .select("*")
    .eq("id", parseInt(id))
    .single();

  if (error) {
    return res.status(500).json({
      message: "no se pudo encontrar el producto",
    });
  }
  return res.status(200).json(data);
};

export const getProductCat = async (req, res) => {
  console.log(req.params);
  const { cat } = req.params;
  const { data, error } = await supabase
    .from("Producto")
    .select("*")
    .eq("categoria", cat);

  if (error) {
    return res.status(500).json({
      message: "no se pudo encontrar el producto",
    });
  }
  return res.status(200).json(data);
};

export const updateProd = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      nombre,
      descripcion,
      precio_unitario,
      stock,
      precio_venta,
      categoria,
    } = req.body;

    const { data, error } = await supabase
      .from("Producto")
      .update({
        nombre,
        descripcion,
        precio_unitario,
        stock,
        precio_venta,
        categoria,
      })
      .eq("id", parseInt(id))
      .select();

    if (error) {
      return res.status(500).json({
        message: "No se pudo actualizar el producto",
        error: error.message,
      });
    }

    if (!data || data.length === 0) {
      return res.status(404).json({
        message: "Producto no encontrado",
      });
    }

    return res.status(200).json({
      message: "Producto actualizado exitosamente",
      producto: data[0],
    });
  } catch (err) {
    return res.status(500).json({
      message: "Error del servidor",
      error: err.message,
    });
  }
};

export const deleteProd = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Primero verificar si existe
    const { data: existe } = await supabase
      .from("Producto")
      .select("id, nombre")
      .eq("id", parseInt(id))
      .single();

    if (!existe) {
      return res.status(404).json({
        message: `No se encontró el producto con id ${id}`
      });
    }

    // Eliminar el producto
    const { error } = await supabase
      .from("Producto")
      .delete()
      .eq("id", parseInt(id));

    if (error) {
      return res.status(500).json({
        message: "No se pudo eliminar el producto",
        error: error.message
      });
    }

    return res.status(200).json({
      message: `Se eliminó exitosamente el producto: ${existe.nombre}`
    });

  } catch (err) {
    return res.status(500).json({
      message: "Error del servidor",
      error: err.message
    });
  }
};
