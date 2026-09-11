import { useState, useEffect } from 'react';
import { db } from './db';
import type { Cliente, Usuario } from './db';



interface ClientesProps { usuarioActual: Usuario; }

export default function Clientes({ usuarioActual: _ }: ClientesProps) {
    const [clientes, setClientes] = useState<Cliente[]>([]);
    const [modalAbierto, setModalAbierto] = useState(false);
    const [editando, setEditando] = useState<Cliente | null>(null);
    const [busqueda, setBusqueda] = useState('');
    const [nombre, setNombre] = useState('');
    const [telefono, setTelefono] = useState('');
    const [direccion, setDireccion] = useState('');
    const [notas, setNotas] = useState('');

    useEffect(() => { cargarClientes(); }, []);

    const cargarClientes = async () => { setClientes(await db.clientes.toArray()); };

    const guardarCliente = async () => {
        if (!nombre.trim()) { alert('El nombre es obligatorio'); return; }
        const datos = { nombre: nombre.trim(), telefono: telefono.trim() || undefined, direccion: direccion.trim() || undefined, notas: notas.trim() || undefined, creadoEn: editando ? editando.creadoEn : new Date(), saldoPendiente: editando ? editando.saldoPendiente : 0 };
        if (editando) { await db.clientes.update(editando.id!, datos); } else { await db.clientes.add(datos); }
        limpiarFormulario(); cargarClientes();
    };

    const editarCliente = (cliente: Cliente) => { setEditando(cliente); setNombre(cliente.nombre); setTelefono(cliente.telefono || ''); setDireccion(cliente.direccion || ''); setNotas(cliente.notas || ''); setModalAbierto(true); };

    const eliminarCliente = async (id: number) => {
        const cliente = await db.clientes.get(id);
        if (cliente && cliente.saldoPendiente > 0) { alert(`No se puede eliminar. Este cliente tiene $${cliente.saldoPendiente.toFixed(2)} pendientes.`); return; }
        if (confirm('¿Eliminar este cliente?')) { await db.clientes.delete(id); cargarClientes(); }
    };

    const limpiarFormulario = () => { setEditando(null); setNombre(''); setTelefono(''); setDireccion(''); setNotas(''); setModalAbierto(false); };

    const clientesFiltrados = clientes.filter(c => c.nombre.toLowerCase().includes(busqueda.toLowerCase()) || (c.telefono && c.telefono.includes(busqueda)));
    const totalFiado = clientes.reduce((sum, c) => sum + c.saldoPendiente, 0);
    const clientesConDeuda = clientes.filter(c => c.saldoPendiente > 0);

    return (
        <div className="p-6 bg-gray-50 dark:bg-gray-900 min-h-screen">
            <div className="max-w-6xl mx-auto">
                <div className="flex justify-between items-center mb-6">
                    <div><h1 className="text-3xl font-bold text-gray-800 dark:text-gray-200 mb-1">👥 Clientes</h1><p className="text-gray-600 dark:text-gray-400">{clientes.length} clientes registrados</p></div>
                    <button onClick={() => setModalAbierto(true)} className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-3 rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all font-semibold shadow-lg">+ Nuevo Cliente</button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                    <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white p-6 rounded-2xl shadow-md"><p className="text-sm opacity-90 mb-2">Total Clientes</p><p className="text-4xl font-bold">{clientes.length}</p></div>
                    <div className="bg-gradient-to-br from-red-500 to-red-600 text-white p-6 rounded-2xl shadow-md"><p className="text-sm opacity-90 mb-2">Total Fiado</p><p className="text-4xl font-bold">${totalFiado.toFixed(2)}</p><p className="text-sm opacity-90 mt-1">{clientesConDeuda.length} con deuda</p></div>
                    <div className="bg-gradient-to-br from-green-500 to-green-600 text-white p-6 rounded-2xl shadow-md"><p className="text-sm opacity-90 mb-2">Al Día</p><p className="text-4xl font-bold">{clientes.length - clientesConDeuda.length}</p></div>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-md p-4 mb-6">
                    <input type="text" placeholder="🔍 Buscar por nombre o teléfono..." value={busqueda} onChange={(e) => setBusqueda(e.target.value)} className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-md p-6">
                    {clientesFiltrados.length === 0 ? <p className="text-gray-500 dark:text-gray-400 text-center py-8">No hay clientes</p> : (
                        <div className="space-y-3">
                            {clientesFiltrados.map((cliente) => (
                                <div key={cliente.id} className="flex items-center justify-between bg-gray-50 dark:bg-gray-700 p-4 rounded-xl border border-gray-100 dark:border-gray-600 hover:shadow-md transition-shadow">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center text-xl font-bold text-blue-600 dark:text-blue-400">{cliente.nombre.charAt(0).toUpperCase()}</div>
                                        <div><h3 className="font-semibold text-gray-800 dark:text-gray-200">{cliente.nombre}</h3><p className="text-sm text-gray-500 dark:text-gray-400">{cliente.telefono || 'Sin teléfono'}{cliente.direccion && ` | ${cliente.direccion}`}</p></div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        {cliente.saldoPendiente > 0 ? <div className="text-right"><p className="text-xs text-gray-500 dark:text-gray-400">Debe:</p><p className="text-lg font-bold text-red-600 dark:text-red-400">${cliente.saldoPendiente.toFixed(2)}</p></div> : <span className="text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-3 py-1 rounded-full font-semibold">Al día ✓</span>}
                                        <button onClick={() => editarCliente(cliente)} className="bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-3 py-2 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors text-sm font-semibold">Editar</button>
                                        <button onClick={() => eliminarCliente(cliente.id!)} className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 px-3 py-2 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/50 transition-colors text-sm font-semibold">🗑️</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {modalAbierto && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
                        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
                            <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4 flex justify-between items-center">
                                <h2 className="text-xl font-bold text-white">{editando ? 'Editar Cliente' : 'Nuevo Cliente'}</h2>
                                <button onClick={limpiarFormulario} className="text-white text-2xl">&times;</button>
                            </div>
                            <div className="p-6 space-y-4">
                                <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nombre *</label><input type="text" value={nombre} onChange={(e) => setNombre(e.target.value)} className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
                                <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Teléfono</label><input type="text" value={telefono} onChange={(e) => setTelefono(e.target.value)} className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="+53 5XXXXXXX" /></div>
                                <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Dirección</label><input type="text" value={direccion} onChange={(e) => setDireccion(e.target.value)} className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
                                <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notas</label><textarea value={notas} onChange={(e) => setNotas(e.target.value)} className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500" rows={2} /></div>
                                <div className="flex gap-3 pt-2">
                                    <button onClick={limpiarFormulario} className="flex-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 py-3 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 font-semibold">Cancelar</button>
                                    <button onClick={guardarCliente} className="flex-1 bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 font-semibold shadow-md">{editando ? 'Guardar' : 'Crear'}</button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}