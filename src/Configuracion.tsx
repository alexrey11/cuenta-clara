import { useState } from 'react';
import { db } from './db';
import type { Usuario } from './db';


interface ConfiguracionProps {
    usuarioActual: Usuario;
}

export default function Configuracion({ usuarioActual: _ }: ConfiguracionProps) {
    const [confirmarBorrar, setConfirmarBorrar] = useState(false);

    const exportarBackup = async () => {
        const datos = {
            categorias: await db.categorias.toArray(),
            productos: await db.productos.toArray(),
            ventas: await db.ventas.toArray(),
            clientes: await db.clientes.toArray(),
            usuarios: await db.usuarios.toArray(),
            tasasCambio: await db.tasasCambio.toArray(),
            fecha: new Date().toISOString()
        };
        const blob = new Blob([JSON.stringify(datos, null, 2)], { type: 'application/json' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `backup_cuentaclara_${new Date().toISOString().split('T')[0]}.json`;
        link.click();
        alert('✅ Backup exportado');
    };

    const importarBackup = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const text = await file.text();
        try {
            const datos = JSON.parse(text);
            if (confirm('⚠️ Esto reemplazará todos los datos actuales. ¿Continuar?')) {
                await db.categorias.clear();
                await db.productos.clear();
                await db.ventas.clear();
                await db.clientes.clear();
                await db.tasasCambio.clear();

                if (datos.categorias) await db.categorias.bulkAdd(datos.categorias);
                if (datos.productos) await db.productos.bulkAdd(datos.productos);
                if (datos.ventas) await db.ventas.bulkAdd(datos.ventas);
                if (datos.clientes) await db.clientes.bulkAdd(datos.clientes);
                if (datos.tasasCambio) await db.tasasCambio.bulkAdd(datos.tasasCambio);

                alert('✅ Backup importado');
                window.location.reload();
            }
        } catch (err) {
            alert('❌ Error al importar backup');
        }
    };

    const borrarTodo = async () => {
        if (!confirmarBorrar) {
            setConfirmarBorrar(true);
            return;
        }
        if (confirm('⚠️ ¿ESTÁS SEGURO? Esto borrará TODOS los datos permanentemente')) {
            await db.categorias.clear();
            await db.productos.clear();
            await db.ventas.clear();
            await db.clientes.clear();
            await db.tasasCambio.clear();
            await db.movimientosInventario.clear();
            await db.cierres.clear();
            alert('✅ Todos los datos han sido borrados');
            window.location.reload();
        }
    };

    return (
        <div className="p-3 md:p-6 bg-gray-50 dark:bg-gray-900 min-h-screen">
            <div className="max-w-2xl mx-auto">
                <div className="bg-white dark:bg-gray-800 rounded-xl md:rounded-2xl shadow-md p-4 md:p-6 mb-4 md:mb-6">
                    <h1 className="text-xl md:text-3xl font-bold text-gray-800 dark:text-gray-200 mb-1">⚙️ Configuración</h1>
                    <p className="text-xs md:text-base text-gray-600 dark:text-gray-400">Ajustes del sistema</p>
                </div>

                <div className="space-y-3 md:space-y-4">
                    <div className="bg-white dark:bg-gray-800 p-4 md:p-6 rounded-xl md:rounded-2xl shadow-md border border-gray-100 dark:border-gray-700">
                        <h2 className="font-bold text-gray-800 dark:text-gray-200 text-base md:text-lg mb-2">💾 Backup de Datos</h2>
                        <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400 mb-3">Exporta o importa todos los datos de la app</p>
                        <div className="flex flex-col md:flex-row gap-2">
                            <button onClick={exportarBackup} className="flex-1 bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 font-semibold text-sm md:text-base">
                                📤 Exportar Backup
                            </button>
                            <label className="flex-1 bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 font-semibold text-sm md:text-base text-center cursor-pointer">
                                📥 Importar Backup
                                <input type="file" accept=".json" onChange={importarBackup} className="hidden" />
                            </label>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-gray-800 p-4 md:p-6 rounded-xl md:rounded-2xl shadow-md border border-red-200 dark:border-red-800">
                        <h2 className="font-bold text-red-600 dark:text-red-400 text-base md:text-lg mb-2">⚠️ Zona Peligrosa</h2>
                        <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400 mb-3">Esta acción no se puede deshacer</p>
                        <button onClick={borrarTodo}
                            className={`w-full py-3 rounded-lg font-semibold text-sm md:text-base ${confirmarBorrar ? 'bg-red-600 text-white hover:bg-red-700' : 'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/50'
                                }`}>
                            {confirmarBorrar ? '⚠️ Confirmar: Borrar TODO' : '🗑️ Borrar Todos los Datos'}
                        </button>
                        {confirmarBorrar && (
                            <button onClick={() => setConfirmarBorrar(false)} className="w-full mt-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 py-2 rounded-lg font-semibold text-sm">
                                Cancelar
                            </button>
                        )}
                    </div>

                    <div className="bg-white dark:bg-gray-800 p-4 md:p-6 rounded-xl md:rounded-2xl shadow-md border border-gray-100 dark:border-gray-700">
                        <h2 className="font-bold text-gray-800 dark:text-gray-200 text-base md:text-lg mb-2">ℹ️ Información</h2>
                        <div className="space-y-2 text-xs md:text-sm text-gray-600 dark:text-gray-400">
                            <p><strong>Versión:</strong> 1.0.0</p>
                            <p><strong>Base de datos:</strong> IndexedDB (local)</p>
                            <p><strong>Modo:</strong> 100% Offline</p>
                            <p><strong>Desarrollado por:</strong> CuentaClara</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}