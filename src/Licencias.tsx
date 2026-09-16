import { useState, useEffect } from 'react';
import { db } from './db';
import type { Usuario } from './db';
import { generarCodigoLicencia } from './utils/licenciaUtils';
import { registrarLog } from './utils/logger';
import { obtenerInfoLicencia } from './utils/trialUtils';
import {
    STYLES, BackgroundBlobs, pageWrap, card, cardPadded, titleGradient,
    btnPrimary, input, label, sectionTitle, filterPill,

    MetricCard, EmptyState,
} from './theme';

interface Licencia {
    id?: number;
    codigo: string;
    cliente: string;
    fechaCreacion: Date;
    fechaActivacion: Date | null;
    estado: 'disponible' | 'activada' | 'vendida';
    plan: 'mensual' | 'anual';
}

interface LicenciasProps {
    usuarioActual: Usuario;
}

const PLANES = [
    { id: 'mensual', label: 'Mensual', precio: '500 CUP', icon: '📅', tile: 'from-blue-500 to-indigo-600' },
    { id: 'anual', label: 'Anual', precio: '5.000 CUP', icon: '⭐', tile: 'from-amber-500 to-orange-600' },
] as const;

const ESTADO_INFO: Record<string, { label: string; pill: string; dot: string }> = {
    disponible: { label: 'Disponible', pill: 'bg-amber-500/15 text-amber-300 ring-1 ring-amber-400/25', dot: 'bg-amber-400' },
    vendida: { label: 'Vendida', pill: 'bg-blue-500/15 text-blue-300 ring-1 ring-blue-400/25', dot: 'bg-blue-400' },
    activada: { label: 'Activada', pill: 'bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-400/25', dot: 'bg-emerald-400' },
};

