import { useState, useEffect } from 'react';
import { db } from './db';
import type { MovimientoInventario, Producto, Usuario } from './db';
import { usePDV } from './contexts/PuntoDeVentaContext';
import {
    STYLES, BackgroundBlobs, pageWrap, card, cardPadded, titleGradient,
    btnPrimary, input, label, filterPill,
    modalOverlay, modalPanel, modalHeader, modalTitle, modalClose,
    MetricCard, EmptyState,
} from './theme';

interface MovimientosProps { usuarioActual: Usuario; }

type TipoMov = 'entrada' | 'salida' | 'ajuste' | 'perdida' | 'devolucion';

const TIPO_INFO: Record<string, { icon: string; label: string; pill: string; tile: string; signo: '+' | '-' | '=' }> = {
    entrada: { icon: '📥', label: 'Entrada', pill: 'bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-400/25', tile: 'from-emerald-500 to-teal-600', signo: '+' },
    salida: { icon: '📤', label: 'Salida', pill: 'bg-rose-500/15 text-rose-300 ring-1 ring-rose-400/25', tile: 'from-rose-500 to-red-600', signo: '-' },
    ajuste: { icon: '🔧', label: 'Ajuste', pill: 'bg-blue-500/15 text-blue-300 ring-1 ring-blue-400/25', tile: 'from-blue-500 to-indigo-600', signo: '=' },
    perdida: { icon: '⚠️', label: 'Pérdida', pill: 'bg-orange-500/15 text-orange-300 ring-1 ring-orange-400/25', tile: 'from-orange-500 to-red-600', signo: '-' },
    devolucion: { icon: '🔄', label: 'Devolución', pill: 'bg-violet-500/15 text-violet-300 ring-1 ring-violet-400/25', tile: 'from-violet-500 to-purple-600', signo: '+' },
};

const getTipo = (t: string) =>
    TIPO_INFO[t] ?? { icon: '📦', label: t, pill: 'bg-slate-500/15 text-slate-300 ring-1 ring-slate-400/25', tile: 'from-slate-400 to-slate-600', signo: '=' as const };

