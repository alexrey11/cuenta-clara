import { useState, useEffect } from 'react';
import { db } from './db';
import type { Cliente, Usuario } from './db';


interface ClientesProps { usuarioActual: Usuario; }

export default function Clientes({ usuarioActual: _ }: ClientesProps) {
    const [clientes, setClientes] = useState<Cliente[]>([]);
    const [modalAbierto, setModalAbierto] = useState(false);
    const [editando, setEditando] = useState<Cliente | null>(null);
    const [nombre, setNombre] = useState('');
    const [telefono, setTelefono] = useState('');
    const [direccion, setDireccion] = useState('');
    const [notas, setNotas] = useState('');
    const [busqueda, setBusqueda] = useState('');

    useEffect(() => { cargarClientes(); }, []);

    const cargarClientes = async () => {
        const c = await db.clientes.toArray();
        setClientes(c.sort((a, b) => b.saldoPendiente - a.saldoPendiente));
    };

    const guardar = async () => {
        if (!nombre.trim()) { alert('Ingresa nombre'); return; }
        const datos = { nombre: nombre.trim(), telefono: telefono.trim() || undefined, direccion: direccion.trim() || undefined, notas: notas.trim() || undefined, saldoPendiente: editando ? editando.saldoPendiente : 0, creadoEn: editando ? editando.creadoEn : new Date() };
        if (editando) { await db.clientes.update(editando.id!, datos); }
        else { await db.clientes.add(datos); }
        limpiar(); cargarClientes();
    };

    const editar = (c: Cliente) => { setEditando(c); setNombre(c.nombre); setTelefono(c.telefono || ''); setDireccion(c.direccion || ''); setNotas(c.notas || ''); setModalAbierto(true); };

    const eliminar = async (id: number) => { if (confirm('¿Eliminar?')) { await db.clientes.delete(id); cargarClientes(); } };

    const limpiar = () => { setNombre(''); setTelefono(''); setDireccion(''); setNotas(''); setEditando(null); setModalAbierto(false); };

    const filtrados = clientes.filter(c => c.nombre.toLowerCase().includes(busqueda.toLowerCase()) || (c.telefono && c.telefono.includes(busqueda)));
    const totalFiado = clientes.reduce((s, c) => s + c.saldoPendiente, 0);

    return (
        <div className="p-3 md:p-6 bg-gray-50 dark:bg-gray-900 min-h-screen">
            <div className="max-w-4xl mx-auto">
                <div className="bg-white dark:bg-gray-800 rounded-xl md:rounded-2xl shadow-md p-4 md:p-6 mb-4 md:mb-6">
                    <div className="flex justify-between items-center">
                        <div>
                            <h1 className="text-xl md:text-3xl font-bold text-gray-800 dark:text-gray-200 mb-1">👥 Clientes</h1>
                            <p className="text-xs md:text-base text-gray-600 dark:text-gray-400">{clientes.length} clientes | Fiado: <strong className="text-red-600 dark:text-red-400">${totalFiado.toFixed(2)}</strong></p>
                        </div>
                        <button onClick={() => setModalAbierto(true)} className="bg-blue-600 hover:bg-blue-700 text-white px-3 md:px-6 py-2 md:py-3 rounded-lg md:rounded-xl font-semibold text-sm md:text-base shadow-md">+ Nuevo</button>
                    </div>
                </div>

                <div className="mb-4">
                    <input type="text" placeholder="🔍 Buscar cliente..." value={busqueda} onChange={(e) => setBusqueda(e.target.value)}
                        className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-xl px-4 py-3 text-base" />
                </div>

                <div className="space-y-2 md:space-y-3">
                    {filtrados.map(c => (
                        <div key={c.id} className="bg-white dark:bg-gray-800 p-3 md:p-4 rounded-xl md:rounded-2xl shadow-md border border-gray-100 dark:border-gray-700">
                            <div className="flex justify-between items-start">
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-bold text-gray-800 dark:text-gray-200 text-sm md:text-lg truncate">{c.nombre}</h3>
                                    {c.telefono && <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400">📱 {c.telefono}</p>}
                                    {c.direccion && <p className="text-xs text-gray-500 dark:text-gray-400 truncate">📍 {c.direccion}</p>}
                                </div>
                                <div className="text-right ml-2 flex-shrink-0">
                                    <p className={`text-lg md:text-2xl font-bold ${c.saldoPendiente > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                                        ${c.saldoPendiente.toFixed(2)}
                                    </p>
                                    <p className="text-[10px] md:text-xs text-gray-500 dark:text-gray-400">{c.saldoPendiente > 0 ? 'Debe' : 'Al día'}</p>
                                </div>
                            </div>
                            <div className="flex gap-2 mt-3">
                                <button onClick={() => editar(c)} className="flex-1 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 py-2 rounded-lg font-semibold text-xs md:text-sm">✏️ Editar</button>
                                <button onClick={() => eliminar(c.id!)} className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 px-3 py-2 rounded-lg text-xs md:text-sm">🗑️</button>
                            </div>
                        </div>
                    ))}
                </div>

                {modalAbierto && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end md:items-center justify-center p-0 md:p-4 z-50">
                        <div className="bg-white dark:bg-gray-800 rounded-t-2xl md:rounded-2xl shadow-2xl w-full md:max-w-md max-h-[90vh] overflow-y-auto">
                            <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-4 md:px-6 py-3 md:py-4 flex justify-between items-center sticky top-0 z-10">
                                <h2 className="text-lg md:text-xl font-bold text-white">{editando ? 'Editar' : 'Nuevo'} Cliente</h2>
                                <button onClick={limpiar} className="text-white text-2xl">&times;</button>
                            </div>
                            <div className="p-4 md:p-6 space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nombre *</label>
                                    <input type="text" value={nombre} onChange={(e) => setNombre(e.target.value)} className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg px-4 py-3 text-base" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Teléfono</label>
                                    <input type="tel" value={telefono} onChange={(e) => setTelefono(e.target.value)} className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg px-4 py-3 text-base" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Dirección</label>
                                    <input type="text" value={direccion} onChange={(e) => setDireccion(e.target.value)} className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg px-4 py-3 text-base" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notas</label>
                                    <textarea value={notas} onChange={(e) => setNotas(e.target.value)} className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg px-4 py-3 text-base" rows={2} />
                                </div>
                                <div className="flex gap-3 pt-2">
                                    <button onClick={limpiar} className="flex-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 py-3 rounded-lg font-semibold">Cancelar</button>
                                    <button onClick={guardar} className="flex-1 bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 font-semibold">{editando ? 'Guardar' : 'Crear'}</button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}