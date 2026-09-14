import { useState } from 'react';
import { LICENCIAS_SECRETAS } from './db';


interface ActivarLicenciaProps {
    onActivar: () => void;
}

export default function ActivarLicencia({ onActivar }: ActivarLicenciaProps) {
    const [codigo, setCodigo] = useState('');
    const [mostrarInfo, setMostrarInfo] = useState(false);
    const [error, setError] = useState('');


    const activarLicencia = async () => {
        const codigoLimpio = codigo.trim().toUpperCase();

        if (!codigoLimpio) {
            setError('Ingresa un código de activación');
            return;
        }

        // 🚀 CÓDIGO MAESTRO DEL DESARROLLADOR (acceso ilimitado)
        if (codigoLimpio === 'CUBA-2024-ADMIN-PRO') {
            localStorage.setItem('cuenta-clara-licencia', 'activa');
            localStorage.setItem('cuenta-clara-dev', 'true');
            localStorage.setItem('cuenta-clara-fecha-instalacion', new Date().toISOString());
            localStorage.setItem('cuenta-clara-fecha-activacion', new Date().toISOString());
            localStorage.setItem('cuenta-clara-licencia-permanente', 'true');
            onActivar();
            return;
        }

        // Buscar el código en las licencias secretas
        const licenciaSecreta = LICENCIAS_SECRETAS.find(l => l.codigo === codigoLimpio);

        if (!licenciaSecreta) {
            setError('Código inválido. Verifica que esté bien escrito.');
            return;
        }

        if (licenciaSecreta.estado === 'activada') {
            setError('Este código ya fue utilizado. Contacta al administrador para obtener uno nuevo.');
            return;
        }

        // Activar licencia por 60 días
        const fechaActivacion = new Date();
        const fechaVencimiento = new Date(fechaActivacion);
        fechaVencimiento.setDate(fechaVencimiento.getDate() + 60);

        // Guardar en localStorage
        localStorage.setItem('cuenta-clara-licencia', 'activa');
        localStorage.setItem('cuenta-clara-fecha-activacion', fechaActivacion.toISOString());
        localStorage.setItem('cuenta-clara-fecha-vencimiento', fechaVencimiento.toISOString());
        localStorage.setItem('cuenta-clara-codigo-licencia', codigoLimpio);

        // Marcar la licencia como usada en el array (solo en memoria, no persistente)
        licenciaSecreta.estado = 'activada';
        licenciaSecreta.fechaActivacion = fechaActivacion;
        licenciaSecreta.fechaVencimiento = fechaVencimiento;



        onActivar();
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-600 to-indigo-800 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-6">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 max-w-md w-full">
                <div className="text-center mb-8">
                    <h1 className="text-4xl font-bold text-gray-800 dark:text-gray-200 mb-2">📊 CuentaClara</h1>
                    <p className="text-gray-600 dark:text-gray-400">Tu negocio bajo control</p>
                </div>

                {!mostrarInfo ? (
                    <>
                        <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg mb-6">
                            <p className="text-sm text-blue-800 dark:text-blue-400">
                                <strong>🎉 ¡Bienvenido a CuentaClara!</strong><br />
                                Tu período de prueba ha terminado. Activa tu licencia para seguir usando todas las funciones.
                            </p>
                        </div>

                        <div className="mb-6">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Código de Activación:
                            </label>
                            <input
                                type="text"
                                value={codigo}
                                onChange={(e) => {
                                    setCodigo(e.target.value.toUpperCase());
                                    setError('');
                                }}
                                className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg px-4 py-3 text-center text-lg font-mono tracking-wider focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="CC-XXXX-XXXX-XXXX-XXXX"
                            />
                            {error && (
                                <p className="text-red-500 dark:text-red-400 text-sm mt-2">{error}</p>
                            )}
                        </div>

                        <button
                            onClick={activarLicencia}
                            className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-semibold text-lg mb-4"
                        >
                            🔓 Activar Licencia
                        </button>

                        <button
                            onClick={() => setMostrarInfo(true)}
                            className="w-full text-blue-600 dark:text-blue-400 hover:underline text-sm"
                        >
                            ¿Cómo obtengo un código?
                        </button>
                    </>
                ) : (
                    <>
                        <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 p-6 rounded-lg mb-6">
                            <h3 className="font-bold text-lg mb-3 text-green-800 dark:text-green-400">💳 Licencia de Uso</h3>

                            <div className="bg-white dark:bg-gray-700 p-4 rounded-lg border-2 border-green-500 dark:border-green-600 relative">
                                <span className="absolute -top-3 left-4 bg-green-500 text-white text-xs px-2 py-1 rounded-full">60 días</span>
                                <p className="font-semibold text-green-700 dark:text-green-400">Licencia Completa</p>
                                <p className="text-2xl font-bold text-gray-800 dark:text-gray-200 mt-2">Acceso Total</p>
                                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Todas las funciones incluidas</p>
                            </div>
                        </div>

                        <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg mb-6">
                            <h4 className="font-semibold mb-2 text-yellow-800 dark:text-yellow-400">📱 Cómo obtener tu licencia:</h4>
                            <ol className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
                                <li>1. Contacta al administrador por WhatsApp:</li>
                                <li className="pl-4 font-mono bg-white dark:bg-gray-700 p-2 rounded text-center font-bold text-blue-600 dark:text-blue-400">
                                    +53 55501545
                                </li>
                                <li>2. Negocia el precio y realiza el pago</li>
                                <li>3. Recibirás tu código de activación único</li>
                                <li>4. Ingresa el código aquí y disfruta de acceso completo</li>
                            </ol>
                        </div>

                        <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg mb-6">
                            <h4 className="font-semibold mb-2 text-blue-800 dark:text-blue-400">✨ ¿Qué incluye?</h4>
                            <ul className="space-y-1 text-sm text-gray-700 dark:text-gray-300">
                                <li>✅ Ventas ilimitadas</li>
                                <li>✅ Gestión de inventario completa</li>
                                <li>✅ Clientes y fiados</li>
                                <li>✅ Reportes profesionales</li>
                                <li>✅ Múltiples métodos de pago</li>
                                <li>✅ 100% Offline</li>
                            </ul>
                        </div>

                        <button
                            onClick={() => setMostrarInfo(false)}
                            className="w-full text-blue-600 dark:text-blue-400 hover:underline"
                        >
                            ← Ya tengo mi código
                        </button>
                    </>
                )}
            </div>
        </div>
    );
}