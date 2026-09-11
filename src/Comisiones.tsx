import { useState, useEffect } from 'react';
import { db } from './db';
import type { Usuario, Venta } from './db';



interface ComisionesProps { usuarioActual: Usuario; }

export default function Comisiones({ usuarioActual: _ }: ComisionesProps) {
    const [vendedores, setVendedores] = useState<Usuario[]>([]);
    const [ventas, setVentas] = useState<Venta[]>([]);
    const [editandoId, setEditandoId] = useState<number | null>(null);
    const [nuevaComision, setNuevaComision] = useState('');
    const [fechaInicio, setFechaInicio] = useState('');
    const [fechaFin, setFechaFin] = useState('');

    useEffect(() => { cargarDatos(); }, []);

    const cargarDatos = async () => {
        const [u, v] = await Promise.all([db.usuarios.where('rol').equals('vendedor').toArray(), db.ventas.where('estado').equals('completada').toArray()]);
        setVendedores(u); setVentas(v);
    };

    const guardarComision = async (userId: number) => {
        const p = parseFloat(nuevaComision);
        if (p < 0 || p > 100) { alert('Porcentaje entre 0 y 100'); return; }
        await db.usuarios.update(userId, { comisionPorcentaje: p });
        setEditandoId(null); setNuevaComision(''); cargarDatos();
    };

    const calcularComision = (vendedorId: number) => {
        const v = vendedores.find(x => x.id === vendedorId);
        const porc = v?.comisionPorcentaje || 0;
        const vf = ventas.filter(x => { if (x.vendedorId !== vendedorId) return false; const f = new Date(x.fecha); if (fechaInicio && f < new Date(fechaInicio)) return false; if (fechaFin && f > new Date(fechaFin + 'T23:59:59')) return false; return true; });
        const total = vf.reduce((s, x) => s + x.total, 0);
        return { totalVentas: total, comision: total * (porc / 100), cantidadVentas: vf.length };
    };

    return (
        <div className="p-6 bg-gray-50 dark:bg-gray-900 min-h-screen">
            <div className="max-w-6xl mx-auto">
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-md p-6 mb-6">
                    <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-200 mb-2">💰 Comisiones</h1>
                    <p className="text-gray-600 dark:text-gray-400">Configura porcentajes y calcula comisiones</p>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-md p-6 mb-6">
                    <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-gray-200">📅 Período</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Desde:</label><input type="date" value={fechaInicio} onChange={(e) => setFechaInicio(e.target.value)} className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg px-4 py-2.5" /></div>
                        <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Hasta:</label><input type="date" value={fechaFin} onChange={(e) => setFechaFin(e.target.value)} className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg px-4 py-2.5" /></div>
                    </div>
                    {(fechaInicio || fechaFin) && <button onClick={() => { setFechaInicio(''); setFechaFin(''); }} className="mt-3 text-blue-600 dark:text-blue-400 text-sm font-semibold hover:underline">✕ Limpiar</button>}
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-md p-6">
                    <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-gray-200">Vendedores ({vendedores.length})</h2>
                    {vendedores.length === 0 ? <p className="text-gray-500 dark:text-gray-400 text-center py-8">No hay vendedores</p> : (
                        <div className="space-y-4">
                            {vendedores.map((v) => {
                                const stats = calcularComision(v.id!);
                                const edit = editandoId === v.id;
                                return (
                                    <div key={v.id} className="bg-gray-50 dark:bg-gray-700 p-6 rounded-xl border border-gray-100 dark:border-gray-600">
                                        <div className="flex justify-between items-start mb-4">
                                            <div className="flex items-center gap-4">
                                                <div className="w-14 h-14 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center text-2xl font-bold text-blue-600 dark:text-blue-400">{v.nombre.charAt(0).toUpperCase()}</div>
                                                <div><h3 className="font-bold text-gray-800 dark:text-gray-200 text-lg">{v.nombre}</h3><p className="text-sm text-gray-500 dark:text-gray-400">{stats.cantidadVentas} ventas</p></div>
                                            </div>
                                            <div className="text-right"><p className="text-sm text-gray-500 dark:text-gray-400">Comisión:</p><p className="text-3xl font-bold text-green-600 dark:text-green-400">${stats.comision.toFixed(2)}</p></div>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                                            <div className="bg-white dark:bg-gray-800 p-3 rounded-lg"><p className="text-xs text-gray-500 dark:text-gray-400">Total Ventas</p><p className="text-xl font-bold text-gray-800 dark:text-gray-200">${stats.totalVentas.toFixed(2)}</p></div>
                                            <div className="bg-white dark:bg-gray-800 p-3 rounded-lg"><p className="text-xs text-gray-500 dark:text-gray-400">% Comisión</p><p className="text-xl font-bold text-blue-600 dark:text-blue-400">{v.comisionPorcentaje || 0}%</p></div>
                                            <div className="bg-white dark:bg-gray-800 p-3 rounded-lg"><p className="text-xs text-gray-500 dark:text-gray-400">Promedio</p><p className="text-xl font-bold text-gray-800 dark:text-gray-200">${stats.cantidadVentas > 0 ? (stats.totalVentas / stats.cantidadVentas).toFixed(2) : '0.00'}</p></div>
                                        </div>
                                        {edit ? (
                                            <div className="flex gap-2 items-center">
                                                <input type="number" min="0" max="100" step="0.1" value={nuevaComision} onChange={(e) => setNuevaComision(e.target.value)} className="flex-1 border border-blue-300 dark:border-blue-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg px-3 py-2" autoFocus placeholder="%" />
                                                <span className="text-gray-500 dark:text-gray-400">%</span>
                                                <button onClick={() => guardarComision(v.id!)} className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 font-semibold">✓</button>
                                                <button onClick={() => { setEditandoId(null); setNuevaComision(''); }} className="bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 px-4 py-2 rounded-lg font-semibold">✕</button>
                                            </div>
                                        ) : (
                                            <button onClick={() => { setEditandoId(v.id!); setNuevaComision((v.comisionPorcentaje || 0).toString()); }} className="w-full bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 py-2 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 font-semibold">✏️ Configurar %</button>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}