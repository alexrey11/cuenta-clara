// ============ src/Devoluciones.tsx ============
import { useState, useEffect } from 'react';
import { db } from './db';
import type { Venta, Devolucion, Usuario } from './db';
import {
    STYLES, BackgroundBlobs, pageWrap, card, cardPadded, titleGradient,
    input, label, sectionTitle,
    modalOverlay, modalPanel, modalHeaderDanger, modalTitle, modalClose,
    MetricCard, EmptyState,
} from './theme';

interface DevolucionesProps { usuarioActual: Usuario; }

export default function Devoluciones({ usuarioActual }: DevolucionesProps) {
    const [ventas, setVentas] = useState<Venta[]>([]);
    const [devoluciones, setDevoluciones] = useState<Devolucion[]>([]);
    const [modalAbierto, setModalAbierto] = useState(false);
    const [ventaSel, setVentaSel] = useState<Venta | null>(null);
    const [cantDev, setCantDev] = useState('');
    const [motivo, setMotivo] = useState('');
    const [busqueda, setBusqueda] = useState('');

    useEffect(() => { cargarDatos(); }, []);

    const cargarDatos = async () => {
        const [v, d] = await Promise.all([
            db.ventas.where('estado').equals('completada').toArray(),
            db.devoluciones.toArray(),
        ]);
        setVentas(v);
        setDevoluciones(d.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime()));
    };

    const procesarDevolucion = async () => {
        if (!ventaSel || !cantDev || !motivo.trim()) { alert('Completa todos los campos'); return; }
        const c = parseInt(cantDev);
        const items = ventaSel.items && ventaSel.items.length > 0
            ? ventaSel.items
            : [{ productoId: ventaSel.productoId || 0, productoNombre: ventaSel.productoNombre || 'N/A', cantidad: ventaSel.cantidad || 1, precioUnitario: ventaSel.precioUnitario || ventaSel.total, precioCompra: 0, subtotal: ventaSel.total }];
        if (items.length === 0) { alert('Venta sin productos'); return; }
        const primerItem = items[0];
        if (c <= 0 || c > primerItem.cantidad) { alert(`Cantidad inválida. Máximo: ${primerItem.cantidad}`); return; }

        const monto = c * primerItem.precioUnitario;
        await db.devoluciones.add({
            ventaId: ventaSel.id!, productoId: primerItem.productoId,
            productoNombre: primerItem.productoNombre, cantidad: c,
            motivo: motivo.trim(), fecha: new Date(),
            realizadoPor: usuarioActual.nombre, montoReembolsado: monto,
        });

        if (c === primerItem.cantidad) {
            await db.ventas.update(ventaSel.id!, { estado: 'devuelta' });
        } else {
            const nuevaCantidad = primerItem.cantidad - c;
            await db.ventas.update(ventaSel.id!, {
                cantidad: nuevaCantidad, total: nuevaCantidad * primerItem.precioUnitario,
            });
        }

        const prod = await db.productos.get(primerItem.productoId);
        if (prod) await db.productos.update(prod.id!, { stockActual: prod.stockActual + c });

        if (ventaSel.esFiado && ventaSel.clienteId) {
            const cli = await db.clientes.get(ventaSel.clienteId);
            if (cli) await db.clientes.update(cli.id!, { saldoPendiente: Math.max(0, cli.saldoPendiente - monto) });
        }

        alert(`✅ Devolución: $${monto.toFixed(2)}`);
        setModalAbierto(false); setVentaSel(null);
        cargarDatos();
    };

    const getNombreVenta = (v: Venta) =>
        v.items && v.items.length > 0 ? v.items.map(i => i.productoNombre).join(', ') : (v.productoNombre || 'Venta');

    const getCantidadVenta = (v: Venta) =>
        v.items && v.items.length > 0 ? v.items.reduce((s, i) => s + i.cantidad, 0) : (v.cantidad || 1);

    const ventasFiltradas = ventas.filter(v => {
        const nombre = getNombreVenta(v);
        const matchNombre = nombre.toLowerCase().includes(busqueda.toLowerCase());
        const matchCliente = v.clienteNombre && v.clienteNombre.toLowerCase().includes(busqueda.toLowerCase());
        return matchNombre || matchCliente;
    });

    const totalReembolsado = devoluciones.reduce((s, d) => s + d.montoReembolsado, 0);

    return (
        <div className={pageWrap}>
            <style>{STYLES}</style>
            <BackgroundBlobs />

            <div className="relative mx-auto max-w-6xl">
                <div className={`cc-fade-up mb-4 md:mb-6 ${cardPadded}`}>
                    <div className="flex items-center gap-3">
                        <div className="hidden h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-500 to-red-600 text-2xl shadow-md ring-2 ring-white/10 md:flex">🔄</div>
                        <div className="min-w-0">
                            <h1 className={`${titleGradient} truncate text-xl md:text-3xl`}>Devoluciones</h1>
                            <p className="truncate text-xs text-gray-400 md:text-sm">Procesa devoluciones y repón stock</p>
                        </div>
                    </div>
                </div>

                <div className="mb-4 grid grid-cols-1 gap-3 md:mb-6 md:grid-cols-3 md:gap-4">
                    <MetricCard icon="🔄" label="Total Devoluciones" value={`${devoluciones.length}`} tile="from-orange-500 to-red-600" />
                    <MetricCard icon="💸" label="Reembolsado" value={`$${totalReembolsado.toFixed(0)}`} tile="from-rose-500 to-red-600" />
                    <MetricCard icon="🛒" label="Disponibles" value={`${ventas.length}`} sub="Para devolver" tile="from-blue-500 to-indigo-600" />
                </div>

                <div className={`${card} cc-fade-up mb-4 p-3 md:mb-6 md:p-4`}>
                    <input type="text" placeholder="🔍 Buscar venta..." value={busqueda}
                        onChange={(e) => setBusqueda(e.target.value)} className={input} />
                </div>

                <div className={`${card} cc-fade-up mb-4 p-4 md:mb-6 md:p-6`}>
                    <h2 className={`${sectionTitle} mb-3 md:mb-4`}>Ventas para Devolver</h2>
                    {ventasFiltradas.length === 0 ? (
                        <EmptyState icon="📭" texto="Sin ventas" />
                    ) : (
                        <div className="space-y-2 md:space-y-3">
                            {ventasFiltradas.slice(0, 10).map((v) => (
                                <div key={v.id} className="rounded-xl border border-white/10 bg-slate-800/50 p-3 md:p-4">
                                    <div className="flex items-start gap-3">
                                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-500/15 text-lg ring-1 ring-blue-400/20 md:h-12 md:w-12 md:text-xl">📦</div>
                                        <div className="min-w-0 flex-1">
                                            <h3 className="truncate text-sm font-bold text-gray-100 md:text-base">{getNombreVenta(v)}</h3>
                                            <p className="text-xs text-gray-400 md:text-sm">
                                                {new Date(v.fecha).toLocaleDateString('es-ES')} · {v.vendedorNombre}
                                                {v.clienteNombre && ` · 👤 ${v.clienteNombre}`}
                                            </p>
                                            <p className="mt-1 text-xs text-gray-400 md:text-sm">
                                                Cant: {getCantidadVenta(v)} · Total: <strong className="text-emerald-300">${v.total.toFixed(2)}</strong>
                                            </p>
                                            <button
                                                onClick={() => {
                                                    setVentaSel(v); setCantDev(getCantidadVenta(v).toString());
                                                    setMotivo(''); setModalAbierto(true);
                                                }}
                                                className="mt-2 w-full rounded-lg border border-orange-400/30 bg-orange-500/10 px-4 py-2 text-sm font-bold text-orange-300 transition-colors hover:bg-orange-500/20 md:w-auto">
                                                Devolver
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className={`${card} cc-fade-up p-4 md:p-6`}>
                    <h2 className={`${sectionTitle} mb-3 md:mb-4`}>📜 Historial</h2>
                    {devoluciones.length === 0 ? (
                        <EmptyState icon="📭" texto="Sin devoluciones" />
                    ) : (
                        <div className="space-y-2 md:space-y-3">
                            {devoluciones.map((d) => (
                                <div key={d.id} className="rounded-xl border border-white/10 bg-slate-800/50 p-3 md:p-4">
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="min-w-0 flex-1">
                                            <h3 className="truncate text-sm font-bold text-gray-100 md:text-base">{d.productoNombre}</h3>
                                            <p className="text-xs text-gray-400 md:text-sm">
                                                {new Date(d.fecha).toLocaleDateString('es-ES')} · Por: {d.realizadoPor}
                                            </p>
                                            <p className="mt-1 text-xs text-gray-400 md:text-sm">
                                                Cant: {d.cantidad} · Reembolso: <strong className="text-rose-300">${d.montoReembolsado.toFixed(2)}</strong>
                                            </p>
                                            <p className="mt-1 text-xs italic text-orange-300">Motivo: {d.motivo}</p>
                                        </div>
                                        <span className="shrink-0 rounded-full bg-orange-500/15 px-2 py-1 text-xs font-bold text-orange-300 ring-1 ring-orange-400/25 md:px-3">
                                            Devuelto
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {modalAbierto && ventaSel && (
                    <div className={modalOverlay}>
                        <div className={modalPanel}>
                            <div className={modalHeaderDanger}>
                                <h2 className={modalTitle}>Procesar Devolución</h2>
                                <button onClick={() => setModalAbierto(false)} className={modalClose}>&times;</button>
                            </div>
                            <div className="space-y-4 p-4 md:p-6">
                                <div className="rounded-xl border border-white/10 bg-slate-800/50 p-3 md:p-4">
                                    <p className="text-sm font-bold text-gray-100 md:text-base">{getNombreVenta(ventaSel)}</p>
                                    <p className="text-xs text-gray-400 md:text-sm">
                                        Original: {getCantidadVenta(ventaSel)} · ${ventaSel.total.toFixed(2)}
                                    </p>
                                </div>
                                <div>
                                    <label className={label}>Cantidad (máx: {getCantidadVenta(ventaSel)})</label>
                                    <input type="number" min="1" max={getCantidadVenta(ventaSel)} value={cantDev}
                                        onChange={(e) => setCantDev(e.target.value)} className={input} />
                                </div>
                                <div>
                                    <label className={label}>Motivo *</label>
                                    <textarea value={motivo} onChange={(e) => setMotivo(e.target.value)}
                                        className={input} rows={3} placeholder="Ej: Producto defectuoso..." />
                                </div>
                                <div className="flex gap-3 pt-2">
                                    <button onClick={() => setModalAbierto(false)} className="flex-1 rounded-xl border border-white/10 bg-slate-800/60 py-3 text-base font-bold text-gray-300 transition-colors hover:bg-slate-800">Cancelar</button>
                                    <button onClick={procesarDevolucion}
                                        className="flex-1 rounded-xl bg-gradient-to-r from-orange-500 to-red-600 py-3 text-base font-bold text-white shadow-md shadow-orange-500/25 transition-transform hover:-translate-y-0.5">
                                        Procesar
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}