import { useState, useEffect, useRef } from 'react';
import { db } from './db';
import type { TasaCambio, Usuario } from './db';
import {
    STYLES, BackgroundBlobs, pageWrap, card, cardPadded, titleGradient,
    input, label,
    modalOverlay, modalPanel, modalHeader, modalTitle, modalClose,
    btnPrimary, EmptyState,
} from './theme';

interface TasasCambioProps { usuarioActual: Usuario; }

type Moneda = 'USD' | 'EUR' | 'MLC';

const MONEDA_INFO: Record<Moneda, { icon: string; nombre: string; tile: string }> = {
    USD: { icon: '🇺🇸', nombre: 'Dólar estadounidense', tile: 'from-emerald-500 to-teal-600' },
    EUR: { icon: '🇪🇺', nombre: 'Euro', tile: 'from-blue-500 to-indigo-600' },
    MLC: { icon: '💳', nombre: 'MLC', tile: 'from-violet-500 to-purple-600' },
};

const MONEDAS_ORDEN: Moneda[] = ['USD', 'EUR', 'MLC'];

const getMoneda = (m: string) =>
    MONEDA_INFO[m as Moneda] ?? { icon: '💰', nombre: m, tile: 'from-slate-400 to-slate-600' };

export default function TasasCambio({ usuarioActual }: TasasCambioProps) {
    const [tasas, setTasas] = useState<TasaCambio[]>([]);
    const [cargando, setCargando] = useState(true);

    const [editando, setEditando] = useState<TasaCambio | null>(null);
    const [nuevaTasa, setNuevaTasa] = useState('');

    const [modalCrear, setModalCrear] = useState(false);
    const [nuevaMoneda, setNuevaMoneda] = useState<Moneda>('USD');
    const [tasaInicial, setTasaInicial] = useState('');

    // 🛡️ Guard para evitar doble ejecución (React StrictMode en dev)
    const inicializadoRef = useRef(false);

    useEffect(() => {
        if (inicializadoRef.current) return;
        inicializadoRef.current = true;
        inicializar();
    }, []);

    /**
     * Carga la lista de tasas.
     * - Verifica moneda por moneda y crea solo las que faltan (idempotente).
     * - Si encuentra duplicados (por doble init previa), borra los antiguos.
     */
    const inicializar = async () => {
        setCargando(true);

        // 1. Leer todas
        const existentes = await db.tasasCambio.toArray();

        // 2. Detectar y borrar duplicados (por si ya los tienes)
        const porMoneda = new Map<string, TasaCambio>();
        const aBorrar: number[] = [];

        for (const t of existentes) {
            const actual = porMoneda.get(t.moneda);
            if (!actual) {
                porMoneda.set(t.moneda, t);
            } else {
                // Quedarse con el más reciente, marcar el otro para borrar
                const fechaActual = new Date(actual.fechaActualizacion).getTime();
                const fechaNueva = new Date(t.fechaActualizacion).getTime();
                if (fechaNueva > fechaActual) {
                    aBorrar.push(actual.id!);
                    porMoneda.set(t.moneda, t);
                } else {
                    aBorrar.push(t.id!);
                }
            }
        }

        if (aBorrar.length > 0) {
            await db.tasasCambio.bulkDelete(aBorrar);
        }

        // 3. Crear las monedas que falten (por si borraste alguna o es la primera vez)
        const ahora = new Date();
        for (const moneda of MONEDAS_ORDEN) {
            if (!porMoneda.has(moneda)) {
                await db.tasasCambio.add({
                    moneda,
                    tasa: 1,
                    fechaActualizacion: ahora,
                    actualizadoPor: usuarioActual.nombre,
                });
            }
        }

        // 4. Recargar la lista ya limpia
        const finales = await db.tasasCambio.toArray();
        // Ordenar según MONEDAS_ORDEN
        finales.sort((a, b) => {
            const ia = MONEDAS_ORDEN.indexOf(a.moneda as Moneda);
            const ib = MONEDAS_ORDEN.indexOf(b.moneda as Moneda);
            return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
        });
        setTasas(finales);
        setCargando(false);
    };

    const cargarTasas = async () => {
        const lista = await db.tasasCambio.toArray();
        lista.sort((a, b) => {
            const ia = MONEDAS_ORDEN.indexOf(a.moneda as Moneda);
            const ib = MONEDAS_ORDEN.indexOf(b.moneda as Moneda);
            return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
        });
        setTasas(lista);
    };

    const monedasDisponibles = MONEDAS_ORDEN.filter(
        (m) => !tasas.some((t) => t.moneda === m)
    );

    const abrirCrear = () => {
        if (monedasDisponibles.length === 0) {
            alert('Ya tienes todas las monedas registradas. Edita una existente.');
            return;
        }
        setNuevaMoneda(monedasDisponibles[0]);
        setTasaInicial('');
        setModalCrear(true);
    };

    const crearTasa = async () => {
        const valor = parseFloat(tasaInicial);
        if (!valor || valor <= 0) { alert('Ingresa una tasa válida mayor a 0'); return; }

        // Verificación final por si acaso
        const yaExiste = await db.tasasCambio.where('moneda').equals(nuevaMoneda).first();
        if (yaExiste) {
            alert(`La moneda ${nuevaMoneda} ya está registrada`);
            setModalCrear(false);
            cargarTasas();
            return;
        }

        await db.tasasCambio.add({
            moneda: nuevaMoneda,
            tasa: valor,
            fechaActualizacion: new Date(),
            actualizadoPor: usuarioActual.nombre,
        });

        setModalCrear(false);
        setTasaInicial('');
        cargarTasas();
    };

    const guardarTasa = async () => {
        if (!editando || !nuevaTasa) return;
        const valor = parseFloat(nuevaTasa);
        if (valor <= 0) { alert('Tasa inválida'); return; }
        if (editando.id) {
            await db.tasasCambio.update(editando.id, {
                tasa: valor,
                fechaActualizacion: new Date(),
                actualizadoPor: usuarioActual.nombre,
            });
        }
        setEditando(null);
        setNuevaTasa('');
        cargarTasas();
    };

    const eliminarTasa = async (t: TasaCambio) => {
        if (!confirm(`¿Eliminar la tasa de ${t.moneda}?`)) return;
        await db.tasasCambio.delete(t.id!);
        cargarTasas();
    };

    const formatearFecha = (f: Date) =>
        new Date(f).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });

    return (
        <div className={pageWrap}>
            <style>{STYLES}</style>
            <BackgroundBlobs />

            <div className="relative mx-auto max-w-2xl">
                <div className={`cc-fade-up mb-4 md:mb-6 ${cardPadded}`}>
                    <div className="flex items-center justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-3">
                            <div className="hidden h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-2xl shadow-md ring-2 ring-white/10 md:flex">
                                💱
                            </div>
                            <div className="min-w-0">
                                <h1 className={`${titleGradient} truncate text-xl md:text-3xl`}>Tasas de Cambio</h1>
                                <p className="truncate text-xs text-gray-400 md:text-sm">
                                    Configura las tasas para conversión de monedas
                                </p>
                            </div>
                        </div>
                        {monedasDisponibles.length > 0 && (
                            <button onClick={abrirCrear} className={btnPrimary}>+ Añadir</button>
                        )}
                    </div>
                </div>

                {cargando ? (
                    <div className={`${card} p-6`}>
                        <div className="flex items-center justify-center gap-3 py-8">
                            <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500/30 border-t-blue-500" />
                            <p className="text-sm text-gray-400">Cargando tasas…</p>
                        </div>
                    </div>
                ) : tasas.length === 0 ? (
                    <div className={`${card} p-6`}>
                        <EmptyState icon="💱" texto="No hay monedas configuradas" />
                        <button onClick={inicializar} className={`${btnPrimary} mt-4 w-full`}>
                            🔄 Restaurar tasas por defecto
                        </button>
                    </div>
                ) : (
                    <div className="space-y-3 md:space-y-4">
                        {tasas.map((t) => {
                            const info = getMoneda(t.moneda);
                            return (
                                <div key={t.id} className={`${card} cc-fade-up p-4 md:p-6`}>
                                    <div className="mb-3 flex items-center justify-between gap-3">
                                        <div className="flex min-w-0 items-center gap-3">
                                            <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${info.tile} text-2xl shadow-md ring-2 ring-white/10`}>
                                                {info.icon}
                                            </span>
                                            <div className="min-w-0">
                                                <h3 className="truncate text-base font-bold text-gray-100 md:text-lg">{t.moneda}</h3>
                                                <p className="truncate text-xs text-gray-400">{info.nombre}</p>
                                            </div>
                                        </div>
                                        <div className="shrink-0 text-right">
                                            <p className="text-2xl font-black text-emerald-300 md:text-3xl">
                                                ${t.tasa.toFixed(2)}
                                            </p>
                                            <p className="text-xs text-gray-500">CUP por 1 {t.moneda}</p>
                                        </div>
                                    </div>

                                    <div className="mb-3 text-[11px] text-gray-500">
                                        Actualizado: {formatearFecha(t.fechaActualizacion)} · por {t.actualizadoPor}
                                    </div>

                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => { setEditando(t); setNuevaTasa(t.tasa.toString()); }}
                                            className="flex-1 rounded-xl border border-blue-400/20 bg-blue-500/10 py-2.5 text-sm font-bold text-blue-300 transition-colors duration-150 hover:bg-blue-500/20 md:text-base"
                                        >
                                            ✏️ Editar
                                        </button>
                                        <button
                                            onClick={() => eliminarTasa(t)}
                                            className="rounded-xl border border-rose-400/20 bg-rose-500/10 px-4 py-2.5 text-sm font-bold text-rose-300 transition-colors duration-150 hover:bg-rose-500/20 md:text-base"
                                        >
                                            🗑️
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {editando && (
                    <div className={modalOverlay}>
                        <div className={modalPanel}>
                            <div className={modalHeader}>
                                <h2 className={modalTitle}>Editar tasa {editando.moneda}</h2>
                                <button onClick={() => { setEditando(null); setNuevaTasa(''); }} className={modalClose}>
                                    &times;
                                </button>
                            </div>
                            <div className="space-y-4 p-4 md:p-6">
                                <div className="rounded-xl border border-white/10 bg-slate-800/50 p-3">
                                    <p className="text-xs text-gray-400">Moneda</p>
                                    <p className="flex items-center gap-2 text-sm font-bold text-gray-100">
                                        <span className="text-lg">{getMoneda(editando.moneda).icon}</span>
                                        {editando.moneda} — {getMoneda(editando.moneda).nombre}
                                    </p>
                                </div>

                                <div>
                                    <label className={label}>Nueva tasa (CUP por 1 {editando.moneda})</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        value={nuevaTasa}
                                        onChange={(e) => setNuevaTasa(e.target.value)}
                                        className={`${input} text-lg font-bold`}
                                        autoFocus
                                    />
                                    <p className="mt-1 text-xs text-gray-500">
                                        Ejemplo: si 1 {editando.moneda} = 320 CUP, escribe 320
                                    </p>
                                </div>

                                <div className="flex gap-3">
                                    <button
                                        onClick={() => { setEditando(null); setNuevaTasa(''); }}
                                        className="flex-1 rounded-xl border border-white/10 bg-slate-800/60 py-3 text-base font-bold text-gray-300 transition-colors hover:bg-slate-800"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        onClick={guardarTasa}
                                        className="flex-1 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 py-3 text-base font-bold text-white shadow-md shadow-blue-500/25 transition-transform hover:-translate-y-0.5"
                                    >
                                        Guardar
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {modalCrear && (
                    <div className={modalOverlay}>
                        <div className={modalPanel}>
                            <div className={modalHeader}>
                                <h2 className={modalTitle}>Añadir moneda</h2>
                                <button onClick={() => setModalCrear(false)} className={modalClose}>
                                    &times;
                                </button>
                            </div>
                            <div className="space-y-4 p-4 md:p-6">
                                <div>
                                    <label className={label}>Moneda</label>
                                    <div className="grid grid-cols-3 gap-2">
                                        {monedasDisponibles.map((m) => {
                                            const info = getMoneda(m);
                                            const activo = nuevaMoneda === m;
                                            return (
                                                <button
                                                    key={m}
                                                    type="button"
                                                    onClick={() => setNuevaMoneda(m)}
                                                    className={`flex flex-col items-center gap-1.5 rounded-xl border p-3 transition-colors duration-150 ${activo
                                                            ? 'border-blue-400/60 bg-blue-500/15'
                                                            : 'border-white/10 bg-slate-800/50 hover:border-blue-400/40'
                                                        }`}
                                                >
                                                    <span className={`flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br ${info.tile} text-base`}>
                                                        {info.icon}
                                                    </span>
                                                    <span className={`text-xs font-bold ${activo ? 'text-blue-300' : 'text-gray-300'}`}>
                                                        {m}
                                                    </span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                <div>
                                    <label className={label}>Tasa (CUP por 1 {nuevaMoneda})</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        value={tasaInicial}
                                        onChange={(e) => setTasaInicial(e.target.value)}
                                        className={`${input} text-lg font-bold`}
                                        placeholder="0.00"
                                        autoFocus
                                    />
                                    <p className="mt-1 text-xs text-gray-500">
                                        Ejemplo: si 1 {nuevaMoneda} = 320 CUP, escribe 320
                                    </p>
                                </div>

                                <div className="flex gap-3">
                                    <button
                                        onClick={() => setModalCrear(false)}
                                        className="flex-1 rounded-xl border border-white/10 bg-slate-800/60 py-3 text-base font-bold text-gray-300 transition-colors hover:bg-slate-800"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        onClick={crearTasa}
                                        className="flex-1 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 py-3 text-base font-bold text-white shadow-md shadow-emerald-500/25 transition-transform hover:-translate-y-0.5"
                                    >
                                        Crear
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