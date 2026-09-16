import { useState, useEffect } from 'react';
import { db } from './db';
import type { MovimientoInventario, Usuario } from './db';


interface MovimientosProps {
    usuarioActual: Usuario;
}

export default function MovimientosInventario({ usuarioActual: _ }: MovimientosProps) {
    const [movimientos, setMovimientos] = useState<MovimientoInventario[]>([]);

    useEffect(() => { cargarMovimientos(); }, []);

    const cargarMovimientos = async () => {
        const m = await db.movimientosInventario.toArray();
        setMovimientos(m.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime()));
    };

    const getTipoIcon = (tipo: string) => {
        switch (tipo) {
            case 'entrada': return '📥';
            case 'salida': return '📤';
            case 'ajuste': return '🔧';
            case 'perdida': return '⚠️';
            case 'devolucion': return '🔄';
            default: return '📦';
        }
    };

    const getTipoColor = (tipo: string) => {
        switch (tipo) {
            case 'entrada': return 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400';
            case 'salida': return 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400';
            case 'ajuste': return 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400';
            case 'perdida': return 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400';
            case 'devolucion': return 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400';
            default: return 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300';
        }
    };

    return (
        <div className="p-3 md:p-6 bg-gray-50 dark:bg-gray-900 min-h-screen">
            <div className="max-w-4xl mx-auto">
                <div className="bg-white dark:bg-gray-800 rounded-xl md:rounded-2xl shadow-md p-4 md:p-6 mb-4 md:mb-6">
                    <h1 className="text-xl md:text-3xl font-bold text-gray-800 dark:text-gray-200 mb-1">📦 Movimientos de Inventario</h1>
                    <p className="text-xs md:text-base text-gray-600 dark:text-gray-400">Historial de cambios en stock</p>
                </div>

                {movimientos.length === 0 ? (
                    <div className="bg-white dark:bg-gray-800 rounded-xl md:rounded-2xl shadow-md p-8 md:p-12 text-center">
                        <p className="text-gray-500 dark:text-gray-400 text-base md:text-lg">No hay movimientos registrados</p>
                    </div>
                ) : (
                    <div className="space-y-2 md:space-y-3">
                        {movimientos.map(m => (
                            <div key={m.id} className="bg-white dark:bg-gray-800 p-3 md:p-4 rounded-xl md:rounded-2xl shadow-md border border-gray-100 dark:border-gray-700">
                                <div className="flex justify-between items-start mb-2">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-xl md:text-2xl">{getTipoIcon(m.tipo)}</span>
                                            <h3 className="font-bold text-gray-800 dark:text-gray-200 text-sm md:text-base truncate">{m.productoNombre}</h3>
                                        </div>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">
                                            {new Date(m.fecha).toLocaleDateString('es-ES')} {new Date(m.fecha).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                                        </p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">Por: {m.realizadoPor}</p>
                                    </div>
                                    <div className="text-right ml-2 flex-shrink-0">
                                        <p className={`text-lg md:text-xl font-bold ${m.tipo === 'entrada' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                            {m.tipo === 'entrada' ? '+' : '-'}{m.cantidad}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex justify-between items-center gap-2">
                                    <span className={`text-xs px-2 py-1 rounded ${getTipoColor(m.tipo)} font-semibold capitalize`}>
                                        {m.tipo}
                                    </span>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate flex-1 ml-2">{m.motivo}</p>
                                </div>
                                <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                                    Stock: {m.stockAnterior} → {m.stockNuevo}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}