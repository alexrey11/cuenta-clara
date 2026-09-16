// ============ src/Clientes.tsx ============
import { useState, useEffect } from 'react';
import { db } from './db';
import type { Cliente, Usuario } from './db';
import {
    STYLES, BackgroundBlobs, pageWrap, card, cardPadded, titleGradient,
    btnPrimary, input, label,
    modalOverlay, modalPanel, modalHeader, modalTitle, modalClose, EmptyState,
} from './theme';

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
        const datos = {
            nombre: nombre.trim(),
            telefono: telefono.trim() || undefined,
            direccion: direccion.trim() || undefined,
            notas: notas.trim() || undefined,
            saldoPendiente: editando ? editando.saldoPendiente : 0,
            creadoEn: editando ? editando.creadoEn : new Date(),
        };
        if (editando) await db.clientes.update(editando.id!, datos);
        else await db.clientes.add(datos);
        limpiar(); cargarClientes();
    };

    const editar = (c: Cliente) => {
        setEditando(c); setNombre(c.nombre); setTelefono(c.telefono || '');
        setDireccion(c.direccion || ''); setNotas(c.notas || ''); setModalAbierto(true);
    };

    const eliminar = async (id: number) => {
        if (confirm('¿Eliminar?')) { await db.clientes.delete(id); cargarClientes(); }
    };

    const limpiar = () => {
        setNombre(''); setTelefono(''); setDireccion(''); setNotas('');
        setEditando(null); setModalAbierto(false);
    };

    const filtrados = clientes.filter(c =>
        c.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
        (c.telefono && c.telefono.includes(busqueda))
    );
    const totalFiado = clientes.reduce((s, c) => s + c.saldoPendiente, 0);

    return (
        <div className={pageWrap}>
            <style>{STYLES}</style>
            <BackgroundBlobs />

            <div className="relative mx-auto max-w-4xl">
                <div className={`cc-fade-up mb-4 md:mb-6 ${cardPadded}`}>
                    <div className="flex items-center justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-3">
                            <div className="hidden h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 text-2xl shadow-md ring-2 ring-white/10 md:flex">👥</div>
                            <div className="min-w-0">
                                <h1 className={`${titleGradient} truncate text-xl md:text-3xl`}>Clientes</h1>
                                <p className="truncate text-xs text-gray-400 md:text-sm">
                                    {clientes.length} clientes · Fiado:{' '}
                                    <strong className="text-rose-300">${totalFiado.toFixed(2)}</strong>
                                </p>
                            </div>
                        </div>
                        <button onClick={() => setModalAbierto(true)} className={btnPrimary}>+ Nuevo</button>
                    </div>
                </div>

                <div className="mb-4">
                    <input type="text" placeholder="🔍 Buscar cliente..." value={busqueda}
                        onChange={(e) => setBusqueda(e.target.value)} className={input} />
                </div>

                {filtrados.length === 0 ? (
                    <div className={`${card} p-6`}><EmptyState icon="🔍" texto={busqueda ? 'Sin resultados' : 'Sin clientes aún'} /></div>
                ) : (
                    <div className="space-y-2 md:space-y-3">
                        {filtrados.map(c => {
                            const debe = c.saldoPendiente > 0;
                            return (
                                <div key={c.id} className={`${card} cc-fade-up p-3 md:p-4`}>
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="min-w-0 flex-1">
                                            <h3 className="truncate text-sm font-bold text-gray-100 md:text-lg">{c.nombre}</h3>
                                            {c.telefono && <p className="text-xs text-gray-400 md:text-sm">📱 {c.telefono}</p>}
                                            {c.direccion && <p className="truncate text-xs text-gray-500">📍 {c.direccion}</p>}
                                        </div>
                                        <div className="shrink-0 text-right">
                                            <p className={`text-lg font-black md:text-2xl ${debe ? 'text-rose-300' : 'text-emerald-300'}`}>
                                                ${c.saldoPendiente.toFixed(2)}
                                            </p>
                                            <p className="text-[10px] text-gray-500 md:text-xs">{debe ? 'Debe' : 'Al día'}</p>
                                        </div>
                                    </div>
                                    <div className="mt-3 flex gap-2">
                                        <button onClick={() => editar(c)} className="flex-1 rounded-lg border border-blue-400/20 bg-blue-500/10 py-2 text-xs font-bold text-blue-300 transition-colors hover:bg-blue-500/20 md:text-sm">✏️ Editar</button>
                                        <button onClick={() => eliminar(c.id!)} className="rounded-lg border border-rose-400/20 bg-rose-500/10 px-3 py-2 text-xs text-rose-300 transition-colors hover:bg-rose-500/20 md:text-sm">🗑️</button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {modalAbierto && (
                    <div className={modalOverlay}>
                        <div className={modalPanel}>
                            <div className={modalHeader}>
                                <h2 className={modalTitle}>{editando ? 'Editar' : 'Nuevo'} Cliente</h2>
                                <button onClick={limpiar} className={modalClose}>&times;</button>
                            </div>
                            <div className="space-y-4 p-4 md:p-6">
                                <div>
                                    <label className={label}>Nombre *</label>
                                    <input type="text" value={nombre} onChange={(e) => setNombre(e.target.value)} className={input} />
                                </div>
                                <div>
                                    <label className={label}>Teléfono</label>
                                    <input type="tel" value={telefono} onChange={(e) => setTelefono(e.target.value)} className={input} />
                                </div>
                                <div>
                                    <label className={label}>Dirección</label>
                                    <input type="text" value={direccion} onChange={(e) => setDireccion(e.target.value)} className={input} />
                                </div>
                                <div>
                                    <label className={label}>Notas</label>
                                    <textarea value={notas} onChange={(e) => setNotas(e.target.value)} className={input} rows={2} />
                                </div>
                                <div className="flex gap-3 pt-2">
                                    <button onClick={limpiar} className="flex-1 rounded-xl border border-white/10 bg-slate-800/60 py-3 text-base font-bold text-gray-300 transition-colors hover:bg-slate-800">Cancelar</button>
                                    <button onClick={guardar} className="flex-1 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 py-3 text-base font-bold text-white shadow-md shadow-blue-500/25 transition-transform hover:-translate-y-0.5">{editando ? 'Guardar' : 'Crear'}</button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}