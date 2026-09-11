import { useState } from 'react';
import { db } from './db';

interface WelcomeScreenProps {
    onComenzarPrueba: () => void;
    onActivarLicencia: () => void;
}

export default function WelcomeScreen({ onComenzarPrueba, onActivarLicencia: _ }: WelcomeScreenProps) {
    const [modo, setModo] = useState<'principal' | 'crearUsuario' | 'activar'>('principal');
    const [nombreUsuario, setNombreUsuario] = useState('');
    const [pin, setPin] = useState('');
    const [codigoActivacion, setCodigoActivacion] = useState('');

    const crearUsuarioAdmin = async () => {
        if (!nombreUsuario || !pin) {
            alert('Completa todos los campos');
            return;
        }
        if (pin.length !== 4) {
            alert('El PIN debe tener 4 dígitos');
            return;
        }

        // Verificar que no exista otro usuario
        const count = await db.usuarios.count();
        if (count > 0) {
            alert('Ya existe un usuario. Inicia sesión normalmente.');
            onComenzarPrueba();
            return;
        }

        await db.usuarios.add({
            nombre: nombreUsuario,
            pin: pin,
            rol: 'admin',
            creadoEn: new Date()
        });

        // Guardar fecha de instalación
        localStorage.setItem('cuenta-clara-fecha-instalacion', new Date().toISOString());

        alert(`✅ ¡Usuario creado!\n\nUsuario: ${nombreUsuario}\nPIN: ${pin}\n\nTienes 15 días de prueba gratis.`);
        onComenzarPrueba();
    };

    const activarConCodigo = async () => {
        const codigoLimpio = codigoActivacion.trim().toUpperCase();

        if (!codigoLimpio) {
            alert('Ingresa tu código de activación');
            return;
        }

        // Validar formato del código
        if (!codigoLimpio.startsWith('CC-') || codigoLimpio.length !== 23) {
            alert('Código inválido. Debe tener el formato: CC-XXXX-XXXX-XXXX-XXXX');
            return;
        }

        // Guardar licencia activada
        localStorage.setItem('cuenta-clara-licencia', 'activa');
        localStorage.setItem('cuenta-clara-fecha-activacion', new Date().toISOString());

        alert('✅ ¡Licencia activada!\n\nAhora crea tu usuario administrador.');
        setModo('crearUsuario');
    };

    if (modo === 'crearUsuario') {
        return (
            <div className="min-h-screen bg-gradient-to-br from-blue-600 to-indigo-800 flex items-center justify-center p-6">
                <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full">
                    <div className="text-center mb-8">
                        <div className="text-6xl mb-4">👑</div>
                        <h1 className="text-3xl font-bold text-gray-800 mb-2">Crea tu Usuario Admin</h1>
                        <p className="text-gray-600">Será el administrador de tu negocio</p>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Tu nombre:
                            </label>
                            <input
                                type="text"
                                value={nombreUsuario}
                                onChange={(e) => setNombreUsuario(e.target.value)}
                                className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="Ej: Juan Pérez"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                PIN (4 dígitos):
                            </label>
                            <input
                                type="password"
                                maxLength={4}
                                value={pin}
                                onChange={(e) => setPin(e.target.value)}
                                className="w-full border border-gray-300 rounded-lg px-4 py-3 text-center text-2xl tracking-widest focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="••••"
                            />
                        </div>

                        <button
                            onClick={crearUsuarioAdmin}
                            className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-semibold text-lg"
                        >
                            ✓ Crear Usuario y Comenzar
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    if (modo === 'activar') {
        return (
            <div className="min-h-screen bg-gradient-to-br from-green-600 to-emerald-800 flex items-center justify-center p-6">
                <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full">
                    <div className="text-center mb-8">
                        <div className="text-6xl mb-4">🔑</div>
                        <h1 className="text-3xl font-bold text-gray-800 mb-2">Activar Licencia</h1>
                        <p className="text-gray-600">Ingresa tu código de activación</p>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Código de Activación:
                            </label>
                            <input
                                type="text"
                                value={codigoActivacion}
                                onChange={(e) => setCodigoActivacion(e.target.value.toUpperCase())}
                                className="w-full border border-gray-300 rounded-lg px-4 py-3 text-center text-lg font-mono tracking-wider focus:outline-none focus:ring-2 focus:ring-green-500"
                                placeholder="CC-XXXX-XXXX-XXXX-XXXX"
                                maxLength={23}
                            />
                        </div>

                        <button
                            onClick={activarConCodigo}
                            className="w-full bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors font-semibold text-lg"
                        >
                            🔓 Activar Licencia
                        </button>

                        <button
                            onClick={() => setModo('principal')}
                            className="w-full text-gray-600 hover:underline"
                        >
                            ← Volver
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-600 to-indigo-800 flex items-center justify-center p-6">
            <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-2xl w-full">
                <div className="text-center mb-8">
                    <div className="text-6xl mb-4">📊</div>
                    <h1 className="text-4xl font-bold text-gray-800 mb-2">CuentaClara</h1>
                    <p className="text-xl text-gray-600">Tu negocio bajo control, estés donde estés</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                    {/* Opción 1: Prueba Gratis */}
                    <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-xl border-2 border-blue-200 hover:border-blue-400 transition-all">
                        <div className="text-4xl mb-3">🎁</div>
                        <h3 className="text-xl font-bold text-blue-800 mb-2">Prueba Gratis</h3>
                        <p className="text-sm text-gray-700 mb-4">
                            15 días gratis para probar todas las funciones
                        </p>
                        <ul className="space-y-2 text-sm text-gray-600 mb-4">
                            <li>✓ Todas las funciones incluidas</li>
                            <li>✓ Sin límite de productos</li>
                            <li>✓ Sin límite de usuarios</li>
                            <li>✓ Soporte por WhatsApp</li>
                        </ul>
                        <button
                            onClick={() => setModo('crearUsuario')}
                            className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-semibold"
                        >
                            Comenzar Prueba Gratis
                        </button>
                    </div>

                    {/* Opción 2: Ya tengo código */}
                    <div className="bg-gradient-to-br from-green-50 to-green-100 p-6 rounded-xl border-2 border-green-200 hover:border-green-400 transition-all">
                        <div className="text-4xl mb-3">🔑</div>
                        <h3 className="text-xl font-bold text-green-800 mb-2">Ya tengo un código</h3>
                        <p className="text-sm text-gray-700 mb-4">
                            Activa tu licencia si ya compraste un plan
                        </p>
                        <ul className="space-y-2 text-sm text-gray-600 mb-4">
                            <li>✓ Plan Mensual: 500 CUP/mes</li>
                            <li>✓ Plan Anual: 5,000 CUP/año</li>
                            <li>✓ Ahorra 1,000 CUP con el plan anual</li>
                            <li>✓ Acceso inmediato</li>
                        </ul>
                        <button
                            onClick={() => setModo('activar')}
                            className="w-full bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors font-semibold"
                        >
                            Activar Licencia
                        </button>
                    </div>
                </div>

                {/* Info adicional */}
                <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                    <p className="text-sm text-yellow-800">
                        <strong>💡 ¿Cómo funciona?</strong><br />
                        1. Prueba la app gratis por 15 días<br />
                        2. Si te gusta, paga por Transfermóvil o EnZona<br />
                        3. Recibe tu código de activación por WhatsApp<br />
                        4. Ingresa el código y sigue usando la app
                    </p>
                </div>
            </div>
        </div>
    );
}