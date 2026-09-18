import { useState } from 'react';
import type { Usuario } from './db';
import { usePDV } from './contexts/PuntoDeVentaContext';
import { registrarLog } from './utils/logger';
import { STYLES } from './theme';

interface SidebarProps {
    usuarioActual: Usuario;
    vistaActual: string;
    onCambiarVista: (vista: string) => void;
    onCerrarSesion: () => void;
    abierto: boolean;
    onToggle: () => void;
    esMaster: boolean;
    licenciaActiva: boolean;
    diasRestantes: number;
}

const MENU = [
    { id: 'venta', icon: '🛒', label: 'Nueva Venta', roles: ['admin', 'jefe', 'vendedor'] },
    { id: 'dashboard', icon: '📊', label: 'Panel de Control', roles: ['admin', 'jefe'] },
    { id: 'historial', icon: '📜', label: 'Historial Ventas', roles: ['admin', 'jefe'] },
    { id: 'cierre', icon: '💰', label: 'Cierre de Caja', roles: ['admin', 'jefe'] },
    { id: 'categorias', icon: '📂', label: 'Categorías', roles: ['admin', 'jefe'] },
    { id: 'clientes', icon: '👥', label: 'Clientes', roles: ['admin', 'jefe'] },
    { id: 'reportes', icon: '📄', label: 'Reportes', roles: ['admin', 'jefe'] },
    { id: 'devoluciones', icon: '🔄', label: 'Devoluciones', roles: ['admin', 'jefe'] },
    { id: 'comisiones', icon: '💵', label: 'Comisiones', roles: ['admin', 'jefe'] },
    { id: 'movimientos', icon: '📦', label: 'Movimientos', roles: ['admin', 'jefe'] },
    { id: 'tasas', icon: '💱', label: 'Tasas de Cambio', roles: ['admin', 'jefe'] },
    { id: 'usuarios', icon: '👤', label: 'Usuarios', roles: ['admin', 'jefe'] },
    { id: 'puntos-venta', icon: '🏪', label: 'Puntos de Venta', roles: ['admin', 'jefe'] },
    { id: 'seguridad', icon: '🔐', label: 'Seguridad', roles: ['admin', 'jefe'] },
    { id: 'licencias', icon: '🔑', label: 'Licencias', roles: ['admin'], soloMaster: true },
    { id: 'ayuda', icon: '📚', label: 'Guía de Uso', roles: ['admin', 'jefe', 'vendedor'] },
    { id: 'configuracion', icon: '⚙️', label: 'Configuración', roles: ['admin', 'jefe'] },
] as const;

const ROL_INFO: Record<string, { icon: string; nombre: string; tile: string }> = {
    admin: { icon: '👑', nombre: 'Administrador', tile: 'from-fuchsia-500 to-purple-600' },
    jefe: { icon: '🎩', nombre: 'Jefe', tile: 'from-sky-500 to-blue-600' },
    vendedor: { icon: '🛒', nombre: 'Vendedor', tile: 'from-emerald-500 to-teal-600' },
};

