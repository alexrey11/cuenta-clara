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
        const c = codigo.trim().toUpperCase();
        if (!c) { setError('Ingresa un código'); return; }

        if (c === 'CUBA-2024-ADMIN-PRO') {
            localStorage.setItem('cuenta-clara-licencia', 'activa');
            localStorage.setItem('cuenta-clara-dev', 'true');
            localStorage.setItem('cuenta-clara-fecha-instalacion', new Date().toISOString());
            localStorage.setItem('cuenta-clara-fecha-activacion', new Date().toISOString());
            localStorage.setItem('cuenta-clara-licencia-permanente', 'true');
            onActivar();
            return;
        }

        if (!c.startsWith('CC-') || c.length !== 23) {
            setError('Formato: CC-XXXX-XXXX-XXXX-XXXX');
            return;
        }

        const licencia = LICENCIAS_SECRETAS.find(l => l.codigo === c);
        if (!licencia) { setError('Código inválido'); return; }
        if (licencia.estado === 'activada') { setError('Código ya usado'); return; }

        const fa = new Date();
        const fv = new Date(fa);
        fv.setDate(fv.getDate() + 60);

        localStorage.setItem('cuenta-clara-licencia', 'activa');
        localStorage.setItem('cuenta-clara-fecha-activacion', fa.toISOString());
        localStorage.setItem('cuenta-clara-fecha-vencimiento', fv.toISOString());
        localStorage.setItem('cuenta-clara-codigo-licencia', c);

        licencia.estado = 'activada';
        licencia.fechaActivacion = fa;
        licencia.fechaVencimiento = fv;

        onActivar();
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-600 to-indigo-800 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4 md:p-6">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-5 md:p-8 max-w-md w-full max-h-[95vh] overflow-y-auto">
                <div className="text-center mb-6">
                    <h1 className="text-3xl md:text-4xl font-bold text-gray-800 dark:text-gray-200 mb-1">📊 CuentaClara</h1>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Tu negocio bajo control</p>
                </div>

                {!mostrarInfo ? (
                    <>
                        <div className="bg-blue-50 dark:bg-blue-900/20 p-3 md:p-4 rounded-lg mb-5">
                            <p className="text-sm text-blue-800 dark:text-blue-400">
                                <strong>🎉 ¡Prueba terminada!</strong><br />
                                Activa tu licencia para seguir usando la app por 60 días.
                            </p>
                        </div>

                        <div className="mb-5">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Código:</label>
                            <input type="text" value={codigo} onChange={(e) => { setCodigo(e.target.value.toUpperCase()); setError(''); }}
                                className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg px-4 py-3 md:py-4 text-center text-base md:text-lg font-mono tracking-wider focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="CC-XXXX-XXXX-XXXX-XXXX" />
                            {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
                        </div>

                        <button onClick={activarLicencia} className="w-full bg-blue-600 text-white px-6 py-3 md:py-4 rounded-lg hover:bg-blue-700 font-semibold text-base md:text-lg mb-3">🔓 Activar (60 días)</button>
                        <button onClick={() => setMostrarInfo(true)} className="w-full text-blue-600 dark:text-blue-400 hover:underline text-sm">¿Cómo obtengo un código?</button>
                    </>
                ) : (
                    <>
                        <div className="bg-green-50 dark:bg-green-900/20 p-4 md:p-6 rounded-lg mb-5">
                            <h3 className="font-bold text-base md:text-lg mb-3 text-green-800 dark:text-green-400">💳 Licencia 60 días</h3>
                            <div className="bg-white dark:bg-gray-700 p-4 rounded-lg border-2 border-green-500">
                                <p className="font-semibold text-green-700 dark:text-green-400">Acceso Total</p>
                                <p className="text-2xl font-bold text-gray-800 dark:text-gray-200 mt-1">60 días</p>
                            </div>
                        </div>

                        <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg mb-5">
                            <h4 className="font-semibold mb-2 text-yellow-800 dark:text-yellow-400 text-sm">📱 Cómo obtener:</h4>
                            <ol className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
                                <li>1. Escribe por WhatsApp:</li>
                                <li className="font-mono bg-white dark:bg-gray-700 p-2 rounded text-center font-bold text-blue-600 dark:text-blue-400">+53 55501545</li>
                                <li>2. Negocia precio y paga</li>
                                <li>3. Recibe tu código único</li>
                            </ol>
                        </div>

                        <button onClick={() => setMostrarInfo(false)} className="w-full text-blue-600 dark:text-blue-400 hover:underline text-sm">← Ya tengo mi código</button>
                    </>
                )}
            </div>
        </div>
    );
}