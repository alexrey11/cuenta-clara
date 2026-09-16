// ============ Dashboard.tsx (optimizado) ============
import { useState, useEffect } from 'react';
import { db } from './db';
import type { Venta, Producto } from './db';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import {
    Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Title, Tooltip, Legend, Filler
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Title, Tooltip, Legend, Filler);

interface DashboardProps { onVolver: () => void; }

const STYLES = `
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

const FILTROS = [
    { id: 'hoy', label: 'Hoy', icon: '📅' },
    { id: 'semana', label: 'Semana', icon: '📆' },
    { id: 'mes', label: 'Mes', icon: '🗓️' },
    { id: 'todo', label: 'Todo', icon: '📊' },
] as const;

export default function Dashboard({ onVolver }: DashboardProps) {
    const [ventas, setVentas] = useState<Venta[]>([]);
    const [productos, setProductos] = useState<Producto[]>([]);
    const [filtroFecha, setFiltroFecha] = useState<'hoy' | 'semana' | 'mes' | 'todo'>('semana');

    useEffect(() => { cargarDatos(); }, [filtroFecha]);

    const cargarDatos = async () => {
        const todasVentas = await db.ventas.toArray();
        const todosProductos = await db.productos.toArray();
        const ahora = new Date();
        let ventasFiltradas = todasVentas.filter(v => v.estado === 'completada');

        if (filtroFecha === 'hoy') {
            const inicio = new Date(ahora); inicio.setHours(0, 0, 0, 0);
            ventasFiltradas = ventasFiltradas.filter(v => new Date(v.fecha) >= inicio);
        } else if (filtroFecha === 'semana') {
            const inicio = new Date(ahora); inicio.setDate(ahora.getDate() - 7); inicio.setHours(0, 0, 0, 0);
            ventasFiltradas = ventasFiltradas.filter(v => new Date(v.fecha) >= inicio);
        } else if (filtroFecha === 'mes') {
            const inicio = new Date(ahora); inicio.setDate(1); inicio.setHours(0, 0, 0, 0);
            ventasFiltradas = ventasFiltradas.filter(v => new Date(v.fecha) >= inicio);
        }

        setVentas(ventasFiltradas);
        setProductos(todosProductos);
    };

    const totalGeneral = ventas.reduce((sum, v) => sum + v.total, 0);
    const ticketPromedio = ventas.length > 0 ? totalGeneral / ventas.length : 0;
    const productosBajoStock = productos.filter(p => p.stockActual <= p.stockMinimo);

    const gananciaTotal = ventas.reduce((sum, v) => {
        const items = v.items && v.items.length > 0 ? v.items : [{ precioUnitario: v.precioUnitario || v.total, precioCompra: 0, cantidad: v.cantidad || 1, subtotal: v.total }];
        return sum + items.reduce((s, item) => s + ((item.precioUnitario - (item.precioCompra || 0)) * item.cantidad), 0);
    }, 0);

    const ventasPorDia = () => {
        const dias: Record<string, number> = {};
        ventas.forEach(v => { const fecha = new Date(v.fecha).toLocaleDateString('es-ES'); dias[fecha] = (dias[fecha] || 0) + v.total; });
        return {
            labels: Object.keys(dias),
            datasets: [{
                label: 'Ventas (CUP)',
                data: Object.values(dias),
                borderColor: 'rgb(96, 165, 250)',
                backgroundColor: 'rgba(96, 165, 250, 0.15)',
                fill: true,
                tension: 0.4,
                pointBackgroundColor: 'rgb(96, 165, 250)',
                pointBorderColor: '#0f172a',
                pointBorderWidth: 2,
                pointRadius: 3,
                pointHoverRadius: 5,
                borderWidth: 2,
            }]
        };
    };

    const topProductos = () => {
        const stats = new Map<string, number>();
        ventas.forEach(v => {
            const items = v.items && v.items.length > 0 ? v.items : [{ productoNombre: v.productoNombre || 'N/A', cantidad: v.cantidad || 1 }];
            items.forEach(item => { stats.set(item.productoNombre, (stats.get(item.productoNombre) || 0) + item.cantidad); });
        });
        const sorted = Array.from(stats.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5);
        return {
            labels: sorted.map(s => s[0]),
            datasets: [{
                label: 'Unidades',
                data: sorted.map(s => s[1]),
                backgroundColor: ['rgba(96, 165, 250, 0.85)', 'rgba(52, 211, 153, 0.85)', 'rgba(251, 191, 36, 0.85)', 'rgba(167, 139, 250, 0.85)', 'rgba(248, 113, 113, 0.85)'],
                borderRadius: 8,
                borderSkipped: false,
            }]
        };
    };

    const metodosPago = () => {
        const metodos: Record<string, number> = { efectivo: 0, transferencia: 0, tarjeta: 0, fiado: 0 };
        ventas.forEach(v => { v.metodosPago?.forEach(mp => { metodos[mp.tipo] = (metodos[mp.tipo] || 0) + mp.montoEnCUP; }); });
        return {
            labels: ['Efectivo', 'Transfer', 'Tarjeta', 'Fiado'],
            datasets: [{
                data: [metodos.efectivo, metodos.transferencia, metodos.tarjeta, metodos.fiado],
                backgroundColor: ['rgba(52, 211, 153, 0.85)', 'rgba(96, 165, 250, 0.85)', 'rgba(251, 191, 36, 0.85)', 'rgba(248, 113, 113, 0.85)'],
                borderColor: 'rgba(15, 23, 42, 0.9)',
                borderWidth: 2,
                hoverOffset: 6,
            }]
        };
    };

    const baseChartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 400 } as const,
        plugins: {
            legend: { display: false },
            tooltip: {
                backgroundColor: 'rgba(15, 23, 42, 0.95)',
                borderColor: 'rgba(148, 163, 184, 0.2)',
                borderWidth: 1,
                padding: 10,
                cornerRadius: 10,
                titleColor: '#f1f5f9',
                bodyColor: '#cbd5e1',
                titleFont: { weight: 700 as const },
            },
        },
        scales: {
            x: { grid: { color: 'rgba(148, 163, 184, 0.08)' }, ticks: { color: '#94a3b8', font: { size: 11 } } },
            y: { grid: { color: 'rgba(148, 163, 184, 0.08)' }, ticks: { color: '#94a3b8', font: { size: 11 } } },
        },
    };

    const doughnutOptions = {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '65%',
        animation: { duration: 400 } as const,
        plugins: {
            legend: {
                display: true,
                position: 'bottom' as const,
                labels: { color: '#cbd5e1', padding: 12, font: { size: 12, weight: 600 as const }, usePointStyle: true, pointStyle: 'circle' },
            },
            tooltip: baseChartOptions.plugins.tooltip,
        },
    };

    const kpis = [
        { label: 'Vendido', valor: `$${totalGeneral.toFixed(0)}`, sub: `${ventas.length} ventas`, icon: '💰', tile: 'from-emerald-500 to-teal-600' },
        { label: 'Ganancia', valor: `$${gananciaTotal.toFixed(0)}`, sub: 'Beneficio real', icon: '📈', tile: 'from-blue-500 to-indigo-600' },
        { label: 'Ticket', valor: `$${ticketPromedio.toFixed(0)}`, sub: 'Promedio', icon: '🎫', tile: 'from-violet-500 to-purple-600' },
        { label: 'Productos', valor: `${productos.length}`, sub: 'En inventario', icon: '📦', tile: 'from-cyan-500 to-blue-600' },
        { label: 'Stock Bajo', valor: `${productosBajoStock.length}`, sub: 'Críticos', icon: '⚠️', tile: 'from-rose-500 to-red-600' },
    ];

    const cardBase = 'rounded-2xl border border-white/10 bg-slate-900/95 shadow-lg shadow-black/30';

    return (
        <div className="relative min-h-screen overflow-hidden bg-slate-950 p-3 md:p-6">
            <style>{STYLES}</style>

            {/* Fondo: blobs estáticos (sin animación, sin blur caro) */}
            <div className="pointer-events-none fixed inset-0" aria-hidden="true">
                <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-blue-600/15 blur-2xl" />
                <div className="absolute -right-32 top-1/3 h-[26rem] w-[26rem] rounded-full bg-indigo-600/15 blur-2xl" />
            </div>

            <div className="relative mx-auto max-w-7xl">

                {/* Header */}
                <div className={`cc-fade-up mb-4 md:mb-6 ${cardBase} p-4 md:p-6`}>
                    <div className="flex items-center justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-3">
                            <div className="hidden h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 via-indigo-600 to-violet-600 text-2xl shadow-md shadow-indigo-600/40 ring-2 ring-white/10 md:flex">
                                📊
                            </div>
                            <div className="min-w-0">
                                <h1 className="cc-gradient-text bg-gradient-to-r from-blue-400 via-indigo-400 to-violet-400 bg-clip-text text-xl font-black tracking-tight text-transparent md:text-3xl">
                                    Panel de Control
                                </h1>
                                <p className="truncate text-xs text-gray-400 md:text-sm">Estadísticas en tiempo real</p>
                            </div>
                        </div>
                        <button
                            onClick={onVolver}
                            className="flex shrink-0 items-center gap-1.5 rounded-xl border border-white/10 bg-slate-800/60 px-3 py-2 text-sm font-bold text-gray-200 transition-colors duration-150 hover:border-blue-400/60 hover:bg-blue-500/15 hover:text-blue-300 md:px-5 md:py-2.5 md:text-base"
                        >
                            ← Volver
                        </button>
                    </div>
                </div>

                {/* Filtros */}
                <div className={`cc-fade-up mb-4 md:mb-6 ${cardBase} p-3 md:p-4`}>
                    <div className="flex flex-wrap gap-2">
                        {FILTROS.map((f) => {
                            const activo = filtroFecha === f.id;
                            return (
                                <button
                                    key={f.id}
                                    onClick={() => setFiltroFecha(f.id)}
                                    className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-bold transition-colors duration-150 md:px-4 md:text-base ${activo
                                            ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/25'
                                            : 'border border-white/10 bg-slate-800/50 text-gray-300 hover:border-blue-400/40 hover:bg-slate-800/80'
                                        }`}
                                >
                                    <span>{f.icon}</span>
                                    <span>{f.label}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* KPIs */}
                <div className="mb-4 grid grid-cols-2 gap-3 md:mb-6 md:grid-cols-3 md:gap-4 lg:grid-cols-5">
                    {kpis.map((k, i) => (
                        <div
                            key={k.label}
                            className={`cc-fade-up rounded-2xl border border-white/10 bg-slate-900/95 p-3 shadow-lg shadow-black/30 transition-transform duration-150 hover:-translate-y-0.5 md:p-4 ${i === 4 ? 'col-span-2 md:col-span-1' : ''}`}
                        >
                            <span className={`mb-2 flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br ${k.tile} text-base shadow-md`}>
                                {k.icon}
                            </span>
                            <p className="mb-0.5 text-[11px] font-extrabold uppercase tracking-wider text-gray-400">{k.label}</p>
                            <p className="truncate text-xl font-black text-gray-100 md:text-2xl">{k.valor}</p>
                            <p className="mt-0.5 text-[11px] font-medium text-gray-500">{k.sub}</p>
                        </div>
                    ))}
                </div>

                {/* Gráficos fila 1 */}
                <div className="mb-4 grid grid-cols-1 gap-4 md:mb-6 lg:grid-cols-2">
                    <div className={`cc-fade-up ${cardBase} p-4 md:p-5`}>
                        <div className="mb-4 flex items-center gap-2">
                            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-base shadow-md">📈</span>
                            <h2 className="text-base font-bold text-gray-100 md:text-lg">Ventas por Día</h2>
                        </div>
                        <div className="h-56 md:h-64">
                            <Line data={ventasPorDia()} options={baseChartOptions} />
                        </div>
                    </div>

                    <div className={`cc-fade-up ${cardBase} p-4 md:p-5`}>
                        <div className="mb-4 flex items-center gap-2">
                            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 text-base shadow-md">🏆</span>
                            <h2 className="text-base font-bold text-gray-100 md:text-lg">Top 5 Productos</h2>
                        </div>
                        <div className="h-56 md:h-64">
                            <Bar data={topProductos()} options={baseChartOptions} />
                        </div>
                    </div>
                </div>

                {/* Gráficos fila 2 */}
                <div className="grid grid-cols-1 gap-4 md:gap-6 lg:grid-cols-2">
                    <div className={`cc-fade-up ${cardBase} p-4 md:p-5`}>
                        <div className="mb-4 flex items-center gap-2">
                            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-base shadow-md">💳</span>
                            <h2 className="text-base font-bold text-gray-100 md:text-lg">Métodos de Pago</h2>
                        </div>
                        <div className="flex h-56 items-center justify-center md:h-64">
                            <Doughnut data={metodosPago()} options={doughnutOptions} />
                        </div>
                    </div>

                    <div className={`cc-fade-up ${cardBase} p-4 md:p-5`}>
                        <div className="mb-4 flex items-center gap-2">
                            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-rose-500 to-red-600 text-base shadow-md">⚠️</span>
                            <h2 className="text-base font-bold text-gray-100 md:text-lg">Stock Bajo</h2>
                            {productosBajoStock.length > 0 && (
                                <span className="ml-auto rounded-full bg-rose-500/15 px-2.5 py-0.5 text-[11px] font-bold text-rose-300 ring-1 ring-rose-400/25">
                                    {productosBajoStock.length}
                                </span>
                            )}
                        </div>

                        {productosBajoStock.length === 0 ? (
                            <div className="flex h-56 flex-col items-center justify-center gap-2 text-center md:h-64">
                                <span className="text-4xl">✅</span>
                                <p className="text-sm font-semibold text-gray-400">Todos tienen stock suficiente</p>
                            </div>
                        ) : (
                            <div className="max-h-56 space-y-2 overflow-y-auto pr-1 md:max-h-64">
                                {productosBajoStock.map((p) => (
                                    <div
                                        key={p.id}
                                        className="flex items-center justify-between rounded-xl border border-rose-400/20 bg-rose-500/10 p-2.5 transition-colors duration-150 hover:border-rose-400/40 hover:bg-rose-500/15 md:p-3"
                                    >
                                        <div className="min-w-0 flex-1">
                                            <p className="truncate text-sm font-bold text-gray-100">{p.nombre}</p>
                                            <p className="text-[11px] text-gray-400">Mínimo: {p.stockMinimo}</p>
                                        </div>
                                        <div className="ml-3 text-right">
                                            <p className="text-xl font-black text-rose-300 md:text-2xl">{p.stockActual}</p>
                                            <p className="text-[10px] font-semibold uppercase text-gray-500">{p.unidadMedida || 'u'}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}