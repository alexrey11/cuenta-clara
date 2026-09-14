import { useState, useEffect } from 'react';
import { db } from './db';
import type { Usuario, RolUsuario } from './db';

interface GestionUsuariosProps {
    onVolver: () => void;
    usuarioActual: Usuario;
}

// Helper para mostrar info del rol de forma consistente en toda la UI
const infoRol = (rol: RolUsuario) => {
    switch (rol) {
        case 'admin':
            return { emoji: '👑', etiqueta: 'Administrador', color: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400' };
        case 'jefe':
            return { emoji: '🎩', etiqueta: 'Jefe', color: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400' };
        case 'vendedor':
            return { emoji: '🛒', etiqueta: 'Vendedor', color: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' };
    }
};

export default function GestionUsuarios({ onVolver, usuarioActual }: GestionUsuariosProps) {
    const [usuarios, setUsuarios] = useState<Usuario[]>([]);
    const [modoCrear, setModoCrear] = useState(false);
    const [editando, setEditando] = useState<Usuario | null>(null);
    const [nombre, setNombre] = useState('');
    const [pin, setPin] = useState('');
    const [rol, setRol] = useState<RolUsuario>('vendedor');   // ✅ tipo completo
    const [comision, setComision] = useState('');

    useEffect(() => {
        cargarUsuarios();
    }, []);

    const cargarUsuarios = async () => {
        setUsuarios(await db.usuarios.toArray());
    };

    const guardar = async () => {
        if (!nombre || !pin) {
            alert('Completa todos los campos');
            return;
        }
        if (pin.length !== 4) {
            alert('PIN de 4 dígitos');
            return;
        }

        const datos = {
            nombre,
            pin,
            rol,
            comisionPorcentaje: comision ? parseFloat(comision) : undefined,
            creadoEn: editando ? editando.creadoEn : new Date(),
        };

        if (editando) {
            await db.usuarios.update(editando.id!, datos);
        } else {
            await db.usuarios.add(datos);
        }

        limpiar();
        cargarUsuarios();
    };

    const editar = (u: Usuario) => {
        setEditando(u);
        setNombre(u.nombre);
        setPin(u.pin);
        setRol(u.rol);   // ✅ ahora sí: ambos aceptan 'admin' | 'Jefe' | 'vendedor'
        setComision(u.comisionPorcentaje?.toString() || '');
        setModoCrear(true);
    };

    const eliminar = async (id: number) => {
        if (id === usuarioActual.id) {
            alert('No puedes eliminarte');
            return;
        }
        if (confirm('¿Eliminar?')) {
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

    return (
        <div className="p-6 bg-gray-50 dark:bg-gray-900 min-h-screen">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-md p-6 mb-6">
                    <div className="flex justify-between items-center">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-200 mb-2">
                                👥 Gestión de Usuarios
                            </h1>
                            <p className="text-gray-600 dark:text-gray-400">
                                Administra los accesos al sistema
                            </p>
                        </div>
                        <button
                            onClick={onVolver}
                            className="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-6 py-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 font-semibold"
                        >
                            ← Volver
                        </button>
                    </div>
                </div>

                {/* Botón crear */}
                {!modoCrear && (
                    <button
                        onClick={() => setModoCrear(true)}
                        className="w-full bg-blue-600 text-white px-6 py-4 rounded-xl hover:bg-blue-700 font-semibold text-lg mb-6 shadow-md"
                    >
                        + Crear Nuevo Usuario
                    </button>
                )}

                {/* Formulario */}
                {modoCrear && (
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-md p-6 mb-6">
                        <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-gray-200">
                            {editando ? 'Editar' : 'Nuevo'} Usuario
                        </h2>
                        <div className="space-y-4">
                            <input
                                type="text"
                                value={nombre}
                                onChange={(e) => setNombre(e.target.value)}
                                placeholder="Nombre"
                                className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            <input
                                type="password"
                                maxLength={4}
                                value={pin}
                                onChange={(e) => setPin(e.target.value)}
                                placeholder="PIN (4 dígitos)"
                                className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />

                            {/* ✅ Select con 3 valores distintos */}
                            <select
                                value={rol}
                                onChange={(e) => setRol(e.target.value as RolUsuario)}
                                className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg px-4 py-2"
                            >
                                <option value="vendedor">🛒 Vendedor</option>
                                <option value="Jefe">🎩 Jefe</option>
                                <option value="admin">👑 Administrador</option>
                            </select>

                            <input
                                type="number"
                                value={comision}
                                onChange={(e) => setComision(e.target.value)}
                                placeholder="% Comisión (opcional)"
                                className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />

                            <div className="flex gap-3">
                                <button
                                    onClick={guardar}
                                    className="flex-1 bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 font-semibold"
                                >
                                    {editando ? 'Actualizar' : 'Crear'}
                                </button>
                                <button
                                    onClick={limpiar}
                                    className="flex-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 py-3 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 font-semibold"
                                >
                                    Cancelar
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Lista */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-md p-6">
                    <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-gray-200">
                        Usuarios ({usuarios.length})
                    </h2>
                    <div className="space-y-3">
                        {usuarios.map((u) => {
                            const r = infoRol(u.rol);
                            return (
                                <div
                                    key={u.id}
                                    className="flex items-center justify-between bg-gray-50 dark:bg-gray-700 p-4 rounded-xl border border-gray-200 dark:border-gray-600"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center text-2xl">
                                            {r.emoji}
                                        </div>
                                        <div>
                                            <h3 className="font-semibold text-gray-800 dark:text-gray-200">
                                                {u.nombre}{' '}
                                                {u.id === usuarioActual.id && (
                                                    <span className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 px-2 py-1 rounded">
                                                        (Tú)
                                                    </span>
                                                )}
                                            </h3>
                                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                                <span className={`text-xs px-2 py-0.5 rounded ${r.color}`}>
                                                    {r.etiqueta}
                                                </span>{' '}
                                                | PIN: {u.pin}
                                                {u.comisionPorcentaje ? ` | Comisión: ${u.comisionPorcentaje}%` : ''}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => editar(u)}
                                            className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 text-sm"
                                        >
                                            Editar
                                        </button>
                                        {u.id !== usuarioActual.id && (
                                            <button
                                                onClick={() => eliminar(u.id!)}
                                                className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 text-sm"
                                            >
                                                🗑️
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
}