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

    useEffect(() => { cargarUsuarios(); crearAdminSiNoExiste(); }, []);

    const cargarUsuarios = async () => { setUsuarios(await db.usuarios.toArray()); };

    const crearAdminSiNoExiste = async () => {
        const count = await db.usuarios.count();
        if (count === 0) {
            await db.usuarios.add({ nombre: 'Admin', pin: '1234', rol: 'admin', creadoEn: new Date() });
            cargarUsuarios();
        }
    };

    const iniciarSesion = () => {
        if (!usuarioSeleccionado) { alert('Selecciona un usuario'); return; }
        if (usuarioSeleccionado.pin !== pin) { alert('PIN incorrecto'); return; }
        onLogin(usuarioSeleccionado);
    };

    const crearUsuario = async () => {
        if (!nuevoNombre || !nuevoPin) { alert('Completa todos los campos'); return; }
        if (nuevoPin.length !== 4) { alert('El PIN debe tener 4 dígitos'); return; }
        await db.usuarios.add({ nombre: nuevoNombre, pin: nuevoPin, rol: nuevoRol, creadoEn: new Date() });
        setNuevoNombre(''); setNuevoPin(''); setModoCrear(false); cargarUsuarios();
        alert('¡Usuario creado!');
    };

    const getRolIcon = (rol: string) => {
        switch (rol) { case 'admin': return '👑'; case 'jefe': return '🎩'; case 'vendedor': return '🛒'; default: return '👤'; }
    };

    const getRolNombre = (rol: string) => {
        switch (rol) { case 'admin': return 'Administrador'; case 'jefe': return 'Jefe'; case 'vendedor': return 'Vendedor'; default: return 'Usuario'; }
    };

    const getRolColor = (rol: string) => {
        switch (rol) { case 'admin': return 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400'; case 'jefe': return 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'; case 'vendedor': return 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'; default: return 'bg-gray-100 dark:bg-gray-700'; }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-600 to-blue-800 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4 md:p-6">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-5 md:p-8 max-w-md w-full max-h-[95vh] overflow-y-auto">
                <div className="text-center mb-6 md:mb-8">
                    <h1 className="text-3xl md:text-4xl font-bold text-gray-800 dark:text-gray-200 mb-1">📊 CuentaClara</h1>
                    <p className="text-sm md:text-base text-gray-600 dark:text-gray-400">Tu negocio bajo control</p>
                </div>

                {!modoCrear ? (
                    <>
                        <div className="mb-5 md:mb-6">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Selecciona tu usuario:</label>
                            <div className="space-y-2">
                                {usuarios.map((u) => (
                                    <button key={u.id} onClick={() => setUsuarioSeleccionado(u)}
                                        className={`w-full p-3 md:p-4 rounded-lg border-2 transition-all text-left ${usuarioSeleccionado?.id === u.id ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30' : 'border-gray-200 dark:border-gray-600 hover:border-blue-300 bg-white dark:bg-gray-700'
                                            }`}>
                                        <div className="flex justify-between items-center">
                                            <div className="flex items-center gap-3">
                                                <span className="text-xl md:text-2xl">{getRolIcon(u.rol)}</span>
                                                <span className="font-semibold text-gray-800 dark:text-gray-200 text-sm md:text-base">{u.nombre}</span>
                                            </div>
                                            <span className={`text-xs px-2 py-1 rounded ${getRolColor(u.rol)}`}>{getRolNombre(u.rol)}</span>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="mb-5 md:mb-6">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">PIN (4 dígitos):</label>
                            <input type="password" maxLength={4} value={pin} onChange={(e) => setPin(e.target.value)}
                                className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg px-4 py-3 md:py-4 text-center text-2xl md:text-3xl tracking-widest focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="••••" />
                        </div>

                        <button onClick={iniciarSesion} className="w-full bg-blue-600 text-white px-6 py-3 md:py-4 rounded-lg hover:bg-blue-700 transition-colors font-semibold text-base md:text-lg mb-3">Iniciar Sesión</button>
                        <button onClick={() => setModoCrear(true)} className="w-full text-blue-600 dark:text-blue-400 hover:underline text-sm mb-4">+ Crear nuevo usuario</button>


                    </>
                ) : (
                    <>
                        <h2 className="text-lg md:text-xl font-semibold mb-4 text-gray-800 dark:text-gray-200">Crear Nuevo Usuario</h2>
                        <div className="space-y-4 mb-5">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nombre:</label>
                                <input type="text" value={nuevoNombre} onChange={(e) => setNuevoNombre(e.target.value)}
                                    className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg px-4 py-3 text-base" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">PIN (4 dígitos):</label>
                                <input type="password" maxLength={4} value={nuevoPin} onChange={(e) => setNuevoPin(e.target.value)}
                                    className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg px-4 py-3 text-base" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Rol:</label>
                                <select value={nuevoRol} onChange={(e) => setNuevoRol(e.target.value as any)}
                                    className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg px-4 py-3 text-base">
                                    <option value="vendedor">🛒 Vendedor</option>
                                    <option value="jefe">🎩 Jefe</option>
                                    <option value="admin">👑 Administrador</option>
                                </select>
                            </div>
                        </div>
                        <button onClick={crearUsuario} className="w-full bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 font-semibold text-base mb-3">Crear Usuario</button>
                        <button onClick={() => setModoCrear(false)} className="w-full text-gray-600 dark:text-gray-400 hover:underline text-sm">← Volver al login</button>
                    </>
                )}
            </div>
        </div>
    );
}