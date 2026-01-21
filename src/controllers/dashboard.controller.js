import { supabase } from "../config/db.js";

// ==========================================
// 1. VENTAS DEL DÍA (CORREGIDO)
// ==========================================
export const ventasTotal = async (req, res) => {
  try {
    const hoy = new Date();
    const inicioDia = new Date(hoy);
    inicioDia.setHours(0, 0, 0, 0);
    const finDia = new Date(hoy);
    finDia.setHours(23, 59, 59, 999);

    const { data, error } = await supabase
      .from('Factura')
      .select(`
        id, codigo, fecha,
        Cliente(nombre, apellido),
        Vendedor(nombre, apellido)
      `)
      .gte('fecha', inicioDia.toISOString())
      .lte('fecha', finDia.toISOString())
      .order('fecha', { ascending: false });

    if (error) throw error;

    const totalVentas = data.length;
    let montoTotal = 0;
    
    if (totalVentas > 0) {
      const facturasIds = data.map(f => f.id);
      
      // CAMBIO: Pedimos precio_unitario directo de Detalle_Factura
      const { data: detalles } = await supabase
        .from('Detalle_Factura')
        .select(`cantidad, precio_unitario`) 
        .in('id_factura', facturasIds);

      if (detalles) {
        montoTotal = detalles.reduce((total, detalle) => {
          // CAMBIO: Usamos el precio histórico (con fallback a 0 por seguridad)
          const precio = detalle.precio_unitario || 0;
          return total + (detalle.cantidad * precio);
        }, 0);
      }
    }

    return res.status(200).json({
      message: `Ventas del día ${hoy.toLocaleDateString('es-BO')}`,
      fecha: hoy.toISOString(),
      estadisticas: {
        total_ventas: totalVentas,
        monto_total: montoTotal,
        promedio_por_venta: totalVentas > 0 ? montoTotal / totalVentas : 0
      },
      ventas: data.map(venta => ({
        codigo: venta.codigo,
        fecha: venta.fecha,
        cliente: venta.Cliente ? `${venta.Cliente.nombre} ${venta.Cliente.apellido}` : 'N/A',
        vendedor: venta.Vendedor ? `${venta.Vendedor.nombre} ${venta.Vendedor.apellido}` : 'N/A'
      }))
    });

  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ message: 'Error del servidor', error: error.message });
  }
};

// ==========================================
// 2. VENTAS ÚLTIMOS 7 DÍAS (CORREGIDO)
// ==========================================
export const ventasUltimos7Dias = async (req, res) => {
  try {
    const hoy = new Date();
    const hace7Dias = new Date();
    hace7Dias.setDate(hoy.getDate() - 7);

    // CAMBIO: Pedimos precio_unitario en lugar de Producto(precio_venta)
    const { data: facturas, error } = await supabase
      .from('Factura')
      .select(`
        fecha,
        Detalle_Factura(cantidad, precio_unitario) 
      `)
      .gte('fecha', hace7Dias.toISOString())
      .lte('fecha', hoy.toISOString());

    if (error) throw error;

    const ventasPorDia = {};

    facturas.forEach(factura => {
      const fecha = factura.fecha.split('T')[0];
      
      if (!ventasPorDia[fecha]) {
        ventasPorDia[fecha] = { fecha: fecha, total_ventas: 0, monto_total: 0 };
      }

      ventasPorDia[fecha].total_ventas++;
      
      if(factura.Detalle_Factura) {
        factura.Detalle_Factura.forEach(detalle => {
          // CAMBIO: Cálculo con precio histórico
          const precio = detalle.precio_unitario || 0;
          ventasPorDia[fecha].monto_total += detalle.cantidad * precio;
        });
      }
    });

    const resultado = Object.values(ventasPorDia)
      .sort((a, b) => new Date(a.fecha) - new Date(b.fecha));

    return res.status(200).json({ message: 'Ventas 7 días', datos: resultado });

  } catch (error) {
    return res.status(500).json({ message: 'Error del servidor', error: error.message });
  }
};

