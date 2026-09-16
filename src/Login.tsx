import { useState, useEffect, useRef } from 'react';
import { db } from './db';
import type { Usuario } from './db';
import { obtenerInfoLicencia } from './utils/trialUtils';
import { registrarLog } from './utils/logger';

interface LoginProps {
    onLogin: (usuario: Usuario) => void;
}

type Rol = 'admin' | 'jefe' | 'vendedor';

const STYLES = `
@keyframes cc-float {
  0%, 100% { transform: translateY(0) rotate(-3deg); }
  50%      { transform: translateY(-8px) rotate(3deg); }
}
.cc-float { animation: cc-float 5s ease-in-out infinite; }

@keyframes cc-fade-up {
  from { opacity: 0; transform: translateY(12px); }
  to   { opacity: 1; transform: translateY(0); }
}
.cc-fade-up { opacity: 0; animation: cc-fade-up .5s ease-out forwards; }

@keyframes cc-gradient {
  0%, 100% { background-position: 0% 50%; }
  50%      { background-position: 100% 50%; }
}
.cc-gradient-text { background-size: 200% 200%; animation: cc-gradient 8s ease infinite; }

@keyframes cc-shake {
  0%, 100% { transform: translateX(0); }
  20%      { transform: translateX(-8px); }
  40%      { transform: translateX(7px); }
  60%      { transform: translateX(-4px); }
  80%      { transform: translateX(2px); }
}
.cc-shake { animation: cc-shake .4s ease-out; }

@media (prefers-reduced-motion: reduce) {
  .cc-float, .cc-gradient-text, .cc-shake { animation: none; }
  .cc-fade-up { opacity: 1; animation: none; }
}
`;

const ROLES: Record<string, { icon: string; nombre: string; tile: string; pill: string }> = {
    admin: { icon: '👑', nombre: 'Administrador', tile: 'from-fuchsia-500 to-purple-600', pill: 'bg-fuchsia-500/15 text-fuchsia-300 ring-1 ring-fuchsia-400/25' },
    jefe: { icon: '🎩', nombre: 'Jefe', tile: 'from-sky-500 to-blue-600', pill: 'bg-sky-500/15 text-sky-300 ring-1 ring-sky-400/25' },
    vendedor: { icon: '🛒', nombre: 'Vendedor', tile: 'from-emerald-500 to-teal-600', pill: 'bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-400/25' },
};

const getRol = (rol: string) =>
    ROLES[rol] ?? { icon: '👤', nombre: 'Usuario', tile: 'from-slate-400 to-slate-600', pill: 'bg-slate-500/15 text-slate-300 ring-1 ring-slate-400/25' };

function PinInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
    const ref = useRef<HTMLInputElement>(null);
    return (
        <div className="relative cursor-pointer" onClick={() => ref.current?.focus()}>
            <input
                ref={ref}
                type="password"
                inputMode="numeric"
                autoComplete="off"
                maxLength={4}
                value={value}
                onChange={(e) => onChange(e.target.value.replace(/\D/g, '').slice(0, 4))}
                aria-label="PIN de 4 dígitos"
                className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0"
            />
            <div className="flex justify-center gap-2.5 md:gap-3">
                {[0, 1, 2, 3].map((i) => {
                    const lleno = value.length > i;
                    return (
                        <div
                            key={i}
                            className={`flex h-14 w-12 items-center justify-center rounded-2xl border-2 text-2xl font-black transition-all duration-150 md:h-16 md:w-14 ${lleno
                                    ? 'border-blue-400 bg-blue-500/20 text-blue-200'
                                    : 'border-white/10 bg-slate-800/60 text-gray-600'
                                }`}
                        >
                            {lleno ? '●' : ''}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

export default function Login({ onLogin }: LoginProps) {
    const [usuarios, setUsuarios] = useState<Usuario[]>([]);
    const [cargando, setCargando] = useState(true);

    const [pin, setPin] = useState('');
    const [usuarioSeleccionado, setUsuarioSeleccionado] = useState<Usuario | null>(null);
    const [mensaje, setMensaje] = useState<{ tipo: 'error' | 'ok'; texto: string } | null>(null);
    const [intentosFallidos, setIntentosFallidos] = useState(0);

    // Info de licencia
    const [esMaster, setEsMaster] = useState(false);
    const [licenciaActiva, setLicenciaActiva] = useState(false);
    const [diasRestantes, setDiasRestantes] = useState(15);

    // Wizard de onboarding (cuando no hay usuarios)
    const [wizardNombre, setWizardNombre] = useState('');
    const [wizardPin, setWizardPin] = useState('');
    const [wizardRol, setWizardRol] = useState<Rol>('jefe');
    const [creando, setCreando] = useState(false);

    const cardRef = useRef<HTMLDivElement>(null);
    const inicializado = useRef(false);

    useEffect(() => {
        if (inicializado.current) return;
        inicializado.current = true;

        (async () => {
            const info = await obtenerInfoLicencia();
            setEsMaster(info.esMaster);
            setLicenciaActiva(info.activa);
            setDiasRestantes(info.diasRestantes);

            const lista = await db.usuarios.toArray();
            setUsuarios(lista);

            // Si es master y no hay usuarios, pre-seleccionar admin
            if (info.esMaster) setWizardRol('admin');
            else setWizardRol('jefe');

            setCargando(false);
        })();
    }, []);

    const sacudir = () => {
        const el = cardRef.current;
        if (!el) return;
        el.classList.remove('cc-shake');
        void el.offsetWidth;
        el.classList.add('cc-shake');
    };

    const error = (texto: string) => {
        setMensaje({ tipo: 'error', texto });
        sacudir();
    };

    const seleccionarUsuario = (u: Usuario) => {
        setUsuarioSeleccionado(u);
        setPin('');
        setMensaje(null);
    };

    const iniciarSesion = async () => {
        if (!usuarioSeleccionado) {
            error('Selecciona un usuario para continuar');
            return;
        }
        if (usuarioSeleccionado.pin !== pin) {
            setPin('');
            const nuevosIntentos = intentosFallidos + 1;
            setIntentosFallidos(nuevosIntentos);
            error(`PIN incorrecto${nuevosIntentos >= 3 ? ' (intento ' + nuevosIntentos + ')' : ''}`);

            await registrarLog('login_fallido', `PIN incorrecto para "${usuarioSeleccionado.nombre}"`, {
                usuarioId: usuarioSeleccionado.id,
                usuarioNombre: usuarioSeleccionado.nombre,
                detalles: `Intento fallido #${nuevosIntentos}`,
            });
            return;
        }

        setIntentosFallidos(0);
        await registrarLog('login_ok', `Inicio de sesión exitoso de "${usuarioSeleccionado.nombre}"`, {
            usuarioId: usuarioSeleccionado.id,
            usuarioNombre: usuarioSeleccionado.nombre,
            detalles: `Rol: ${usuarioSeleccionado.rol}`,
        });
        onLogin(usuarioSeleccionado);
    };

    const crearUsuarioInicial = async () => {
        const nombre = wizardNombre.trim();
        if (!nombre) { error('Escribe tu nombre o el de tu negocio'); return; }
        if (wizardPin.length !== 4) { error('El PIN debe tener 4 dígitos'); return; }

        setCreando(true);
        try {
            const datos = {
                nombre,
                pin: wizardPin,
                rol: wizardRol,
                creadoEn: new Date(),
            };
            const id = await db.usuarios.add(datos);

            await registrarLog('usuario_creado', `Usuario inicial "${nombre}" creado (${wizardRol})`, {
                usuarioNombre: nombre,
                detalles: 'Primer usuario de la instalación. Bienvenida.',
            });

            const nuevo: Usuario = { id, ...datos };
            setCreando(false);
            onLogin(nuevo);
        } catch (e) {
            setCreando(false);
            error('No se pudo crear el usuario. Intenta de nuevo.');
        }
    };

    const estadoLic = (() => {
        if (esMaster) return { icon: '👑', label: 'Instalación Master', class: 'bg-violet-500/15 text-violet-300 ring-1 ring-violet-400/25' };
        if (licenciaActiva) return { icon: '✅', label: 'Licencia activa', class: 'bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-400/25' };
        if (diasRestantes > 7) return { icon: '⏳', label: `Prueba: ${diasRestantes} días restantes`, class: 'bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-400/25' };
        if (diasRestantes > 2) return { icon: '⏳', label: `Prueba: ${diasRestantes} días restantes`, class: 'bg-amber-500/15 text-amber-300 ring-1 ring-amber-400/25' };
        return { icon: '⚠️', label: `Prueba: ${diasRestantes} día${diasRestantes !== 1 ? 's' : ''} restante${diasRestantes !== 1 ? 's' : ''}`, class: 'bg-rose-500/15 text-rose-300 ring-1 ring-rose-400/25' };
    })();

    const esOnboarding = !cargando && usuarios.length === 0;

    return (
        <div className="relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-slate-950 p-4 md:p-6">
            <style>{STYLES}</style>

            <div className="pointer-events-none absolute inset-0" aria-hidden="true">
                <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-blue-600/20 blur-2xl" />
                <div className="absolute -right-32 top-1/3 h-[26rem] w-[26rem] rounded-full bg-indigo-600/20 blur-2xl" />
            </div>

            <div className="relative w-full max-w-md">
                <div
                    ref={cardRef}
                    className="max-h-[95vh] overflow-y-auto rounded-3xl border border-white/10 bg-slate-900/95 p-6 shadow-2xl shadow-black/60 ring-1 ring-inset ring-white/5 md:p-8"
                >
                    {/* Badge de licencia */}
                    <div className="cc-fade-up mb-4 flex justify-center">
                        <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-wider md:text-[11px] ${estadoLic.class}`}>
                            <span className="text-sm">{estadoLic.icon}</span>
                            <span>{estadoLic.label}</span>
                        </span>
                    </div>

                    {/* Cabecera */}
                    <div className="cc-fade-up mb-6 flex flex-col items-center text-center">
                        <div className="cc-float mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-br from-blue-500 via-indigo-600 to-violet-600 text-3xl shadow-xl shadow-indigo-600/50 ring-2 ring-white/10">
                            📊
                        </div>
                        <h1 className="cc-gradient-text bg-gradient-to-r from-blue-400 via-indigo-400 to-violet-400 bg-clip-text text-3xl font-black tracking-tight text-transparent md:text-4xl">
                            CuentaClara
                        </h1>
                        <p className="mt-1 text-sm font-medium text-gray-400 md:text-base">
                            {esOnboarding
                                ? 'Vamos a configurar tu cuenta'
                                : <>Tu negocio bajo control, <span className="font-bold text-gray-200">sin internet</span></>}
                        </p>
                    </div>

                    {cargando ? (
                        <div className="flex items-center justify-center gap-3 py-8">
                            <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500/30 border-t-blue-500" />
                            <p className="text-sm text-gray-400">Cargando…</p>
                        </div>
                    ) : esOnboarding ? (
                        /* ============ WIZARD DE ONBOARDING ============ */
                        <>
                            <div className="cc-fade-up mb-5 rounded-2xl border border-blue-400/25 bg-blue-500/10 p-3" style={{ animationDelay: '0.05s' }}>
                                <p className="text-xs font-bold text-blue-200 md:text-sm">👋 ¡Bienvenido!</p>
                                <p className="mt-1 text-[11px] text-blue-200/80 md:text-xs">
                                    Este es tu primer acceso. Crea tu usuario principal para empezar a usar CuentaClara.
                                </p>
                            </div>

                            <div className="cc-fade-up mb-4" style={{ animationDelay: '0.1s' }}>
                                <label className="mb-1.5 block text-[11px] font-extrabold uppercase tracking-wider text-gray-400">
                                    Tu nombre o el de tu negocio
                                </label>
                                <input
                                    type="text"
                                    value={wizardNombre}
                                    onChange={(e) => { setWizardNombre(e.target.value); setMensaje(null); }}
                                    placeholder="Ej: Bodega La Esquina, Juan Pérez…"
                                    autoFocus
                                    className="w-full rounded-2xl border border-white/10 bg-slate-800/60 px-4 py-3 text-base font-semibold text-gray-100 outline-none transition-colors duration-150 placeholder:font-normal placeholder:text-gray-500 focus:border-blue-400/60 focus:bg-slate-800"
                                />
                            </div>

                            <div className="cc-fade-up mb-4" style={{ animationDelay: '0.15s' }}>
                                <label className="mb-2 block text-[11px] font-extrabold uppercase tracking-wider text-gray-400">
                                    Elige tu PIN (4 dígitos)
                                </label>
                                <PinInput value={wizardPin} onChange={(v) => { setWizardPin(v); setMensaje(null); }} />
                                <p className="mt-2 text-center text-[11px] text-gray-500">
                                    🔐 Guárdalo bien. Lo usarás cada vez que entres.
                                </p>
                            </div>

                            {/* Selector de rol — solo visible si es master */}
                            {esMaster && (
                                <div className="cc-fade-up mb-5" style={{ animationDelay: '0.2s' }}>
                                    <label className="mb-2 block text-[11px] font-extrabold uppercase tracking-wider text-gray-400">
                                        Rol de la cuenta
                                    </label>
                                    <div className="grid grid-cols-2 gap-2">
                                        {(['admin', 'jefe'] as Rol[]).map((r) => {
                                            const info = getRol(r);
                                            const activo = wizardRol === r;
                                            return (
                                                <button
                                                    key={r}
                                                    type="button"
                                                    onClick={() => setWizardRol(r)}
                                                    className={`flex items-center gap-2 rounded-2xl border p-3 transition-colors duration-150 ${activo
                                                            ? 'border-blue-400/60 bg-blue-500/15'
                                                            : 'border-white/10 bg-slate-800/50 hover:border-blue-400/40'
                                                        }`}
                                                >
                                                    <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${info.tile} text-base`}>
                                                        {info.icon}
                                                    </span>
                                                    <span className={`text-xs font-bold ${activo ? 'text-blue-300' : 'text-gray-300'}`}>
                                                        {info.nombre}
                                                    </span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                    <p className="mt-2 text-[11px] text-gray-500">
                                        👑 Como master, puedes elegir admin.
                                    </p>
                                </div>
                            )}

                            {mensaje && (
                                <div className={`cc-fade-up mb-4 flex items-center justify-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-bold ${mensaje.tipo === 'error'
                                        ? 'bg-rose-500/15 text-rose-300 ring-1 ring-rose-400/25'
                                        : 'bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-400/25'
                                    }`}>
                                    <span>{mensaje.tipo === 'error' ? '⚠️' : '✅'}</span>
                                    <span>{mensaje.texto}</span>
                                </div>
                            )}

                            <button
                                onClick={crearUsuarioInicial}
                                disabled={creando}
                                className="w-full rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 px-6 py-4 font-bold text-white shadow-lg shadow-indigo-600/40 transition-transform duration-150 hover:-translate-y-0.5 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                <span className="flex items-center justify-center gap-2 text-base md:text-lg">
                                    {creando ? 'Creando…' : '✨ Crear cuenta y entrar'}
                                </span>
                            </button>
                        </>
                    ) : (
                        /* ============ LOGIN NORMAL ============ */
                        <>
                            <div className="mb-5">
                                <label className="mb-2.5 block text-[11px] font-extrabold uppercase tracking-wider text-gray-400">
                                    Selecciona tu usuario
                                </label>
                                <div className="space-y-2.5">
                                    {usuarios.map((u) => {
                                        const r = getRol(u.rol);
                                        const activo = usuarioSeleccionado?.id === u.id;
                                        return (
                                            <button
                                                key={u.id}
                                                onClick={() => seleccionarUsuario(u)}
                                                className={`flex w-full items-center justify-between gap-3 rounded-2xl border p-3 text-left transition-colors duration-150 ${activo
                                                        ? 'border-blue-400/60 bg-blue-500/15'
                                                        : 'border-white/10 bg-slate-800/50 hover:border-blue-400/40 hover:bg-slate-800/80'
                                                    }`}
                                            >
                                                <span className="flex min-w-0 items-center gap-3">
                                                    <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${r.tile} text-xl`}>
                                                        {r.icon}
                                                    </span>
                                                    <span className="min-w-0">
                                                        <span className="block truncate text-sm font-bold text-gray-100 md:text-base">
                                                            {u.nombre}
                                                        </span>
                                                        <span className={`mt-0.5 inline-block rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${r.pill}`}>
                                                            {r.nombre}
                                                        </span>
                                                    </span>
                                                </span>
                                                <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 text-[11px] font-black ${activo ? 'border-blue-400 bg-blue-500 text-white' : 'border-white/15 text-transparent'
                                                    }`}>
                                                    ✓
                                                </span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            <div className="mb-4">
                                <label className="mb-2.5 block text-[11px] font-extrabold uppercase tracking-wider text-gray-400">
                                    Ingresa tu PIN
                                </label>
                                <PinInput value={pin} onChange={(v) => { setPin(v); setMensaje(null); }} />
                            </div>

                            {mensaje && (
                                <div className={`mb-4 flex items-center justify-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-bold ${mensaje.tipo === 'error'
                                        ? 'bg-rose-500/15 text-rose-300 ring-1 ring-rose-400/25'
                                        : 'bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-400/25'
                                    }`}>
                                    <span>{mensaje.tipo === 'error' ? '⚠️' : '✅'}</span>
                                    <span>{mensaje.texto}</span>
                                </div>
                            )}

                            <button
                                onClick={iniciarSesion}
                                className="w-full rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 px-6 py-4 font-bold text-white shadow-lg shadow-indigo-600/40 transition-transform duration-150 hover:-translate-y-0.5 active:translate-y-0"
                            >
                                <span className="flex items-center justify-center gap-2 text-base md:text-lg">
                                    🔓 Iniciar Sesión
                                </span>
                            </button>

                            <div className="mt-5 rounded-2xl border border-white/10 bg-slate-800/40 p-3 text-center">
                                <p className="text-[11px] font-semibold text-gray-400 md:text-xs">
                                    🔐 Los usuarios se gestionan desde el panel de <strong className="text-gray-200">Usuarios</strong>.
                                </p>
                                <p className="mt-1.5 text-[10px] text-gray-500">
                                    ¿Olvidaste tu PIN? Contacta al administrador del negocio.
                                </p>
                            </div>
                        </>
                    )}

                    <p className="mt-5 text-center text-[10px] leading-relaxed text-gray-500">
                        🔒 Tus datos se guardan solo en este dispositivo
                    </p>
                </div>
            </div>
        </div>
    );
}