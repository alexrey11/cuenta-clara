import { useState, useEffect } from 'react';
import { db } from './db';
import type { Usuario, PuntoDeVenta } from './db';
import { registrarLog } from './utils/logger';
import {
    STYLES, BackgroundBlobs, pageWrap, card, cardPadded, titleGradient,
    btnPrimary, btnSecondary, input, label, sectionTitle,
    btnMiniPrimary, btnMiniDanger, EmptyState,
} from './theme';

interface GestionUsuariosProps {
    onVolver: () => void;
    usuarioActual: Usuario;
}

type Rol = 'admin' | 'jefe' | 'vendedor';

const ROL_INFO: Record<Rol, { icon: string; nombre: string; tile: string; pill: string }> = {
    admin: { icon: '👑', nombre: 'Administrador', tile: 'from-fuchsia-500 to-purple-600', pill: 'bg-fuchsia-500/15 text-fuchsia-300 ring-1 ring-fuchsia-400/25' },
    jefe: { icon: '🎩', nombre: 'Jefe', tile: 'from-sky-500 to-blue-600', pill: 'bg-sky-500/15 text-sky-300 ring-1 ring-sky-400/25' },
    vendedor: { icon: '🛒', nombre: 'Vendedor', tile: 'from-emerald-500 to-teal-600', pill: 'bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-400/25' },
};

const getRol = (r: string): (typeof ROL_INFO)[Rol] =>
    ROL_INFO[r as Rol] ?? { icon: '👤', nombre: 'Usuario', tile: 'from-slate-400 to-slate-600', pill: 'bg-slate-500/15 text-slate-300 ring-1 ring-slate-400/25' };

