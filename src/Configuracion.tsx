import { useState, useEffect } from 'react';
import { db } from './db';
import type { Usuario } from './db';
import { activarLicencia, obtenerInfoLicencia } from './utils/trialUtils';
import { registrarLog } from './utils/logger';
import {
    STYLES, BackgroundBlobs, pageWrap, card, cardPadded, titleGradient,
    sectionTitle, input, label,
} from './theme';

interface ConfiguracionProps {
    usuarioActual: Usuario;
}

export default function Configuracion({ usuarioActual: _ }: ConfiguracionProps) {
    const [confirmarBorrar, setConfirmarBorrar] = useState(false);

    // ===== Estado de licencia =====
    const [esMaster, setEsMaster] = useState(false);
    const [yaActivada, setYaActivada] = useState(false);
    const [diasRestantes, setDiasRestantes] = useState(15);

    // ===== Activación =====
    const [codigo, setCodigo] = useState('');
    const [activando, setActivando] = useState(false);
    const [msgActivacion, setMsgActivacion] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null);

    // ===== Reset de desarrollo =====
    const [confirmarReset, setConfirmarReset] = useState(false);
    const [reseteando, setReseteando] = useState(false);

    useEffect(() => {
        obtenerInfoLicencia().then((info) => {
            setEsMaster(info.esMaster);
            setYaActivada(info.activa);
            setDiasRestantes(info.diasRestantes);
        });
    }, []);

    // ===== Backup =====
    const exportarBackup = async () => {
        const datos = {
            categorias: await db.categorias.toArray(),
            productos: await db.productos.toArray(),
            ventas: await db.ventas.toArray(),
            clientes: await db.clientes.toArray(),
            usuarios: await db.usuarios.toArray(),
            tasasCambio: await db.tasasCambio.toArray(),
            fecha: new Date().toISOString(),
        };
        const blob = new Blob([JSON.stringify(datos, null, 2)], { type: 'application/json' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `backup_cuentaclara_${new Date().toISOString().split('T')[0]}.json`;
        link.click();
        await registrarLog('backup_exportado', 'Backup exportado', {
            usuarioNombre: 'Admin',
        });
        alert('✅ Backup exportado');
    };

    const importarBackup = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const text = await file.text();
        try {
            const datos = JSON.parse(text);
            if (confirm('⚠️ Esto reemplazará todos los datos actuales. ¿Continuar?')) {
                await db.categorias.clear();
                await db.productos.clear();
                await db.ventas.clear();
                await db.clientes.clear();
                await db.tasasCambio.clear();
                if (datos.categorias) await db.categorias.bulkAdd(datos.categorias);
                if (datos.productos) await db.productos.bulkAdd(datos.productos);
                if (datos.ventas) await db.ventas.bulkAdd(datos.ventas);
                if (datos.clientes) await db.clientes.bulkAdd(datos.clientes);
                if (datos.tasasCambio) await db.tasasCambio.bulkAdd(datos.tasasCambio);
                alert('✅ Backup importado');
                await registrarLog('backup_importado', 'Backup importado (datos reemplazados)', {
                    usuarioNombre: 'Admin',
                });
                window.location.reload();
            }
        } catch { alert('❌ Error al importar backup'); }
    };

    // ===== Borrar solo datos de negocio (mantiene usuarios y licencia) =====
    const borrarTodo = async () => {
        if (!confirmarBorrar) { setConfirmarBorrar(true); return; }
        if (confirm('⚠️ ¿ESTÁS SEGURO? Esto borrará TODOS los datos de negocio permanentemente')) {
            await db.categorias.clear();
            await db.productos.clear();
            await db.ventas.clear();
            await db.clientes.clear();
            await db.tasasCambio.clear();
            await db.movimientosInventario.clear();
            await db.cierres.clear();
            await db.devoluciones.clear();
            await registrarLog('datos_borrados', 'Datos de negocio borrados desde Configuración', {
                usuarioNombre: 'Admin',
                detalles: 'Categorías, productos, ventas, clientes, tasas, movimientos, cierres, devoluciones',
            });
            alert('✅ Datos de negocio borrados');
            window.location.reload();
        }
    };
    // ===== RESET TOTAL (borra trial + licencia + todo) — para desarrollo =====
    const resetTotal = async () => {
        if (!confirmarReset) { setConfirmarReset(true); return; }
        if (!confirm('⚠️⚠️ RESET TOTAL\n\nEsto borrará TODO:\n• Base de datos completa\n• Trial y licencia\n• LocalStorage\n\nLa app quedará como recién instalada.\n\n¿Continuar?')) return;
        setReseteando(true);
        try {
            await registrarLog('reset_total', 'Reset total de la app ejecutado', {
                usuarioNombre: 'Admin',
                detalles: 'Base de datos completa borrada. App volverá a estado inicial.',
            });
            // 1. Cerrar y borrar Dexie (esto libera la conexión)
            await db.close();
            await db.delete();
            // 2. Limpiar storages
            localStorage.clear();
            sessionStorage.clear();
            // 3. Recargar
            window.location.reload();
        } catch (err) {
            console.error(err);
            alert('❌ Error al resetear. Abre DevTools y revisa la consola.');
            setReseteando(false);
            setConfirmarReset(false);
        }
    };

    // ===== Activación de licencia =====
    const manejarActivacion = async () => {
        if (!codigo.trim()) {
            setMsgActivacion({ tipo: 'error', texto: 'Introduce un código' });
            return;
        }
        setActivando(true);
        setMsgActivacion(null);
        const res = await activarLicencia(codigo);
        setActivando(false);
        if (res.ok) {
            setMsgActivacion({ tipo: 'ok', texto: '¡Licencia activada! Recargando…' });
            setTimeout(() => window.location.reload(), 1200);
        } else {
            setMsgActivacion({ tipo: 'error', texto: res.error ?? 'Código inválido' });
        }
    };

    const formatearCodigo = (raw: string) => {
        const clean = raw.toUpperCase().replace(/[^A-Z0-9]/g, '');
        const body = clean.startsWith('CC') ? clean.slice(2) : clean;
        const bloques = body.slice(0, 16).match(/.{1,4}/g) ?? [];
        const base = bloques.join('-');
        return clean.startsWith('CC') ? (base ? `CC-${base}` : 'CC') : base;
    };

    // ===== Badge de estado =====
    const estadoLic = (() => {
        if (esMaster) return { icon: '👑', titulo: 'Instalación Master', desc: 'Esta instalación es del desarrollador. Acceso total desbloqueado.', color: 'from-violet-500 to-purple-600' };
        if (yaActivada) return { icon: '✅', titulo: 'Licencia Activa', desc: 'Tu licencia está activada permanentemente.', color: 'from-emerald-500 to-teal-600' };
        return { icon: '⏳', titulo: 'Prueba Gratuita', desc: `Te quedan ${diasRestantes} día${diasRestantes !== 1 ? 's' : ''} de prueba gratuita.`, color: 'from-amber-500 to-orange-600' };
    })();

    return (
        <div className={pageWrap}>
            <style>{STYLES}</style>
            <BackgroundBlobs />

            <div className="relative mx-auto max-w-2xl">
                <div className={`cc-fade-up mb-4 md:mb-6 ${cardPadded}`}>
                    <div className="flex items-center gap-3">
                        <div className="hidden h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-slate-500 to-slate-700 text-2xl shadow-md ring-2 ring-white/10 md:flex">⚙️</div>
                        <div className="min-w-0">
                            <h1 className={`${titleGradient} truncate text-xl md:text-3xl`}>Configuración</h1>
                            <p className="truncate text-xs text-gray-400 md:text-sm">Ajustes del sistema</p>
                        </div>
                    </div>
                </div>

                <div className="space-y-3 md:space-y-4">

                    {/* ===== ESTADO DE LICENCIA ===== */}
                    <div className={`${card} cc-fade-up p-4 md:p-6`}>
                        <div className="mb-3 flex items-center gap-3">
                            <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${estadoLic.color} text-xl shadow-md ring-2 ring-white/10`}>
                                {estadoLic.icon}
                            </span>
                            <div className="min-w-0">
                                <h2 className={`${sectionTitle}`}>{estadoLic.titulo}</h2>
                                <p className="text-xs text-gray-400 md:text-sm">{estadoLic.desc}</p>
                            </div>
                        </div>

                        {!yaActivada && !esMaster && (
                            <>
                                <div className="mb-3">
                                    <label className={label}>Introducir código de licencia</label>
                                    <input
                                        type="text"
                                        value={codigo}
                                        onChange={(e) => { setCodigo(formatearCodigo(e.target.value)); setMsgActivacion(null); }}
                                        placeholder="CC-XXXX-XXXX-XXXX-XXXX"
                                        className={`${input} text-center font-mono font-black tracking-wider`}
                                    />
                                </div>

                                {msgActivacion && (
                                    <div className={`mb-3 flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-bold ${msgActivacion.tipo === 'ok'
                                        ? 'bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-400/25'
                                        : 'bg-rose-500/15 text-rose-300 ring-1 ring-rose-400/25'
                                        }`}>
                                        <span>{msgActivacion.tipo === 'ok' ? '✅' : '⚠️'}</span>
                                        <span>{msgActivacion.texto}</span>
                                    </div>
                                )}

                                <button
                                    onClick={manejarActivacion}
                                    disabled={activando}
                                    className="w-full rounded-xl bg-gradient-to-r from-amber-500 via-orange-600 to-rose-600 py-3 text-sm font-black text-white shadow-md shadow-orange-500/30 transition-transform hover:-translate-y-0.5 disabled:opacity-60 md:text-base">
                                    {activando ? 'Validando…' : '🔓 Activar Licencia'}
                                </button>
                            </>
                        )}
                    </div>

                    {/* ===== BACKUP ===== */}
                    <div className={`${card} cc-fade-up p-4 md:p-6`}>
                        <h2 className={`${sectionTitle} mb-2`}>💾 Backup de Datos</h2>
                        <p className="mb-3 text-xs text-gray-400 md:text-sm">Exporta o importa todos los datos de la app</p>
                        <div className="flex flex-col gap-2 md:flex-row">
                            <button onClick={exportarBackup} className="flex-1 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 py-3 text-sm font-bold text-white shadow-md shadow-blue-500/25 transition-transform hover:-translate-y-0.5 md:text-base">
                                📤 Exportar Backup
                            </button>
                            <label className="flex-1 cursor-pointer rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 py-3 text-center text-sm font-bold text-white shadow-md shadow-emerald-500/25 transition-transform hover:-translate-y-0.5 md:text-base">
                                📥 Importar Backup
                                <input type="file" accept=".json" onChange={importarBackup} className="hidden" />
                            </label>
                        </div>
                    </div>

                    {/* ===== ZONA PELIGROSA: borrar datos de negocio ===== */}
                    <div className="cc-fade-up rounded-2xl border border-rose-400/25 bg-rose-500/5 p-4 shadow-lg shadow-black/30 md:p-6">
                        <h2 className="mb-2 text-base font-bold text-rose-300 md:text-lg">⚠️ Borrar Datos de Negocio</h2>
                        <p className="mb-3 text-xs text-gray-400 md:text-sm">
                            Borra productos, ventas, clientes, etc. <strong className="text-rose-200">No toca usuarios ni licencia.</strong>
                        </p>
                        <button onClick={borrarTodo}
                            className={`w-full rounded-xl py-3 text-sm font-bold transition-all duration-150 md:text-base ${confirmarBorrar
                                ? 'bg-gradient-to-r from-rose-500 to-red-600 text-white shadow-md shadow-rose-500/30 hover:-translate-y-0.5'
                                : 'border border-rose-400/30 bg-rose-500/10 text-rose-300 hover:bg-rose-500/20'
                                }`}>
                            {confirmarBorrar ? '⚠️ Confirmar: Borrar Datos' : '🗑️ Borrar Datos de Negocio'}
                        </button>
                        {confirmarBorrar && (
                            <button onClick={() => setConfirmarBorrar(false)} className="mt-2 w-full rounded-xl border border-white/10 bg-slate-800/60 py-2 text-sm font-bold text-gray-300 transition-colors hover:bg-slate-800">
                                Cancelar
                            </button>
                        )}
                    </div>

                    {/* ===== ZONA DEV: reset total ===== */}
                    <div className="cc-fade-up rounded-2xl border border-violet-400/25 bg-violet-500/5 p-4 shadow-lg shadow-black/30 md:p-6">
                        <h2 className="mb-2 text-base font-bold text-violet-300 md:text-lg">🛠️ Reset Total (Desarrollo)</h2>
                        <p className="mb-3 text-xs text-gray-400 md:text-sm">
                            Borra <strong className="text-violet-200">TODO</strong>: base de datos, trial, licencia y localStorage. La app quedará como recién instalada (verás el WelcomeScreen de nuevo). Útil para probar el flujo completo.
                        </p>
                        <button onClick={resetTotal}
                            disabled={reseteando}
                            className={`w-full rounded-xl py-3 text-sm font-bold transition-all duration-150 md:text-base ${reseteando
                                ? 'bg-slate-700 text-gray-400 cursor-not-allowed'
                                : confirmarReset
                                    ? 'bg-gradient-to-r from-violet-500 to-purple-600 text-white shadow-md shadow-violet-500/30 hover:-translate-y-0.5'
                                    : 'border border-violet-400/30 bg-violet-500/10 text-violet-300 hover:bg-violet-500/20'
                                }`}>
                            {reseteando ? 'Reseteando…' : confirmarReset ? '⚠️ Confirmar: RESET TOTAL' : '🔄 Reset Total de la App'}
                        </button>
                        {confirmarReset && !reseteando && (
                            <button onClick={() => setConfirmarReset(false)} className="mt-2 w-full rounded-xl border border-white/10 bg-slate-800/60 py-2 text-sm font-bold text-gray-300 transition-colors hover:bg-slate-800">
                                Cancelar
                            </button>
                        )}
                    </div>

                    {/* ===== INFO ===== */}
                    <div className={`${card} cc-fade-up p-4 md:p-6`}>
                        <h2 className={`${sectionTitle} mb-2`}>ℹ️ Información</h2>
                        <div className="space-y-1.5 text-xs text-gray-400 md:text-sm">
                            <p><strong className="text-gray-200">Versión:</strong> 1.0.0</p>
                            <p><strong className="text-gray-200">Base de datos:</strong> IndexedDB (local)</p>
                            <p><strong className="text-gray-200">Modo:</strong> 100% Offline</p>
                            <p><strong className="text-gray-200">Desarrollado por:</strong> CuentaClara</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}