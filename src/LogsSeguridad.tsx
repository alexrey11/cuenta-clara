import { useState, useEffect } from 'react';
import { db } from './db';
import type { LogSeguridad, TipoLogSeguridad, Usuario } from './db';
import { limpiarLogsAntiguos } from './utils/logger';
import {
    STYLES, BackgroundBlobs, pageWrap, card, cardPadded, titleGradient,
    input, sectionTitle, filterPill,
    MetricCard, EmptyState,
} from './theme';

interface LogsSeguridadProps { usuarioActual: Usuario; }

const TIPO_INFO: Record<TipoLogSeguridad, { icon: string; label: string; tile: string; pill: string }> = {
    login_ok: { icon: '✅', label: 'Login OK', tile: 'from-emerald-500 to-teal-600', pill: 'bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-400/25' },
    login_fallido: { icon: '❌', label: 'Login fallido', tile: 'from-rose-500 to-red-600', pill: 'bg-rose-500/15 text-rose-300 ring-1 ring-rose-400/25' },
    logout: { icon: '🚪', label: 'Logout', tile: 'from-slate-500 to-slate-700', pill: 'bg-slate-500/15 text-slate-300 ring-1 ring-slate-400/25' },
    usuario_creado: { icon: '👤', label: 'Usuario creado', tile: 'from-blue-500 to-indigo-600', pill: 'bg-blue-500/15 text-blue-300 ring-1 ring-blue-400/25' },
    usuario_editado: { icon: '✏️', label: 'Usuario editado', tile: 'from-cyan-500 to-blue-600', pill: 'bg-cyan-500/15 text-cyan-300 ring-1 ring-cyan-400/25' },
    usuario_eliminado: { icon: '🗑️', label: 'Usuario eliminado', tile: 'from-rose-500 to-red-600', pill: 'bg-rose-500/15 text-rose-300 ring-1 ring-rose-400/25' },
    acceso_denegado: { icon: '🔒', label: 'Acceso denegado', tile: 'from-amber-500 to-orange-600', pill: 'bg-amber-500/15 text-amber-300 ring-1 ring-amber-400/25' },
    licencia_activada: { icon: '🔑', label: 'Licencia activada', tile: 'from-emerald-500 to-teal-600', pill: 'bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-400/25' },
    licencia_invalida: { icon: '⛔', label: 'Licencia inválida', tile: 'from-rose-500 to-red-600', pill: 'bg-rose-500/15 text-rose-300 ring-1 ring-rose-400/25' },
    reset_total: { icon: '💥', label: 'Reset total', tile: 'from-violet-500 to-purple-600', pill: 'bg-violet-500/15 text-violet-300 ring-1 ring-violet-400/25' },
    datos_borrados: { icon: '🧹', label: 'Datos borrados', tile: 'from-orange-500 to-red-600', pill: 'bg-orange-500/15 text-orange-300 ring-1 ring-orange-400/25' },
    backup_exportado: { icon: '📤', label: 'Backup exportado', tile: 'from-sky-500 to-blue-600', pill: 'bg-sky-500/15 text-sky-300 ring-1 ring-sky-400/25' },
    backup_importado: { icon: '📥', label: 'Backup importado', tile: 'from-emerald-500 to-teal-600', pill: 'bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-400/25' },
    tasa_editada: { icon: '💱', label: 'Tasa editada', tile: 'from-cyan-500 to-blue-600', pill: 'bg-cyan-500/15 text-cyan-300 ring-1 ring-cyan-400/25' },
    categoria_creada: { icon: '📂', label: 'Categoría creada', tile: 'from-blue-500 to-indigo-600', pill: 'bg-blue-500/15 text-blue-300 ring-1 ring-blue-400/25' },
    categoria_editada: { icon: '✏️', label: 'Categoría editada', tile: 'from-cyan-500 to-blue-600', pill: 'bg-cyan-500/15 text-cyan-300 ring-1 ring-cyan-400/25' },
    categoria_eliminada: { icon: '🗑️', label: 'Categoría eliminada', tile: 'from-rose-500 to-red-600', pill: 'bg-rose-500/15 text-rose-300 ring-1 ring-rose-400/25' },
    producto_creado: { icon: '📦', label: 'Producto creado', tile: 'from-emerald-500 to-teal-600', pill: 'bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-400/25' },
    producto_editado: { icon: '✏️', label: 'Producto editado', tile: 'from-amber-500 to-orange-600', pill: 'bg-amber-500/15 text-amber-300 ring-1 ring-amber-400/25' },
    producto_eliminado: { icon: '🗑️', label: 'Producto eliminado', tile: 'from-rose-500 to-red-600', pill: 'bg-rose-500/15 text-rose-300 ring-1 ring-rose-400/25' },
};

