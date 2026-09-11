
import { useState, useEffect } from 'react';
import { db } from './db';


import type { Venta, Usuario, CierreCaja as CC } from './db';

interface Props { onVolver: () => void; usuarioActual: Usuario; }

export default function CierreCaja({ onVolver, usuarioActual }: Props) {
    const [ventasCompletadas, setVentasCompletadas] = useState<Venta[]>([]);
    const [ventasError, setVentasError] = useState<Venta[]>([]);
    const [totalDia, setTotalDia] = useState(0);
    const [vendedores, setVendedores] = useState<Map<string, { total: number; cantidad: number }>>(new Map());
    const [montoReal, setMontoReal] = useState('');
    const [notas, setNotas] = useState('');
    const [cierreRealizado, setCierreRealizado] = useState(false);
    const [cierres, setCierres] = useState<CC[]>([]);

    useEffect(() => { cargar(); }, []);

    const cargar = async () => {
        const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
        const todas = await db.ventas.toArray();
        const deHoy = todas.filter(v => new Date(v.fecha) >= hoy);
        const comp = deHoy.filter(v => v.estado === 'completada');
        const err = deHoy.filter(v => v.estado === 'error');
        setVentasCompletadas(comp); setVentasError(err);
        setTotalDia(comp.reduce((s, v) => s + v.total, 0));
        const vm = new Map<string, { total: number; cantidad: number }>();
        comp.forEach(v => { const a = vm.get(v.vendedorNombre) || { total: 0, cantidad: 0 }; vm.set(v.vendedorNombre, { total: a.total + v.total, cantidad: a.cantidad + 1 }); });
        setVendedores(vm);
        const c = await db.cierres.toArray(); c.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime()); setCierres(c);
    };

    const diff = montoReal ? parseFloat(montoReal) - totalDia : 0;

    const cerrar = async () => {
        if (!montoReal) { alert('Ingresa monto real'); return; }
        await db.cierres.add({ fecha: new Date(), totalVentas: totalDia, cantidadVentas: ventasCompletadas.length, montoReal: parseFloat(montoReal), diferencia: diff, notas, realizadoPor: usuarioActual.nombre, ventasPorVendedor: Array.from(vendedores.entries()).map(([v, d]) => ({ vendedor: v, total: d.total })) });
        setCierreRealizado(true); cargar();
    };

    if (cierreRealizado) return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6 flex items-center justify-center">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-md p-12 text-center">
                <div className="text-6xl mb-4">✅</div>
                <h2 className="text-3xl font-bold text-gray-800 dark:text-gray-200 mb-4">Cierre Registrado</h2>
                <button onClick={onVolver} className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 font-semibold">Volver</button>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
            <div className="max-w-6xl mx-auto">
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-md p-6 mb-6">
                    <div className="flex justify-between items-center">
                        <div><h1 className="text-3xl font-bold text-gray-800 dark:text-gray-200 mb-2">💰 Cierre de Caja</h1><p className="text-gray-600 dark:text-gray-400">{new Date().toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p></div>
                        <button onClick={onVolver} className="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-6 py-2 rounded-lg font-semibold">← Volver</button>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                    <div className="bg-gradient-to-br from-green-500 to-green-600 text-white p-6 rounded-2xl shadow-md"><p className="text-sm opacity-90">💵 Total Esperado</p><p className="text-4xl font-bold">${totalDia.toFixed(2)}</p><p className="text-sm opacity-90 mt-1">{ventasCompletadas.length} ventas</p></div>
                    <div className="bg-gradient-to-br from-yellow-500 to-yellow-600 text-white p-6 rounded-2xl shadow-md"><p className="text-sm opacity-90">⚠️ Errores</p><p className="text-4xl font-bold">{ventasError.length}</p><p className="text-sm opacity-90 mt-1">${ventasError.reduce((s, v) => s + v.total, 0).toFixed(2)} no cobradas</p></div>
                    <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white p-6 rounded-2xl shadow-md"><p className="text-sm opacity-90">🎫 Ticket Promedio</p><p className="text-4xl font-bold">${ventasCompletadas.length > 0 ? (totalDia / ventasCompletadas.length).toFixed(2) : '0.00'}</p></div>
                </div>

                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-2xl p-6 mb-6">
                    <h3 className="font-bold text-blue-900 dark:text-blue-300 mb-2">ℹ️ ¿Cómo funciona?</h3>
                    <p className="text-sm text-blue-800 dark:text-blue-400">Diferencia = Monto Real - Total Esperado. Si es 0 ✅ cuadrada. Si &gt; 0 ⚠️ sobrante. Si &lt; 0 ❌ faltante.</p>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-md p-6 mb-6">
                    <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-gray-200">👥 Por Vendedor</h2>
                    {Array.from(vendedores.entries()).length === 0 ? <p className="text-gray-500 dark:text-gray-400 text-center py-4">Sin ventas</p> : (
                        <div className="space-y-3">{Array.from(vendedores.entries()).map(([v, d]) => (
                            <div key={v} className="flex justify-between items-center bg-gray-50 dark:bg-gray-700 p-4 rounded-xl"><div className="flex items-center gap-3"><span className="text-xl">🛒</span><div><p className="font-semibold text-gray-800 dark:text-gray-200">{v}</p><p className="text-xs text-gray-500 dark:text-gray-400">{d.cantidad} ventas</p></div></div><span className="text-2xl font-bold text-green-600 dark:text-green-400">${d.total.toFixed(2)}</span></div>
                        ))}</div>
                    )}
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-md p-6 mb-6">
                    <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-gray-200">📝 Realizar Cierre</h2>
                    <div className="space-y-4">
                        <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Monto real en caja:</label>
                            <input type="number" step="0.01" value={montoReal} onChange={(e) => setMontoReal(e.target.value)} className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg px-4 py-3 text-2xl focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="0.00" /></div>
                        {montoReal && (
                            <div className={`p-4 rounded-xl border-2 ${diff === 0 ? 'bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-700' : diff > 0 ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700' : 'bg-red-50 dark:bg-red-900/20 border-red-300 dark:border-red-700'}`}>
                                <p className="text-sm text-gray-700 dark:text-gray-300">Esperado: ${totalDia.toFixed(2)} | Real: ${parseFloat(montoReal).toFixed(2)}</p>
                                <p className={`text-3xl font-bold ${diff === 0 ? 'text-green-600 dark:text-green-400' : diff > 0 ? 'text-blue-600 dark:text-blue-400' : 'text-red-600 dark:text-red-400'}`}>Diferencia: ${diff.toFixed(2)}</p>
                                <p className="text-sm font-semibold">{diff === 0 ? '✅ Cuadrada' : diff > 0 ? '⚠️ Sobrante' : '❌ Faltante'}</p>
                            </div>
                        )}
                        <textarea value={notas} onChange={(e) => setNotas(e.target.value)} className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg px-4 py-2" rows={2} placeholder="Notas..." />
                        <button onClick={cerrar} disabled={!montoReal} className="w-full bg-green-600 text-white py-4 rounded-xl hover:bg-green-700 font-semibold text-lg disabled:opacity-50">✓ Realizar Cierre</button>
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-md p-6">
                    <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-gray-200">📜 Historial</h2>
                    {cierres.length === 0 ? <p className="text-gray-500 dark:text-gray-400 text-center py-4">Sin cierres</p> : (
                        <div className="space-y-3">{cierres.slice(0, 10).map((c) => (
                            <div key={c.id} className="bg-gray-50 dark:bg-gray-700 p-4 rounded-xl border border-gray-200 dark:border-gray-600">
                                <div className="flex justify-between items-start mb-2">
                                    <div><p className="font-semibold text-gray-800 dark:text-gray-200">{new Date(c.fecha).toLocaleDateString('es-ES')}</p><p className="text-sm text-gray-500 dark:text-gray-400">Por: {c.realizadoPor}</p></div>
                                    <p className={`text-2xl font-bold ${c.diferencia === 0 ? 'text-green-600 dark:text-green-400' : c.diferencia > 0 ? 'text-blue-600 dark:text-blue-400' : 'text-red-600 dark:text-red-400'}`}>${c.diferencia.toFixed(2)}</p>
                                </div>
                                <div className="grid grid-cols-3 gap-2 text-sm bg-white dark:bg-gray-800 p-3 rounded-lg">
                                    <div><p className="text-gray-500 dark:text-gray-400 text-xs">Esperado</p><p className="font-semibold text-gray-800 dark:text-gray-200">${c.totalVentas.toFixed(2)}</p></div>
                                    <div><p className="text-gray-500 dark:text-gray-400 text-xs">Real</p><p className="font-semibold text-gray-800 dark:text-gray-200">${c.montoReal.toFixed(2)}</p></div>
                                    <div><p className="text-gray-500 dark:text-gray-400 text-xs">Ventas</p><p className="font-semibold text-gray-800 dark:text-gray-200">{c.cantidadVentas}</p></div>
                                </div>
                            </div>
                        ))}</div>
                    )}
                </div>
            </div>
        </div>
    );
}