export default function Sidebar({
    usuarioActual, vistaActual, onCambiarVista, onCerrarSesion,
    abierto, onToggle, esMaster, licenciaActiva, diasRestantes,
}: SidebarProps) {
    const rol = ROL_INFO[usuarioActual.rol] ?? { icon: '👤', nombre: 'Usuario', tile: 'from-slate-400 to-slate-600' };
    const { pdvActivo, pdvList, modoTodos, cambiarPDV, activarModoTodos } = usePDV();
    const [modalCambiarPDV, setModalCambiarPDV] = useState(false);

    const itemsFiltrados = MENU.filter(item => {
        if (!(item.roles as readonly string[]).includes(usuarioActual.rol)) return false;
        if ('soloMaster' in item && item.soloMaster && !esMaster) return false;
        return true;
    });

    const handleItemClick = (vista: string) => {
        onCambiarVista(vista);
        if (window.innerWidth < 768) onToggle();
    };

    const handleCambiarPDV = async (pdv: any | null) => {
        if (pdv === null) {
            activarModoTodos();
            await registrarLog('pdv_cambio', 'Modo "Todos los PDV" activado', {
                usuarioId: usuarioActual.id,
                usuarioNombre: usuarioActual.nombre,
            });
        } else {
            cambiarPDV(pdv);
            await registrarLog('pdv_cambio', `Cambio a PDV "${pdv.nombre}"`, {
                usuarioId: usuarioActual.id,
                usuarioNombre: usuarioActual.nombre,
            });
        }
        setModalCambiarPDV(false);
        // Recargar vista actual para que tome el nuevo contexto
        window.location.reload();
    };

    // Badge de licencia
    const badge = (() => {
        if (esMaster) return { icon: '👑', label: 'Master', class: 'bg-violet-500/15 text-violet-300 ring-1 ring-violet-400/25' };
        if (licenciaActiva) return { icon: '✅', label: 'Licencia activa', class: 'bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-400/25' };
        if (diasRestantes > 7) return { icon: '⏳', label: `Prueba: ${diasRestantes} días`, class: 'bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-400/25' };
        if (diasRestantes > 2) return { icon: '⏳', label: `Prueba: ${diasRestantes} días`, class: 'bg-amber-500/15 text-amber-300 ring-1 ring-amber-400/25' };
        return { icon: '⚠️', label: `Prueba: ${diasRestantes} días`, class: 'bg-rose-500/15 text-rose-300 ring-1 ring-rose-400/25' };
    })();



    const puedeVerTodos = usuarioActual.rol === 'admin' || usuarioActual.rol === 'jefe';

    return (
        <>
            <style>{STYLES}</style>

            <aside className={`
                fixed top-0 left-0 z-40 flex h-screen w-64 flex-col
                border-r border-white/10 bg-slate-900/95
                shadow-2xl shadow-black/50
                transition-transform duration-300 ease-out
                ${abierto ? 'translate-x-0' : '-translate-x-full'}
                md:translate-x-0
            `}>
                {/* Header marca */}
                <div className="flex items-start justify-between gap-2 border-b border-white/10 bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-700 p-4 md:p-5">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15 text-xl ring-1 ring-white/20">📊</div>
                        <div className="min-w-0">
                            <h1 className="cc-gradient-text truncate text-lg font-black tracking-tight text-white md:text-xl">CuentaClara</h1>
                            <p className="truncate text-[11px] text-white/70">Tu negocio bajo control</p>
                        </div>
                    </div>
                    <button
                        onClick={onToggle}
                        aria-label="Cerrar menú"
                        className="rounded-lg p-1 text-xl text-white/80 transition-colors hover:bg-white/15 hover:text-white md:hidden"
                    >
                        ✕
                    </button>
                </div>

                {/* Selector de PDV */}
                <div className="border-b border-white/10 p-3">
                    <button
                        onClick={() => setModalCambiarPDV(true)}
                        className="flex w-full items-center gap-2 rounded-xl border border-indigo-400/25 bg-indigo-500/10 p-2.5 text-left transition-colors duration-150 hover:bg-indigo-500/20"
                    >
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 text-lg shadow-md">
                            {modoTodos ? '🌐' : (pdvActivo?.icono || '🏪')}
                        </span>
                        <span className="min-w-0 flex-1">
                            <span className="block text-[10px] font-extrabold uppercase tracking-wider text-indigo-300">Punto de venta</span>
                            <span className="block truncate text-xs font-bold text-gray-100">
                                {modoTodos ? 'Todos' : (pdvActivo?.nombre.replace(/^[^\s]+\s/, '') || 'Sin asignar')}
                            </span>
                        </span>
                        <span className="shrink-0 text-gray-400">▾</span>
                    </button>
                </div>

                {/* Info usuario */}
                <div className="border-b border-white/10 p-4">
                    <div className="flex items-center gap-3">
                        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${rol.tile} text-xl ring-2 ring-white/10`}>
                            {rol.icon}
                        </div>
                        <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-bold text-gray-100">{usuarioActual.nombre}</p>
                            <p className="truncate text-[11px] font-semibold uppercase tracking-wider text-gray-400">{rol.nombre}</p>
                        </div>
                    </div>
                    <div className={`mt-3 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${badge.class}`}>
                        <span className="text-xs">{badge.icon}</span>
                        <span>{badge.label}</span>
                    </div>
                </div>

                {/* Navegación */}
                <nav className="flex-1 overflow-y-auto p-3">
                    <ul className="space-y-1">
                        {itemsFiltrados.map((item) => {
                            const activo = vistaActual === item.id;
                            return (
                                <li key={item.id}>
                                    <button
                                        onClick={() => handleItemClick(item.id)}
                                        className={`group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors duration-150 ${activo
                                            ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/25'
                                            : 'text-gray-300 hover:bg-white/5 hover:text-gray-100'
                                            }`}
                                    >
                                        <span className="text-lg">{item.icon}</span>
                                        <span className="truncate text-sm font-semibold">{item.label}</span>
                                        {activo && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-white" />}
                                    </button>
                                </li>
                            );
                        })}
                    </ul>
                </nav>

                {/* Footer */}
                <div className="space-y-1 border-t border-white/10 p-3">
                    <button
                        onClick={onCerrarSesion}
                        className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left font-semibold text-rose-300 transition-colors duration-150 hover:bg-rose-500/10 hover:text-rose-200"
                    >
                        <span className="text-lg">🚪</span>
                        <span className="text-sm">Cerrar Sesión</span>
                    </button>
                    <p className="px-3 pt-2 text-[10px] text-gray-600">v1.0.0 · 100% Offline</p>
                </div>
            </aside>

            {/* Modal selector de PDV */}
            {modalCambiarPDV && (
                <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/70 p-0 md:items-center md:p-4">
                    <div className="max-h-[90vh] w-full overflow-y-auto rounded-t-2xl border border-white/10 bg-slate-900 shadow-2xl shadow-black/60 md:max-w-md md:rounded-2xl">
                        <div className="sticky top-0 z-10 flex items-center justify-between bg-gradient-to-r from-indigo-600 to-violet-700 px-4 py-3 md:px-6 md:py-4">
                            <div>
                                <h2 className="text-lg font-bold text-white md:text-xl">Cambiar punto de venta</h2>
                                <p className="text-xs text-white/70">¿Dónde vas a trabajar?</p>
                            </div>
                            <button onClick={() => setModalCambiarPDV(false)} className="text-2xl text-white/80 hover:text-white">&times;</button>
                        </div>

                        <div className="space-y-2 p-4 md:p-6">
                            {puedeVerTodos && (
                                <button
                                    onClick={() => handleCambiarPDV(null)}
                                    className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-colors ${modoTodos
                                        ? 'border-indigo-400/60 bg-indigo-500/15'
                                        : 'border-white/10 bg-slate-800/50 hover:border-indigo-400/40 hover:bg-slate-800/80'
                                        }`}
                                >
                                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 text-xl shadow-md">
                                        🌐
                                    </span>
                                    <span className="min-w-0 flex-1">
                                        <span className="block text-sm font-bold text-gray-100">Todos los PDV</span>
                                        <span className="block text-xs text-gray-400">Vista consolidada de todo el negocio</span>
                                    </span>
                                    {modoTodos && <span className="text-emerald-400">✓</span>}
                                </button>
                            )}

                            {pdvList.length === 0 && (
                                <p className="rounded-xl border border-amber-400/20 bg-amber-500/10 p-3 text-xs text-amber-200">
                                    No tienes puntos de venta asignados. Contacta al jefe.
                                </p>
                            )}

                            {pdvList.map(pdv => {
                                const activo = !modoTodos && pdvActivo?.id === pdv.id;
                                return (
                                    <button
                                        key={pdv.id}
                                        onClick={() => handleCambiarPDV(pdv)}
                                        disabled={!pdv.activo}
                                        className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-colors ${!pdv.activo
                                            ? 'cursor-not-allowed border-white/5 bg-slate-900/40 opacity-50'
                                            : activo
                                                ? 'border-indigo-400/60 bg-indigo-500/15'
                                                : 'border-white/10 bg-slate-800/50 hover:border-indigo-400/40 hover:bg-slate-800/80'
                                            }`}
                                    >
                                        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 text-xl shadow-md">
                                            {pdv.icono || '🏪'}
                                        </span>
                                        <span className="min-w-0 flex-1">
                                            <span className="block truncate text-sm font-bold text-gray-100">
                                                {pdv.nombre.replace(/^[^\s]+\s/, '')}
                                            </span>
                                            {pdv.direccion && (
                                                <span className="block truncate text-xs text-gray-400">📍 {pdv.direccion}</span>
                                            )}
                                            {!pdv.activo && (
                                                <span className="mt-0.5 inline-block rounded-full bg-slate-500/15 px-2 py-0.5 text-[10px] font-bold text-slate-400">
                                                    Inactivo
                                                </span>
                                            )}
                                        </span>
                                        {activo && <span className="text-emerald-400">✓</span>}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}