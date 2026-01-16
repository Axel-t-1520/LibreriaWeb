import { supabase } from "../config/db.js";

export const registProv = async (req, res) => {
  try {
    const { empresa, telefono, nombre_trabajador } = req.body;
    const { data, error } = await supabase
      .from("Proveedor")
      .insert({ empresa, telefono, nombre_trabajador })
      .select();
    if (error) {
      return res.status(404).json({
        message: "Error al registrar Proveedor",
      });
    }
    res.status(200).json({
      message: "Proveedor registrado",
      proveedor: data,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Error en el servidor",
    });
  }
};

export const getProveedorNom = async (req, res) => {
  try {
    const { nombre } = req.params;
    const { data: existe } = await supabase
      .from("Proveedor")
      .select("*")
      .ilike("nombre_trabajador", `%${nombre}%`);

    if (!existe || existe.length === 0) {
      return res.status(500).json({
        message: `el proveedor con nombre ${nombre} no existe`,
      });
    }
    return res.status(200).json({
      proveedor: existe,
    });
  } catch (error) {
    return res.send(error);
  }
};

export const getProveedor = async (req, res) => {
  try {
    const { data, error } = await supabase.from("Proveedor").select("*");

    if (error) {
      return res.status(500).json({
        message: `no se pudo listar`,
      });
    }
    return res.status(200).json({
      message: `total de prov: ${data.length}`,
      proveedores: data,
    });
  } catch (error) {
    return res.send(error);
  }
};

export const updateProv = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre_trabajador, telefono, empresa } = req.body;
    const { data, error } = await supabase
      .from("Proveedor")
      .update({ nombre_trabajador, telefono, empresa })
      .eq("id", parseInt(id))
      .select("*")
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return res.status(404).json({
          message: `El proveedor con id ${id} no existe`,
        });
      }
      return res.status(500).json({
        message: "Error al actualizar proveedor",
        error: error.message,
      });
    }
    return res.status(200).json({
      message: `Datos de proveedor actualizado`,
      proveedor: data,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Error del servidor",
      //error : message.error
    });
  }
};

export const deleteProv = async (req, res) => {
  try {
    const { id } = req.params;
    const { data: existe } = await supabase
      .from("Proveedor")
      .select("*")
      .eq("id", parseInt(id))
      .single()
    if (!existe) {
      return res
        .status(404)
        .json({ message: `no existe el proveedor con id ${id}` });
    }
    const { error } = await supabase
      .from("Proveedor")
      .delete()
      .eq("id", parseInt(id));

    if (error) {
      return res
        .status(500)
        .json({
          message: `no se pudo eliminar al proveedor de nombre ${existe.nombre_trabajador}`,
        });
    }
    return res.status(200).json({
      message: `Se ha eliminado al proveedor ${existe.nombre_trabajador}`
    });
  } catch (error) {
    return res.status(500).json({
      message: `Error en el servidor`,
      error: error.message
    });
  }
};
