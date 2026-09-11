import { useState } from 'react';

interface SistemaLicenciaProps {
    onActivar: () => void;
}

export default function SistemaLicencia({ onActivar }: SistemaLicenciaProps) {
    const [codigo, setCodigo] = useState('');
    const [mostrarInfo, setMostrarInfo] = useState(false);

    const activarLicencia = () => {
        // Aquí validarías el código contra tu backend
        // Por ahora, aceptamos cualquier código de 16 caracteres
        if (codigo.length === 16) {
            localStorage.setItem('cuenta-clara-licencia', 'activa');
            onActivar();
        } else {
            alert('Código inválido. Debe tener 16 caracteres.');
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center p-6">
            <div className="bg-white rounded-lg shadow-2xl p-8 max-w-md w-full">
                <div className="text-center mb-8">
                    <h1 className="text-4xl font-bold text-gray-800 mb-2">📊 CuentaClara</h1>
                    <p className="text-gray-600">Activa tu licencia premium</p>
                </div>

                {!mostrarInfo ? (
                    <>
                        <div className="mb-6">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Código de Activación:
                            </label>
                            <input
                                type="text"
                                value={codigo}
                                onChange={(e) => setCodigo(e.target.value.toUpperCase())}
                                className="w-full border border-gray-300 rounded-lg px-4 py-3 text-center text-lg tracking-widest focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="XXXX-XXXX-XXXX-XXXX"
                                maxLength={19}
                            />
                        </div>

                        <button
                            onClick={activarLicencia}
                            className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-semibold text-lg mb-4"
                        >
                            Activar Licencia
                        </button>

                        <button
                            onClick={() => setMostrarInfo(true)}
                            className="w-full text-blue-600 hover:underline text-sm"
                        >
                            ¿Cómo obtengo un código?
                        </button>
                    </>
                ) : (
                    <>
                        <div className="bg-blue-50 p-6 rounded-lg mb-6">
                            <h3 className="font-bold text-lg mb-3">💳 Plan Premium</h3>
                            <ul className="space-y-2 text-sm text-gray-700">
                                <li>✅ Productos ilimitados</li>
                                <li>✅ Usuarios ilimitados</li>
                                <li>✅ Historial completo</li>
                                <li>✅ Reportes avanzados</li>
                                <li>✅ Soporte prioritario</li>
                            </ul>
                            <div className="mt-4 p-4 bg-white rounded-lg">
                                <p className="text-3xl font-bold text-blue-600">5,000 CUP</p>
                                <p className="text-sm text-gray-600">por año</p>
                            </div>
                        </div>

                        <div className="bg-yellow-50 p-4 rounded-lg mb-6">
                            <h4 className="font-semibold mb-2">📱 Cómo pagar:</h4>
                            <ol className="space-y-2 text-sm text-gray-700">
                                <li>1. Transfiere 5,000 CUP a:</li>
                                <li className="pl-4 font-mono bg-white p-2 rounded">
                                    Transfermóvil: 9224-1299-7081-8579
                                </li>
                                <li>2. Envía el comprobante por WhatsApp al:</li>
                                <li className="pl-4 font-mono bg-white p-2 rounded">
                                    +53 55501545
                                </li>
                                <li>3. Recibirás tu código de 16 caracteres en minutos</li>
                            </ol>
                        </div>

                        <button
                            onClick={() => setMostrarInfo(false)}
                            className="w-full text-blue-600 hover:underline"
                        >
                            ← Volver a activación
                        </button>
                    </>
                )}
            </div>
        </div>
    );
}