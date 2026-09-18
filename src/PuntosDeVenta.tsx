import { useState, useEffect } from 'react';
import { db } from './db';
import type { PuntoDeVenta, Usuario } from './db';
import { usePDV } from './contexts/PuntoDeVentaContext';
import { registrarLog } from './utils/logger';
import {
    STYLES, BackgroundBlobs, pageWrap, card, cardPadded, titleGradient,
    btnPrimary, input, label,
    modalOverlay, modalPanel, modalHeader, modalTitle, modalClose, EmptyState,
} from './theme';

interface PuntosDeVentaProps {
    usuarioActual: Usuario;
}

const ICONOS = ['🏪', '🏬', '🏢', '🥩', '🍎', '🥖', '👕', '💊', '🔧', '📱', '🍽️', '🍺', '🧴', '🎂', '🌸'];

export default function PuntosDeVenta({ usuarioActual }: PuntosDeVentaProps) {
    const { recargarPDV } = usePDV();
    const [puntos, setPuntos] = useState<PuntoDeVenta[]>([]);
    const [modalAbierto, setModalAbierto] = useState(false);
    const [editando, setEditando] = useState<PuntoDeVenta | null>(null);
    const [nombre, setNombre] = useState('');
    const [direccion, setDireccion] = useState('');
    const [telefono, setTelefono] = useState('');
    const [encargado, setEncargado] = useState('');
    const [icono, setIcono] = useState('🏪');
    const [eliminando, setEliminando] = useState<number | null>(null);

    useEffect(() => { cargarPuntos(); }, []);

    const cargarPuntos = async () => {
        const lista = await db.puntosDeVenta.toArray();
        lista.sort((a, b) => {
            if (a.activo !== b.activo) return a.activo ? -1 : 1;
            return a.nombre.localeCompare(b.nombre);
        });
        setPuntos(lista);
    };

    const abrirCrear = () => {
        setEditando(null);
        setNombre(''); setDireccion(''); setTelefono('');
        setEncargado(''); setIcono('🏪');
        setModalAbierto(true);
    };

    const editar = (p: PuntoDeVenta) => {
        setEditando(p);
        setNombre(p.nombre.replace(/^[^\s]+\s/, '').trim());
        setDireccion(p.direccion || '');
        setTelefono(p.telefono || '');
        setEncargado(p.encargado || '');
        setIcono(p.icono || '🏪');
        setModalAbierto(true);
    };

    const guardar = async () => {
        if (!nombre.trim()) { alert('Ingresa un nombre'); return; }

        const datos = {
            nombre: `${icono} ${nombre.trim()}`,
            direccion: direccion.trim() || undefined,
            telefono: telefono.trim() || undefined,
            encargado: encargado.trim() || undefined,
            icono,
            activo: editando ? editando.activo : true,
            creadoEn: editando ? editando.creadoEn : new Date(),
        };

        if (editando) {
            await db.puntosDeVenta.update(editando.id!, datos);
            await registrarLog('pdv_editado', `Punto de venta "${datos.nombre}" editado`, {
                usuarioId: usuarioActual.id,
                usuarioNombre: usuarioActual.nombre,
                detalles: `ID: ${editando.id}`,
            });
        } else {
            const id = await db.puntosDeVenta.add(datos);
            await registrarLog('pdv_creado', `Punto de venta "${datos.nombre}" creado`, {
                usuarioId: usuarioActual.id,
                usuarioNombre: usuarioActual.nombre,
                detalles: `ID: ${id}`,
            });
        }

        limpiar();
        await cargarPuntos();
        await recargarPDV();
    };

    const toggleActivo = async (p: PuntoDeVenta) => {
        await db.puntosDeVenta.update(p.id!, { activo: !p.activo });
        await registrarLog('pdv_editado', `PDV "${p.nombre}" ${p.activo ? 'desactivado' : 'activado'}`, {
            usuarioId: usuarioActual.id,
            usuarioNombre: usuarioActual.nombre,
        });
        await cargarPuntos();
        await recargarPDV();
    };

    const confirmarEliminar = async () => {
        if (!eliminando) return;
        const p = puntos.find(x => x.id === eliminando);
        if (!p) return;

        // Verificaciones
        const totalPuntos = puntos.length;
        if (totalPuntos <= 1) {
            alert('No puedes eliminar el único punto de venta. Debe existir al menos uno.');
            setEliminando(null);
            return;
        }

        const ventas = await db.ventas.where('puntoDeVentaId').equals(eliminando).count();
        if (ventas > 0) {
            alert(`No se puede eliminar: hay ${ventas} ventas en este PDV.\n\nEn su lugar, desactívalo.`);
            setEliminando(null);
            return;
        }

        const productos = await db.productos.where('puntoDeVentaId').equals(eliminando).count();
        if (productos > 0) {
            alert(`No se puede eliminar: hay ${productos} productos en este PDV.\n\nElimina los productos primero o desactívalo.`);
            setEliminando(null);
            return;
        }

        const categorias = await db.categorias.where('puntoDeVentaId').equals(eliminando).count();
        if (categorias > 0) {
            alert(`No se puede eliminar: hay ${categorias} categorías en este PDV.\n\nElimina las categorías primero o desactívalo.`);
            setEliminando(null);
            return;
        }

        await db.puntosDeVenta.delete(eliminando);
        await registrarLog('pdv_eliminado', `Punto de venta "${p.nombre}" eliminado`, {
            usuarioId: usuarioActual.id,
            usuarioNombre: usuarioActual.nombre,
            detalles: `ID: ${eliminando}`,
        });

        setEliminando(null);
        await cargarPuntos();
        await recargarPDV();
    };

    const limpiar = () => {
        setEditando(null);
        setNombre(''); setDireccion(''); setTelefono('');
        setEncargado(''); setIcono('🏪');
        setModalAbierto(false);
    };

    const pdvAEliminar = eliminando ? puntos.find(x => x.id === eliminando) : null;
    const activos = puntos.filter(p => p.activo).length;

    return (
        <div className={pageWrap}>
            <style>{STYLES}</style>
            <BackgroundBlobs />

            <div className="relative mx-auto max-w-4xl">
                <div className={`cc-fade-up mb-4 md:mb-6 ${cardPadded}`}>
                    <div className="flex items-center justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-3">
                            <div className="hidden h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 text-2xl shadow-md ring-2 ring-white/10 md:flex">🏪</div>
                            <div className="min-w-0">
                                <h1 className={`${titleGradient} truncate text-xl md:text-3xl`}>Puntos de Venta</h1>
                                <p className="truncate text-xs text-gray-400 md:text-sm">{activos} activos · {puntos.length} totales</p>
                            </div>
                        </div>
                        <button onClick={abrirCrear} className={btnPrimary}>+ Nuevo</button>
                    </div>
                </div>

                <div className="cc-fade-up mb-4 rounded-xl border border-blue-400/20 bg-blue-500/10 p-3 text-xs text-blue-200 md:mb-6 md:text-sm">
                    💡 Cada punto de venta tiene su propio catálogo de productos, stock, usuarios y ventas. Son independientes entre sí.
                </div>

                {puntos.length === 0 ? (
                    <div className={`${card} p-6`}>
                        <EmptyState icon="🏪" texto="Aún no hay puntos de venta" />
                        <button onClick={abrirCrear} className={`${btnPrimary} mt-4 w-full`}>
                            Crear primer punto de venta
                        </button>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {puntos.map((p) => (
                            <div key={p.id} className={`${card} cc-fade-up p-4 md:p-5 ${!p.activo ? 'opacity-60' : ''}`}>
                                <div className="flex items-start gap-3">
                                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 text-3xl shadow-md ring-2 ring-white/10">
                                        {p.icono || '🏪'}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <h3 className="mb-1 truncate text-base font-bold text-gray-100 md:text-lg">
                                            {p.nombre.replace(/^[^\s]+\s/, '')}
                                        </h3>
                                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-400 md:text-sm">
                                            {p.direccion && <span>📍 {p.direccion}</span>}
                                            {p.telefono && <span>📱 {p.telefono}</span>}
                                            {p.encargado && <span>👤 {p.encargado}</span>}
                                        </div>
                                        <div className="mt-2">
                                            <span className={`inline-block rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${p.activo
                                                    ? 'bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-400/25'
                                                    : 'bg-slate-500/15 text-slate-300 ring-1 ring-slate-400/25'
                                                }`}>
                                                {p.activo ? '✅ Activo' : '⏸ Inactivo'}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <div className="mt-3 flex flex-wrap gap-2">
                                    <button onClick={() => editar(p)}
                                        className="flex-1 rounded-lg border border-amber-400/25 bg-amber-500/10 py-2 text-xs font-bold text-amber-300 transition-colors hover:bg-amber-500/20 md:text-sm">
                                        ✏️ Editar
                                    </button>
                                    <button onClick={() => toggleActivo(p)}
                                        className="flex-1 rounded-lg border border-blue-400/25 bg-blue-500/10 py-2 text-xs font-bold text-blue-300 transition-colors hover:bg-blue-500/20 md:text-sm">
                                        {p.activo ? '⏸ Desactivar' : '▶️ Activar'}
                                    </button>
                                    <button onClick={() => setEliminando(p.id!)}
                                        className="rounded-lg border border-rose-400/25 bg-rose-500/10 px-3 py-2 text-xs font-bold text-rose-300 transition-colors hover:bg-rose-500/20 md:text-sm">
                                        🗑️
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Modal Crear/Editar */}
                {modalAbierto && (
                    <div className={modalOverlay}>
                        <div className={modalPanel}>
                            <div className={modalHeader}>
                                <h2 className={modalTitle}>{editando ? 'Editar' : 'Nuevo'} Punto de Venta</h2>
                                <button onClick={limpiar} className={modalClose}>&times;</button>
                            </div>
                            <div className="space-y-4 p-4 md:p-6">
                                <div>
                                    <label className={label}>Icono</label>
                                    <div className="flex flex-wrap gap-2">
                                        {ICONOS.map(i => (
                                            <button key={i} type="button" onClick={() => setIcono(i)}
                                                className={`flex h-12 w-12 items-center justify-center rounded-xl border text-2xl transition-colors ${icono === i
                                                        ? 'border-blue-400/60 bg-blue-500/15'
                                                        : 'border-white/10 bg-slate-800/50 hover:border-blue-400/40'
                                                    }`}>
                                                {i}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <label className={label}>Nombre *</label>
                                    <input type="text" value={nombre} onChange={(e) => setNombre(e.target.value)}
                                        placeholder="Ej: Tienda Centro, Carnecería El Rápido..."
                                        className={input} autoFocus />
                                </div>
                                <div>
                                    <label className={label}>Dirección</label>
                                    <input type="text" value={direccion} onChange={(e) => setDireccion(e.target.value)}
                                        placeholder="Calle, número, referencia..." className={input} />
                                </div>
                                <div>
                                    <label className={label}>Teléfono</label>
                                    <input type="tel" value={telefono} onChange={(e) => setTelefono(e.target.value)}
                                        placeholder="+53..." className={input} />
                                </div>
                                <div>
                                    <label className={label}>Encargado</label>
                                    <input type="text" value={encargado} onChange={(e) => setEncargado(e.target.value)}
                                        placeholder="Nombre del encargado" className={input} />
                                </div>
                                <div className="flex gap-3 border-t border-white/10 pt-4">
                                    <button onClick={limpiar} className="flex-1 rounded-xl border border-white/10 bg-slate-800/60 py-3 text-base font-bold text-gray-300 transition-colors hover:bg-slate-800">
                                        Cancelar
                                    </button>
                                    <button onClick={guardar} className="flex-1 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 py-3 text-base font-bold text-white shadow-md shadow-blue-500/25 transition-transform hover:-translate-y-0.5">
                                        {editando ? 'Guardar' : 'Crear'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Modal Eliminar */}
                {pdvAEliminar && (
                    <div className={modalOverlay}>
                        <div className={modalPanel}>
                            <div className="flex items-center justify-between bg-gradient-to-r from-rose-500 to-red-600 px-4 py-3 md:px-6 md:py-4">
                                <h2 className={modalTitle}>🗑️ Eliminar punto de venta</h2>
                                <button onClick={() => setEliminando(null)} className={modalClose}>&times;</button>
                            </div>
                            <div className="space-y-4 p-4 md:p-6">
                                <p className="text-sm text-gray-300">
                                    ¿Seguro que quieres eliminar <strong className="text-gray-100">"{pdvAEliminar.nombre}"</strong>?
                                </p>
                                <p className="rounded-xl border border-amber-400/25 bg-amber-500/10 p-3 text-xs text-amber-200">
                                    ⚠️ Solo se puede eliminar si no tiene productos, categorías ni ventas registradas. Si tiene, mejor usa "Desactivar".
                                </p>
                                <div className="flex gap-3">
                                    <button onClick={() => setEliminando(null)} className="flex-1 rounded-xl border border-white/10 bg-slate-800/60 py-3 text-base font-bold text-gray-300 transition-colors hover:bg-slate-800">
                                        Cancelar
                                    </button>
                                    <button onClick={confirmarEliminar} className="flex-1 rounded-xl bg-gradient-to-r from-rose-500 to-red-600 py-3 text-base font-bold text-white shadow-md shadow-rose-500/25 transition-transform hover:-translate-y-0.5">
                                        Eliminar
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}