export default function Licencias({ usuarioActual: _ }: LicenciasProps) {
    const [licencias, setLicencias] = useState<Licencia[]>([]);
    const [clienteNombre, setClienteNombre] = useState('');
    const [plan, setPlan] = useState<'mensual' | 'anual'>('anual');
    const [filtroEstado, setFiltroEstado] = useState<'todas' | 'disponible' | 'vendida' | 'activada'>('todas');
    const [codigoCopiado, setCodigoCopiado] = useState<string | null>(null);
    const [codigoRecienCreado, setCodigoRecienCreado] = useState<string | null>(null);
    const [accesoMaster, setAccesoMaster] = useState<boolean | null>(null);

    useEffect(() => { cargarLicencias(); }, []);

    // Verifica si esta instalación es del desarrollador (master)
    useEffect(() => {
        obtenerInfoLicencia().then((info) => {
            setAccesoMaster(info.esMaster);
            if (!info.esMaster) {
                registrarLog('acceso_denegado', 'Intento de acceso al panel de Licencias sin ser master', {
                    usuarioNombre: 'Sistema',
                });
            }
        });
    }, []);

    const cargarLicencias = async () => {
        const todas = await db.licencias.toArray();
        todas.sort((a, b) => new Date(b.fechaCreacion).getTime() - new Date(a.fechaCreacion).getTime());
        setLicencias(todas);
    };

    const crearLicencia = async () => {
        if (!clienteNombre.trim()) { alert('Escribe el nombre del cliente o negocio'); return; }
        const codigo = generarCodigoLicencia();
        await db.licencias.add({
            codigo, cliente: clienteNombre.trim(),
            fechaCreacion: new Date(), fechaActivacion: null,
            estado: 'vendida', plan,
        });
        setCodigoRecienCreado(codigo);
        setClienteNombre('');
        cargarLicencias();
    };

    const copiarCodigo = async (codigo: string) => {
        try {
            await navigator.clipboard.writeText(codigo);
            setCodigoCopiado(codigo);
            setTimeout(() => setCodigoCopiado(null), 1800);
        } catch { alert(`Código: ${codigo}`); }
    };

    const eliminarLicencia = async (id: number) => {
        if (confirm('¿Eliminar esta licencia?')) { await db.licencias.delete(id); cargarLicencias(); }
    };

    // ===== GATE: verificando acceso =====
    if (accesoMaster === null) {
        return (
            <div className={pageWrap}>
                <style>{STYLES}</style>
                <BackgroundBlobs />
                <div className="relative flex min-h-[60vh] items-center justify-center">
                    <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-500/30 border-t-blue-500" />
                </div>
            </div>
        );
    }

    // ===== GATE: no es master → acceso restringido =====
    if (!accesoMaster) {
        return (
            <div className={pageWrap}>
                <style>{STYLES}</style>
                <BackgroundBlobs />
                <div className="relative mx-auto flex min-h-[60vh] max-w-md items-center">
                    <div className={`${cardPadded} w-full text-center`}>
                        <div className="mb-4 flex justify-center">
                            <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-br from-rose-500 to-red-600 text-3xl shadow-lg shadow-rose-500/30 ring-4 ring-white/10">
                                🔒
                            </div>
                        </div>
                        <h1 className="mb-2 text-xl font-black text-gray-100">Acceso restringido</h1>
                        <p className="text-sm text-gray-400">
                            El panel de generación de licencias es exclusivo del desarrollador.
                            Si necesitas asistencia, contacta al vendedor.
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    // ===== UI normal (solo master) =====
    const disponibles = licencias.filter(l => l.estado === 'disponible');
    const vendidas = licencias.filter(l => l.estado === 'vendida');
    const activadas = licencias.filter(l => l.estado === 'activada');

    const filtradas = filtroEstado === 'todas'
        ? licencias
        : licencias.filter(l => l.estado === filtroEstado);

    const filtros = [
        { id: 'todas' as const, label: `Todas (${licencias.length})`, icon: '📋' },
        { id: 'disponible' as const, label: `Disponibles (${disponibles.length})`, icon: '⏳' },
        { id: 'vendida' as const, label: `Vendidas (${vendidas.length})`, icon: '💳' },
        { id: 'activada' as const, label: `Activadas (${activadas.length})`, icon: '✅' },
    ];

    return (
        <div className={pageWrap}>
            <style>{STYLES}</style>
            <BackgroundBlobs />

            <div className="relative mx-auto max-w-5xl">
                <div className={`cc-fade-up mb-4 md:mb-6 ${cardPadded}`}>
                    <div className="flex items-center gap-3">
                        <div className="hidden h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 text-2xl shadow-md ring-2 ring-white/10 md:flex">🔑</div>
                        <div className="min-w-0">
                            <h1 className={`${titleGradient} truncate text-xl md:text-3xl`}>Gestión de Licencias</h1>
                            <p className="truncate text-xs text-gray-400 md:text-sm">Genera y administra códigos de activación</p>
                        </div>
                    </div>
                </div>

                <div className="mb-4 grid grid-cols-3 gap-3 md:mb-6 md:gap-4">
                    <MetricCard icon="⏳" label="Disponibles" value={`${disponibles.length}`} sub="Sin vender" tile="from-amber-500 to-orange-600" />
                    <MetricCard icon="💳" label="Vendidas" value={`${vendidas.length}`} sub="Sin activar" tile="from-blue-500 to-indigo-600" />
                    <MetricCard icon="✅" label="Activadas" value={`${activadas.length}`} sub="En uso" tile="from-emerald-500 to-teal-600" />
                </div>

                {/* Generador */}
                <div className={`${card} cc-fade-up mb-4 p-4 md:mb-6 md:p-6`}>
                    <h2 className={`${sectionTitle} mb-4`}>✨ Generar Nueva Licencia</h2>
                    <div className="space-y-4">
                        <div>
                            <label className={label}>Cliente o negocio</label>
                            <input type="text" placeholder="Ej: Bodega La Esquina"
                                value={clienteNombre}
                                onChange={(e) => setClienteNombre(e.target.value)}
                                className={input} />
                        </div>

                        <div>
                            <label className={label}>Plan</label>
                            <div className="grid grid-cols-2 gap-3">
                                {PLANES.map((p) => {
                                    const activo = plan === p.id;
                                    return (
                                        <button key={p.id} type="button" onClick={() => setPlan(p.id)}
                                            className={`flex items-center gap-3 rounded-xl border p-3 text-left transition-all duration-150 ${activo
                                                ? 'border-blue-400/60 bg-gradient-to-br from-blue-500/15 to-indigo-500/10 shadow-md shadow-blue-500/10'
                                                : 'border-white/10 bg-slate-800/50 hover:border-blue-400/40'
                                                }`}>
                                            <span className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${p.tile} text-lg shadow-md`}>
                                                {p.icon}
                                            </span>
                                            <div className="min-w-0">
                                                <p className={`text-sm font-bold ${activo ? 'text-blue-200' : 'text-gray-200'}`}>{p.label}</p>
                                                <p className="text-xs text-gray-400">{p.precio}</p>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        <button onClick={crearLicencia} className={`${btnPrimary} w-full py-3.5 text-base md:py-4`}>
                            🔑 Generar Código
                        </button>
                    </div>
                </div>

                {/* Código recién creado */}
                {codigoRecienCreado && (
                    <div className="cc-fade-up mb-4 rounded-2xl border border-emerald-400/25 bg-emerald-500/10 p-4 md:mb-6 md:p-5">
                        <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 flex-1">
                                <p className="mb-1 text-xs font-bold uppercase tracking-wider text-emerald-300">✅ Licencia generada</p>
                                <p className="break-all font-mono text-sm font-black text-emerald-200 md:text-lg">{codigoRecienCreado}</p>
                                <p className="mt-1 text-xs text-emerald-300/80">Envíale este código a tu cliente por WhatsApp</p>
                            </div>
                            <button onClick={() => setCodigoRecienCreado(null)}
                                className="text-2xl text-emerald-300/70 hover:text-emerald-200">✕</button>
                        </div>
                        <button onClick={() => copiarCodigo(codigoRecienCreado)}
                            className="mt-3 w-full rounded-xl bg-emerald-500/20 py-2.5 text-sm font-bold text-emerald-200 transition-colors hover:bg-emerald-500/30">
                            {codigoCopiado === codigoRecienCreado ? '✅ ¡Copiado!' : '📋 Copiar código'}
                        </button>
                    </div>
                )}

                {/* Filtros */}
                <div className={`${card} cc-fade-up mb-4 p-3 md:mb-6 md:p-4`}>
                    <div className="flex flex-wrap gap-2">
                        {filtros.map((f) => (
                            <button key={f.id} onClick={() => setFiltroEstado(f.id)} className={filterPill(filtroEstado === f.id)}>
                                <span>{f.icon}</span>
                                <span>{f.label}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Lista */}
                <div className={`${card} cc-fade-up p-4 md:p-6`}>
                    <h2 className={`${sectionTitle} mb-4`}>Licencias ({filtradas.length})</h2>
                    {filtradas.length === 0 ? (
                        <EmptyState icon="🔑" texto="No hay licencias en este filtro" />
                    ) : (
                        <div className="space-y-2 md:space-y-3">
                            {filtradas.map((licencia) => {
                                const info = ESTADO_INFO[licencia.estado];
                                const esAnual = licencia.plan === 'anual';
                                return (
                                    <div key={licencia.id} className="rounded-xl border border-white/10 bg-slate-800/50 p-3 transition-colors duration-150 hover:border-blue-400/30 md:p-4">
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="min-w-0 flex-1">
                                                <div className="mb-1 flex items-center gap-2">
                                                    <span className={`h-2 w-2 shrink-0 rounded-full ${info.dot}`} />
                                                    <p className="break-all font-mono text-sm font-black text-gray-100 md:text-base">
                                                        {licencia.codigo}
                                                    </p>
                                                </div>
                                                <p className="truncate text-xs text-gray-300 md:text-sm">
                                                    👤 <strong className="text-gray-200">{licencia.cliente}</strong>
                                                </p>
                                                <div className="mt-1.5 flex flex-wrap items-center gap-2">
                                                    <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${info.pill}`}>
                                                        {info.label}
                                                    </span>
                                                    <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${esAnual
                                                        ? 'bg-amber-500/15 text-amber-300 ring-1 ring-amber-400/25'
                                                        : 'bg-sky-500/15 text-sky-300 ring-1 ring-sky-400/25'
                                                        }`}>
                                                        {esAnual ? '⭐ Anual' : '📅 Mensual'}
                                                    </span>
                                                </div>
                                                <p className="mt-1.5 text-[11px] text-gray-500">
                                                    {new Date(licencia.fechaCreacion).toLocaleDateString('es-ES')}
                                                    {licencia.fechaActivacion && ` → ${new Date(licencia.fechaActivacion).toLocaleDateString('es-ES')}`}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="mt-3 flex flex-wrap gap-2">
                                            <button onClick={() => copiarCodigo(licencia.codigo)}
                                                className="flex-1 rounded-lg border border-blue-400/20 bg-blue-500/10 px-3 py-2 text-xs font-bold text-blue-300 transition-colors hover:bg-blue-500/20 md:flex-none md:text-sm">
                                                {codigoCopiado === licencia.codigo ? '✅ Copiado' : '📋 Copiar'}
                                            </button>
                                            <button onClick={() => eliminarLicencia(licencia.id!)}
                                                className="rounded-lg border border-rose-400/20 bg-rose-500/10 px-3 py-2 text-xs font-bold text-rose-300 transition-colors hover:bg-rose-500/20 md:text-sm">
                                                🗑️
                                            </button>
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