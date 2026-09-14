import { useState } from 'react';
import { db } from './db';

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

        // 🚀 CÓDIGO MAESTRO DEL DESARROLLADOR (¡VA PRIMERO QUE CUALQUIER VALIDACIÓN!)
        if (codigoLimpio === 'CUBA-2026-ADMIN-PRO') {
            localStorage.setItem('cuenta-clara-licencia', 'activa');
            localStorage.setItem('cuenta-clara-fecha-activacion', new Date().toISOString());
            onActivar();
            return;
        }

        // Validación de formato para códigos normales de clientes
        if (!codigoLimpio.startsWith('CC-') || codigoLimpio.length !== 23) {
            setError('Código inválido. Debe tener el formato: CC-XXXX-XXXX-XXXX-XXXX');
            return;
        }

        // Buscar el código en la base de datos local
        const licencia = await db.licencias.where('codigo').equals(codigoLimpio).first();

        if (licencia) {
            await db.licencias.update(licencia.id!, {
                estado: 'activada',
                fechaActivacion: new Date()
            });

            localStorage.setItem('cuenta-clara-licencia', 'activa');
            localStorage.setItem('cuenta-clara-fecha-activacion', new Date().toISOString());
            onActivar();
        } else {
            setError('Código inválido. Verifica que esté bien escrito.');
        }
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
                                <strong>🎉 ¡Prueba gratis de 15 días!</strong><br />
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
                            <h3 className="font-bold text-lg mb-3 text-green-800 dark:text-green-400">💳 Planes Disponibles</h3>

                            <div className="space-y-3">
                                <div className="bg-white dark:bg-gray-700 p-4 rounded-lg border border-green-200 dark:border-green-800">
                                    <p className="font-semibold text-green-700 dark:text-green-400">Plan Mensual</p>
                                    <p className="text-2xl font-bold text-gray-800 dark:text-gray-200">500 CUP<span className="text-sm font-normal text-gray-500 dark:text-gray-400">/mes</span></p>
                                </div>

                                <div className="bg-white dark:bg-gray-700 p-4 rounded-lg border-2 border-green-500 dark:border-green-600 relative">
                                    <span className="absolute -top-3 left-4 bg-green-500 text-white text-xs px-2 py-1 rounded-full">Popular</span>
                                    <p className="font-semibold text-green-700 dark:text-green-400">Plan Anual</p>
                                    <p className="text-2xl font-bold text-gray-800 dark:text-gray-200">5,000 CUP<span className="text-sm font-normal text-gray-500 dark:text-gray-400">/año</span></p>
                                    <p className="text-xs text-green-600 dark:text-green-400 mt-1">¡Ahorra 1,000 CUP!</p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg mb-6">
                            <h4 className="font-semibold mb-2 text-yellow-800 dark:text-yellow-400">📱 Cómo pagar:</h4>
                            <ol className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
                                <li>1. Transfiere el monto por <strong>EnZona</strong> o <strong>Transfermóvil</strong></li>
                                <li>2. Envía el comprobante por WhatsApp al:</li>
                                <li className="pl-4 font-mono bg-white dark:bg-gray-700 p-2 rounded text-center font-bold text-blue-600 dark:text-blue-400">
                                    +53 55501545
                                </li>
                                <li>3. Recibirás tu código de activación en minutos</li>
                            </ol>
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