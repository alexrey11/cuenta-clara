import type { Usuario } from './db';
import { STYLES } from './theme';

interface SidebarProps {
    usuarioActual: Usuario;
    vistaActual: string;
    onCambiarVista: (vista: string) => void;
    onCerrarSesion: () => void;
    abierto: boolean;
    onToggle: () => void;
    // NUEVOS:
    esMaster: boolean;
    licenciaActiva: boolean;
    diasRestantes: number;
}

const MENU = [
    { id: 'dashboard', icon: '📊', label: 'Panel de Control', roles: ['admin', 'jefe'] },
    { id: 'venta', icon: '🛒', label: 'Nueva Venta', roles: ['admin', 'jefe', 'vendedor'] },
    { id: 'historial', icon: '📜', label: 'Historial Ventas', roles: ['admin', 'jefe', 'vendedor'] },
    { id: 'categorias', icon: '📂', label: 'Categorías', roles: ['admin', 'jefe'] },
    { id: 'clientes', icon: '👥', label: 'Clientes', roles: ['admin', 'jefe'] },
    { id: 'devoluciones', icon: '🔄', label: 'Devoluciones', roles: ['admin', 'jefe', 'vendedor'] },
    { id: 'comisiones', icon: '💵', label: 'Comisiones', roles: ['admin', 'jefe'] },
    { id: 'movimientos', icon: '📦', label: 'Movimientos', roles: ['admin', 'jefe'] },
    { id: 'tasas', icon: '💱', label: 'Tasas de Cambio', roles: ['admin'] },
    { id: 'cierre', icon: '💰', label: 'Cierre de Caja', roles: ['admin', 'jefe', 'vendedor'] },
    { id: 'reportes', icon: '📄', label: 'Reportes', roles: ['admin', 'jefe', 'vendedor'] },
    { id: 'usuarios', icon: '👤', label: 'Usuarios', roles: ['admin', 'jefe'] },
    // Licencias solo lo ve el dev (esMaster === true)
    { id: 'licencias', icon: '🔑', label: 'Licencias', roles: ['admin'], soloMaster: true },
    { id: 'seguridad', icon: '🔐', label: 'Seguridad', roles: ['admin', 'jefe'] },
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

    const itemsFiltrados = MENU.filter(item => {
        if (!(item.roles as readonly string[]).includes(usuarioActual.rol)) return false;
        if ('soloMaster' in item && item.soloMaster && !esMaster) return false;
        return true;
    });

    const handleItemClick = (vista: string) => {
        onCambiarVista(vista);
        if (window.innerWidth < 768) onToggle();
    };

    // Badge de estado de licencia
    const badge = (() => {
        if (esMaster) {
            return { icon: '👑', label: 'Master', class: 'bg-violet-500/15 text-violet-300 ring-1 ring-violet-400/25' };
        }
        if (licenciaActiva) {
            return { icon: '✅', label: 'Licencia activa', class: 'bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-400/25' };
        }
        if (diasRestantes > 7) {
            return { icon: '⏳', label: `Prueba: ${diasRestantes} días`, class: 'bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-400/25' };
        }
        if (diasRestantes > 2) {
            return { icon: '⏳', label: `Prueba: ${diasRestantes} días`, class: 'bg-amber-500/15 text-amber-300 ring-1 ring-amber-400/25' };
        }
        return { icon: '⚠️', label: `Prueba: ${diasRestantes} días`, class: 'bg-rose-500/15 text-rose-300 ring-1 ring-rose-400/25' };
    })();

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

                {/* Info usuario + badge licencia */}
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
                    {/* Badge de licencia */}
                    <div className={`mt-3 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${badge.class}`}>
                        <span className="text-xs">{badge.icon}</span>
                        <span>{badge.label}</span>
                    </div>
                </div>

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
        </>
    );
}