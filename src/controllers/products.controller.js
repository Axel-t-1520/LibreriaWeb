import { supabase } from "../config/db.js";

export const registerProduct = async (req, res) => {
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
    .insert([
      { nombre, descripcion, precio_unitario, stock, precio_venta, categoria },
    ])
    .select();

  if (error) {
    return res.status().json({
      message: "no se registro el producto",
    });
  }
  res.status(200).json(data, {
    message: "se registro el producto",
  });
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