const getTipo = (t: TipoLogSeguridad) =>
    TIPO_INFO[t] ?? { icon: '📋', label: t, tile: 'from-slate-400 to-slate-600', pill: 'bg-slate-500/15 text-slate-300 ring-1 ring-slate-400/25' };

type FiltroTipo = 'todos' | 'login' | 'usuarios' | 'licencia' | 'datos';

const FILTROS: { id: FiltroTipo; label: string; icon: string }[] = [
    { id: 'todos', label: 'Todos', icon: '📋' },
    { id: 'login', label: 'Accesos', icon: '🔐' },
    { id: 'usuarios', label: 'Usuarios', icon: '👤' },
    { id: 'licencia', label: 'Licencia', icon: '🔑' },
    { id: 'datos', label: 'Datos', icon: '💾' },
];

const coincideFiltro = (tipo: TipoLogSeguridad, filtro: FiltroTipo): boolean => {
    if (filtro === 'todos') return true;
    if (filtro === 'login') return tipo === 'login_ok' || tipo === 'login_fallido' || tipo === 'logout';
    if (filtro === 'usuarios') return tipo.startsWith('usuario_');
    if (filtro === 'licencia') return tipo === 'licencia_activada' || tipo === 'licencia_invalida' || tipo === 'acceso_denegado';
    if (filtro === 'datos') return tipo === 'reset_total' || tipo === 'datos_borrados' || tipo === 'backup_exportado' || tipo === 'backup_importado' || tipo === 'tasa_editada';
    return true;
};

