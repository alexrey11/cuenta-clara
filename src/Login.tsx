import { useState, useEffect } from 'react';
import { db } from './db';
import type { Usuario } from './db';

interface LoginProps {
    onLogin: (usuario: Usuario) => void;
}

export default function Login({ onLogin }: LoginProps) {
    const [usuarios, setUsuarios] = useState<Usuario[]>([]);
    const [pin, setPin] = useState('');
    const [usuarioSeleccionado, setUsuarioSeleccionado] = useState<Usuario | null>(null);
    const [modoCrear, setModoCrear] = useState(false);
    const [nuevoNombre, setNuevoNombre] = useState('');
    const [nuevoPin, setNuevoPin] = useState('');
    const [nuevoRol, setNuevoRol] = useState<'admin' | 'jefe' | 'vendedor'>('vendedor');

    useEffect(() => {
        cargarUsuarios();
        crearAdminSiNoExiste();
    }, []);

    const cargarUsuarios = async () => {
        const todos = await db.usuarios.toArray();
        setUsuarios(todos);
    };

    const crearAdminSiNoExiste = async () => {
        const count = await db.usuarios.count();
        if (count === 0) {
            await db.usuarios.add({
                nombre: 'Admin',
                pin: '1234',
                rol: 'admin',
                creadoEn: new Date()
            });
            cargarUsuarios();
        }
    };

    const iniciarSesion = () => {
        if (!usuarioSeleccionado) {
            alert('Selecciona un usuario');
            return;
        }
        if (usuarioSeleccionado.pin !== pin) {
            alert('PIN incorrecto');
            return;
        }
        onLogin(usuarioSeleccionado);
    };

    const crearUsuario = async () => {
        if (!nuevoNombre || !nuevoPin) {
            alert('Completa todos los campos');
            return;
        }
        if (nuevoPin.length !== 4) {
            alert('El PIN debe tener 4 dígitos');
            return;
        }

        await db.usuarios.add({
            nombre: nuevoNombre,
            pin: nuevoPin,
            rol: nuevoRol,
            creadoEn: new Date()
        });

        setNuevoNombre('');
        setNuevoPin('');
        setModoCrear(false);
        cargarUsuarios();
        alert('¡Usuario creado!');
    };

    const getRolIcon = (rol: string) => {
        switch (rol) {
            case 'admin': return '👑';
            case 'jefe': return '🎩';
            case 'vendedor': return '🛒';
            default: return '👤';
        }
    };

    const getRolNombre = (rol: string) => {
        switch (rol) {
            case 'admin': return 'Administrador';
            case 'jefe': return 'Jefe';
            case 'vendedor': return 'Vendedor';
            default: return 'Usuario';
        }
    };

    const getRolColor = (rol: string) => {
        switch (rol) {
            case 'admin': return 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400';
            case 'jefe': return 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400';
            case 'vendedor': return 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400';
            default: return 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300';
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-600 to-blue-800 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-6">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 max-w-md w-full">
                <div className="text-center mb-8">
                    <h1 className="text-4xl font-bold text-gray-800 dark:text-gray-200 mb-2">📊 CuentaClara</h1>
                    <p className="text-gray-600 dark:text-gray-400">Tu negocio bajo control</p>
                </div>

                {!modoCrear ? (
                    <>
                        <div className="mb-6">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Selecciona tu usuario:
                            </label>
                            <div className="space-y-2">
                                {usuarios.map((usuario) => (
                                    <button
                                        key={usuario.id}
                                        onClick={() => setUsuarioSeleccionado(usuario)}
                                        className={`w-full p-4 rounded-lg border-2 transition-all text-left ${usuarioSeleccionado?.id === usuario.id
                                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30'
                                            : 'border-gray-200 dark:border-gray-600 hover:border-blue-300 dark:hover:border-blue-500 bg-white dark:bg-gray-700'
                                            }`}
                                    >
                                        <div className="flex justify-between items-center">
                                            <div className="flex items-center gap-3">
                                                <span className="text-2xl">{getRolIcon(usuario.rol)}</span>
                                                <span className="font-semibold text-gray-800 dark:text-gray-200">{usuario.nombre}</span>
                                            </div>
                                            <span className={`text-xs px-2 py-1 rounded ${getRolColor(usuario.rol)}`}>
                                                {getRolNombre(usuario.rol)}
                                            </span>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="mb-6">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                PIN (4 dígitos):
                            </label>
                            <input
                                type="password"
                                maxLength={4}
                                value={pin}
                                onChange={(e) => setPin(e.target.value)}
                                className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg px-4 py-3 text-center text-2xl tracking-widest focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="••••"
                            />
                        </div>

                        <button
                            onClick={iniciarSesion}
                            className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-semibold text-lg mb-4"
                        >
                            Iniciar Sesión
                        </button>

                        <button
                            onClick={() => setModoCrear(true)}
                            className="w-full text-blue-600 dark:text-blue-400 hover:underline text-sm"
                        >
                            + Crear nuevo usuario
                        </button>


                    </>
                ) : (
                    <>
                        <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-gray-200">Crear Nuevo Usuario</h2>
                        <div className="space-y-4 mb-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Nombre:</label>
                                <input
                                    type="text"
                                    value={nuevoNombre}
                                    onChange={(e) => setNuevoNombre(e.target.value)}
                                    className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">PIN (4 dígitos):</label>
                                <input
                                    type="password"
                                    maxLength={4}
                                    value={nuevoPin}
                                    onChange={(e) => setNuevoPin(e.target.value)}
                                    className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Rol:</label>
                                <select
                                    value={nuevoRol}
                                    onChange={(e) => setNuevoRol(e.target.value as 'admin' | 'jefe' | 'vendedor')}
                                    className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="vendedor">🛒 Vendedor</option>
                                    <option value="jefe">🎩 Jefe</option>
                                    <option value="admin">👑 Administrador</option>
                                </select>
                            </div>
                        </div>
                        <button
                            onClick={crearUsuario}
                            className="w-full bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors font-semibold mb-4"
                        >
                            Crear Usuario
                        </button>
                        <button
                            onClick={() => setModoCrear(false)}
                            className="w-full text-gray-600 dark:text-gray-400 hover:underline"
                        >
                            ← Volver al login
                        </button>
                    </>
                )}
            </div>
        </div>
    );
}