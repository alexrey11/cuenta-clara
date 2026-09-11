import { useState, useEffect } from 'react';
import { db } from './db';
import type { TasaCambio, Usuario } from './db';



interface TasasCambioProps { usuarioActual: Usuario; }

export default function TasasCambio({ usuarioActual }: TasasCambioProps) {
    const [tasas, setTasas] = useState<TasaCambio[]>([]);
    const [editandoId, setEditandoId] = useState<number | null>(null);
    const [nuevaTasa, setNuevaTasa] = useState('');

    useEffect(() => { cargarTasas(); }, []);

    const cargarTasas = async () => {
        let todas = await db.tasasCambio.toArray();
        if (todas.length === 0) {
            await db.tasasCambio.bulkAdd([
                { moneda: 'USD', tasa: 300, fechaActualizacion: new Date(), actualizadoPor: 'Sistema' },
                { moneda: 'EUR', tasa: 330, fechaActualizacion: new Date(), actualizadoPor: 'Sistema' },
                { moneda: 'MLC', tasa: 280, fechaActualizacion: new Date(), actualizadoPor: 'Sistema' }
            ]);
            todas = await db.tasasCambio.toArray();
        }
        const map = new Map<string, TasaCambio>();
        todas.forEach(t => { if (!map.has(t.moneda) || new Date(t.fechaActualizacion) > new Date(map.get(t.moneda)!.fechaActualizacion)) map.set(t.moneda, t); });
        const idsMantener = Array.from(map.values()).map(t => t.id!);
        const idsBorrar = todas.filter(t => !idsMantener.includes(t.id!)).map(t => t.id!);
        if (idsBorrar.length > 0) await db.tasasCambio.bulkDelete(idsBorrar);
        setTasas(Array.from(map.values()));
    };

    const guardar = async (id: number) => {
        const v = parseFloat(nuevaTasa);
        if (!v || v <= 0) { alert('Tasa inválida'); return; }
        await db.tasasCambio.update(id, { tasa: v, fechaActualizacion: new Date(), actualizadoPor: usuarioActual.nombre });
        setEditandoId(null); setNuevaTasa(''); cargarTasas();
    };

    const info: Record<string, { nombre: string; emoji: string }> = { USD: { nombre: 'Dólar', emoji: '🇺🇸' }, EUR: { nombre: 'Euro', emoji: '🇪🇺' }, MLC: { nombre: 'MLC', emoji: '🏦' } };

    return (
        <div className="p-6 bg-gray-50 dark:bg-gray-900 min-h-screen">
            <div className="max-w-4xl mx-auto">
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-md p-6 mb-6">
                    <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-200 mb-2">💱 Tasas de Cambio</h1>
                    <p className="text-gray-600 dark:text-gray-400">1 unidad = X CUP</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                    <div className="bg-gradient-to-br from-green-500 to-green-600 text-white p-6 rounded-2xl shadow-md">
                        <div className="flex items-center gap-3 mb-4"><span className="text-3xl">🇨🇺</span><div><h3 className="font-bold text-lg">CUP</h3><p className="text-sm opacity-90">Peso Cubano</p></div></div>
                        <p className="text-4xl font-bold">1.00</p>
                        <p className="text-sm opacity-75">Moneda base</p>
                    </div>

                    {tasas.map((t) => {
                        const i = info[t.moneda] || { nombre: t.moneda, emoji: '💰' };
                        const edit = editandoId === t.id;
                        return (
                            <div key={t.id} className="bg-white dark:bg-gray-800 rounded-2xl shadow-md p-6 border border-gray-100 dark:border-gray-700">
                                <div className="flex items-center gap-3 mb-4"><span className="text-3xl">{i.emoji}</span><div><h3 className="font-bold text-lg text-gray-800 dark:text-gray-200">{t.moneda}</h3><p className="text-sm text-gray-500 dark:text-gray-400">{i.nombre}</p></div></div>
                                {edit ? (
                                    <div className="space-y-3">
                                        <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
                                            <p className="text-xs text-blue-700 dark:text-blue-400 font-semibold mb-2">Nueva tasa:</p>
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className="text-sm text-gray-700 dark:text-gray-300 whitespace-nowrap">1 {t.moneda} =</span>
                                                <input type="number" step="0.01" value={nuevaTasa} onChange={(e) => setNuevaTasa(e.target.value)} autoFocus
                                                    className="flex-1 min-w-[80px] border border-blue-300 dark:border-blue-600 rounded-lg px-3 py-2 text-lg font-bold bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                                                <span className="text-sm text-gray-700 dark:text-gray-300 whitespace-nowrap">CUP</span>
                                            </div>
                                        </div>
                                        <div className="flex gap-2">
                                            <button onClick={() => guardar(t.id!)} className="flex-1 bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 font-semibold text-sm">✓</button>
                                            <button onClick={() => { setEditandoId(null); setNuevaTasa(''); }} className="flex-1 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 py-2 rounded-lg font-semibold text-sm">✕</button>
                                        </div>
                                    </div>
                                ) : (
                                    <div>
                                        <p className="text-4xl font-bold text-gray-800 dark:text-gray-200 mb-1">{t.tasa.toFixed(2)}</p>
                                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">1 {t.moneda} = {t.tasa.toFixed(2)} CUP</p>
                                        <button onClick={() => { setEditandoId(t.id!); setNuevaTasa(t.tasa.toString()); }} className="w-full bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 py-2 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 font-semibold text-sm">✏️ Actualizar</button>
                                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">{new Date(t.fechaActualizacion).toLocaleDateString('es-ES')}</p>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-md p-6">
                    <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-gray-200">📊 Ejemplo</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {tasas.map((t) => (
                            <div key={t.id} className="bg-gray-50 dark:bg-gray-700 p-4 rounded-xl text-center">
                                <p className="text-sm text-gray-500 dark:text-gray-400">10 {t.moneda} =</p>
                                <p className="text-2xl font-bold text-green-600 dark:text-green-400">{(10 * t.tasa).toFixed(2)} CUP</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}