import { supabase } from "../config/db.js";

export const realizarVenta = async (req, res) => {
  console.log("🔔 VENTA RECIBIDA:", new Date().toISOString());
  console.log(
    "Cliente:",
    req.body.id_cliente,
    "Vendedor:",
    req.body.id_vendedor
  );
  console.log("---");
  const { id_cliente, id_vendedor, productos } = req.body;

  if (!id_cliente || !id_cliente || !productos || productos.length === 0) {
    return res.status(400).json({
      message: "todos los campos deben estar completos",
    });
  }

  //valida si existe el cliente

  const { data: cliente } = await supabase
    .from("Cliente")
    .select("*")
    .eq("id", id_cliente)
    .single();

  if (!cliente) {
    return res.status(500).json({
      message: `el cliente con id ${id_cliente} no existe`,
    });
  }

  //valida si existe el vendedor

  const { data: vendedor } = await supabase
    .from("Vendedor")
    .select("*")
    .eq("id", id_vendedor)
    .single();

  if (!vendedor) {
    return res.status(500).json({
      message: `el cliente con id ${id_cliente} no existe`,
    });
  }

  const productosValidos = [];

  for (let item of productos) {
    const { data: producto, error: errorProducto } = await supabase
      .from("Producto")
      .select("*")
      .eq("id", parseInt(item.id_producto))
      .single();

    if (errorProducto || !producto) {
      return res.status(404).json({
        message: `El producto con id ${item.id_producto} no existe`,
      });
    }

    if (producto.stock < item.cantidad) {
      return res.status(400).json({
        message: `Stock insuficiente para ${producto.nombre}. Disponible: ${producto.stock}, solicitado: ${item.cantidad}`,
      });
    }

    productosValidos.push({
      id_producto: producto.id,
      nombre: producto.nombre,
      cantidad: item.cantidad,
      precio_venta: producto.precio_venta,
      subtotal: producto.precio_venta * item.cantidad,
    });
  }

  const { data: factura, error: errorFactura } = await supabase
    .from("Factura")
    .insert({
      id_cliente: id_cliente,
      id_vendedor: id_vendedor,
      fecha: new Date().toISOString(),
    })
    .select()
    .single();

  if (errorFactura) {
    return res.status(500).json({
      message: "Error al crear la factura",
      error: errorFactura.message,
    });
  }

  const detallesParaInsertar = productosValidos.map((prod) => ({
    id_factura: factura.id,
    id_producto: prod.id_producto,
    cantidad: prod.cantidad,
  }));

  const { data: detalles, error: errorDetalles } = await supabase
    .from("Detalle_Factura")
    .insert(detallesParaInsertar)
    .select();

  if (errorDetalles) {
    // Si falla, deberíamos eliminar la factura creada (rollback manual)
    await supabase.from("Factura").delete().eq("id", factura.id);

    return res.status(500).json({
      message: "Error al crear los detalles de la factura",
      error: errorDetalles.message,
    });
  }

  for (let prod of productosValidos) {
    const { error: errorStock } = await supabase.rpc("reducir_stock", {
      p_id_producto: prod.id_producto,
      p_cantidad: prod.cantidad,
    });

    if (errorStock) {
      console.error("Error al actualizar stock:", errorStock);
      return res.status(500).json({
        message: "Error al actualizar el stock del producto",
        error: errorStock.message,
      });
    }
  }

  const totalVenta = productosValidos.reduce(
    (total, prod) => total + prod.subtotal,
    0
  );

  return res.status(201).json({
    message: "Venta realizada exitosamente",
    factura: {
      id: factura.id,
      codigo: factura.codigo,
      fecha: factura.fecha,
      cliente: {
        id: cliente.id,
        nombre: `${cliente.nombre} ${cliente.apellido}`,
      },
      vendedor: {
        id: vendedor.id,
        nombre: `${vendedor.nombre} ${vendedor.apellido}`,
      },
      productos: productosValidos,
      total: totalVenta,
    },
  });
};