export default function LogsSeguridad({ usuarioActual: _ }: LogsSeguridadProps) {
    const [logs, setLogs] = useState<LogSeguridad[]>([]);
    const [filtro, setFiltro] = useState<FiltroTipo>('todos');
    const [busqueda, setBusqueda] = useState('');
    const [cargando, setCargando] = useState(true);

    useEffect(() => { cargarLogs(); }, []);

    const cargarLogs = async () => {
        setCargando(true);
        const todos = await db.logsSeguridad.toArray();
        todos.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
        setLogs(todos);
        setCargando(false);
    };

    const limpiarAntiguos = async () => {
        if (!confirm('¿Borrar logs con más de 90 días de antigüedad?')) return;
        const n = await limpiarLogsAntiguos(90);
        alert(n > 0 ? `✅ ${n} logs antiguos borrados` : 'No hay logs antiguos');
        cargarLogs();
    };

    const borrarTodos = async () => {
        if (!confirm('⚠️ ¿Borrar TODOS los logs? Esta acción no se puede deshacer.')) return;
        await db.logsSeguridad.clear();
        cargarLogs();
    };

    const filtrados = logs.filter((l) => {
        if (!coincideFiltro(l.tipo, filtro)) return false;
        if (busqueda) {
            const b = busqueda.toLowerCase();
            return (
                l.descripcion.toLowerCase().includes(b) ||
                (l.usuarioNombre && l.usuarioNombre.toLowerCase().includes(b)) ||
                (l.detalles && l.detalles.toLowerCase().includes(b))
            );
        }
        return true;
    });

    // Stats
    const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
    const logsHoy = logs.filter((l) => new Date(l.fecha) >= hoy);
    const loginsFallidos = logs.filter((l) => l.tipo === 'login_fallido').length;
    const accesosDenegados = logs.filter((l) => l.tipo === 'acceso_denegado').length;

    const formatearFecha = (f: Date) => {
        const d = new Date(f);
        return d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' }) + ' · ' +
            d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
    };

    return (
        <div className={pageWrap}>
            <style>{STYLES}</style>
            <BackgroundBlobs />

            <div className="relative mx-auto max-w-5xl">
                <div className={`cc-fade-up mb-4 md:mb-6 ${cardPadded}`}>
                    <div className="flex items-center justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-3">
                            <div className="hidden h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-rose-500 to-red-600 text-2xl shadow-md ring-2 ring-white/10 md:flex">🔐</div>
                            <div className="min-w-0">
                                <h1 className={`${titleGradient} truncate text-xl md:text-3xl`}>Seguridad</h1>
                                <p className="truncate text-xs text-gray-400 md:text-sm">Registro de eventos y auditoría</p>
                            </div>
                        </div>
                        <div className="flex shrink-0 gap-2">
                            <button onClick={limpiarAntiguos}
                                className="rounded-xl border border-white/10 bg-slate-800/60 px-3 py-2 text-xs font-bold text-gray-300 transition-colors hover:border-amber-400/40 hover:bg-amber-500/10 hover:text-amber-300 md:px-4 md:text-sm">
                                🧹 Limpiar
                            </button>
                            <button onClick={borrarTodos}
                                className="rounded-xl border border-rose-400/25 bg-rose-500/10 px-3 py-2 text-xs font-bold text-rose-300 transition-colors hover:bg-rose-500/20 md:px-4 md:text-sm">
                                🗑️ Borrar
                            </button>
                        </div>
                    </div>
                </div>

                {/* Stats */}
                <div className="mb-4 grid grid-cols-2 gap-3 md:mb-6 md:grid-cols-4 md:gap-4">
                    <MetricCard icon="📋" label="Total" value={`${logs.length}`} sub="Eventos" tile="from-slate-500 to-slate-700" />
                    <MetricCard icon="📅" label="Hoy" value={`${logsHoy.length}`} sub="Eventos" tile="from-blue-500 to-indigo-600" />
                    <MetricCard icon="❌" label="Login fallidos" value={`${loginsFallidos}`} sub="Total histórico" tile="from-amber-500 to-orange-600" />
                    <MetricCard icon="🔒" label="Accesos deneg." value={`${accesosDenegados}`} sub="Intentos bloqueados" tile="from-rose-500 to-red-600" />
                </div>

                {/* Filtros */}
                <div className={`${card} cc-fade-up mb-4 p-3 md:mb-6 md:p-4`}>
                    <div className="mb-3 flex flex-wrap gap-2">
                        {FILTROS.map((f) => (
                            <button key={f.id} onClick={() => setFiltro(f.id)} className={filterPill(filtro === f.id)}>
                                <span>{f.icon}</span>
                                <span>{f.label}</span>
                            </button>
                        ))}
                    </div>
                    <input type="text" placeholder="🔍 Buscar por descripción, usuario o detalle..."
                        value={busqueda} onChange={(e) => setBusqueda(e.target.value)} className={input} />
                </div>

                {/* Lista */}
                <div className={`${card} cc-fade-up p-3 md:p-5`}>
                    <h2 className={`${sectionTitle} mb-3 md:mb-4`}>Eventos ({filtrados.length})</h2>

                    {cargando ? (
                        <div className="flex items-center justify-center gap-3 py-12">
                            <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500/30 border-t-blue-500" />
                            <p className="text-sm text-gray-400">Cargando…</p>
                        </div>
                    ) : filtrados.length === 0 ? (
                        <EmptyState icon="🔍" texto={busqueda || filtro !== 'todos' ? 'Sin eventos que coincidan' : 'Aún no hay eventos registrados'} />
                    ) : (
                        <div className="space-y-2 md:space-y-3">
                            {filtrados.map((l) => {
                                const info = getTipo(l.tipo);
                                return (
                                    <div key={l.id} className="rounded-xl border border-white/10 bg-slate-800/50 p-3 transition-colors duration-150 hover:border-blue-400/30 md:p-4">
                                        <div className="flex items-start gap-3">
                                            <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${info.tile} text-lg shadow-md ring-2 ring-white/10 md:h-11 md:w-11 md:text-xl`}>
                                                {info.icon}
                                            </span>
                                            <div className="min-w-0 flex-1">
                                                <div className="mb-1 flex flex-wrap items-center gap-2">
                                                    <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${info.pill}`}>
                                                        {info.label}
                                                    </span>
                                                    <span className="text-[11px] text-gray-500">{formatearFecha(l.fecha)}</span>
                                                </div>
                                                <p className="text-sm font-semibold text-gray-100 md:text-base">{l.descripcion}</p>
                                                {l.usuarioNombre && (
                                                    <p className="mt-0.5 text-xs text-gray-400">
                                                        👤 <span className="font-semibold text-gray-300">{l.usuarioNombre}</span>
                                                    </p>
                                                )}
                                                {l.detalles && (
                                                    <p className="mt-1 rounded-lg bg-slate-900/60 px-2 py-1 font-mono text-[11px] text-gray-400 md:text-xs">
                                                        {l.detalles}
                                                    </p>
                                                )}
                                            </div>
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