// ==========================================
// 3. VENTAS MES ACTUAL (CORREGIDO)
// ==========================================
export const ventasMesActual = async (req, res) => {
  try {
    const hoy = new Date();
    const primerDiaMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
    const ultimoDiaMes = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0, 23, 59, 59);

    // CAMBIO: Pedimos precio_unitario
    const { data: facturas, error } = await supabase
      .from('Factura')
      .select(`
        id,
        Detalle_Factura(cantidad, precio_unitario)
      `)
      .gte('fecha', primerDiaMes.toISOString())
      .lte('fecha', ultimoDiaMes.toISOString());

    if (error) throw error;

    const totalVentas = facturas.length;
    let montoTotal = 0;

    facturas.forEach(factura => {
      if(factura.Detalle_Factura) {
        factura.Detalle_Factura.forEach(detalle => {
          // CAMBIO: Cálculo con precio histórico
          const precio = detalle.precio_unitario || 0;
          montoTotal += detalle.cantidad * precio;
        });
      }
    });

    return res.status(200).json({
      mes: hoy.toLocaleDateString('es-BO', { month: 'long', year: 'numeric' }),
      total_ventas: totalVentas,
      monto_total: montoTotal,
      promedio_venta: totalVentas > 0 ? montoTotal / totalVentas : 0
    });

  } catch (error) {
    return res.status(500).json({ message: 'Error del servidor', error: error.message });
  }
};

// ==========================================
// 4. COMPARACIÓN HOY VS AYER (CORREGIDO)
// ==========================================
export const ventasHoyVsAyer = async (req, res) => {
  try {
    const hoy = new Date();
    const inicioHoy = new Date(hoy.setHours(0, 0, 0, 0));
    const finHoy = new Date(hoy.setHours(23, 59, 59, 999));

    const ayer = new Date();
    ayer.setDate(ayer.getDate() - 1);
    const inicioAyer = new Date(ayer.setHours(0, 0, 0, 0));
    const finAyer = new Date(ayer.setHours(23, 59, 59, 999));

    // CAMBIO: Pedimos precio_unitario en ambas consultas
    const { data: facturasHoy } = await supabase
      .from('Factura')
      .select(`Detalle_Factura(cantidad, precio_unitario)`)
      .gte('fecha', inicioHoy.toISOString())
      .lte('fecha', finHoy.toISOString());

    const { data: facturasAyer } = await supabase
      .from('Factura')
      .select(`Detalle_Factura(cantidad, precio_unitario)`)
      .gte('fecha', inicioAyer.toISOString())
      .lte('fecha', finAyer.toISOString());

    // Totales HOY
    const ventasHoy = facturasHoy.length;
    let montoHoy = 0;
    facturasHoy.forEach(f => {
      f.Detalle_Factura.forEach(d => {
        montoHoy += d.cantidad * (d.precio_unitario || 0);
      });
    });

    // Totales AYER
    const ventasAyer = facturasAyer.length;
    let montoAyer = 0;
    facturasAyer.forEach(f => {
      f.Detalle_Factura.forEach(d => {
        montoAyer += d.cantidad * (d.precio_unitario || 0);
      });
    });

    const diferenciaVentas = ventasHoy - ventasAyer;
    const diferenciaMonto = montoHoy - montoAyer;
    const porcentajeVentas = ventasAyer > 0 
      ? ((diferenciaVentas / ventasAyer) * 100).toFixed(1) 
      : 0;

    return res.status(200).json({
      hoy: { ventas: ventasHoy, monto: montoHoy },
      ayer: { ventas: ventasAyer, monto: montoAyer },
      comparacion: {
        diferencia_ventas: diferenciaVentas,
        diferencia_monto: diferenciaMonto,
        porcentaje_cambio: `${porcentajeVentas}%`,
        tendencia: diferenciaVentas > 0 ? 'subida' : diferenciaVentas < 0 ? 'bajada' : 'igual'
      }
    });

  } catch (error) {
    return res.status(500).json({ message: 'Error del servidor', error: error.message });
  }
};