import { supabase } from "../config/db.js";

export const ventasTotal = async (req, res) => {
  try {
    // ============================================
    // OBTENER FECHA ACTUAL (inicio y fin del día)
    // ============================================
    const hoy = new Date();
    
    // Inicio del día: 00:00:00
    const inicioDia = new Date(hoy);
    inicioDia.setHours(0, 0, 0, 0);
    
    // Fin del día: 23:59:59
    const finDia = new Date(hoy);
    finDia.setHours(23, 59, 59, 999);

    // ============================================
    // CONSULTAR VENTAS DEL DÍA
    // ============================================
    const { data, error } = await supabase
      .from('Factura')
      .select(`
        id,
        codigo,
        fecha,
        Cliente(nombre, apellido),
        Vendedor(nombre, apellido)
      `)
      .gte('fecha', inicioDia.toISOString())  // Mayor o igual a 00:00:00
      .lte('fecha', finDia.toISOString())     // Menor o igual a 23:59:59
      .order('fecha', { ascending: false });  // Más reciente primero

    if (error) {
      console.error('Error al obtener ventas:', error);
      return res.status(500).json({
        message: "Error al obtener las ventas del día",
        error: error.message
      });
    }

    // ============================================
    // CALCULAR ESTADÍSTICAS
    // ============================================
    const totalVentas = data.length;

    // Calcular monto total (si tienes Detalle_Factura)
    let montoTotal = 0;
    
    if (totalVentas > 0) {
      // Obtener detalles para calcular totales
      const facturasIds = data.map(f => f.id);
      
      const { data: detalles } = await supabase
        .from('Detalle_Factura')
        .select(`
          cantidad,
          Producto(precio_venta)
        `)
        .in('id_factura', facturasIds);

      if (detalles) {
        montoTotal = detalles.reduce((total, detalle) => {
          return total + (detalle.cantidad * detalle.Producto.precio_venta);
        }, 0);
      }
    }

    // ============================================
    // RESPUESTA
    // ============================================
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
        cliente: venta.Cliente ? 
          `${venta.Cliente.nombre} ${venta.Cliente.apellido}` : 
          'N/A',
        vendedor: venta.Vendedor ? 
          `${venta.Vendedor.nombre} ${venta.Vendedor.apellido}` : 
          'N/A'
      }))
    });

  } catch (error) {
    console.error('Error del servidor:', error);
    return res.status(500).json({
      message: 'Error del servidor',
      error: error.message
    });
  }
};

export const ventasUltimos7Dias = async (req, res) => {
  try {
    const hoy = new Date();
    const hace7Dias = new Date();
    hace7Dias.setDate(hoy.getDate() - 7);

    const { data: facturas, error } = await supabase
      .from('Factura')
      .select(`
        fecha,
        Detalle_Factura(cantidad, Producto(precio_venta))
      `)
      .gte('fecha', hace7Dias.toISOString())
      .lte('fecha', hoy.toISOString());

    if (error) {
      return res.status(500).json({
        message: 'Error al obtener ventas',
        error: error.message
      });
    }

    // Agrupar por día
    const ventasPorDia = {};

    facturas.forEach(factura => {
      const fecha = factura.fecha.split('T')[0]; // "2026-01-20"
      
      if (!ventasPorDia[fecha]) {
        ventasPorDia[fecha] = {
          fecha: fecha,
          total_ventas: 0,
          monto_total: 0
        };
      }

      ventasPorDia[fecha].total_ventas++;
      
      factura.Detalle_Factura.forEach(detalle => {
        ventasPorDia[fecha].monto_total += 
          detalle.cantidad * detalle.Producto.precio_venta;
      });
    });

    // Convertir a array y ordenar
    const resultado = Object.values(ventasPorDia)
      .sort((a, b) => new Date(a.fecha) - new Date(b.fecha));

    return res.status(200).json({
      message: 'Ventas de los últimos 7 días',
      datos: resultado
    });

  } catch (error) {
    return res.status(500).json({
      message: 'Error del servidor',
      error: error.message
    });
  }
};

