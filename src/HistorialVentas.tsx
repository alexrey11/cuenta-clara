// ============ src/HistorialVentas.tsx ============
import { useState, useEffect } from 'react';
import { db } from './db';
import type { Venta, Usuario } from './db';
import jsPDF from 'jspdf';
import {
    STYLES, BackgroundBlobs, pageWrap, card, cardPadded, titleGradient,
    input, sectionTitle, filterPill,
    modalOverlay, modalPanel, modalHeader, modalTitle, modalClose,
    MetricCard, EmptyState,
} from './theme';

interface HistorialVentasProps { usuarioActual: Usuario; }

const FILTROS = [
    { id: 'hoy', label: 'Hoy', icon: '📅' },
    { id: 'semana', label: 'Semana', icon: '📆' },
    { id: 'mes', label: 'Mes', icon: '🗓️' },
    { id: 'todo', label: 'Todo', icon: '📊' },
] as const;

export default function HistorialVentas({ usuarioActual: _ }: HistorialVentasProps) {
    const [ventas, setVentas] = useState<Venta[]>([]);
    const [filtroFecha, setFiltroFecha] = useState<'hoy' | 'semana' | 'mes' | 'todo'>('hoy');
    const [filtroVendedor, setFiltroVendedor] = useState<string>('todos');
    const [busqueda, setBusqueda] = useState('');
    const [ventaSeleccionada, setVentaSeleccionada] = useState<Venta | null>(null);
    const [vendedores, setVendedores] = useState<string[]>([]);

    useEffect(() => { cargarDatos(); }, [filtroFecha, filtroVendedor]);

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
                const items = v.items || [];
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
    const ticketProm = ventas.length > 0 ? totalVentas / ventas.length : 0;
    const totalVuelto = ventas.reduce((s, v) => s + (v.vueltoCUP || 0), 0);

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
        doc.setFontSize(16); doc.text('Historial de Ventas', 105, 20, { align: 'center' });
        doc.setFontSize(9); doc.text(`Generado: ${new Date().toLocaleString('es-ES')}`, 105, 28, { align: 'center' });
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
        <div className={pageWrap}>
            <style>{STYLES}</style>
            <BackgroundBlobs />

            <div className="relative mx-auto max-w-7xl">
                <div className={`cc-fade-up mb-4 md:mb-6 ${cardPadded}`}>
                    <div className="flex items-center gap-3">
                        <div className="hidden h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 text-2xl shadow-md ring-2 ring-white/10 md:flex">📜</div>
                        <div className="min-w-0">
                            <h1 className={`${titleGradient} truncate text-xl md:text-3xl`}>Historial Ventas</h1>
                            <p className="truncate text-xs text-gray-400 md:text-sm">Registro completo con detalle</p>
                        </div>
                    </div>
                </div>

                <div className="mb-4 grid grid-cols-2 gap-3 md:mb-6 md:grid-cols-4 md:gap-4">
                    <MetricCard icon="💰" label="Total" value={`$${totalVentas.toFixed(0)}`} sub={`${ventas.length} ventas`} tile="from-emerald-500 to-teal-600" />
                    <MetricCard icon="📈" label="Ganancia" value={`$${totalGanancia.toFixed(0)}`} sub="Neto" tile="from-blue-500 to-indigo-600" />
                    <MetricCard icon="🎫" label="Ticket" value={`$${ticketProm.toFixed(0)}`} sub="Promedio" tile="from-violet-500 to-purple-600" />
                    <MetricCard icon="💵" label="Vuelto" value={`$${totalVuelto.toFixed(0)}`} sub="Devuelto" tile="from-orange-500 to-red-600" />
                </div>

                <div className={`${card} cc-fade-up mb-4 p-3 md:mb-6 md:p-5`}>
                    <h2 className={`${sectionTitle} mb-3`}>🔍 Filtros</h2>
                    <div className="mb-3 flex flex-wrap gap-2">
                        {FILTROS.map((f) => (
                            <button key={f.id} onClick={() => setFiltroFecha(f.id)} className={filterPill(filtroFecha === f.id)}>
                                <span>{f.icon}</span><span>{f.label}</span>
                            </button>
                        ))}
                    </div>
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                        <select value={filtroVendedor} onChange={(e) => setFiltroVendedor(e.target.value)} className={input}>
                            <option value="todos">Todos los vendedores</option>
                            {vendedores.map(v => <option key={v} value={v}>{v}</option>)}
                        </select>
                        <input type="text" placeholder="🔍 Buscar producto, cliente, vendedor..." value={busqueda}
                            onChange={(e) => setBusqueda(e.target.value)} className={input} />
                    </div>
                </div>

                <div className="mb-4 flex gap-2 md:mb-6 md:gap-3">
                    <button onClick={exportarPDF}
                        className="flex-1 rounded-xl bg-gradient-to-r from-rose-500 to-red-600 px-4 py-2.5 text-sm font-bold text-white shadow-md shadow-rose-500/25 transition-transform hover:-translate-y-0.5 md:flex-none md:px-6 md:py-3 md:text-base">
                        📄 PDF
                    </button>
                    <button onClick={exportarCSV}
                        className="flex-1 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 px-4 py-2.5 text-sm font-bold text-white shadow-md shadow-emerald-500/25 transition-transform hover:-translate-y-0.5 md:flex-none md:px-6 md:py-3 md:text-base">
                        📊 CSV
                    </button>
                </div>

                <div className={`${card} cc-fade-up p-3 md:p-6`}>
                    <h2 className={`${sectionTitle} mb-3 md:mb-4`}>Ventas ({ventas.length})</h2>
                    {ventas.length === 0 ? (
                        <EmptyState icon="📭" texto="Sin ventas en este período" />
                    ) : (
                        <div className="space-y-2 md:space-y-3">
                            {ventas.map((venta) => {
                                const items = getItemsVenta(venta);
                                const fecha = new Date(venta.fecha);
                                return (
                                    <div key={venta.id} onClick={() => setVentaSeleccionada(venta)}
                                        className="cursor-pointer rounded-xl border border-white/10 bg-slate-800/50 p-3 transition-colors duration-150 hover:border-blue-400/30 hover:bg-slate-800/80 md:p-4">
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="min-w-0 flex-1">
                                                <div className="mb-1 flex items-center gap-2">
                                                    <span className="text-lg md:text-2xl">🧾</span>
                                                    <div className="min-w-0 flex-1">
                                                        <p className="truncate text-sm font-bold text-gray-100 md:text-base">
                                                            {fecha.toLocaleDateString('es-ES')} {fecha.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                                                        </p>
                                                        <p className="truncate text-xs text-gray-400 md:text-sm">
                                                            👤 {venta.vendedorNombre}{venta.clienteNombre && ` · ${venta.clienteNombre}`}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="ml-7 md:ml-10">
                                                    <p className="truncate text-xs text-gray-300 md:text-sm">
                                                        {items.map(i => `${i.productoNombre} x${i.cantidad}`).join(', ')}
                                                    </p>
                                                    <div className="mt-1 flex flex-wrap gap-2 text-xs text-gray-500 md:gap-3">
                                                        <span>💰 <strong className="text-emerald-300">${venta.total.toFixed(2)}</strong></span>
                                                        {venta.vueltoCUP && venta.vueltoCUP > 0 && <span>💵 <strong className="text-blue-300">${venta.vueltoCUP.toFixed(2)}</strong></span>}
                                                        {venta.esFiado && <span className="rounded bg-amber-500/15 px-2 py-0.5 font-bold text-amber-300 ring-1 ring-amber-400/25">FIADO</span>}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="shrink-0 text-right">
                                                <p className="text-lg font-black text-emerald-300 md:text-2xl">${venta.total.toFixed(0)}</p>
                                                <p className="text-[10px] text-gray-500 md:text-xs">Ver →</p>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {ventaSeleccionada && (
                    <div className={modalOverlay}>
                        <div className={`${modalPanel} md:max-w-2xl`}>
                            <div className={modalHeader}>
                                <h2 className={modalTitle}>🧾 Detalle</h2>
                                <button onClick={() => setVentaSeleccionada(null)} className={modalClose}>&times;</button>
                            </div>
                            <div className="space-y-3 p-4 md:space-y-4 md:p-6">
                                <div className="rounded-xl border border-white/10 bg-slate-800/50 p-3 md:p-4">
                                    <h3 className={`${sectionTitle} mb-2 text-sm md:text-base`}>📋 Información</h3>
                                    <div className="grid grid-cols-2 gap-2 text-xs md:gap-3 md:text-sm">
                                        <div><p className="text-gray-500">Fecha:</p><p className="font-semibold text-gray-200">{new Date(ventaSeleccionada.fecha).toLocaleDateString('es-ES')}</p></div>
                                        <div><p className="text-gray-500">Hora:</p><p className="font-semibold text-gray-200">{new Date(ventaSeleccionada.fecha).toLocaleTimeString('es-ES')}</p></div>
                                        <div><p className="text-gray-500">Vendedor:</p><p className="truncate font-semibold text-gray-200">{ventaSeleccionada.vendedorNombre}</p></div>
                                        <div><p className="text-gray-500">Cliente:</p><p className="truncate font-semibold text-gray-200">{ventaSeleccionada.clienteNombre || 'N/A'}</p></div>
                                        <div><p className="text-gray-500">Estado:</p><p className={`font-semibold ${ventaSeleccionada.estado === 'completada' ? 'text-emerald-300' : 'text-rose-300'}`}>{ventaSeleccionada.estado === 'completada' ? '✅ OK' : '⚠️ Error'}</p></div>
                                        {ventaSeleccionada.esFiado && <div><p className="text-gray-500">Tipo:</p><p className="font-semibold text-amber-300">💳 FIADO</p></div>}
                                    </div>
                                </div>

                                <div className="rounded-xl border border-white/10 bg-slate-800/50 p-3 md:p-4">
                                    <h3 className={`${sectionTitle} mb-2 text-sm md:text-base`}>📦 Productos</h3>
                                    <div className="space-y-2">
                                        {getItemsVenta(ventaSeleccionada).map((item, idx) => (
                                            <div key={idx} className="flex items-center justify-between rounded-lg bg-slate-900/60 p-2 md:p-3">
                                                <div className="min-w-0 flex-1">
                                                    <p className="truncate text-sm font-semibold text-gray-100">{item.productoNombre}</p>
                                                    {item.codigoBarras && <p className="font-mono text-xs text-gray-500">📊 {item.codigoBarras}</p>}
                                                    <p className="text-xs text-gray-400 md:text-sm">${item.precioUnitario.toFixed(2)} × {item.cantidad}</p>
                                                </div>
                                                <p className="ml-2 text-base font-black text-blue-300 md:text-lg">${item.subtotal.toFixed(2)}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {ventaSeleccionada.metodosPago && ventaSeleccionada.metodosPago.length > 0 && (
                                    <div className="rounded-xl border border-white/10 bg-slate-800/50 p-3 md:p-4">
                                        <h3 className={`${sectionTitle} mb-2 text-sm md:text-base`}>💰 Pago</h3>
                                        <div className="space-y-2">
                                            {ventaSeleccionada.metodosPago.map((mp, idx) => (
                                                <div key={idx} className="flex items-center justify-between rounded-lg bg-slate-900/60 p-2 md:p-3">
                                                    <div>
                                                        <p className="text-sm font-semibold text-gray-100">
                                                            {mp.tipo === 'efectivo' ? '💵 Efectivo' : mp.tipo === 'transferencia' ? '📱 Transfer' : mp.tipo === 'tarjeta' ? '💳 Tarjeta' : '💳 Fiado'}
                                                        </p>
                                                        <p className="text-xs text-gray-400">{mp.monto} {mp.moneda}{mp.moneda !== 'CUP' && ` (= $${mp.montoEnCUP.toFixed(2)} CUP)`}</p>
                                                    </div>
                                                    <p className="ml-2 text-base font-black text-emerald-300 md:text-lg">${mp.montoEnCUP.toFixed(2)}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <div className="rounded-xl border border-emerald-400/25 bg-emerald-500/10 p-3 md:p-4">
                                    <div className="space-y-2">
                                        <div className="flex justify-between text-base md:text-lg">
                                            <span className="font-semibold text-gray-200">Total:</span>
                                            <span className="font-black text-emerald-300">${ventaSeleccionada.total.toFixed(2)} CUP</span>
                                        </div>
                                        {ventaSeleccionada.vueltoCUP && ventaSeleccionada.vueltoCUP > 0 && (
                                            <div className="flex justify-between text-base md:text-lg">
                                                <span className="font-semibold text-gray-200">💵 Vuelto:</span>
                                                <span className="font-black text-blue-300">${ventaSeleccionada.vueltoCUP.toFixed(2)} CUP</span>
                                            </div>
                                        )}
                                        {ventaSeleccionada.comisionVendedor && ventaSeleccionada.comisionVendedor > 0 && (
                                            <div className="flex justify-between text-xs md:text-sm">
                                                <span className="text-gray-400">Comisión:</span>
                                                <span className="font-semibold text-violet-300">${ventaSeleccionada.comisionVendedor.toFixed(2)}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {ventaSeleccionada.notas && (
                                    <div className="rounded-xl border border-amber-400/25 bg-amber-500/10 p-3">
                                        <h3 className="mb-1 text-sm font-bold text-amber-300">📝 Notas</h3>
                                        <p className="text-xs text-gray-300 md:text-sm">{ventaSeleccionada.notas}</p>
                                    </div>
                                )}
                                {ventaSeleccionada.notaCancelacion && (
                                    <div className="rounded-xl border border-rose-400/25 bg-rose-500/10 p-3">
                                        <h3 className="mb-1 text-sm font-bold text-rose-300">⚠️ Motivo Error</h3>
                                        <p className="text-xs text-gray-300 md:text-sm">{ventaSeleccionada.notaCancelacion}</p>
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