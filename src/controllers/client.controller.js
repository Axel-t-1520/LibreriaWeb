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
  try {
    const { id } = req.params;
    
    // Primero verificar que el cliente existe
    const { data: cliente, error: errorCliente } = await supabase
      .from("Cliente")
      .select("id, nombre, apellido")
      .eq("id", parseInt(id))
      .single();
    
    if (errorCliente || !cliente) {
      return res.status(404).json({
        message: `No se encontró el cliente con id ${id}`
      });
    }
    
    // Obtener facturas del cliente
    const { data, error } = await supabase
      .from("Factura")
      .select(`
        codigo,
        fecha,
        Vendedor(nombre, apellido),
        Detalle_Factura(
          id,
          cantidad,
          Producto(nombre, precio_venta)
        )
      `)
      .eq("id_cliente", parseInt(id))
      .order("fecha", { ascending: false });

    if (error) {
      return res.status(500).json({
        message: "Error al obtener historial de compras",
        error: error.message
      });
    }

    // Si no hay compras
    if (!data || data.length === 0) {
      return res.status(200).json({
        message: `${cliente.nombre} ${cliente.apellido} no tiene compras registradas`,
        cliente: {
          id: cliente.id,
          nombre: `${cliente.nombre} ${cliente.apellido}`
        },
        total_compras: 0,
        //message:"no tienes ninguna factura",
        facturas: []
      });
    }

    // Calcular totales
    let totalGastado = 0;
    
    const facturasConTotal = data.map(factura => {
      const total = factura.Detalle_Factura.reduce((sum, detalle) => {
        return sum + (detalle.cantidad * detalle.Producto.precio_venta);
      }, 0);
      
      totalGastado += total;
      
      return {
        codigo: factura.codigo,
        fecha: factura.fecha,
        vendedor: `${factura.Vendedor.nombre} ${factura.Vendedor.apellido}`,
        productos: factura.Detalle_Factura.map(detalle => ({
          nombre: detalle.Producto.nombre,
          cantidad: detalle.cantidad,
          precio_unitario: detalle.Producto.precio_venta,
          subtotal: detalle.cantidad * detalle.Producto.precio_venta
        })),
        total: total
      };
    });

    return res.status(200).json({
      message: `Historial de compras de ${cliente.nombre} ${cliente.apellido}`,
      cliente: {
        id: cliente.id,
        nombre: `${cliente.nombre} ${cliente.apellido}`
      },
      total_compras: data.length,
      total_gastado: totalGastado,
      promedio_por_compra: totalGastado / data.length,
      facturas: facturasConTotal
    });
    
  } catch (error) {
    return res.status(500).json({
      message: "Error del servidor",
      error: error.message
    });
  }
};
