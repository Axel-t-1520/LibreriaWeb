import { supabase } from "../config/db.js";

export const registClient = async (req, res) => {
  try {
    const { nombre, apellido, ci, telefono } = req.body;
    const { data, error } = await supabase
      .from("Cliente")
      .insert([{ nombre, apellido, ci, telefono }])
      .select();
    if (error) {
      return res
        .status(404)
        .json({ message: "no se pudo registrar al cliente" });
    }

    return res.status(201).json({
      message: "Usuaria registrado exitosamente",
      usuario: data,
    });
  } catch (error) {
    return res.send(error);
  }
};

export const getClient = async (req, res) => {
  try {
    const { data, error } = await supabase.from("Cliente").select("*");
    if (error) {
      return res.status(500).json({
        message: "no se pudo obtener al cliente",
      });
    }
    return res.status(200).json({
      message: `total de clientes: ${data.length}`,
      clientes: data,
    });
  } catch (error) {
    return res.json({ message: error });
  }
};

export const getClientNombApe = async (req, res) => {
  try {
    const { termino } = req.params;
    const { data, error } = await supabase
      .from("Cliente")
      .select("*")
      .or(`nombre.ilike.%${termino}%,apellido.ilike.%${termino}%`);
    if (error) {
      return res.status(404).json({ message: "no existe el cliente" });
    }
    res.status(200).json({
      message: `total de clientes ${data.length}`,
      clientes: data,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Error de servidor",
    });
  }
};

export const updateClient = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, apellido, ci, telefono } = req.body;
    const { data, error } = await supabase
      .from("Cliente")
      .update({ nombre, apellido, ci, telefono })
      .eq("id", parseInt(id))
      .select("nombre,apellido");
    if (error) {
      return res.status(404).json({
        message: `no existe el cliente con id: ${id}`,
      });
    }
    if (!data || data.length === 0) {
      return res.status(404).json({
        message: `No existe el cliente con id: ${id}`,
      });
    }
    console.log(data);
    return res.status(200).json({
      cliente: data,
      message: `se ha actualizado el cliente con nombre ${nombre} ${apellido}`,
    });
  } catch (error) {
    return res.send(error);
  }
};

export const deleteClient = async (req, res) => {
  try {
    const { id } = req.params;
    const { data: existe } = await supabase
      .from("Cliente")
      .select("id,nombre,apellido")
      .eq("id", parseInt(id))
      .single();
    if (!existe) {
      return res.json({ message: `el usuario con id ${id} no existe` });
    }

    const { error } = await supabase
      .from("Cliente")
      .delete()
      .eq("id", parseInt(id));

    if (error) {
      return res.status(500).json({
        message: "no se pudo eliminar al cliente",
        error: error.message,
      });
    }
    return res.status(200).json({
      message: `se elimino al cliente de id ${id} con nombre ${existe.nombre} ${existe.apellido}`,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Error del servidor",
      error: error.message,
    });
  }
};

export const comprasCliente = async (req, res) => {
  const { id } = req.params;
  const { data, error } = await supabase
    .from("Factura")
    .select(
      `codigo,fecha,Vendedor(nombre,apellido),Detalle_Factura(id,cantidad,Producto(nombre,precio_venta))`
    )
    .eq("id_cliente", parseInt(id))
    .order('fecha',{ascending:false})

  if (error) {
    return res.status(404).json({
      message: "no se encontro al cliente",
    });
  }

  return res.status(200).json({
    message: `Historial de compras del cliente`,
    productos: data,
  });
};
