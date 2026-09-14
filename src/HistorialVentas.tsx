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
        const todosUsuarios = await db.usuarios.where('rol').anyOf(['admin', 'jefe', 'vendedor']).toArray();

        setVendedores(todosUsuarios.map(u => u.nombre));

        const ahora = new Date();
        let ventasFiltradas = todasVentas.filter(v => v.estado === 'completada' || v.estado === 'error');

        if (filtroFecha === 'hoy') {
            const inicio = new Date(ahora);
            inicio.setHours(0, 0, 0, 0);
            ventasFiltradas = ventasFiltradas.filter(v => new Date(v.fecha) >= inicio);
        } else if (filtroFecha === 'semana') {
            const inicio = new Date(ahora);
            inicio.setDate(ahora.getDate() - 7);
            inicio.setHours(0, 0, 0, 0);
            ventasFiltradas = ventasFiltradas.filter(v => new Date(v.fecha) >= inicio);
        } else if (filtroFecha === 'mes') {
            const inicio = new Date(ahora);
            inicio.setDate(1);
            inicio.setHours(0, 0, 0, 0);
            ventasFiltradas = ventasFiltradas.filter(v => new Date(v.fecha) >= inicio);
        }

        if (filtroVendedor !== 'todos') {
            ventasFiltradas = ventasFiltradas.filter(v => v.vendedorNombre === filtroVendedor);
        }

        if (busqueda) {
            const b = busqueda.toLowerCase();
            ventasFiltradas = ventasFiltradas.filter(v => {
                const items = v.items && v.items.length > 0 ? v.items : [];
                const matchProducto = items.some(i =>
                    i.productoNombre.toLowerCase().includes(b) ||
                    (i.codigoBarras && i.codigoBarras.includes(b))
                );
                const matchCliente = v.clienteNombre && v.clienteNombre.toLowerCase().includes(b);
                const matchVendedor = v.vendedorNombre.toLowerCase().includes(b);
                return matchProducto || matchCliente || matchVendedor;
            });
        }

        setVentas(ventasFiltradas.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime()));
    };

    const getItemsVenta = (v: Venta) => {
        if (v.items && v.items.length > 0) return v.items;
        return [{
            productoId: v.productoId || 0,
            productoNombre: v.productoNombre || 'N/A',
            codigoBarras: '',
            cantidad: v.cantidad || 1,
            precioUnitario: v.precioUnitario || v.total,
            precioCompra: 0,
            subtotal: v.total
        }];
    };

    const totalVentas = ventas.reduce((s, v) => s + v.total, 0);
    const totalGanancia = ventas.reduce((s, v) => {
        const items = getItemsVenta(v);
        return s + items.reduce((sum, i) => sum + ((i.precioUnitario - (i.precioCompra || 0)) * i.cantidad), 0);
    }, 0);

    const exportarCSV = () => {
        let csv = 'Fecha,Hora,Vendedor,Cliente,Producto,Cod.Barras,Cantidad,P.Unitario,Subtotal,Total Venta,Metodo Pago,Vuelto,Estado,Notas\n';

        ventas.forEach(v => {
            const items = getItemsVenta(v);
            const fecha = new Date(v.fecha);
            const metodos = v.metodosPago?.map(m => `${m.tipo}(${m.monto}${m.moneda})`).join('; ') || '';

            items.forEach(item => {
                csv += `"${fecha.toLocaleDateString('es-ES')}","${fecha.toLocaleTimeString('es-ES')}","${v.vendedorNombre}","${v.clienteNombre || ''}","${item.productoNombre}","${item.codigoBarras || ''}",${item.cantidad},${item.precioUnitario},${item.subtotal},${v.total},"${metodos}",${v.vueltoCUP || 0},"${v.estado}","${v.notas || ''}"\n`;
            });
        });

        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `Historial_Ventas_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
    };

    const exportarPDF = () => {
        const doc = new jsPDF();
        doc.setFontSize(18);
        doc.text('Historial Completo de Ventas', 105, 20, { align: 'center' });
        doc.setFontSize(9);
        doc.text(`Generado: ${new Date().toLocaleDateString('es-ES')} ${new Date().toLocaleTimeString('es-ES')}`, 105, 28, { align: 'center' });
        doc.text(`Filtro: ${filtroFecha} | Vendedor: ${filtroVendedor}`, 105, 34, { align: 'center' });

        let y = 44;
        ventas.forEach((v, idx) => {
            if (y > 260) { doc.addPage(); y = 20; }

            const fecha = new Date(v.fecha);
            const items = getItemsVenta(v);

            doc.setFontSize(10);
            doc.setFont('helvetica', 'bold');
            doc.text(`Venta #${idx + 1} - ${fecha.toLocaleDateString('es-ES')} ${fecha.toLocaleTimeString('es-ES')}`, 14, y);
            y += 6;

            doc.setFontSize(8);
            doc.setFont('helvetica', 'normal');
            doc.text(`Vendedor: ${v.vendedorNombre} | Cliente: ${v.clienteNombre || 'N/A'} | Estado: ${v.estado}`, 14, y);
            y += 5;

            items.forEach(item => {
                if (y > 275) { doc.addPage(); y = 20; }
                doc.text(`  • ${item.productoNombre} x${item.cantidad} = $${item.subtotal.toFixed(2)}`, 14, y);
                y += 4;
            });

            doc.text(`TOTAL: $${v.total.toFixed(2)} CUP`, 14, y);
            if (v.vueltoCUP && v.vueltoCUP > 0) {
                doc.text(`Vuelto: $${v.vueltoCUP.toFixed(2)} CUP`, 80, y);
            }
            y += 5;

            if (v.metodosPago && v.metodosPago.length > 0) {
                const metodos = v.metodosPago.map(m => `${m.tipo}: ${m.monto} ${m.moneda}`).join(' | ');
                doc.text(`Pago: ${metodos}`, 14, y);
                y += 5;
            }

            if (v.notas) {
                doc.text(`Notas: ${v.notas}`, 14, y);
                y += 5;
            }

            y += 3;
            doc.setLineWidth(0.5);
            doc.line(14, y, 196, y);
            y += 6;
        });

        y += 5;
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text(`TOTAL GENERAL: $${totalVentas.toFixed(2)} CUP`, 14, y);
        doc.text(`GANANCIA TOTAL: $${totalGanancia.toFixed(2)} CUP`, 14, y + 8);
        doc.text(`${ventas.length} ventas`, 14, y + 16);

        doc.save(`Historial_Ventas_${new Date().toISOString().split('T')[0]}.pdf`);
    };

    return (
        <div className="p-6 bg-gray-50 dark:bg-gray-900 min-h-screen">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-md p-6 mb-6">
                    <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-200 mb-2">📜 Historial de Ventas</h1>
                    <p className="text-gray-600 dark:text-gray-400">Registro completo de todas las ventas con detalle</p>
                </div>

                {/* KPIs */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
                    <div className="bg-gradient-to-br from-green-500 to-green-600 text-white p-6 rounded-2xl shadow-md">
                        <p className="text-sm opacity-90">💰 Total Ventas</p>
                        <p className="text-3xl font-bold">${totalVentas.toFixed(2)}</p>
                        <p className="text-xs opacity-75 mt-1">{ventas.length} ventas</p>
                    </div>
                    <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white p-6 rounded-2xl shadow-md">
                        <p className="text-sm opacity-90">📈 Ganancia</p>
                        <p className="text-3xl font-bold">${totalGanancia.toFixed(2)}</p>
                        <p className="text-xs opacity-75 mt-1">Beneficio neto</p>
                    </div>
                    <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white p-6 rounded-2xl shadow-md">
                        <p className="text-sm opacity-90">🎫 Ticket Promedio</p>
                        <p className="text-3xl font-bold">${ventas.length > 0 ? (totalVentas / ventas.length).toFixed(2) : '0.00'}</p>
                        <p className="text-xs opacity-75 mt-1">Por venta</p>
                    </div>
                    <div className="bg-gradient-to-br from-orange-500 to-orange-600 text-white p-6 rounded-2xl shadow-md">
                        <p className="text-sm opacity-90">💵 Vuelto Total</p>
                        <p className="text-3xl font-bold">${ventas.reduce((s, v) => s + (v.vueltoCUP || 0), 0).toFixed(2)}</p>
                        <p className="text-xs opacity-75 mt-1">Devuelto a clientes</p>
                    </div>
                </div>

                {/* Filtros */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-md p-6 mb-6">
                    <h2 className="text-lg font-semibold mb-4 text-gray-800 dark:text-gray-200">🔍 Filtros</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* Fecha */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Período:</label>
                            <select
                                value={filtroFecha}
                                onChange={(e) => setFiltroFecha(e.target.value as any)}
                                className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg px-4 py-2.5"
                            >
                                <option value="hoy">📅 Hoy</option>
                                <option value="semana">📆 Esta Semana</option>
                                <option value="mes">🗓️ Este Mes</option>
                                <option value="todo">📊 Todo</option>
                            </select>
                        </div>

                        {/* Vendedor */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Vendedor:</label>
                            <select
                                value={filtroVendedor}
                                onChange={(e) => setFiltroVendedor(e.target.value)}
                                className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg px-4 py-2.5"
                            >
                                <option value="todos">Todos los vendedores</option>
                                {vendedores.map(v => <option key={v} value={v}>{v}</option>)}
                            </select>
                        </div>

                        {/* Búsqueda */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Buscar:</label>
                            <input
                                type="text"
                                placeholder="Producto, cliente, vendedor..."
                                value={busqueda}
                                onChange={(e) => setBusqueda(e.target.value)}
                                className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg px-4 py-2.5"
                            />
                        </div>
                    </div>
                </div>

                {/* Botones Exportar */}
                <div className="flex gap-3 mb-6">
                    <button
                        onClick={exportarPDF}
                        className="bg-red-600 text-white px-6 py-3 rounded-xl hover:bg-red-700 font-semibold shadow-md"
                    >
                        📄 Exportar PDF
                    </button>
                    <button
                        onClick={exportarCSV}
                        className="bg-green-600 text-white px-6 py-3 rounded-xl hover:bg-green-700 font-semibold shadow-md"
                    >
                        📊 Exportar CSV
                    </button>
                </div>

                {/* Lista de Ventas */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-md p-6">
                    <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-gray-200">
                        Ventas ({ventas.length})
                    </h2>

                    {ventas.length === 0 ? (
                        <p className="text-gray-500 dark:text-gray-400 text-center py-12">No hay ventas en este período</p>
                    ) : (
                        <div className="space-y-3">
                            {ventas.map((venta) => {
                                const items = getItemsVenta(venta);
                                const fecha = new Date(venta.fecha);

                                return (
                                    <div
                                        key={venta.id}
                                        className="bg-gray-50 dark:bg-gray-700 p-4 rounded-xl border border-gray-200 dark:border-gray-600 hover:shadow-md transition-shadow cursor-pointer"
                                        onClick={() => setVentaSeleccionada(venta)}
                                    >
                                        <div className="flex justify-between items-start">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-3 mb-2">
                                                    <span className="text-2xl">🧾</span>
                                                    <div>
                                                        <p className="font-bold text-gray-800 dark:text-gray-200">
                                                            {fecha.toLocaleDateString('es-ES')} - {fecha.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                                                        </p>
                                                        <p className="text-sm text-gray-600 dark:text-gray-400">
                                                            👤 Vendedor: <strong>{venta.vendedorNombre}</strong>
                                                            {venta.clienteNombre && ` | 🛒 Cliente: ${venta.clienteNombre}`}
                                                        </p>
                                                    </div>
                                                </div>

                                                <div className="ml-10">
                                                    <p className="text-sm text-gray-700 dark:text-gray-300">
                                                        {items.map(i => `${i.productoNombre} x${i.cantidad}`).join(', ')}
                                                    </p>
                                                    <div className="flex gap-4 mt-2 text-xs text-gray-500 dark:text-gray-400">
                                                        <span>💰 Total: <strong className="text-green-600 dark:text-green-400">${venta.total.toFixed(2)}</strong></span>
                                                        {venta.vueltoCUP && venta.vueltoCUP > 0 && (
                                                            <span>💵 Vuelto: <strong className="text-blue-600 dark:text-blue-400">${venta.vueltoCUP.toFixed(2)}</strong></span>
                                                        )}
                                                        {venta.esFiado && (
                                                            <span className="bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 px-2 py-0.5 rounded font-semibold">FIADO</span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="text-right">
                                                <p className="text-2xl font-bold text-green-600 dark:text-green-400">${venta.total.toFixed(2)}</p>
                                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Ver detalle →</p>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Modal Detalle Venta */}
                {ventaSeleccionada && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
                        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                            <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4 flex justify-between items-center sticky top-0">
                                <h2 className="text-xl font-bold text-white">🧾 Detalle de Venta</h2>
                                <button
                                    onClick={() => setVentaSeleccionada(null)}
                                    className="text-white hover:text-gray-200 text-2xl"
                                >
                                    &times;
                                </button>
                            </div>

                            <div className="p-6 space-y-4">
                                {/* Info General */}
                                <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-xl">
                                    <h3 className="font-semibold text-gray-800 dark:text-gray-200 mb-2">📋 Información General</h3>
                                    <div className="grid grid-cols-2 gap-3 text-sm">
                                        <div>
                                            <p className="text-gray-500 dark:text-gray-400">Fecha:</p>
                                            <p className="font-semibold text-gray-800 dark:text-gray-200">
                                                {new Date(ventaSeleccionada.fecha).toLocaleDateString('es-ES')}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-gray-500 dark:text-gray-400">Hora:</p>
                                            <p className="font-semibold text-gray-800 dark:text-gray-200">
                                                {new Date(ventaSeleccionada.fecha).toLocaleTimeString('es-ES')}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-gray-500 dark:text-gray-400">Vendedor:</p>
                                            <p className="font-semibold text-gray-800 dark:text-gray-200">{ventaSeleccionada.vendedorNombre}</p>
                                        </div>
                                        <div>
                                            <p className="text-gray-500 dark:text-gray-400">Cliente:</p>
                                            <p className="font-semibold text-gray-800 dark:text-gray-200">{ventaSeleccionada.clienteNombre || 'N/A'}</p>
                                        </div>
                                        <div>
                                            <p className="text-gray-500 dark:text-gray-400">Estado:</p>
                                            <p className={`font-semibold ${ventaSeleccionada.estado === 'completada' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                                {ventaSeleccionada.estado === 'completada' ? '✅ Completada' : '⚠️ Error'}
                                            </p>
                                        </div>
                                        {ventaSeleccionada.esFiado && (
                                            <div>
                                                <p className="text-gray-500 dark:text-gray-400">Tipo:</p>
                                                <p className="font-semibold text-yellow-600 dark:text-yellow-400">💳 FIADO</p>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Productos */}
                                <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-xl">
                                    <h3 className="font-semibold text-gray-800 dark:text-gray-200 mb-2">📦 Productos</h3>
                                    <div className="space-y-2">
                                        {getItemsVenta(ventaSeleccionada).map((item, idx) => (
                                            <div key={idx} className="flex justify-between items-center bg-white dark:bg-gray-600 p-3 rounded-lg">
                                                <div className="flex-1">
                                                    <p className="font-semibold text-gray-800 dark:text-gray-200">{item.productoNombre}</p>
                                                    {item.codigoBarras && (
                                                        <p className="text-xs text-gray-500 dark:text-gray-400 font-mono">📊 {item.codigoBarras}</p>
                                                    )}
                                                    <p className="text-sm text-gray-600 dark:text-gray-400">
                                                        ${item.precioUnitario.toFixed(2)} × {item.cantidad}
                                                    </p>
                                                </div>
                                                <p className="text-lg font-bold text-blue-600 dark:text-blue-400">${item.subtotal.toFixed(2)}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Métodos de Pago */}
                                {ventaSeleccionada.metodosPago && ventaSeleccionada.metodosPago.length > 0 && (
                                    <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-xl">
                                        <h3 className="font-semibold text-gray-800 dark:text-gray-200 mb-2">💰 Métodos de Pago</h3>
                                        <div className="space-y-2">
                                            {ventaSeleccionada.metodosPago.map((mp, idx) => (
                                                <div key={idx} className="flex justify-between items-center bg-white dark:bg-gray-600 p-3 rounded-lg">
                                                    <div>
                                                        <p className="font-semibold text-gray-800 dark:text-gray-200">
                                                            {mp.tipo === 'efectivo' ? '💵 Efectivo' :
                                                                mp.tipo === 'transferencia' ? '📱 Transferencia' :
                                                                    mp.tipo === 'tarjeta' ? '💳 Tarjeta' : '💳 Fiado'}
                                                        </p>
                                                        <p className="text-sm text-gray-600 dark:text-gray-400">
                                                            {mp.monto} {mp.moneda}
                                                            {mp.moneda !== 'CUP' && ` (= $${mp.montoEnCUP.toFixed(2)} CUP)`}
                                                        </p>
                                                    </div>
                                                    <p className="text-lg font-bold text-green-600 dark:text-green-400">${mp.montoEnCUP.toFixed(2)}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Totales */}
                                <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 p-4 rounded-xl border-2 border-green-200 dark:border-green-800">
                                    <div className="space-y-2">
                                        <div className="flex justify-between text-lg">
                                            <span className="font-semibold text-gray-800 dark:text-gray-200">Total Venta:</span>
                                            <span className="font-bold text-green-700 dark:text-green-400">${ventaSeleccionada.total.toFixed(2)} CUP</span>
                                        </div>
                                        {ventaSeleccionada.vueltoCUP && ventaSeleccionada.vueltoCUP > 0 && (
                                            <div className="flex justify-between text-lg">
                                                <span className="font-semibold text-gray-800 dark:text-gray-200">💵 Vuelto:</span>
                                                <span className="font-bold text-blue-700 dark:text-blue-400">${ventaSeleccionada.vueltoCUP.toFixed(2)} CUP</span>
                                            </div>
                                        )}
                                        {ventaSeleccionada.comisionVendedor && ventaSeleccionada.comisionVendedor > 0 && (
                                            <div className="flex justify-between text-sm">
                                                <span className="text-gray-700 dark:text-gray-300">Comisión vendedor:</span>
                                                <span className="font-semibold text-purple-700 dark:text-purple-400">${ventaSeleccionada.comisionVendedor.toFixed(2)}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Notas */}
                                {ventaSeleccionada.notas && (
                                    <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-xl border border-yellow-200 dark:border-yellow-800">
                                        <h3 className="font-semibold text-yellow-800 dark:text-yellow-400 mb-1">📝 Notas:</h3>
                                        <p className="text-sm text-gray-700 dark:text-gray-300">{ventaSeleccionada.notas}</p>
                                    </div>
                                )}

                                {ventaSeleccionada.notaCancelacion && (
                                    <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-xl border border-red-200 dark:border-red-800">
                                        <h3 className="font-semibold text-red-800 dark:text-red-400 mb-1">⚠️ Motivo de Error:</h3>
                                        <p className="text-sm text-gray-700 dark:text-gray-300">{ventaSeleccionada.notaCancelacion}</p>
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