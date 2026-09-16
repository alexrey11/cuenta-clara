import { useState, useEffect } from 'react';
import { db } from './db';
import type { Venta, Usuario } from './db';
import jsPDF from 'jspdf';

interface HistorialVentasProps {
    usuarioActual: Usuario;
}

export default function HistorialVentas({ usuarioActual: _ }: HistorialVentasProps) {
    const [ventas, setVentas] = useState<Venta[]>([]);
    const [filtroFecha, setFiltroFecha] = useState<'hoy' | 'semana' | 'mes' | 'todo'>('hoy');
    const [filtroVendedor, setFiltroVendedor] = useState<string>('todos');
    const [busqueda, setBusqueda] = useState('');
    const [ventaSeleccionada, setVentaSeleccionada] = useState<Venta | null>(null);
    const [vendedores, setVendedores] = useState<string[]>([]);

    useEffect(() => {
        cargarDatos();
    }, [filtroFecha, filtroVendedor]);

    const cargarDatos = async () => {
        const todasVentas = await db.ventas.toArray();
        const todosUsuarios = await db.usuarios.toArray();
        setVendedores(todosUsuarios.map(u => u.nombre));
        const ahora = new Date();
        let ventasFiltradas = todasVentas.filter(v => v.estado === 'completada' || v.estado === 'error');

        if (filtroFecha === 'hoy') { const i = new Date(ahora); i.setHours(0, 0, 0, 0); ventasFiltradas = ventasFiltradas.filter(v => new Date(v.fecha) >= i); }
        else if (filtroFecha === 'semana') { const i = new Date(ahora); i.setDate(ahora.getDate() - 7); i.setHours(0, 0, 0, 0); ventasFiltradas = ventasFiltradas.filter(v => new Date(v.fecha) >= i); }
        else if (filtroFecha === 'mes') { const i = new Date(ahora); i.setDate(1); i.setHours(0, 0, 0, 0); ventasFiltradas = ventasFiltradas.filter(v => new Date(v.fecha) >= i); }

        if (filtroVendedor !== 'todos') ventasFiltradas = ventasFiltradas.filter(v => v.vendedorNombre === filtroVendedor);

        if (busqueda) {
            const b = busqueda.toLowerCase();
            ventasFiltradas = ventasFiltradas.filter(v => {
                const items = v.items && v.items.length > 0 ? v.items : [];
                return items.some(i => i.productoNombre.toLowerCase().includes(b) || (i.codigoBarras && i.codigoBarras.includes(b))) ||
                    (v.clienteNombre && v.clienteNombre.toLowerCase().includes(b)) ||
                    v.vendedorNombre.toLowerCase().includes(b);
            });
        }
        setVentas(ventasFiltradas.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime()));
    };

    const getItemsVenta = (v: Venta) => {
        if (v.items && v.items.length > 0) return v.items;
        return [{ productoId: v.productoId || 0, productoNombre: v.productoNombre || 'N/A', codigoBarras: '', cantidad: v.cantidad || 1, precioUnitario: v.precioUnitario || v.total, precioCompra: 0, subtotal: v.total }];
    };

    const totalVentas = ventas.reduce((s, v) => s + v.total, 0);
    const totalGanancia = ventas.reduce((s, v) => {
        const items = getItemsVenta(v);
        return s + items.reduce((sum, i) => sum + ((i.precioUnitario - (i.precioCompra || 0)) * i.cantidad), 0);
    }, 0);

    const exportarCSV = () => {
        let csv = 'Fecha,Hora,Vendedor,Cliente,Producto,Cod.Barras,Cantidad,P.Unitario,Subtotal,Total,Metodo Pago,Vuelto,Estado\n';
        ventas.forEach(v => {
            const items = getItemsVenta(v);
            const fecha = new Date(v.fecha);
            const metodos = v.metodosPago?.map(m => `${m.tipo}(${m.monto}${m.moneda})`).join('; ') || '';
            items.forEach(item => {
                csv += `"${fecha.toLocaleDateString('es-ES')}","${fecha.toLocaleTimeString('es-ES')}","${v.vendedorNombre}","${v.clienteNombre || ''}","${item.productoNombre}","${item.codigoBarras || ''}",${item.cantidad},${item.precioUnitario},${item.subtotal},${v.total},"${metodos}",${v.vueltoCUP || 0},"${v.estado}"\n`;
            });
        });
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `Historial_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
    };

    const exportarPDF = () => {
        const doc = new jsPDF();
        doc.setFontSize(16);
        doc.text('Historial de Ventas', 105, 20, { align: 'center' });
        doc.setFontSize(9);
        doc.text(`Generado: ${new Date().toLocaleString('es-ES')}`, 105, 28, { align: 'center' });
        let y = 40;
        ventas.forEach((v, idx) => {
            if (y > 260) { doc.addPage(); y = 20; }
            const fecha = new Date(v.fecha);
            const items = getItemsVenta(v);
            doc.setFontSize(9); doc.setFont('helvetica', 'bold');
            doc.text(`#${idx + 1} - ${fecha.toLocaleDateString('es-ES')} ${fecha.toLocaleTimeString('es-ES')}`, 14, y); y += 5;
            doc.setFontSize(8); doc.setFont('helvetica', 'normal');
            doc.text(`Vend: ${v.vendedorNombre} | Cli: ${v.clienteNombre || 'N/A'}`, 14, y); y += 4;
            items.forEach(item => { if (y > 275) { doc.addPage(); y = 20; } doc.text(`  • ${item.productoNombre} x${item.cantidad} = $${item.subtotal.toFixed(2)}`, 14, y); y += 4; });
            doc.text(`TOTAL: $${v.total.toFixed(2)} | Vuelto: $${(v.vueltoCUP || 0).toFixed(2)}`, 14, y); y += 5;
            doc.line(14, y, 196, y); y += 5;
        });
        y += 3; doc.setFont('helvetica', 'bold'); doc.setFontSize(10);
        doc.text(`TOTAL: $${totalVentas.toFixed(2)} | Ganancia: $${totalGanancia.toFixed(2)} | ${ventas.length} ventas`, 14, y);
        doc.save(`Historial_${new Date().toISOString().split('T')[0]}.pdf`);
    };

    return (
        <div className="p-3 md:p-6 bg-gray-50 dark:bg-gray-900 min-h-screen">
            <div className="max-w-7xl mx-auto">
                <div className="bg-white dark:bg-gray-800 rounded-xl md:rounded-2xl shadow-md p-4 md:p-6 mb-4 md:mb-6">
                    <h1 className="text-xl md:text-3xl font-bold text-gray-800 dark:text-gray-200 mb-1">📜 Historial Ventas</h1>
                    <p className="text-xs md:text-base text-gray-600 dark:text-gray-400">Registro completo con detalle</p>
                </div>

                {/* KPIs */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6 mb-4 md:mb-6">
                    <div className="bg-gradient-to-br from-green-500 to-green-600 text-white p-3 md:p-6 rounded-xl md:rounded-2xl shadow-md">
                        <p className="text-xs md:text-sm opacity-90">💰 Total</p>
                        <p className="text-lg md:text-3xl font-bold truncate">${totalVentas.toFixed(0)}</p>
                        <p className="text-xs opacity-75 mt-1 hidden md:block">{ventas.length} ventas</p>
                    </div>
                    <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white p-3 md:p-6 rounded-xl md:rounded-2xl shadow-md">
                        <p className="text-xs md:text-sm opacity-90">📈 Ganancia</p>
                        <p className="text-lg md:text-3xl font-bold truncate">${totalGanancia.toFixed(0)}</p>
                        <p className="text-xs opacity-75 mt-1 hidden md:block">Neto</p>
                    </div>
                    <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white p-3 md:p-6 rounded-xl md:rounded-2xl shadow-md">
                        <p className="text-xs md:text-sm opacity-90">🎫 Ticket</p>
                        <p className="text-lg md:text-3xl font-bold truncate">${ventas.length > 0 ? (totalVentas / ventas.length).toFixed(0) : '0'}</p>
                        <p className="text-xs opacity-75 mt-1 hidden md:block">Promedio</p>
                    </div>
                    <div className="bg-gradient-to-br from-orange-500 to-orange-600 text-white p-3 md:p-6 rounded-xl md:rounded-2xl shadow-md">
                        <p className="text-xs md:text-sm opacity-90">💵 Vuelto</p>
                        <p className="text-lg md:text-3xl font-bold truncate">${ventas.reduce((s, v) => s + (v.vueltoCUP || 0), 0).toFixed(0)}</p>
                        <p className="text-xs opacity-75 mt-1 hidden md:block">Devuelto</p>
                    </div>
                </div>

                {/* Filtros */}
                <div className="bg-white dark:bg-gray-800 rounded-xl md:rounded-2xl shadow-md p-3 md:p-6 mb-4 md:mb-6">
                    <h2 className="text-sm md:text-lg font-semibold mb-3 text-gray-800 dark:text-gray-200">🔍 Filtros</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <select value={filtroFecha} onChange={(e) => setFiltroFecha(e.target.value as any)}
                            className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg px-3 py-2.5 text-sm md:text-base">
                            <option value="hoy">📅 Hoy</option>
                            <option value="semana">📆 Semana</option>
                            <option value="mes">🗓️ Mes</option>
                            <option value="todo">📊 Todo</option>
                        </select>
                        <select value={filtroVendedor} onChange={(e) => setFiltroVendedor(e.target.value)}
                            className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg px-3 py-2.5 text-sm md:text-base">
                            <option value="todos">Todos vendedores</option>
                            {vendedores.map(v => <option key={v} value={v}>{v}</option>)}
                        </select>
                        <input type="text" placeholder="Buscar..." value={busqueda} onChange={(e) => setBusqueda(e.target.value)}
                            className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg px-3 py-2.5 text-sm md:text-base" />
                    </div>
                </div>

                {/* Botones */}
                <div className="flex gap-2 md:gap-3 mb-4 md:mb-6">
                    <button onClick={exportarPDF} className="flex-1 md:flex-none bg-red-600 text-white px-4 md:px-6 py-2.5 md:py-3 rounded-xl hover:bg-red-700 font-semibold text-sm md:text-base shadow-md">📄 PDF</button>
                    <button onClick={exportarCSV} className="flex-1 md:flex-none bg-green-600 text-white px-4 md:px-6 py-2.5 md:py-3 rounded-xl hover:bg-green-700 font-semibold text-sm md:text-base shadow-md">📊 CSV</button>
                </div>

                {/* Lista */}
                <div className="bg-white dark:bg-gray-800 rounded-xl md:rounded-2xl shadow-md p-3 md:p-6">
                    <h2 className="text-base md:text-xl font-semibold mb-3 md:mb-4 text-gray-800 dark:text-gray-200">Ventas ({ventas.length})</h2>
                    {ventas.length === 0 ? (
                        <p className="text-gray-500 dark:text-gray-400 text-center py-8 md:py-12 text-sm md:text-base">Sin ventas</p>
                    ) : (
                        <div className="space-y-2 md:space-y-3">
                            {ventas.map((venta) => {
                                const items = getItemsVenta(venta);
                                const fecha = new Date(venta.fecha);
                                return (
                                    <div key={venta.id} onClick={() => setVentaSeleccionada(venta)}
                                        className="bg-gray-50 dark:bg-gray-700 p-3 md:p-4 rounded-lg md:rounded-xl border border-gray-200 dark:border-gray-600 hover:shadow-md transition-shadow cursor-pointer">
                                        <div className="flex justify-between items-start gap-2">
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="text-lg md:text-2xl">🧾</span>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="font-bold text-gray-800 dark:text-gray-200 text-sm md:text-base truncate">
                                                            {fecha.toLocaleDateString('es-ES')} {fecha.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                                                        </p>
                                                        <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400 truncate">
                                                            👤 {venta.vendedorNombre}{venta.clienteNombre && ` | ${venta.clienteNombre}`}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="ml-7 md:ml-10">
                                                    <p className="text-xs md:text-sm text-gray-700 dark:text-gray-300 truncate">
                                                        {items.map(i => `${i.productoNombre} x${i.cantidad}`).join(', ')}
                                                    </p>
                                                    <div className="flex gap-2 md:gap-4 mt-1 text-xs text-gray-500 dark:text-gray-400 flex-wrap">
                                                        <span>💰 <strong className="text-green-600 dark:text-green-400">${venta.total.toFixed(2)}</strong></span>
                                                        {venta.vueltoCUP && venta.vueltoCUP > 0 && <span>💵 <strong className="text-blue-600 dark:text-blue-400">${venta.vueltoCUP.toFixed(2)}</strong></span>}
                                                        {venta.esFiado && <span className="bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 px-2 py-0.5 rounded font-semibold">FIADO</span>}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="text-right flex-shrink-0">
                                                <p className="text-lg md:text-2xl font-bold text-green-600 dark:text-green-400">${venta.total.toFixed(0)}</p>
                                                <p className="text-[10px] md:text-xs text-gray-500 dark:text-gray-400">Ver →</p>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Modal Detalle */}
                {ventaSeleccionada && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end md:items-center justify-center p-0 md:p-4 z-50 backdrop-blur-sm">
                        <div className="bg-white dark:bg-gray-800 rounded-t-2xl md:rounded-2xl shadow-2xl w-full md:max-w-2xl max-h-[90vh] overflow-y-auto">
                            <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-4 md:px-6 py-3 md:py-4 flex justify-between items-center sticky top-0 z-10">
                                <h2 className="text-lg md:text-xl font-bold text-white">🧾 Detalle</h2>
                                <button onClick={() => setVentaSeleccionada(null)} className="text-white hover:text-gray-200 text-2xl">&times;</button>
                            </div>
                            <div className="p-4 md:p-6 space-y-3 md:space-y-4">
                                <div className="bg-gray-50 dark:bg-gray-700 p-3 md:p-4 rounded-lg md:rounded-xl">
                                    <h3 className="font-semibold text-gray-800 dark:text-gray-200 mb-2 text-sm md:text-base">📋 Info</h3>
                                    <div className="grid grid-cols-2 gap-2 md:gap-3 text-xs md:text-sm">
                                        <div><p className="text-gray-500 dark:text-gray-400">Fecha:</p><p className="font-semibold text-gray-800 dark:text-gray-200">{new Date(ventaSeleccionada.fecha).toLocaleDateString('es-ES')}</p></div>
                                        <div><p className="text-gray-500 dark:text-gray-400">Hora:</p><p className="font-semibold text-gray-800 dark:text-gray-200">{new Date(ventaSeleccionada.fecha).toLocaleTimeString('es-ES')}</p></div>
                                        <div><p className="text-gray-500 dark:text-gray-400">Vendedor:</p><p className="font-semibold text-gray-800 dark:text-gray-200 truncate">{ventaSeleccionada.vendedorNombre}</p></div>
                                        <div><p className="text-gray-500 dark:text-gray-400">Cliente:</p><p className="font-semibold text-gray-800 dark:text-gray-200 truncate">{ventaSeleccionada.clienteNombre || 'N/A'}</p></div>
                                        <div><p className="text-gray-500 dark:text-gray-400">Estado:</p><p className={`font-semibold ${ventaSeleccionada.estado === 'completada' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>{ventaSeleccionada.estado === 'completada' ? '✅ OK' : '⚠️ Error'}</p></div>
                                        {ventaSeleccionada.esFiado && <div><p className="text-gray-500 dark:text-gray-400">Tipo:</p><p className="font-semibold text-yellow-600 dark:text-yellow-400">💳 FIADO</p></div>}
                                    </div>
                                </div>

                                <div className="bg-gray-50 dark:bg-gray-700 p-3 md:p-4 rounded-lg md:rounded-xl">
                                    <h3 className="font-semibold text-gray-800 dark:text-gray-200 mb-2 text-sm md:text-base">📦 Productos</h3>
                                    <div className="space-y-2">
                                        {getItemsVenta(ventaSeleccionada).map((item, idx) => (
                                            <div key={idx} className="flex justify-between items-center bg-white dark:bg-gray-600 p-2 md:p-3 rounded-lg">
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-semibold text-gray-800 dark:text-gray-200 text-sm truncate">{item.productoNombre}</p>
                                                    {item.codigoBarras && <p className="text-xs text-gray-500 dark:text-gray-400 font-mono">📊 {item.codigoBarras}</p>}
                                                    <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400">${item.precioUnitario.toFixed(2)} × {item.cantidad}</p>
                                                </div>
                                                <p className="text-base md:text-lg font-bold text-blue-600 dark:text-blue-400 ml-2">${item.subtotal.toFixed(2)}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {ventaSeleccionada.metodosPago && ventaSeleccionada.metodosPago.length > 0 && (
                                    <div className="bg-gray-50 dark:bg-gray-700 p-3 md:p-4 rounded-lg md:rounded-xl">
                                        <h3 className="font-semibold text-gray-800 dark:text-gray-200 mb-2 text-sm md:text-base">💰 Pago</h3>
                                        <div className="space-y-2">
                                            {ventaSeleccionada.metodosPago.map((mp, idx) => (
                                                <div key={idx} className="flex justify-between items-center bg-white dark:bg-gray-600 p-2 md:p-3 rounded-lg">
                                                    <div>
                                                        <p className="font-semibold text-gray-800 dark:text-gray-200 text-sm">
                                                            {mp.tipo === 'efectivo' ? '💵 Efectivo' : mp.tipo === 'transferencia' ? '📱 Transfer' : mp.tipo === 'tarjeta' ? '💳 Tarjeta' : '💳 Fiado'}
                                                        </p>
                                                        <p className="text-xs text-gray-600 dark:text-gray-400">{mp.monto} {mp.moneda}{mp.moneda !== 'CUP' && ` (= $${mp.montoEnCUP.toFixed(2)} CUP)`}</p>
                                                    </div>
                                                    <p className="text-base md:text-lg font-bold text-green-600 dark:text-green-400 ml-2">${mp.montoEnCUP.toFixed(2)}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 p-3 md:p-4 rounded-lg md:rounded-xl border-2 border-green-200 dark:border-green-800">
                                    <div className="space-y-2">
                                        <div className="flex justify-between text-base md:text-lg"><span className="font-semibold text-gray-800 dark:text-gray-200">Total:</span><span className="font-bold text-green-700 dark:text-green-400">${ventaSeleccionada.total.toFixed(2)} CUP</span></div>
                                        {ventaSeleccionada.vueltoCUP && ventaSeleccionada.vueltoCUP > 0 && (
                                            <div className="flex justify-between text-base md:text-lg"><span className="font-semibold text-gray-800 dark:text-gray-200">💵 Vuelto:</span><span className="font-bold text-blue-700 dark:text-blue-400">${ventaSeleccionada.vueltoCUP.toFixed(2)} CUP</span></div>
                                        )}
                                        {ventaSeleccionada.comisionVendedor && ventaSeleccionada.comisionVendedor > 0 && (
                                            <div className="flex justify-between text-xs md:text-sm"><span className="text-gray-700 dark:text-gray-300">Comisión:</span><span className="font-semibold text-purple-700 dark:text-purple-400">${ventaSeleccionada.comisionVendedor.toFixed(2)}</span></div>
                                        )}
                                    </div>
                                </div>

                                {ventaSeleccionada.notas && (
                                    <div className="bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded-lg border border-yellow-200 dark:border-yellow-800">
                                        <h3 className="font-semibold text-yellow-800 dark:text-yellow-400 mb-1 text-sm">📝 Notas:</h3>
                                        <p className="text-xs md:text-sm text-gray-700 dark:text-gray-300">{ventaSeleccionada.notas}</p>
                                    </div>
                                )}
                                {ventaSeleccionada.notaCancelacion && (
                                    <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded-lg border border-red-200 dark:border-red-800">
                                        <h3 className="font-semibold text-red-800 dark:text-red-400 mb-1 text-sm">⚠️ Motivo Error:</h3>
                                        <p className="text-xs md:text-sm text-gray-700 dark:text-gray-300">{ventaSeleccionada.notaCancelacion}</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}