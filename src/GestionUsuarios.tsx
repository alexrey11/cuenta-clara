import { useState, useEffect } from 'react';
import { db } from './db';
import type { Usuario } from './db';
interface GestionUsuariosProps {
    onVolver: () => void;
    usuarioActual: Usuario;
}

export default function GestionUsuarios({ onVolver, usuarioActual }: GestionUsuariosProps) {
    const [usuarios, setUsuarios] = useState<Usuario[]>([]);
    const [modoCrear, setModoCrear] = useState(false);
    const [editando, setEditando] = useState<Usuario | null>(null);
    const [nombre, setNombre] = useState('');
    const [pin, setPin] = useState('');
    const [rol, setRol] = useState<'admin' | 'jefe' | 'vendedor'>('vendedor');
    const [comision, setComision] = useState('');

    useEffect(() => { cargarUsuarios(); }, []);

    const cargarUsuarios = async () => {
        const todos = await db.usuarios.toArray();
        setUsuarios(todos);
    };

    const guardar = async () => {
        if (!nombre || !pin) {
            alert('Completa todos los campos');
            return;
        }
        if (pin.length !== 4) {
            alert('PIN debe tener 4 dígitos');
            return;
        }

        const datos = {
            nombre,
            pin,
            rol,
            comisionPorcentaje: comision ? parseFloat(comision) : undefined,
            creadoEn: editando ? editando.creadoEn : new Date()
        };

        if (editando) {
            await db.usuarios.update(editando.id!, datos);
        } else {
            await db.usuarios.add(datos);
        }

        limpiar();
        cargarUsuarios();
        alert(editando ? '✅ Usuario actualizado' : '✅ Usuario creado');
    };

    const editar = (u: Usuario) => {
        setEditando(u);
        setNombre(u.nombre);
        setPin(u.pin);
        setRol(u.rol);
        setComision(u.comisionPorcentaje?.toString() || '');
        setModoCrear(true);
    };

    const eliminar = async (id: number) => {
        if (id === usuarioActual.id) {
            alert('No puedes eliminarte a ti mismo');
            return;
        }
        if (confirm('¿Eliminar este usuario?')) {
            await db.usuarios.delete(id);
            cargarUsuarios();
        }
    };

    const limpiar = () => {
        setNombre('');
        setPin('');
        setRol('vendedor');
        setComision('');
        setModoCrear(false);
        setEditando(null);
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



    return (
        <div className="p-6 bg-gray-50 dark:bg-gray-900 min-h-screen">
            <div className="max-w-4xl mx-auto">
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-md p-6 mb-6">
                    <div className="flex justify-between items-center">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-200 mb-2">👥 Gestión de Usuarios</h1>
                            <p className="text-gray-600 dark:text-gray-400">Administra los accesos al sistema</p>
                        </div>
                        <button
                            onClick={onVolver}
                            className="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-6 py-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 font-semibold"
                        >
                            ← Volver
                        </button>
                    </div>
                </div>

                {!modoCrear && (
                    <button
                        onClick={() => setModoCrear(true)}
                        className="w-full bg-blue-600 text-white px-6 py-4 rounded-xl hover:bg-blue-700 font-semibold text-lg mb-6 shadow-md"
                    >
                        + Crear Nuevo Usuario
                    </button>
                )}

                {modoCrear && (
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-md p-6 mb-6">
                        <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-gray-200">
                            {editando ? 'Editar' : 'Nuevo'} Usuario
                        </h2>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nombre:</label>
                                <input
                                    type="text"
                                    value={nombre}
                                    onChange={(e) => setNombre(e.target.value)}
                                    placeholder="Nombre del usuario"
                                    className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">PIN (4 dígitos):</label>
                                <input
                                    type="password"
                                    maxLength={4}
                                    value={pin}
                                    onChange={(e) => setPin(e.target.value)}
                                    placeholder="••••"
                                    className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Rol:</label>
                                <select
                                    value={rol}
                                    onChange={(e) => setRol(e.target.value as 'admin' | 'jefe' | 'vendedor')}
                                    className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg px-4 py-2"
                                >
                                    <option value="vendedor">🛒 Vendedor</option>
                                    <option value="jefe">🎩 Jefe</option>
                                    <option value="admin">👑 Administrador</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">% Comisión (solo vendedores):</label>
                                <input
                                    type="number"
                                    min="0"
                                    max="100"
                                    step="0.1"
                                    value={comision}
                                    onChange={(e) => setComision(e.target.value)}
                                    placeholder="Ej: 10"
                                    className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                            <div className="flex gap-3">
                                <button
                                    onClick={guardar}
                                    className="flex-1 bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 font-semibold"
                                >
                                    {editando ? '✓ Actualizar' : '✓ Crear'}
                                </button>
                                <button
                                    onClick={limpiar}
                                    className="flex-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 py-3 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 font-semibold"
                                >
                                    ✕ Cancelar
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-md p-6">
                    <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-gray-200">
                        Usuarios ({usuarios.length})
                    </h2>
                    <div className="space-y-3">
                        {usuarios.map((u) => (
                            <div
                                key={u.id}
                                className="flex items-center justify-between bg-gray-50 dark:bg-gray-700 p-4 rounded-xl border border-gray-200 dark:border-gray-600"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center text-2xl">
                                        {getRolIcon(u.rol)}
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-gray-800 dark:text-gray-200">
                                            {u.nombre}
                                            {u.id === usuarioActual.id && (
                                                <span className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 px-2 py-1 rounded ml-2">
                                                    (Tú)
                                                </span>
                                            )}
                                        </h3>
                                        <p className="text-sm text-gray-600 dark:text-gray-400">
                                            {getRolNombre(u.rol)} | PIN: {u.pin}
                                            {u.comisionPorcentaje && ` | Comisión: ${u.comisionPorcentaje}%`}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => editar(u)}
                                        className="bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-4 py-2 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/50 text-sm font-semibold"
                                    >
                                        ✏️ Editar
                                    </button>
                                    {u.id !== usuarioActual.id && (
                                        <button
                                            onClick={() => eliminar(u.id!)}
                                            className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 px-4 py-2 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/50 text-sm font-semibold"
                                        >
                                            🗑️
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}