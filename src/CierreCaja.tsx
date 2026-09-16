
import { useState, useEffect } from 'react';
import { db } from './db';

import type { Venta, CierreCaja as CierreCajaType, Usuario } from './db';

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
        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0);
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
        ventasHoy.forEach(v => {
            ventasPorVendedor[v.vendedorNombre] = (ventasPorVendedor[v.vendedorNombre] || 0) + v.total;
        });

        await db.cierres.add({
            fecha: new Date(),
            totalVentas,
            cantidadVentas: ventasHoy.length,
            montoReal: mr,
            diferencia,
            notas: notas.trim() || 'Sin notas',
            realizadoPor: usuarioActual.nombre,
            ventasPorVendedor: Object.entries(ventasPorVendedor).map(([vendedor, total]) => ({ vendedor, total })),
            desgloseMetodosPago: {
                efectivo: totalEfectivo,
                transferencia: ventasHoy.reduce((s, v) => s + (v.metodosPago?.filter(m => m.tipo === 'transferencia').reduce((a, m) => a + m.montoEnCUP, 0) || 0), 0),
                tarjeta: ventasHoy.reduce((s, v) => s + (v.metodosPago?.filter(m => m.tipo === 'tarjeta').reduce((a, m) => a + m.montoEnCUP, 0) || 0), 0),
                fiado: ventasHoy.reduce((s, v) => s + (v.metodosPago?.filter(m => m.tipo === 'fiado').reduce((a, m) => a + m.montoEnCUP, 0) || 0), 0)
            }
        });

        alert(`✅ Cierre guardado\nDiferencia: $${diferencia.toFixed(2)}`);
        setModalAbierto(false);
        setMontoReal('');
        setNotas('');
        cargarDatos();
    };

    return (
        <div className="p-3 md:p-6 bg-gray-50 dark:bg-gray-900 min-h-screen">
            <div className="max-w-4xl mx-auto">
                <div className="bg-white dark:bg-gray-800 rounded-xl md:rounded-2xl shadow-md p-4 md:p-6 mb-4 md:mb-6">
                    <div className="flex justify-between items-center">
                        <div>
                            <h1 className="text-xl md:text-3xl font-bold text-gray-800 dark:text-gray-200 mb-1">💰 Cierre de Caja</h1>
                            <p className="text-xs md:text-base text-gray-600 dark:text-gray-400">Control diario de ventas</p>
                        </div>
                        <button onClick={onVolver} className="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-3 md:px-6 py-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 font-semibold text-sm md:text-base">← Volver</button>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-6 mb-4 md:mb-6">
                    <div className="bg-gradient-to-br from-green-500 to-green-600 text-white p-4 md:p-6 rounded-xl md:rounded-2xl shadow-md">
                        <p className="text-xs md:text-sm opacity-90 mb-1">💵 Ventas Hoy</p>
                        <p className="text-2xl md:text-3xl font-bold">${totalVentas.toFixed(2)}</p>
                        <p className="text-xs opacity-90 mt-1">{ventasHoy.length} ventas</p>
                    </div>
                    <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white p-4 md:p-6 rounded-xl md:rounded-2xl shadow-md">
                        <p className="text-xs md:text-sm opacity-90 mb-1">💵 Efectivo</p>
                        <p className="text-2xl md:text-3xl font-bold">${totalEfectivo.toFixed(2)}</p>
                        <p className="text-xs opacity-90 mt-1">Contar en caja</p>
                    </div>
                    <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white p-4 md:p-6 rounded-xl md:rounded-2xl shadow-md">
                        <p className="text-xs md:text-sm opacity-90 mb-1">📊 Cierres</p>
                        <p className="text-2xl md:text-3xl font-bold">{cierres.length}</p>
                        <p className="text-xs opacity-90 mt-1">Total registrados</p>
                    </div>
                </div>

                <button onClick={() => setModalAbierto(true)} disabled={ventasHoy.length === 0}
                    className="w-full bg-blue-600 text-white px-6 py-3 md:py-4 rounded-xl hover:bg-blue-700 font-semibold text-base md:text-lg mb-4 md:mb-6 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed">
                    🔒 Realizar Cierre de Caja
                </button>

                <div className="bg-white dark:bg-gray-800 rounded-xl md:rounded-2xl shadow-md p-4 md:p-6">
                    <h2 className="text-lg md:text-xl font-semibold mb-3 md:mb-4 text-gray-800 dark:text-gray-200">📜 Historial de Cierres</h2>
                    {cierres.length === 0 ? (
                        <p className="text-gray-500 dark:text-gray-400 text-center py-8">Sin cierres registrados</p>
                    ) : (
                        <div className="space-y-2 md:space-y-3">
                            {cierres.map(c => (
                                <div key={c.id} className="bg-gray-50 dark:bg-gray-700 p-3 md:p-4 rounded-lg md:rounded-xl border border-gray-200 dark:border-gray-600">
                                    <div className="flex justify-between items-start mb-2">
                                        <div>
                                            <p className="font-semibold text-gray-800 dark:text-gray-200 text-sm md:text-base">{new Date(c.fecha).toLocaleDateString('es-ES')}</p>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">Por: {c.realizadoPor}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-lg md:text-xl font-bold text-green-600 dark:text-green-400">${c.totalVentas.toFixed(2)}</p>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">{c.cantidadVentas} ventas</p>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2 text-xs md:text-sm">
                                        <div>
                                            <p className="text-gray-500 dark:text-gray-400">Efectivo:</p>
                                            <p className="font-semibold text-gray-800 dark:text-gray-200">${c.desgloseMetodosPago?.efectivo.toFixed(2) || '0.00'}</p>
                                        </div>
                                        <div>
                                            <p className="text-gray-500 dark:text-gray-400">Real:</p>
                                            <p className="font-semibold text-gray-800 dark:text-gray-200">${c.montoReal.toFixed(2)}</p>
                                        </div>
                                    </div>
                                    <div className={`mt-2 p-2 rounded text-xs md:text-sm ${c.diferencia === 0 ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'}`}>
                                        Diferencia: <strong>${c.diferencia.toFixed(2)}</strong>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {modalAbierto && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end md:items-center justify-center p-0 md:p-4 z-50">
                        <div className="bg-white dark:bg-gray-800 rounded-t-2xl md:rounded-2xl shadow-2xl w-full md:max-w-md max-h-[90vh] overflow-y-auto">
                            <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-4 md:px-6 py-3 md:py-4 flex justify-between items-center sticky top-0 z-10">
                                <h2 className="text-lg md:text-xl font-bold text-white">Cierre de Caja</h2>
                                <button onClick={() => setModalAbierto(false)} className="text-white text-2xl">&times;</button>
                            </div>
                            <div className="p-4 md:p-6 space-y-4">
                                <div className="bg-blue-50 dark:bg-blue-900/20 p-3 md:p-4 rounded-lg">
                                    <p className="text-sm text-blue-800 dark:text-blue-400">Total ventas del día:</p>
                                    <p className="text-2xl md:text-3xl font-bold text-blue-700 dark:text-blue-400">${totalVentas.toFixed(2)}</p>
                                    <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">{ventasHoy.length} ventas realizadas</p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">💵 Efectivo en caja:</label>
                                    <input type="number" step="0.01" value={montoReal} onChange={(e) => setMontoReal(e.target.value)}
                                        className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg px-4 py-3 text-base md:text-lg" placeholder="0.00" />
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Cuenta el dinero en efectivo</p>
                                </div>
                                {montoReal && (
                                    <div className={`p-3 rounded-lg ${parseFloat(montoReal) === totalEfectivo ? 'bg-green-50 dark:bg-green-900/20' : 'bg-red-50 dark:bg-red-900/20'}`}>
                                        <p className="text-sm">
                                            <strong>Diferencia:</strong> ${(parseFloat(montoReal) - totalEfectivo).toFixed(2)}
                                        </p>
                                    </div>
                                )}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notas:</label>
                                    <textarea value={notas} onChange={(e) => setNotas(e.target.value)}
                                        className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg px-4 py-3 text-base" rows={2} placeholder="Opcional..." />
                                </div>
                                <div className="flex gap-3 pt-2">
                                    <button onClick={() => setModalAbierto(false)} className="flex-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 py-3 rounded-lg font-semibold">Cancelar</button>
                                    <button onClick={guardarCierre} className="flex-1 bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 font-semibold">Guardar Cierre</button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}