export default function GestionUsuarios({ onVolver, usuarioActual }: GestionUsuariosProps) {
    const [usuarios, setUsuarios] = useState<Usuario[]>([]);
    const [puntosDeVenta, setPuntosDeVenta] = useState<PuntoDeVenta[]>([]);
    const [modoCrear, setModoCrear] = useState(false);
    const [editando, setEditando] = useState<Usuario | null>(null);
    const [nombre, setNombre] = useState('');
    const [pin, setPin] = useState('');
    const [rol, setRol] = useState<Rol>('vendedor');
    const [comision, setComision] = useState('');
    const [pdvsSeleccionados, setPdvsSeleccionados] = useState<number[]>([]);

    const esAdmin = usuarioActual.rol === 'admin';
    const rolesPermitidos: Rol[] = esAdmin ? ['admin', 'jefe', 'vendedor'] : ['jefe', 'vendedor'];

    useEffect(() => {
        cargarUsuarios();
        cargarPDVs();
    }, []);

    const cargarUsuarios = async () => {
        const todos = await db.usuarios.toArray();
        setUsuarios(todos);
    };

    const cargarPDVs = async () => {
        const lista = await db.puntosDeVenta.toArray();
        lista.sort((a, b) => a.nombre.localeCompare(b.nombre));
        setPuntosDeVenta(lista);
    };

    const abrirCrear = () => {
        setRol(esAdmin ? 'jefe' : 'vendedor');
        setPdvsSeleccionados([]);
        setModoCrear(true);
    };

    const togglePDV = (id: number) => {
        setPdvsSeleccionados(prev =>
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        );
    };

    const guardar = async () => {
        if (!nombre.trim() || !pin) { alert('Completa todos los campos'); return; }
        if (pin.length !== 4) { alert('PIN debe tener 4 dígitos'); return; }

        if (!rolesPermitidos.includes(rol)) {
            alert(`No puedes crear usuarios con rol "${getRol(rol).nombre}"`);
            return;
        }

        if (editando && !rolesPermitidos.includes(editando.rol as Rol)) {
            alert('No tienes permisos para editar a este usuario');
            return;
        }

        if (rol === 'vendedor' && pdvsSeleccionados.length === 0) {
            if (!confirm('Este vendedor no tiene puntos de venta asignados. ¿Crear de todas formas?')) return;
        }

        const datos = {
            nombre: nombre.trim(),
            pin,
            rol,
            comisionPorcentaje: comision ? parseFloat(comision) : undefined,
            creadoEn: editando ? editando.creadoEn : new Date(),
            puntosDeVentaIds: rol === 'vendedor' ? pdvsSeleccionados : [],
        };

        if (editando) {
            await db.usuarios.update(editando.id!, datos);
            await registrarLog('usuario_editado', `Usuario "${datos.nombre}" editado`, {
                usuarioId: usuarioActual.id,
                usuarioNombre: usuarioActual.nombre,
                detalles: `Rol: ${datos.rol}, PDVs: ${datos.puntosDeVentaIds.length}`,
            });
            alert('✅ Usuario actualizado');
        } else {
            await db.usuarios.add(datos);
            await registrarLog('usuario_creado', `Usuario "${datos.nombre}" creado`, {
                usuarioId: usuarioActual.id,
                usuarioNombre: usuarioActual.nombre,
                detalles: `Rol: ${datos.rol}, PDVs: ${datos.puntosDeVentaIds.length}`,
            });
            alert('✅ Usuario creado');
        }

        limpiar();
        cargarUsuarios();
    };

    const editar = (u: Usuario) => {
        setEditando(u);
        setNombre(u.nombre);
        setPin(u.pin);
        setRol(u.rol as Rol);
        setComision(u.comisionPorcentaje?.toString() || '');
        setPdvsSeleccionados(u.puntosDeVentaIds || []);
        setModoCrear(true);
    };

    const eliminar = async (id: number) => {
        if (id === usuarioActual.id) {
            alert('No puedes eliminarte a ti mismo');
            return;
        }
        const u = usuarios.find((x) => x.id === id);
        if (!u) return;

        if (u.rol === 'admin' && !esAdmin) {
            alert('No puedes eliminar a un administrador');
            return;
        }

        if (u.rol === 'admin') {
            const admins = usuarios.filter((x) => x.rol === 'admin');
            if (admins.length <= 1) {
                alert('No puedes eliminar al último administrador');
                return;
            }
        }

        if (confirm(`¿Eliminar a "${u.nombre}"?`)) {
            await db.usuarios.delete(id);
            await registrarLog('usuario_eliminado', `Usuario "${u.nombre}" eliminado`, {
                usuarioId: usuarioActual.id,
                usuarioNombre: usuarioActual.nombre,
                detalles: `Rol: ${u.rol}`,
            });
            cargarUsuarios();
        }
    };

    const limpiar = () => {
        setNombre('');
        setPin('');
        setRol('vendedor');
        setComision('');
        setPdvsSeleccionados([]);
        setModoCrear(false);
        setEditando(null);
    };

    return (
        <div className={pageWrap}>
            <style>{STYLES}</style>
            <BackgroundBlobs />

            <div className="relative mx-auto max-w-4xl">
                <div className={`cc-fade-up mb-4 md:mb-6 ${cardPadded}`}>
                    <div className="flex items-center justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-3">
                            <div className="hidden h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-fuchsia-500 to-purple-600 text-2xl shadow-md ring-2 ring-white/10 md:flex">👥</div>
                            <div className="min-w-0">
                                <h1 className={`${titleGradient} truncate text-xl md:text-3xl`}>Gestión de Usuarios</h1>
                                <p className="truncate text-xs text-gray-400 md:text-sm">Administra los accesos al sistema</p>
                            </div>
                        </div>
                        <button onClick={onVolver} className={btnSecondary}>← Volver</button>
                    </div>
                </div>

                {!modoCrear && (
                    <button onClick={abrirCrear} className={`${btnPrimary} mb-4 w-full py-3.5 text-base md:mb-6 md:py-4 md:text-lg`}>
                        + Crear Nuevo Usuario
                    </button>
                )}

                {modoCrear && (
                    <div className={`${card} cc-fade-up mb-4 p-4 md:mb-6 md:p-6`}>
                        <h2 className={`${sectionTitle} mb-4`}>{editando ? 'Editar' : 'Nuevo'} Usuario</h2>
                        <div className="space-y-4">
                            <div>
                                <label className={label}>Nombre</label>
                                <input type="text" value={nombre} onChange={(e) => setNombre(e.target.value)}
                                    placeholder="Nombre del usuario" className={input} />
                            </div>
                            <div>
                                <label className={label}>PIN (4 dígitos)</label>
                                <input type="password" maxLength={4} value={pin}
                                    onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                                    placeholder="••••" className={input} />
                            </div>

                            <div>
                                <label className={label}>Rol</label>
                                <div className={`grid gap-2 ${rolesPermitidos.length === 3 ? 'grid-cols-3' : 'grid-cols-2'}`}>
                                    {rolesPermitidos.map((r) => {
                                        const info = getRol(r);
                                        const activo = rol === r;
                                        return (
                                            <button key={r} type="button" onClick={() => setRol(r)}
                                                className={`flex flex-col items-center gap-1.5 rounded-2xl border p-3 transition-colors duration-150 ${activo
                                                        ? 'border-blue-400/60 bg-blue-500/15'
                                                        : 'border-white/10 bg-slate-800/50 hover:border-blue-400/40'
                                                    }`}>
                                                <span className={`flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br ${info.tile} text-base`}>
                                                    {info.icon}
                                                </span>
                                                <span className={`text-[11px] font-bold ${activo ? 'text-blue-300' : 'text-gray-300'}`}>
                                                    {info.nombre}
                                                </span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {rol === 'vendedor' && (
                                <div>
                                    <label className={label}>Puntos de venta asignados</label>
                                    {puntosDeVenta.length === 0 ? (
                                        <p className="rounded-xl border border-amber-400/20 bg-amber-500/10 p-3 text-xs text-amber-200">
                                            ⚠️ No hay puntos de venta creados. Ve a <strong>Puntos de Venta</strong> y crea al menos uno primero.
                                        </p>
                                    ) : (
                                        <div className="space-y-2">
                                            {puntosDeVenta.filter(p => p.activo).map(p => {
                                                const activo = pdvsSeleccionados.includes(p.id!);
                                                return (
                                                    <button
                                                        key={p.id}
                                                        type="button"
                                                        onClick={() => togglePDV(p.id!)}
                                                        className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-colors ${activo
                                                                ? 'border-blue-400/60 bg-blue-500/15'
                                                                : 'border-white/10 bg-slate-800/50 hover:border-blue-400/40'
                                                            }`}>
                                                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 text-lg shadow-md">
                                                            {p.icono || '🏪'}
                                                        </span>
                                                        <span className="min-w-0 flex-1">
                                                            <span className="block truncate text-sm font-bold text-gray-100">
                                                                {p.nombre.replace(/^[^\s]+\s/, '')}
                                                            </span>
                                                            {p.direccion && (
                                                                <span className="block truncate text-xs text-gray-400">📍 {p.direccion}</span>
                                                            )}
                                                        </span>
                                                        <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 text-[11px] font-black ${activo ? 'border-blue-400 bg-blue-500 text-white' : 'border-white/15 text-transparent'
                                                            }`}>
                                                            ✓
                                                        </span>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    )}
                                    <p className="mt-2 text-[11px] text-gray-500">
                                        Puedes asignar 1, 2 o más puntos de venta. Este vendedor podrá elegir dónde trabajar al entrar.
                                    </p>
                                </div>
                            )}

                            <div>
                                <label className={label}>% Comisión (opcional, para vendedores)</label>
                                <input type="number" min="0" max="100" step="0.1" value={comision}
                                    onChange={(e) => setComision(e.target.value)} placeholder="Ej: 10" className={input} />
                            </div>

                            <div className="flex gap-3">
                                <button onClick={guardar}
                                    className="flex-1 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 py-3 text-base font-bold text-white shadow-md shadow-emerald-500/25 transition-transform hover:-translate-y-0.5">
                                    {editando ? '✓ Actualizar' : '✓ Crear'}
                                </button>
                                <button onClick={limpiar}
                                    className="flex-1 rounded-xl border border-white/10 bg-slate-800/60 py-3 text-base font-bold text-gray-300 transition-colors hover:bg-slate-800">
                                    ✕ Cancelar
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                <div className={`${card} cc-fade-up p-4 md:p-6`}>
                    <h2 className={`${sectionTitle} mb-4`}>Usuarios ({usuarios.length})</h2>
                    {usuarios.length === 0 ? (
                        <EmptyState icon="👤" texto="Sin usuarios registrados" />
                    ) : (
                        <div className="space-y-2 md:space-y-3">
                            {usuarios.map((u) => {
                                const info = getRol(u.rol);
                                const esYo = u.id === usuarioActual.id;
                                const puedeEliminar = !esYo && (u.rol !== 'admin' || esAdmin);
                                const puedeEditar = rolesPermitidos.includes(u.rol as Rol);
                                const pdvsDeUsuario = u.puntosDeVentaIds
                                    ?.map(id => puntosDeVenta.find(p => p.id === id))
                                    .filter(Boolean) || [];

                                return (
                                    <div key={u.id} className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-white/10 bg-slate-800/50 p-3 md:p-4">
                                        <div className="flex min-w-0 flex-1 items-start gap-3">
                                            <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${info.tile} text-xl ring-2 ring-white/10`}>
                                                {info.icon}
                                            </span>
                                            <div className="min-w-0 flex-1">
                                                <h3 className="flex items-center gap-2 truncate text-sm font-bold text-gray-100 md:text-base">
                                                    {u.nombre}
                                                    {esYo && (
                                                        <span className="rounded-full bg-blue-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-blue-300 ring-1 ring-blue-400/25">
                                                            Tú
                                                        </span>
                                                    )}
                                                </h3>
                                                <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                                                    <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${info.pill}`}>
                                                        {info.nombre}
                                                    </span>
                                                    {u.comisionPorcentaje ? (
                                                        <span className="text-[11px] text-emerald-300">💰 {u.comisionPorcentaje}%</span>
                                                    ) : null}
                                                </div>
                                                {u.rol === 'vendedor' && (
                                                    <div className="mt-2 flex flex-wrap gap-1.5">
                                                        {pdvsDeUsuario.length === 0 ? (
                                                            <span className="text-[10px] italic text-gray-500">Sin PDV asignados</span>
                                                        ) : (
                                                            pdvsDeUsuario.map((p: any) => (
                                                                <span key={p.id} className="inline-flex items-center gap-1 rounded-full bg-indigo-500/15 px-2 py-0.5 text-[10px] font-bold text-indigo-300 ring-1 ring-indigo-400/25">
                                                                    {p.icono} {p.nombre.replace(/^[^\s]+\s/, '')}
                                                                </span>
                                                            ))
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {puedeEditar && (
                                                <button onClick={() => editar(u)} className={btnMiniPrimary}>✏️ Editar</button>
                                            )}
                                            {puedeEliminar && (
                                                <button onClick={() => eliminar(u.id!)} className={btnMiniDanger}>🗑️</button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}