export default function MovimientosInventario({ usuarioActual }: MovimientosProps) {
    const { pdvActivo, modoTodos } = usePDV();
    const [movimientos, setMovimientos] = useState<MovimientoInventario[]>([]);
    const [productos, setProductos] = useState<Producto[]>([]);
    const [modalAbierto, setModalAbierto] = useState(false);
    const [productoSel, setProductoSel] = useState<number>(0);
    const [tipo, setTipo] = useState<TipoMov>('entrada');
    const [cantidad, setCantidad] = useState('');
    const [motivo, setMotivo] = useState('');
    const [filtroTipo, setFiltroTipo] = useState<'todos' | TipoMov>('todos');
    const [busqueda, setBusqueda] = useState('');

    useEffect(() => { cargarDatos(); }, [pdvActivo?.id, modoTodos]);

    const cargarDatos = async () => {
        let movs: MovimientoInventario[];
        let prods: Producto[];

        if (modoTodos) {
            movs = await db.movimientosInventario.toArray();
            prods = await db.productos.toArray();
        } else if (pdvActivo) {
            movs = await db.movimientosInventario.where('puntoDeVentaId').equals(pdvActivo.id!).toArray();
            prods = await db.productos.where('puntoDeVentaId').equals(pdvActivo.id!).toArray();
        } else {
            movs = [];
            prods = [];
        }

        movs.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
        setMovimientos(movs);
        setProductos(prods);
    };

    const crearMovimiento = async () => {
        if (!pdvActivo) { alert('Selecciona un punto de venta específico'); return; }
        if (!productoSel || !cantidad || !motivo.trim()) { alert('Completa todos los campos'); return; }

        const prod = await db.productos.get(productoSel);
        if (!prod) { alert('Producto no encontrado'); return; }

        const cant = parseInt(cantidad);
        if (cant <= 0) { alert('Cantidad inválida'); return; }

        let stockNuevo = prod.stockActual;
        if (tipo === 'entrada' || tipo === 'devolucion') stockNuevo += cant;
        else if (tipo === 'salida' || tipo === 'perdida') stockNuevo -= cant;
        else if (tipo === 'ajuste') stockNuevo = cant;

        if (stockNuevo < 0) { alert('Stock no puede ser negativo'); return; }

        await db.movimientosInventario.add({
            productoId: prod.id!,
            productoNombre: prod.nombre,
            tipo,
            cantidad: tipo === 'ajuste' ? Math.abs(stockNuevo - prod.stockActual) : cant,
            motivo: motivo.trim(),
            fecha: new Date(),
            realizadoPor: usuarioActual.nombre,
            stockAnterior: prod.stockActual,
            stockNuevo,
            puntoDeVentaId: pdvActivo.id!,
        });

        await db.productos.update(prod.id!, { stockActual: stockNuevo });
        alert(`✅ Movimiento registrado\nStock: ${prod.stockActual} → ${stockNuevo}`);
        setModalAbierto(false); setProductoSel(0); setCantidad(''); setMotivo('');
        cargarDatos();
    };

    const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
    const deHoy = movimientos.filter(m => new Date(m.fecha) >= hoy);
    const entradasHoy = deHoy.filter(m => m.tipo === 'entrada' || m.tipo === 'devolucion').reduce((s, m) => s + m.cantidad, 0);
    const salidasHoy = deHoy.filter(m => m.tipo === 'salida' || m.tipo === 'perdida').reduce((s, m) => s + m.cantidad, 0);

    const filtrados = movimientos.filter(m => {
        const okTipo = filtroTipo === 'todos' || m.tipo === filtroTipo;
        const b = busqueda.toLowerCase();
        const okBusqueda = !busqueda || m.productoNombre.toLowerCase().includes(b) || m.motivo.toLowerCase().includes(b) || m.realizadoPor.toLowerCase().includes(b);
        return okTipo && okBusqueda;
    });

    const filtros: { id: 'todos' | TipoMov; label: string; icon: string }[] = [
        { id: 'todos', label: 'Todos', icon: '📋' },
        { id: 'entrada', label: 'Entradas', icon: '📥' },
        { id: 'salida', label: 'Salidas', icon: '📤' },
        { id: 'ajuste', label: 'Ajustes', icon: '🔧' },
        { id: 'perdida', label: 'Pérdidas', icon: '⚠️' },
    ];

    return (
        <div className={pageWrap}>
            <style>{STYLES}</style>
            <BackgroundBlobs />

            <div className="relative mx-auto max-w-4xl">
                <div className={`cc-fade-up mb-4 md:mb-6 ${cardPadded}`}>
                    <div className="flex items-center justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-3">
                            <div className="hidden h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 text-2xl shadow-md ring-2 ring-white/10 md:flex">📦</div>
                            <div className="min-w-0">
                                <h1 className={`${titleGradient} truncate text-xl md:text-3xl`}>Movimientos</h1>
                                <p className="truncate text-xs text-gray-400 md:text-sm">
                                    {pdvActivo && `${pdvActivo.icono} ${pdvActivo.nombre.replace(/^[^\s]+\s/, '')}`}
                                    {modoTodos && 'Todos los PDV'}
                                </p>
                            </div>
                        </div>
                        {!modoTodos && <button onClick={() => setModalAbierto(true)} className={btnPrimary}>+ Nuevo</button>}
                    </div>
                </div>

                <div className="mb-4 grid grid-cols-3 gap-3 md:mb-6 md:gap-4">
                    <MetricCard icon="📋" label="Hoy" value={`${deHoy.length}`} sub="Movimientos" tile="from-slate-500 to-slate-700" />
                    <MetricCard icon="📥" label="Entradas" value={`+${entradasHoy}`} sub="Unidades hoy" tile="from-emerald-500 to-teal-600" />
                    <MetricCard icon="📤" label="Salidas" value={`-${salidasHoy}`} sub="Unidades hoy" tile="from-rose-500 to-red-600" />
                </div>

                <div className={`${card} cc-fade-up mb-4 p-3 md:mb-6 md:p-4`}>
                    <div className="mb-3 flex flex-wrap gap-2">
                        {filtros.map((f) => (
                            <button key={f.id} onClick={() => setFiltroTipo(f.id)} className={filterPill(filtroTipo === f.id)}>
                                <span>{f.icon}</span>
                                <span>{f.label}</span>
                            </button>
                        ))}
                    </div>
                    <input type="text" placeholder="🔍 Buscar producto, motivo o responsable..." value={busqueda}
                        onChange={(e) => setBusqueda(e.target.value)} className={input} />
                </div>

                {filtrados.length === 0 ? (
                    <div className={`${card} p-6`}>
                        <EmptyState icon="📦" texto={busqueda || filtroTipo !== 'todos' ? 'Sin movimientos que coincidan' : 'No hay movimientos registrados'} />
                    </div>
                ) : (
                    <div className="space-y-2 md:space-y-3">
                        {filtrados.map((m) => {
                            const info = getTipo(m.tipo);
                            const esEntrada = info.signo === '+';
                            return (
                                <div key={m.id} className={`${card} cc-fade-up p-3 md:p-4`}>
                                    <div className="mb-2 flex items-start justify-between gap-3">
                                        <div className="flex min-w-0 flex-1 items-center gap-3">
                                            <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${info.tile} text-lg shadow-md ring-2 ring-white/10 md:h-11 md:w-11 md:text-xl`}>
                                                {info.icon}
                                            </span>
                                            <div className="min-w-0">
                                                <h3 className="truncate text-sm font-bold text-gray-100 md:text-base">{m.productoNombre}</h3>
                                                <p className="truncate text-[11px] text-gray-500 md:text-xs">
                                                    {new Date(m.fecha).toLocaleDateString('es-ES')} · {new Date(m.fecha).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="shrink-0 text-right">
                                            <p className={`text-lg font-black md:text-xl ${esEntrada ? 'text-emerald-300' : info.signo === '-' ? 'text-rose-300' : 'text-blue-300'}`}>
                                                {info.signo}{m.cantidad}
                                            </p>
                                            <p className="text-[10px] font-bold uppercase tracking-wide text-gray-500">{info.label}</p>
                                        </div>
                                    </div>

                                    <div className="flex flex-wrap items-center gap-2 border-t border-white/10 pt-2">
                                        <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${info.pill}`}>
                                            {m.realizadoPor}
                                        </span>
                                        <p className="min-w-0 flex-1 truncate text-xs text-gray-400">{m.motivo}</p>
                                        <span className="rounded bg-slate-900/60 px-2 py-0.5 font-mono text-[10px] text-gray-400 md:text-xs">
                                            Stock: {m.stockAnterior} → {m.stockNuevo}
                                        </span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {modalAbierto && (
                    <div className={modalOverlay}>
                        <div className={modalPanel}>
                            <div className={modalHeader}>
                                <h2 className={modalTitle}>Nuevo Movimiento</h2>
                                <button onClick={() => setModalAbierto(false)} className={modalClose}>&times;</button>
                            </div>
                            <div className="space-y-4 p-4 md:p-6">
                                <div className="rounded-xl border border-blue-400/20 bg-blue-500/10 p-3 text-xs text-blue-200">
                                    Punto de venta: <strong>{pdvActivo?.nombre}</strong>
                                </div>
                                <div>
                                    <label className={label}>Producto *</label>
                                    <select value={productoSel} onChange={(e) => setProductoSel(parseInt(e.target.value))} className={input}>
                                        <option value={0}>Seleccionar producto...</option>
                                        {productos.map(p => (
                                            <option key={p.id} value={p.id}>{p.nombre} (Stock: {p.stockActual})</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className={label}>Tipo de movimiento *</label>
                                    <div className="grid grid-cols-2 gap-2">
                                        {(['entrada', 'salida', 'ajuste', 'perdida'] as TipoMov[]).map((t) => {
                                            const info = getTipo(t);
                                            const activo = tipo === t;
                                            return (
                                                <button key={t} type="button" onClick={() => setTipo(t)}
                                                    className={`flex items-center gap-2 rounded-xl border p-2.5 text-left transition-all duration-150 ${activo ? 'border-blue-400/60 bg-gradient-to-br from-blue-500/15 to-indigo-500/10' : 'border-white/10 bg-slate-800/50 hover:border-blue-400/40'}`}>
                                                    <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br ${info.tile} text-sm`}>
                                                        {info.icon}
                                                    </span>
                                                    <span className={`text-xs font-bold ${activo ? 'text-blue-200' : 'text-gray-300'}`}>
                                                        {info.label}
                                                    </span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                <div>
                                    <label className={label}>{tipo === 'ajuste' ? 'Nuevo stock *' : 'Cantidad *'}</label>
                                    <input type="number" min="0" value={cantidad}
                                        onChange={(e) => setCantidad(e.target.value)}
                                        className={`${input} text-lg font-bold`}
                                        placeholder={tipo === 'ajuste' ? 'Stock final' : 'Cantidad'} />
                                </div>

                                <div>
                                    <label className={label}>Motivo *</label>
                                    <textarea value={motivo} onChange={(e) => setMotivo(e.target.value)}
                                        className={input} rows={3}
                                        placeholder="Ej: Compra a proveedor, merma, ajuste de inventario..." />
                                </div>

                                <div className="flex gap-3 pt-2">
                                    <button onClick={() => setModalAbierto(false)} className="flex-1 rounded-xl border border-white/10 bg-slate-800/60 py-3 text-base font-bold text-gray-300 transition-colors hover:bg-slate-800">
                                        Cancelar
                                    </button>
                                    <button onClick={crearMovimiento} className="flex-1 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 py-3 text-base font-bold text-white shadow-md shadow-blue-500/25 transition-transform hover:-translate-y-0.5">
                                        Registrar
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