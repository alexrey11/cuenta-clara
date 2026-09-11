import { useState } from 'react';
import { db } from './db';
import type { Usuario } from './db';

interface ConfiguracionProps {
    usuarioActual: Usuario;
}

export default function Configuracion({ usuarioActual }: ConfiguracionProps) {
    const [mensaje, setMensaje] = useState<{ tipo: 'success' | 'error'; texto: string } | null>(null);

    const exportarBackup = async () => {
        try {
            const datos = {
                version: '1.0',
                fecha: new Date().toISOString(),
                categorias: await db.categorias.toArray(),
                productos: await db.productos.toArray(),
                ventas: await db.ventas.toArray(),
                clientes: await db.clientes.toArray(),
                usuarios: await db.usuarios.toArray(),
                cierres: await db.cierres.toArray(),
                devoluciones: await db.devoluciones.toArray(),
                movimientosInventario: await db.movimientosInventario.toArray(),
                tasasCambio: await db.tasasCambio.toArray(),
                licencias: await db.licencias.toArray()
            };

            const blob = new Blob([JSON.stringify(datos, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `CuentaClara_Backup_${new Date().toISOString().split('T')[0]}.json`;
            a.click();
            URL.revokeObjectURL(url);

            setMensaje({ tipo: 'success', texto: '✅ Backup exportado correctamente' });
            setTimeout(() => setMensaje(null), 3000);
        } catch (error) {
            setMensaje({ tipo: 'error', texto: '❌ Error al exportar backup' });
            setTimeout(() => setMensaje(null), 3000);
        }
    };

    const importarBackup = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!confirm('⚠️ Esto reemplazará TODOS tus datos actuales. ¿Continuar?')) {
            e.target.value = '';
            return;
        }

        try {
            const texto = await file.text();
            const datos = JSON.parse(texto);

            if (!datos.version || !datos.categorias) {
                throw new Error('Archivo de backup inválido');
            }

            // Limpiar base de datos actual
            await db.categorias.clear();
            await db.productos.clear();
            await db.ventas.clear();
            await db.clientes.clear();
            await db.usuarios.clear();
            await db.cierres.clear();
            await db.devoluciones.clear();
            await db.movimientosInventario.clear();
            await db.tasasCambio.clear();
            await db.licencias.clear();

            // Importar datos
            if (datos.categorias.length > 0) await db.categorias.bulkAdd(datos.categorias);
            if (datos.productos.length > 0) await db.productos.bulkAdd(datos.productos);
            if (datos.ventas.length > 0) await db.ventas.bulkAdd(datos.ventas);
            if (datos.clientes.length > 0) await db.clientes.bulkAdd(datos.clientes);
            if (datos.usuarios.length > 0) await db.usuarios.bulkAdd(datos.usuarios);
            if (datos.cierres.length > 0) await db.cierres.bulkAdd(datos.cierres);
            if (datos.devoluciones.length > 0) await db.devoluciones.bulkAdd(datos.devoluciones);
            if (datos.movimientosInventario.length > 0) await db.movimientosInventario.bulkAdd(datos.movimientosInventario);
            if (datos.tasasCambio.length > 0) await db.tasasCambio.bulkAdd(datos.tasasCambio);
            if (datos.licencias.length > 0) await db.licencias.bulkAdd(datos.licencias);

            setMensaje({ tipo: 'success', texto: '✅ Backup importado correctamente. Recargando...' });
            setTimeout(() => window.location.reload(), 2000);
        } catch (error) {
            setMensaje({ tipo: 'error', texto: '❌ Error al importar backup: archivo inválido' });
            setTimeout(() => setMensaje(null), 3000);
        }

        e.target.value = '';
    };

    const borrarTodo = async () => {
        if (!confirm('⚠️ ¿Estás SEGURO? Esto borrará TODOS los datos permanentemente.')) return;
        if (!confirm('⚠️ ÚLTIMA ADVERTENCIA: Esta acción NO se puede deshacer. ¿Continuar?')) return;

        try {
            await db.categorias.clear();
            await db.productos.clear();
            await db.ventas.clear();
            await db.clientes.clear();
            await db.cierres.clear();
            await db.devoluciones.clear();
            await db.movimientosInventario.clear();

            setMensaje({ tipo: 'success', texto: '✅ Datos borrados. Recargando...' });
            setTimeout(() => window.location.reload(), 2000);
        } catch (error) {
            setMensaje({ tipo: 'error', texto: '❌ Error al borrar datos' });
            setTimeout(() => setMensaje(null), 3000);
        }
    };

    return (
        <div className="p-6 bg-gray-50 dark:bg-gray-900 min-h-screen">
            <div className="max-w-4xl mx-auto">
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-md p-6 mb-6">
                    <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-200 mb-2">⚙️ Configuración</h1>
                    <p className="text-gray-600 dark:text-gray-400">Gestiona tu aplicación y datos</p>
                </div>

                {mensaje && (
                    <div className={`mb-6 p-4 rounded-xl ${mensaje.tipo === 'success' ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400' : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400'}`}>
                        {mensaje.texto}
                    </div>
                )}

                {/* Backup */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-md p-6 mb-6">
                    <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-gray-200">💾 Copias de Seguridad</h2>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                        Exporta tus datos regularmente para no perderlos si cambias de dispositivo.
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <button
                            onClick={exportarBackup}
                            className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6 rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all shadow-md"
                        >
                            <div className="text-3xl mb-2">📤</div>
                            <h3 className="font-bold text-lg mb-1">Exportar Backup</h3>
                            <p className="text-sm opacity-90">Descargar todos tus datos</p>
                        </button>

                        <label className="bg-gradient-to-r from-green-600 to-green-700 text-white p-6 rounded-xl hover:from-green-700 hover:to-green-800 transition-all shadow-md cursor-pointer">
                            <div className="text-3xl mb-2">📥</div>
                            <h3 className="font-bold text-lg mb-1">Importar Backup</h3>
                            <p className="text-sm opacity-90">Restaurar desde archivo</p>
                            <input type="file" accept=".json" onChange={importarBackup} className="hidden" />
                        </label>
                    </div>
                </div>

                {/* Información */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-md p-6 mb-6">
                    <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-gray-200">ℹ️ Información</h2>
                    <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                        <p><strong>Versión:</strong> 1.0.0</p>
                        <p><strong>Usuario actual:</strong> {usuarioActual.nombre}</p>
                        <p><strong>Rol:</strong> {usuarioActual.rol === 'admin' ? 'Administrador' : 'Vendedor'}</p>
                        <p><strong>Modo:</strong> Offline-first (todos los datos se guardan en tu dispositivo)</p>
                    </div>
                </div>

                {/* Zona de peligro */}
                <div className="bg-red-50 dark:bg-red-900/20 border-2 border-red-200 dark:border-red-800 rounded-2xl p-6">
                    <h2 className="text-xl font-semibold mb-4 text-red-700 dark:text-red-400">⚠️ Zona de Peligro</h2>
                    <p className="text-sm text-red-600 dark:text-red-300 mb-4">
                        Estas acciones son irreversibles. Asegúrate de tener un backup antes de continuar.
                    </p>
                    <button
                        onClick={borrarTodo}
                        className="bg-red-600 text-white px-6 py-3 rounded-xl hover:bg-red-700 transition-colors font-semibold"
                    >
                        🗑️ Borrar Todos los Datos
                    </button>
                </div>
            </div>
        </div>
    );
}