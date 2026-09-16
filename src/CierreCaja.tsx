// ============ src/CierreCaja.tsx ============
import { useState, useEffect } from 'react';
import { db } from './db';
import type { Venta, CierreCaja as CierreCajaType, Usuario } from './db';
import {
    STYLES, BackgroundBlobs, pageWrap, card, cardPadded, titleGradient,
    btnPrimary, btnSecondary, input, label, sectionTitle,
    modalOverlay, modalPanel, modalHeader, modalTitle, modalClose,
    MetricCard, EmptyState,
} from './theme';

interface CierreCajaProps {
    onVolver: () => void;
    usuarioActual: Usuario;
}

export default function CierreCaja({ onVolver, usuarioActual }: CierreCajaProps) {
    const [cierres, setCierres] = useState<CierreCajaType[]>([]);
    const [modalAbierto, setModalAbierto] = useState(false);
    const [montoReal, setMontoReal] = useState('');
    const [notas, setNotas] = useState('');
    const [ventasHoy, setVentasHoy] = useState<Venta[]>([]);

    useEffect(() => { cargarDatos(); }, []);

    const cargarDatos = async () => {
        const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
        const todasVentas = await db.ventas.toArray();
        const deHoy = todasVentas.filter(v => new Date(v.fecha) >= hoy && v.estado === 'completada');
        setVentasHoy(deHoy);
        const c = await db.cierres.toArray();
        setCierres(c.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime()));
    };

    const totalVentas = ventasHoy.reduce((s, v) => s + v.total, 0);
    const totalEfectivo = ventasHoy.reduce((s, v) => {
        const ef = v.metodosPago?.filter(m => m.tipo === 'efectivo').reduce((a, m) => a + m.montoEnCUP, 0) || 0;
        return s + ef;
    }, 0);

    const guardarCierre = async () => {
        if (!montoReal) { alert('Ingresa monto real'); return; }
        const mr = parseFloat(montoReal);
        const diferencia = mr - totalEfectivo;

        const ventasPorVendedor: Record<string, number> = {};
        ventasHoy.forEach(v => { ventasPorVendedor[v.vendedorNombre] = (ventasPorVendedor[v.vendedorNombre] || 0) + v.total; });

        await db.cierres.add({
            fecha: new Date(), totalVentas, cantidadVentas: ventasHoy.length,
            montoReal: mr, diferencia, notas: notas.trim() || 'Sin notas',
            realizadoPor: usuarioActual.nombre,
            ventasPorVendedor: Object.entries(ventasPorVendedor).map(([vendedor, total]) => ({ vendedor, total })),
            desgloseMetodosPago: {
                efectivo: totalEfectivo,
                transferencia: ventasHoy.reduce((s, v) => s + (v.metodosPago?.filter(m => m.tipo === 'transferencia').reduce((a, m) => a + m.montoEnCUP, 0) || 0), 0),
                tarjeta: ventasHoy.reduce((s, v) => s + (v.metodosPago?.filter(m => m.tipo === 'tarjeta').reduce((a, m) => a + m.montoEnCUP, 0) || 0), 0),
                fiado: ventasHoy.reduce((s, v) => s + (v.metodosPago?.filter(m => m.tipo === 'fiado').reduce((a, m) => a + m.montoEnCUP, 0) || 0), 0),
            },
        });

        alert(`✅ Cierre guardado\nDiferencia: $${diferencia.toFixed(2)}`);
        setModalAbierto(false); setMontoReal(''); setNotas('');
        cargarDatos();
    };

    return (
        <div className={pageWrap}>
            <style>{STYLES}</style>
            <BackgroundBlobs />

            <div className="relative mx-auto max-w-4xl">
                <div className={`cc-fade-up mb-4 md:mb-6 ${cardPadded}`}>
                    <div className="flex items-center justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-3">
                            <div className="hidden h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-2xl shadow-md ring-2 ring-white/10 md:flex">💰</div>
                            <div className="min-w-0">
                                <h1 className={`${titleGradient} truncate text-xl md:text-3xl`}>Cierre de Caja</h1>
                                <p className="truncate text-xs text-gray-400 md:text-sm">Control diario de ventas</p>
                            </div>
                        </div>
                        <button onClick={onVolver} className={btnSecondary}>← Volver</button>
                    </div>
                </div>

                <div className="mb-4 grid grid-cols-1 gap-3 md:mb-6 md:grid-cols-3 md:gap-4">
                    <MetricCard icon="💵" label="Ventas Hoy" value={`$${totalVentas.toFixed(2)}`} sub={`${ventasHoy.length} ventas`} tile="from-emerald-500 to-teal-600" />
                    <MetricCard icon="💵" label="Efectivo" value={`$${totalEfectivo.toFixed(2)}`} sub="Contar en caja" tile="from-blue-500 to-indigo-600" />
                    <MetricCard icon="📊" label="Cierres" value={`${cierres.length}`} sub="Total registrados" tile="from-violet-500 to-purple-600" />
                </div>

                <button onClick={() => setModalAbierto(true)} disabled={ventasHoy.length === 0}
                    className={`${btnPrimary} mb-4 w-full py-3.5 text-base md:mb-6 md:py-4 md:text-lg`}>
                    🔒 Realizar Cierre de Caja
                </button>

                <div className={`${card} cc-fade-up p-4 md:p-6`}>
                    <h2 className={`${sectionTitle} mb-3 md:mb-4`}>📜 Historial de Cierres</h2>
                    {cierres.length === 0 ? (
                        <EmptyState icon="📭" texto="Sin cierres registrados" />
                    ) : (
                        <div className="space-y-2 md:space-y-3">
                            {cierres.map(c => {
                                const ok = c.diferencia === 0;
                                return (
                                    <div key={c.id} className="rounded-xl border border-white/10 bg-slate-800/50 p-3 md:p-4">
                                        <div className="mb-2 flex items-start justify-between">
                                            <div>
                                                <p className="text-sm font-bold text-gray-100 md:text-base">{new Date(c.fecha).toLocaleDateString('es-ES')}</p>
                                                <p className="text-xs text-gray-500">Por: {c.realizadoPor}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-lg font-black text-emerald-300 md:text-xl">${c.totalVentas.toFixed(2)}</p>
                                                <p className="text-xs text-gray-500">{c.cantidadVentas} ventas</p>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-2 text-xs md:text-sm">
                                            <div>
                                                <p className="text-gray-500">Efectivo:</p>
                                                <p className="font-semibold text-gray-200">${c.desgloseMetodosPago?.efectivo.toFixed(2) || '0.00'}</p>
                                            </div>
                                            <div>
                                                <p className="text-gray-500">Real:</p>
                                                <p className="font-semibold text-gray-200">${c.montoReal.toFixed(2)}</p>
                                            </div>
                                        </div>
                                        <div className={`mt-2 rounded-lg p-2 text-xs font-semibold md:text-sm ${ok ? 'bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-400/25' : 'bg-rose-500/15 text-rose-300 ring-1 ring-rose-400/25'
                                            }`}>
                                            Diferencia: <strong>${c.diferencia.toFixed(2)}</strong>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {modalAbierto && (
                    <div className={modalOverlay}>
                        <div className={modalPanel}>
                            <div className={modalHeader}>
                                <h2 className={modalTitle}>Cierre de Caja</h2>
                                <button onClick={() => setModalAbierto(false)} className={modalClose}>&times;</button>
                            </div>
                            <div className="space-y-4 p-4 md:p-6">
                                <div className="rounded-xl border border-blue-400/20 bg-blue-500/10 p-3 md:p-4">
                                    <p className="text-sm text-blue-300">Total ventas del día:</p>
                                    <p className="text-2xl font-black text-blue-200 md:text-3xl">${totalVentas.toFixed(2)}</p>
                                    <p className="mt-1 text-xs text-blue-300/80">{ventasHoy.length} ventas realizadas</p>
                                </div>
                                <div>
                                    <label className={label}>💵 Efectivo en caja</label>
                                    <input type="number" step="0.01" value={montoReal} onChange={(e) => setMontoReal(e.target.value)}
                                        className={`${input} text-lg font-bold`} placeholder="0.00" />
                                    <p className="mt-1 text-xs text-gray-500">Cuenta el dinero en efectivo</p>
                                </div>
                                {montoReal && (
                                    <div className={`rounded-xl p-3 text-sm font-semibold ${parseFloat(montoReal) === totalEfectivo
                                        ? 'bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-400/25'
                                        : 'bg-rose-500/15 text-rose-300 ring-1 ring-rose-400/25'
                                        }`}>
                                        <strong>Diferencia:</strong> ${(parseFloat(montoReal) - totalEfectivo).toFixed(2)}
                                    </div>
                                )}
                                <div>
                                    <label className={label}>Notas</label>
                                    <textarea value={notas} onChange={(e) => setNotas(e.target.value)} className={input} rows={2} placeholder="Opcional…" />
                                </div>
                                <div className="flex gap-3 pt-2">
                                    <button onClick={() => setModalAbierto(false)} className="flex-1 rounded-xl border border-white/10 bg-slate-800/60 py-3 text-base font-bold text-gray-300 transition-colors hover:bg-slate-800">Cancelar</button>
                                    <button onClick={guardarCierre} className="flex-1 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 py-3 text-base font-bold text-white shadow-md shadow-blue-500/25 transition-transform hover:-translate-y-0.5">Guardar Cierre</button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}