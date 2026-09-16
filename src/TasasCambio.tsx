import { useState, useEffect } from 'react';
import { db } from './db';
import type { TasaCambio, Usuario } from './db';

interface TasasCambioProps {
    usuarioActual: Usuario;
}

export default function TasasCambio({ usuarioActual: _ }: TasasCambioProps) {
    const [tasas, setTasas] = useState<TasaCambio[]>([]);
    const [editando, setEditando] = useState<TasaCambio | null>(null);
    const [nuevaTasa, setNuevaTasa] = useState('');

    useEffect(() => { cargarTasas(); }, []);

    const cargarTasas = async () => {
        const t = await db.tasasCambio.toArray();
        setTasas(t);
    };

    const guardarTasa = async () => {
        if (!editando || !nuevaTasa) return;
        const valor = parseFloat(nuevaTasa);
        if (valor <= 0) { alert('Tasa inválida'); return; }

        if (editando.id) {
            await db.tasasCambio.update(editando.id, {
                tasa: valor,
                fechaActualizacion: new Date(),
                actualizadoPor: 'Admin'
            });
        }
        setEditando(null);
        setNuevaTasa('');
        cargarTasas();
    };

    const getMonedaIcon = (moneda: string) => {
        switch (moneda) {
            case 'USD': return '🇺🇸';
            case 'EUR': return '🇪🇺';
            case 'MLC': return '💳';
            default: return '💰';
        }
    };

    return (
        <div className="p-3 md:p-6 bg-gray-50 dark:bg-gray-900 min-h-screen">
            <div className="max-w-2xl mx-auto">
                <div className="bg-white dark:bg-gray-800 rounded-xl md:rounded-2xl shadow-md p-4 md:p-6 mb-4 md:mb-6">
                    <h1 className="text-xl md:text-3xl font-bold text-gray-800 dark:text-gray-200 mb-1">💱 Tasas de Cambio</h1>
                    <p className="text-xs md:text-base text-gray-600 dark:text-gray-400">Configura las tasas para conversión de monedas</p>
                </div>

                <div className="space-y-3 md:space-y-4">
                    {tasas.map(t => (
                        <div key={t.id} className="bg-white dark:bg-gray-800 p-4 md:p-6 rounded-xl md:rounded-2xl shadow-md border border-gray-100 dark:border-gray-700">
                            <div className="flex justify-between items-center mb-3">
                                <div className="flex items-center gap-3">
                                    <span className="text-3xl md:text-4xl">{getMonedaIcon(t.moneda)}</span>
                                    <div>
                                        <h3 className="font-bold text-gray-800 dark:text-gray-200 text-base md:text-lg">{t.moneda}</h3>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">1 {t.moneda} = X CUP</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-2xl md:text-3xl font-bold text-blue-600 dark:text-blue-400">${t.tasa.toFixed(2)}</p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">CUP</p>
                                </div>
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                                Actualizado: {new Date(t.fechaActualizacion).toLocaleDateString('es-ES')} por {t.actualizadoPor}
                            </div>
                            <button onClick={() => { setEditando(t); setNuevaTasa(t.tasa.toString()); }}
                                className="w-full bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 py-2 rounded-lg font-semibold text-sm md:text-base">
                                ✏️ Editar Tasa
                            </button>
                        </div>
                    ))}
                </div>

                {editando && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end md:items-center justify-center p-0 md:p-4 z-50">
                        <div className="bg-white dark:bg-gray-800 rounded-t-2xl md:rounded-2xl shadow-2xl w-full md:max-w-md">
                            <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-4 md:px-6 py-3 md:py-4 flex justify-between items-center sticky top-0 z-10">
                                <h2 className="text-lg md:text-xl font-bold text-white">Editar Tasa {editando.moneda}</h2>
                                <button onClick={() => { setEditando(null); setNuevaTasa(''); }} className="text-white text-2xl">&times;</button>
                            </div>
                            <div className="p-4 md:p-6 space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nueva tasa (CUP):</label>
                                    <input type="number" step="0.01" value={nuevaTasa} onChange={(e) => setNuevaTasa(e.target.value)}
                                        className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg px-4 py-3 text-base md:text-lg" />
                                </div>
                                <div className="flex gap-3">
                                    <button onClick={() => { setEditando(null); setNuevaTasa(''); }} className="flex-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 py-3 rounded-lg font-semibold">Cancelar</button>
                                    <button onClick={guardarTasa} className="flex-1 bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 font-semibold">Guardar</button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}