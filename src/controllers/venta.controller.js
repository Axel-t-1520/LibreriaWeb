import { supabase } from "../config/db.js";
import PDFDocument from 'pdfkit'

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

  if (!id_cliente || !productos || productos.length === 0) {
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


export const descargarPDFFactura = async (req, res) => {
  try {
    const { id } = req.params;
    
    const facturaId = parseInt(id);
    
    if (isNaN(facturaId)) {
      return res.status(400).json({
        message: 'ID de factura inválido',
        error: 'El ID debe ser un número válido'
      });
    }
    
    // ============================================
    // OBTENER FACTURA CON TODAS LAS RELACIONES
    // ============================================
    const { data: factura, error } = await supabase
      .from('Factura')
      .select(`
        *,
        Cliente(id, codigo, nombre, apellido, ci, telefono),
        Vendedor(id, codigo, nombre, apellido),
        Detalle_Factura(
          id,
          cantidad,
          Producto(id, codigo, nombre, precio_venta)
        )
      `)
      .eq('id', facturaId)
      .single();

    if (error || !factura) {
      return res.status(404).json({
        message: `No se encontró la factura con id ${facturaId}`,
        error: error?.message
      });
    }

    // ✅ VALIDAR QUE EXISTAN LAS RELACIONES
    if (!factura.Cliente) {
      return res.status(404).json({
        message: 'No se encontró el cliente asociado a la factura',
        debug: { factura }
      });
    }

    if (!factura.Vendedor) {
      return res.status(404).json({
        message: 'No se encontró el vendedor asociado a la factura',
        debug: { factura }
      });
    }

    if (!factura.Detalle_Factura || factura.Detalle_Factura.length === 0) {
      return res.status(404).json({
        message: 'No se encontraron productos en la factura',
        debug: { factura }
      });
    }

    // ✅ VALIDAR PRODUCTOS DENTRO DE DETALLES
    const detallesConProductos = factura.Detalle_Factura.filter(
      detalle => detalle.Producto !== null
    );

    if (detallesConProductos.length === 0) {
      return res.status(404).json({
        message: 'No se encontraron productos válidos en los detalles',
        debug: { detalles: factura.Detalle_Factura }
      });
    }

    // ============================================
    // EXTRAER DATOS
    // ============================================
    const cliente = factura.Cliente;
    const vendedor = factura.Vendedor;
    
    const productosValidos = detallesConProductos.map(detalle => ({
      nombre: detalle.Producto.nombre,
      cantidad: detalle.cantidad,
      precio_venta: detalle.Producto.precio_venta,
      subtotal: detalle.cantidad * detalle.Producto.precio_venta
    }));

    const totalVenta = productosValidos.reduce(
      (total, prod) => total + prod.subtotal,
      0
    );

    // ============================================
    // CONFIGURAR HEADERS
    // ============================================
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition', 
      `attachment; filename=factura-${factura.codigo}.pdf`
    );

    // ============================================
    // CREAR PDF
    // ============================================
    const pdf = new PDFDocument({
      margin: 20,
      size: [397, 618]
    });

    pdf.pipe(res);

    // ... resto del código del PDF sin cambios ...
    
    const pageWidth = pdf.page.width;
    const pageHeight = pdf.page.height;
    const margin = pdf.page.margins.left;
    const contentWidth = pageWidth - (margin * 2);

    pdf
      .fontSize(10)
      .fillColor('#101828')
      .text('FACTURA DE VENTA', { align: 'center' })
      .moveDown(0.3);

    pdf
      .fontSize(7)
      .fillColor('#666')
      .text('Libreria T&M.', { align: 'center' })
      .text('Calle: Mcal. Andres de Santa Cruz', { align: 'center' })
      .text('telefono: 63423423',{align: 'center'})
      .moveDown(1);

    const yPosition = pdf.y;

    pdf
      .fontSize(8)
      .fillColor('#333')
      .font('Helvetica-Bold')
      .text('Factura:', margin, yPosition)
      .font('Helvetica')
      .text(factura.codigo, margin + 50, yPosition);

    pdf
      .font('Helvetica-Bold')
      .text('Fecha:', margin, yPosition + 12)
      .font('Helvetica')
      .text(
        new Date(factura.fecha).toLocaleDateString('es-BO', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric'
        }) + ' ' + new Date(factura.fecha).toLocaleTimeString('es-BO', {
          hour: '2-digit',
          minute: '2-digit'
        }),
        margin + 50,
        yPosition + 12,
        { width: contentWidth - 50 }
      );

    pdf
      .font('Helvetica-Bold')
      .text('Cliente:', margin, yPosition + 24)
      .font('Helvetica')
      .text(
        `${cliente.nombre} ${cliente.apellido}`,
        margin + 50,
        yPosition + 24,
        { width: contentWidth - 50 }
      );

    pdf
      .font('Helvetica-Bold')
      .text('CI:', margin, yPosition + 36)
      .font('Helvetica')
      .text(cliente.ci?.toString() || 'N/A', margin + 50, yPosition + 36);

    pdf
      .font('Helvetica-Bold')
      .text('Vendedor:', margin, yPosition + 48)
      .font('Helvetica')
      .text(
        `${vendedor.nombre} ${vendedor.apellido}`,
        margin + 50,
        yPosition + 48,
        { width: contentWidth - 50 }
      )

    pdf.moveDown(2);

    pdf
      .strokeColor('#2563eb')
      .lineWidth(1.5)
      .moveTo(margin, pdf.y)
      .lineTo(pageWidth - margin, pdf.y)
      .stroke();

    pdf.moveDown(0.5);

    const tableTop = pdf.y;
    
    pdf
      .fontSize(7)
      .fillColor('#fff')
      .rect(margin, tableTop, contentWidth, 18)
      .fill('#414243');

    const col1Width = contentWidth * 0.40;
    const col2Width = contentWidth * 0.15;
    const col3Width = contentWidth * 0.22;
    const col4Width = contentWidth * 0.23;

    pdf
      .fillColor('#fff')
      .font('Helvetica-Bold')
      .text('Producto', margin + 3, tableTop + 5, { width: col1Width - 3 })
      .text('Cant.', margin + col1Width, tableTop + 5, { 
        width: col2Width, 
        align: 'center' 
      })
      .text('P. Unit.', margin + col1Width + col2Width, tableTop + 5, { 
        width: col3Width, 
        align: 'right' 
      })
      .text('Subtotal', margin + col1Width + col2Width + col3Width, tableTop + 5, { 
        width: col4Width - 3, 
        align: 'right' 
      });

    let yPos = tableTop + 23;

    productosValidos.forEach((producto, index) => {
      if (yPos > pageHeight - 100) {
        pdf.addPage();
        yPos = margin;

        pdf
          .fontSize(7)
          .fillColor('#fff')
          .rect(margin, yPos, contentWidth, 18)
          .fill('#2563eb');

        pdf
          .fillColor('#fff')
          .font('Helvetica-Bold')
          .text('Producto', margin + 3, yPos + 5, { width: col1Width - 3 })
          .text('Cant.', margin + col1Width, yPos + 5, { 
            width: col2Width, 
            align: 'center' 
          })
          .text('P. Unit.', margin + col1Width + col2Width, yPos + 5, { 
            width: col3Width, 
            align: 'right' 
          })
          .text('Subtotal', margin + col1Width + col2Width + col3Width, yPos + 5, { 
            width: col4Width - 3, 
            align: 'right' 
          });

        yPos += 23;
      }

      if (index % 2 === 0) {
        pdf
          .fillColor('#f9fafb')
          .rect(margin, yPos - 3, contentWidth, 18)
          .fill();
      }

      pdf
        .fontSize(7)
        .fillColor('#333')
        .font('Helvetica')
        .text(producto.nombre, margin + 3, yPos, { 
          width: col1Width - 6,
          ellipsis: true
        })
        .text(producto.cantidad.toString(), margin + col1Width, yPos, { 
          width: col2Width, 
          align: 'center' 
        })
        .text(
          `${producto.precio_venta.toFixed(2)}`, 
          margin + col1Width + col2Width, 
          yPos, 
          { width: col3Width, align: 'right' }
        )
        .text(
          `${producto.subtotal.toFixed(2)}`, 
          margin + col1Width + col2Width + col3Width, 
          yPos, 
          { width: col4Width - 3, align: 'right' }
        );

      yPos += 20;
    });

    yPos += 5;
    pdf
      .strokeColor('#ddd')
      .lineWidth(0.5)
      .moveTo(margin, yPos)
      .lineTo(pageWidth - margin, yPos)
      .stroke();

    yPos += 10;

    pdf
      .fontSize(10)
      .font('Helvetica-Bold')
      .fillColor('#050b16')
      .text('TOTAL:', margin + col1Width + col2Width, yPos)
      .fontSize(11)
      .text(
        `Bs. ${totalVenta.toFixed(2)}`, 
        margin + col1Width + col2Width + col3Width, 
        yPos, 
        { width: col4Width - 3, align: 'right' }
      );

    const footerY = pageHeight - 35;

    pdf
      .fontSize(6)
      .fillColor('#666')
      .font('Helvetica-Oblique')
      .text(
        'Gracias por su compra',
        margin,
        footerY,
        { align: 'center', width: contentWidth }
      )

    pdf.end();

  } catch (error) {
    console.error('Error al generar PDF:', error);
    
    if (!res.headersSent) {
      return res.status(500).json({
        message: 'Error al generar PDF',
        error: error.message
      });
    }
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