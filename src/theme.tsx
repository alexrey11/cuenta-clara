// ============ src/theme.tsx ============
import type { ReactNode } from 'react';

export const STYLES = `
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

@media (prefers-reduced-motion: reduce) {
  .cc-gradient-text { animation: none; }
  .cc-fade-up { opacity: 1; animation: none; }
}
`;

/** Blobs de fondo estáticos (sin animación, baratos en GPU). */
export function BackgroundBlobs() {
    return (
        <div className="pointer-events-none fixed inset-0" aria-hidden="true">
            <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-blue-600/15 blur-2xl" />
            <div className="absolute -right-32 top-1/3 h-[26rem] w-[26rem] rounded-full bg-indigo-600/15 blur-2xl" />
        </div>
    );
}

/** Contenedor raíz de cada página. */
export const pageWrap = 'relative min-h-screen overflow-hidden bg-slate-950 p-3 md:p-6';

/** Tarjeta base oscura tipo glass. */
export const card = 'rounded-2xl border border-white/10 bg-slate-900/95 shadow-lg shadow-black/30';
export const cardPadded = `${card} p-4 md:p-6`;

/** Título con degradado animado. */
export const titleGradient =
    'cc-gradient-text bg-gradient-to-r from-blue-400 via-indigo-400 to-violet-400 bg-clip-text font-black tracking-tight text-transparent';

/** Botones. */
export const btnPrimary =
    'inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-2.5 text-sm font-bold text-white shadow-md shadow-blue-500/25 transition-transform duration-150 hover:-translate-y-0.5 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 md:px-5 md:text-base';

export const btnSuccess =
    'inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 px-4 py-2.5 text-sm font-bold text-white shadow-md shadow-emerald-500/25 transition-transform duration-150 hover:-translate-y-0.5 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-50 md:px-5 md:text-base';

export const btnSecondary =
    'inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-slate-800/60 px-4 py-2.5 text-sm font-bold text-gray-200 transition-colors duration-150 hover:border-blue-400/60 hover:bg-blue-500/15 hover:text-blue-300 md:px-5 md:text-base';

export const btnGhost =
    'inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-slate-800/40 px-3 py-2 text-sm font-bold text-gray-300 transition-colors duration-150 hover:border-blue-400/60 hover:bg-blue-500/10 hover:text-blue-300';

export const btnDanger =
    'inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-rose-500 to-red-600 px-4 py-2.5 text-sm font-bold text-white shadow-md shadow-rose-500/25 transition-transform duration-150 hover:-translate-y-0.5 active:translate-y-0 md:px-5 md:text-base';

/** Inputs, labels, selects. */
export const input =
    'w-full rounded-xl border border-white/10 bg-slate-800/60 px-4 py-3 text-base text-gray-100 outline-none transition-colors duration-150 placeholder:text-gray-500 focus:border-blue-400/60 focus:bg-slate-800';

export const label = 'mb-1.5 block text-[11px] font-extrabold uppercase tracking-wider text-gray-400';

export const sectionTitle = 'text-base font-bold text-gray-100 md:text-lg';

/** Modal. */
export const modalOverlay = 'fixed inset-0 z-50 flex items-end justify-center bg-slate-950/70 p-0 md:items-center md:p-4';
export const modalPanel = 'max-h-[90vh] w-full overflow-y-auto rounded-t-2xl border border-white/10 bg-slate-900 shadow-2xl shadow-black/60 md:max-w-md md:rounded-2xl';
export const modalHeader = 'sticky top-0 z-10 flex items-center justify-between bg-gradient-to-r from-blue-600 to-indigo-700 px-4 py-3 md:px-6 md:py-4';
export const modalHeaderDanger = 'sticky top-0 z-10 flex items-center justify-between bg-gradient-to-r from-orange-500 to-red-600 px-4 py-3 md:px-6 md:py-4';
export const modalTitle = 'text-lg font-bold text-white md:text-xl';
export const modalClose = 'text-2xl text-white/80 transition-colors hover:text-white';

/** Encabezado tipo hero de cada página. */
export function PageHeader({
    icon, title, subtitle, gradient = 'from-blue-500 to-indigo-600', actions,
}: {
    icon: string;
    title: string;
    subtitle: string;
    gradient?: string;
    actions?: ReactNode;
}) {
    return (
        <div className={`cc-fade-up mb-4 md:mb-6 ${cardPadded}`}>
            <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                    <div className={`hidden h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${gradient} text-2xl shadow-md ring-2 ring-white/10 md:flex`}>
                        {icon}
                    </div>
                    <div className="min-w-0">
                        <h1 className={`${titleGradient} truncate text-xl md:text-3xl`}>{title}</h1>
                        <p className="truncate text-xs text-gray-400 md:text-sm">{subtitle}</p>
                    </div>
                </div>
                {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
            </div>
        </div>
    );
}

/** Tarjeta métrica con icono en tile y glow sutil. */
export function MetricCard({
    icon, label, value, sub, tile, accent = false,
}: {
    icon: string;
    label: string;
    value: string;
    sub?: string;
    tile: string;
    accent?: boolean;
}) {
    return (
        <div className={`${card} cc-fade-up p-3 md:p-4 ${accent ? 'ring-1 ring-blue-400/20' : ''}`}>
            <span className={`mb-2 flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br ${tile} text-base shadow-md`}>
                {icon}
            </span>
            <p className="mb-0.5 text-[11px] font-extrabold uppercase tracking-wider text-gray-400">{label}</p>
            <p className="truncate text-xl font-black text-gray-100 md:text-2xl">{value}</p>
            {sub && <p className="mt-0.5 text-[11px] font-medium text-gray-500">{sub}</p>}
        </div>
    );
}

/** Estado vacío. */
export function EmptyState({ icon = '📭', texto }: { icon?: string; texto: string }) {
    return (
        <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
            <span className="text-4xl">{icon}</span>
            <p className="text-sm font-semibold text-gray-500">{texto}</p>
        </div>
    );
}

/** Filtros tipo pill (Fecha, categorías, etc.) */
export const filterPill = (activo: boolean) =>
    `flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-bold transition-colors duration-150 md:px-4 md:text-base ${activo
        ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/25'
        : 'border border-white/10 bg-slate-800/50 text-gray-300 hover:border-blue-400/40 hover:bg-slate-800/80'
    }`;

/** Botón de acción pequeño tipo "Editar" / "Eliminar" dentro de cards. */
export const btnMiniPrimary =
    'rounded-lg border border-blue-400/20 bg-blue-500/10 px-3 py-2 text-xs font-bold text-blue-300 transition-colors duration-150 hover:bg-blue-500/20 md:text-sm';
export const btnMiniDanger =
    'rounded-lg border border-rose-400/20 bg-rose-500/10 px-3 py-2 text-xs font-bold text-rose-300 transition-colors duration-150 hover:bg-rose-500/20 md:text-sm';
export const btnMiniSuccess =
    'rounded-lg border border-emerald-400/20 bg-emerald-500/10 px-3 py-2 text-xs font-bold text-emerald-300 transition-colors duration-150 hover:bg-emerald-500/20 md:text-sm';

// ============ Agregar al final de src/theme.tsx ============

export const btnIconMini =
    'flex h-7 w-7 items-center justify-center rounded-lg border border-white/10 bg-slate-900/60 text-xs text-gray-400 transition-colors duration-150 hover:border-blue-400/50 hover:bg-blue-500/15 hover:text-blue-300';