export const ventasMesActual = async (req, res) => {
  try {
    const hoy = new Date();
    const primerDiaMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
    const ultimoDiaMes = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0, 23, 59, 59);

    const { data: facturas, error } = await supabase
      .from('Factura')
      .select(`
        id,
        Detalle_Factura(cantidad, Producto(precio_venta))
      `)
      .gte('fecha', primerDiaMes.toISOString())
      .lte('fecha', ultimoDiaMes.toISOString());

    if (error) {
      return res.status(500).json({
        message: 'Error al obtener ventas',
        error: error.message
      });
    }

    // Calcular totales
    const totalVentas = facturas.length;
    let montoTotal = 0;

    facturas.forEach(factura => {
      factura.Detalle_Factura.forEach(detalle => {
        montoTotal += detalle.cantidad * detalle.Producto.precio_venta;
      });
    });

    return res.status(200).json({
      mes: hoy.toLocaleDateString('es-BO', { month: 'long', year: 'numeric' }),
      total_ventas: totalVentas,
      monto_total: montoTotal,
      promedio_venta: totalVentas > 0 ? montoTotal / totalVentas : 0
    });

  } catch (error) {
    return res.status(500).json({
      message: 'Error del servidor',
      error: error.message
    });
  }
};

export const ventasHoyVsAyer = async (req, res) => {
  try {
    // HOY
    const hoy = new Date();
    const inicioHoy = new Date(hoy.setHours(0, 0, 0, 0));
    const finHoy = new Date(hoy.setHours(23, 59, 59, 999));

    // AYER
    const ayer = new Date();
    ayer.setDate(ayer.getDate() - 1);
    const inicioAyer = new Date(ayer.setHours(0, 0, 0, 0));
    const finAyer = new Date(ayer.setHours(23, 59, 59, 999));

    // Ventas de hoy
    const { data: facturasHoy } = await supabase
      .from('Factura')
      .select(`Detalle_Factura(cantidad, Producto(precio_venta))`)
      .gte('fecha', inicioHoy.toISOString())
      .lte('fecha', finHoy.toISOString());

    // Ventas de ayer
    const { data: facturasAyer } = await supabase
      .from('Factura')
      .select(`Detalle_Factura(cantidad, Producto(precio_venta))`)
      .gte('fecha', inicioAyer.toISOString())
      .lte('fecha', finAyer.toISOString());

    // Calcular totales HOY
    const ventasHoy = facturasHoy.length;
    let montoHoy = 0;
    facturasHoy.forEach(f => {
      f.Detalle_Factura.forEach(d => {
        montoHoy += d.cantidad * d.Producto.precio_venta;
      });
    });

    // Calcular totales AYER
    const ventasAyer = facturasAyer.length;
    let montoAyer = 0;
    facturasAyer.forEach(f => {
      f.Detalle_Factura.forEach(d => {
        montoAyer += d.cantidad * d.Producto.precio_venta;
      });
    });

    // Comparación
    const diferenciaVentas = ventasHoy - ventasAyer;
    const diferenciaMonto = montoHoy - montoAyer;
    const porcentajeVentas = ventasAyer > 0 
      ? ((diferenciaVentas / ventasAyer) * 100).toFixed(1) 
      : 0;

    return res.status(200).json({
      hoy: {
        ventas: ventasHoy,
        monto: montoHoy
      },
      ayer: {
        ventas: ventasAyer,
        monto: montoAyer
      },
      comparacion: {
        diferencia_ventas: diferenciaVentas,
        diferencia_monto: diferenciaMonto,
        porcentaje_cambio: `${porcentajeVentas}%`,
        tendencia: diferenciaVentas > 0 ? 'subida' : diferenciaVentas < 0 ? 'bajada' : 'igual'
      }
    });

  } catch (error) {
    return res.status(500).json({
      message: 'Error del servidor',
      error: error.message
    });
  }
};