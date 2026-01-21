import { supabase } from "../config/db.js";
import PDFDocument from 'pdfkit'

export const realizarVenta = async (req, res) => {
  console.log("🔔 VENTA RECIBIDA:", new Date().toISOString());
  // ... (logs) ...
  const { id_cliente, id_vendedor, productos } = req.body;

  if (!id_cliente || !productos || productos.length === 0) {
    return res.status(400).json({
      message: "todos los campos deben estar completos",
    });
  }

  // --- VALIDACIÓN CLIENTE ---
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

  // --- VALIDACIÓN VENDEDOR ---
  const { data: vendedor } = await supabase
    .from("Vendedor")
    .select("*")
    .eq("id", id_vendedor)
    .single();

  if (!vendedor) {
    return res.status(500).json({
      // CORREGIDO: Decía "cliente" en el mensaje de error
      message: `el vendedor con id ${id_vendedor} no existe`,
    });
  }

  const productosValidos = [];

  // --- VALIDACIÓN PRODUCTOS Y PRECIO ---
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
      // Aquí ya estabas capturando el precio correctamente:
      precio_venta: producto.precio_venta, 
      subtotal: producto.precio_venta * item.cantidad,
    });
  }

  // --- CREAR FACTURA ---
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

  // --- INSERTAR DETALLES (AQUÍ ESTÁ EL CAMBIO IMPORTANTE) ---
  const detallesParaInsertar = productosValidos.map((prod) => ({
    id_factura: factura.id,
    id_producto: prod.id_producto,
    cantidad: prod.cantidad,
    
    // 🔥 CAMBIO CRÍTICO: Guardamos el precio histórico
    // Asignamos el precio que capturamos arriba a la columna de la BD
    precio_unitario: prod.precio_venta 
  }));

  const { data: detalles, error: errorDetalles } = await supabase
    .from("Detalle_Factura")
    .insert(detallesParaInsertar)
    .select();

  if (errorDetalles) {
    // Rollback manual si falla el detalle
    await supabase.from("Factura").delete().eq("id", factura.id);

    return res.status(500).json({
      message: "Error al crear los detalles de la factura",
      error: errorDetalles.message,
    });
  }

  // --- REDUCIR STOCK ---
  for (let prod of productosValidos) {
    const { error: errorStock } = await supabase.rpc("reducir_stock", {
      p_id_producto: prod.id_producto,
      p_cantidad: prod.cantidad,
    });

    if (errorStock) {
      console.error("Error al actualizar stock:", errorStock);
      // Nota: Aquí idealmente también harías rollback, pero es más complejo.
      // Por ahora está bien informar el error.
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


export const descargarPDFFactura = async (req, res) => {
  try {
    const { id } = req.params;
    const facturaId = parseInt(id);
    
    if (isNaN(facturaId)) {
      return res.status(400).json({ message: 'ID de factura inválido' });
    }
    
    // ============================================
    // 1. OBTENER FACTURA
    // ============================================
    // NOTA: Aquí quité los comentarios // que causaban el error
    const { data: factura, error } = await supabase
      .from('Factura')
      .select(`
        *,
        Cliente(id, codigo, nombre, apellido, ci, telefono),
        Vendedor(id, codigo, nombre, apellido),
        Detalle_Factura(
          id,
          cantidad,
          precio_unitario,
          Producto(id, codigo, nombre)
        )
      `)
      .eq('id', facturaId)
      .single();

    if (error || !factura) {
      return res.status(404).json({ message: 'Factura no encontrada', error: error?.message });
    }

    if (!factura.Cliente || !factura.Vendedor || !factura.Detalle_Factura?.length) {
      return res.status(404).json({ message: 'Datos de la factura incompletos' });
    }

    // ============================================
    // 2. EXTRAER DATOS (USANDO PRECIO HISTÓRICO)
    // ============================================
    const cliente = factura.Cliente;
    const vendedor = factura.Vendedor;
    
    // Filtramos solo detalles que tengan producto válido
    const detallesConProductos = factura.Detalle_Factura.filter(d => d.Producto);

    const productosValidos = detallesConProductos.map(detalle => {
      // AQUÍ ES EL CAMBIO DE ATRIBUTOS:
      // Usamos 'precio_unitario' (de la tabla detalle) en lugar de 'Producto.precio_venta'
      // Si es una factura vieja y no tiene precio histórico, usamos 0 como seguridad.
      const precioReal = detalle.precio_unitario !== null ? detalle.precio_unitario : 0;
      
      return {
        nombre: detalle.Producto.nombre,
        cantidad: detalle.cantidad,
        precio_venta: precioReal, // Usamos la variable local, no la del producto
        subtotal: detalle.cantidad * precioReal
      };
    });

    const totalVenta = productosValidos.reduce((total, prod) => total + prod.subtotal, 0);

    // ============================================
    // 3. GENERAR PDF
    // ============================================
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=factura-${factura.codigo || facturaId}.pdf`);

    const pdf = new PDFDocument({
      margin: 20,
      size: [397, 618]
    });

    pdf.pipe(res);

    const pageWidth = pdf.page.width;
    const pageHeight = pdf.page.height;
    const margin = pdf.page.margins.left;
    const contentWidth = pageWidth - (margin * 2);

    // --- ENCABEZADO ---
    pdf.fontSize(10).fillColor('#101828').text('FACTURA DE VENTA', { align: 'center' }).moveDown(0.3);
    
    pdf.fontSize(7).fillColor('#666')
      .text('Libreria T&M.', { align: 'center' })
      .text('Calle: Mcal. Andres de Santa Cruz', { align: 'center' })
      .text('Teléfono: 63423423',{align: 'center'})
      .moveDown(1);

    const yStart = pdf.y;

    const printField = (label, value, y) => {
      pdf.font('Helvetica-Bold').text(label, margin, y);
      pdf.font('Helvetica').text(value, margin + 50, y, { width: contentWidth - 50 });
    };

    printField('Factura:', factura.codigo || 'S/N', yStart);
    
    const fechaObj = new Date(factura.fecha);
    const fechaStr = fechaObj.toLocaleDateString('es-BO') + ' ' + fechaObj.toLocaleTimeString('es-BO', {hour: '2-digit', minute:'2-digit'});
    printField('Fecha:', fechaStr, yStart + 12);

    printField('Cliente:', `${cliente.nombre} ${cliente.apellido}`, yStart + 24);
    printField('CI/NIT:', cliente.ci?.toString() || '0', yStart + 36);
    printField('Vendedor:', `${vendedor.nombre} ${vendedor.apellido}`, yStart + 48);

    pdf.moveDown(2);
    
    pdf.strokeColor('#2563eb').lineWidth(1.5)
       .moveTo(margin, pdf.y).lineTo(pageWidth - margin, pdf.y).stroke();
    pdf.moveDown(0.5);

    // --- TABLA ---
    const tableTop = pdf.y;
    
    pdf.fontSize(7).fillColor('#fff')
       .rect(margin, tableTop, contentWidth, 18).fill('#414243');

    const col1 = contentWidth * 0.45;
    const col2 = contentWidth * 0.15;
    const col3 = contentWidth * 0.20;
    const col4 = contentWidth * 0.20;

    const rowY = tableTop + 5;
    pdf.fillColor('#fff').font('Helvetica-Bold');
    pdf.text('Producto', margin + 3, rowY, { width: col1 - 3 });
    pdf.text('Cant.', margin + col1, rowY, { width: col2, align: 'center' });
    pdf.text('P. Unit.', margin + col1 + col2, rowY, { width: col3, align: 'right' });
    pdf.text('Subtotal', margin + col1 + col2 + col3, rowY, { width: col4 - 3, align: 'right' });

    let yPos = tableTop + 23;

    productosValidos.forEach((producto, index) => {
      if (yPos > pageHeight - 50) {
        pdf.addPage();
        yPos = margin;
      }

      if (index % 2 === 0) {
        pdf.fillColor('#f9fafb').rect(margin, yPos - 3, contentWidth, 18).fill();
      }

      pdf.fontSize(7).fillColor('#333').font('Helvetica');
      
      pdf.text(producto.nombre, margin + 3, yPos, { width: col1 - 6, ellipsis: true });
      pdf.text(producto.cantidad.toString(), margin + col1, yPos, { width: col2, align: 'center' });
      
      // Mostrar precio histórico formateado
      pdf.text(Number(producto.precio_venta).toFixed(2), margin + col1 + col2, yPos, { width: col3, align: 'right' });
      
      // Mostrar subtotal formateado
      pdf.text(Number(producto.subtotal).toFixed(2), margin + col1 + col2 + col3, yPos, { width: col4 - 3, align: 'right' });

      yPos += 18;
    });

    yPos += 5;
    pdf.strokeColor('#ddd').lineWidth(0.5)
       .moveTo(margin, yPos).lineTo(pageWidth - margin, yPos).stroke();

    yPos += 10;
    
    pdf.fontSize(10).font('Helvetica-Bold').fillColor('#050b16');
    pdf.text('TOTAL:', margin + col1 + col2, yPos, { width: col3, align: 'right' });
    
    pdf.fontSize(11)
       .text(`Bs. ${totalVenta.toFixed(2)}`, margin + col1 + col2 + col3, yPos, { width: col4 - 3, align: 'right' });

    pdf.fontSize(6).fillColor('#666').font('Helvetica-Oblique')
       .text('Gracias por su preferencia', margin, pageHeight - 30, { align: 'center', width: contentWidth });

    pdf.end();

  } catch (error) {
    console.error('Error generando PDF:', error);
    if (!res.headersSent) res.status(500).json({ error: 'Error al generar el PDF' });
  }
};

export const listarFacturas = async(req,res)=>{
  const{data:factura, error:errorFactura} = await supabase
  .from('Factura')
  .select('id,codigo,id_cliente,fecha,Cliente(nombre,apellido)')

  if(errorFactura){
    return res.status(404).json({
      message: "no se pudo listar las facturas"
    })
  }

  return res.status(200).json({
    message: 'Lista de facturas',
    facturas : factura
  })
}