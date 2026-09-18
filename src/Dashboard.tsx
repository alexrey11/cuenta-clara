import { useState, useEffect } from 'react';
import { db } from './db';
import type { Venta, Producto } from './db';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import {
    Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Title, Tooltip, Legend, Filler
} from 'chart.js';
import {
    STYLES, BackgroundBlobs, pageWrap, card, cardPadded, titleGradient,
    filterPill,
    MetricCard, EmptyState,
} from './theme';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Title, Tooltip, Legend, Filler);

interface DashboardProps {
    onVolver: () => void;
    onIrAVista: (vista: string) => void;
}

const FILTROS = [
    { id: 'hoy', label: 'Hoy', icon: '📅' },
    { id: 'semana', label: 'Semana', icon: '📆' },
    { id: 'mes', label: 'Mes', icon: '🗓️' },
    { id: 'todo', label: 'Todo', icon: '📊' },
] as const;

type SeccionDashboard = 'graficos' | 'metodos' | 'stock';

const SECCIONES: { id: SeccionDashboard; label: string; icon: string }[] = [
    { id: 'graficos', label: 'Ventas', icon: '📈' },
    { id: 'metodos', label: 'Pagos', icon: '💳' },
    { id: 'stock', label: 'Stock', icon: '📦' },
];

export default function Dashboard({ onVolver, onIrAVista }: DashboardProps) {
    const [ventas, setVentas] = useState<Venta[]>([]);
    const [productos, setProductos] = useState<Producto[]>([]);
    const [filtroFecha, setFiltroFecha] = useState<'hoy' | 'semana' | 'mes' | 'todo'>('semana');
    const [seccionMovil, setSeccionMovil] = useState<SeccionDashboard>('graficos');
    const [mostrarBienvenida, setMostrarBienvenida] = useState(false);

    useEffect(() => { cargarDatos(); }, [filtroFecha]);

    // Banner de bienvenida (solo la primera vez)
    useEffect(() => {
        const yaVio = localStorage.getItem('cc.bienvenida.vista');
        if (!yaVio) setMostrarBienvenida(true);
    }, []);

    const cerrarBienvenida = () => {
        localStorage.setItem('cc.bienvenida.vista', 'true');
        setMostrarBienvenida(false);
    };

    const irAGuia = () => {
        cerrarBienvenida();
        onIrAVista('ayuda');
    };

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
        const items = v.items && v.items.length > 0
            ? v.items
            : [{ precioUnitario: v.precioUnitario || v.total, precioCompra: 0, cantidad: v.cantidad || 1, subtotal: v.total }];
        return sum + items.reduce((s, item) => s + ((item.precioUnitario - (item.precioCompra || 0)) * item.cantidad), 0);
    }, 0);

    const ventasPorDia = () => {
        const dias: Record<string, number> = {};
        ventas.forEach(v => {
            const fecha = new Date(v.fecha).toLocaleDateString('es-ES');
            dias[fecha] = (dias[fecha] || 0) + v.total;
        });
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
            const items = v.items && v.items.length > 0
                ? v.items
                : [{ productoNombre: v.productoNombre || 'N/A', cantidad: v.cantidad || 1 }];
            items.forEach(item => {
                stats.set(item.productoNombre, (stats.get(item.productoNombre) || 0) + item.cantidad);
            });
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
        ventas.forEach(v => {
            v.metodosPago?.forEach(mp => {
                metodos[mp.tipo] = (metodos[mp.tipo] || 0) + mp.montoEnCUP;
            });
        });
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
            x: { grid: { color: 'rgba(148, 163, 184, 0.08)' }, ticks: { color: '#94a3b8', font: { size: 10 } } },
            y: { grid: { color: 'rgba(148, 163, 184, 0.08)' }, ticks: { color: '#94a3b8', font: { size: 10 } } },
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
                labels: { color: '#cbd5e1', padding: 10, font: { size: 11, weight: 600 as const }, usePointStyle: true, pointStyle: 'circle' },
            },
            tooltip: baseChartOptions.plugins.tooltip,
        },
    };

    const kpisPrincipales = [
        { label: 'Vendido', valor: `$${totalGeneral.toFixed(0)}`, sub: `${ventas.length} ventas`, icon: '💰', tile: 'from-emerald-500 to-teal-600' },
        { label: 'Ganancia', valor: `$${gananciaTotal.toFixed(0)}`, sub: 'Beneficio real', icon: '📈', tile: 'from-blue-500 to-indigo-600' },
        { label: 'Ticket', valor: `$${ticketPromedio.toFixed(0)}`, sub: 'Promedio', icon: '🎫', tile: 'from-violet-500 to-purple-600' },
        { label: 'Productos', valor: `${productos.length}`, sub: 'En inventario', icon: '📦', tile: 'from-cyan-500 to-blue-600' },
    ];

    return (
        <div className={pageWrap}>
            <style>{STYLES}</style>
            <BackgroundBlobs />

            <div className="relative mx-auto max-w-7xl">
                {/* ===== Banner de Bienvenida ===== */}
                {mostrarBienvenida && (
                    <div className="cc-fade-up mb-4 overflow-hidden rounded-2xl border border-blue-400/25 bg-gradient-to-br from-blue-500/15 to-indigo-500/10 p-4 md:mb-6 md:p-5">
                        <div className="flex items-start gap-3">
                            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-xl shadow-md">
                                👋
                            </span>
                            <div className="min-w-0 flex-1">
                                <h3 className="mb-1 text-base font-bold text-gray-100 md:text-lg">¡Bienvenido a CuentaClara!</h3>
                                <p className="mb-3 text-xs text-gray-300 md:text-sm">
                                    ¿Es tu primera vez? Tenemos una guía con todo lo que necesitas para empezar a vender hoy mismo.
                                </p>
                                <div className="flex flex-wrap gap-2">
                                    <button
                                        onClick={irAGuia}
                                        className="rounded-lg border border-blue-400/30 bg-blue-500/20 px-3 py-2 text-xs font-bold text-blue-200 transition-colors hover:bg-blue-500/30 md:text-sm"
                                    >
                                        📚 Ver guía
                                    </button>
                                    <button
                                        onClick={cerrarBienvenida}
                                        className="rounded-lg border border-white/10 bg-slate-800/60 px-3 py-2 text-xs font-bold text-gray-300 transition-colors hover:bg-slate-800 md:text-sm"
                                    >
                                        Cerrar
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* ===== Header ===== */}
                <div className={`cc-fade-up mb-4 md:mb-6 ${cardPadded}`}>
                    <div className="flex items-center justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-3">
                            <div className="hidden h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 via-indigo-600 to-violet-600 text-2xl shadow-md shadow-indigo-600/40 ring-2 ring-white/10 md:flex">
                                📊
                            </div>
                            <div className="min-w-0">
                                <h1 className={`${titleGradient} truncate text-xl md:text-3xl`}>Panel de Control</h1>
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

                {/* ===== Filtros ===== */}
                <div className={`cc-fade-up mb-4 md:mb-6 ${card} p-3 md:p-4`}>
                    <div className="flex flex-wrap gap-2">
                        {FILTROS.map((f) => (
                            <button key={f.id} onClick={() => setFiltroFecha(f.id)} className={filterPill(filtroFecha === f.id)}>
                                <span>{f.icon}</span>
                                <span>{f.label}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* ===== KPIs: 2x2 en móvil, 4 en desktop ===== */}
                <div className="mb-4 grid grid-cols-2 gap-3 md:mb-6 md:grid-cols-4 md:gap-4">
                    {kpisPrincipales.map((k) => (
                        <MetricCard key={k.label} icon={k.icon} label={k.label} value={k.valor} sub={k.sub} tile={k.tile} />
                    ))}
                </div>

                {/* ===== Stock bajo en móvil (compacto) ===== */}
                <div className="mb-4 md:hidden">
                    <div className={`${card} p-3`}>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-rose-500 to-red-600 text-sm shadow-md">⚠️</span>
                                <div>
                                    <p className="text-[10px] font-extrabold uppercase tracking-wider text-gray-400">Stock Bajo</p>
                                    <p className="text-lg font-black text-gray-100">{productosBajoStock.length}</p>
                                </div>
                            </div>
                            {productosBajoStock.length > 0 && (
                                <span className="rounded-full bg-rose-500/15 px-2.5 py-0.5 text-[10px] font-bold text-rose-300 ring-1 ring-rose-400/25">
                                    {productosBajoStock.length} críticos
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                {/* ===== MÓVIL: Tabs ===== */}
                <div className="md:hidden">
                    <div className={`${card} mb-4 p-1.5`}>
                        <div className="flex gap-1">
                            {SECCIONES.map((s) => (
                                <button
                                    key={s.id}
                                    onClick={() => setSeccionMovil(s.id)}
                                    className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2.5 text-xs font-bold transition-colors duration-150 ${seccionMovil === s.id
                                            ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md'
                                            : 'text-gray-400 hover:bg-white/5'
                                        }`}
                                >
                                    <span>{s.icon}</span>
                                    <span>{s.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className={`cc-fade-up ${card} p-4`}>
                        {seccionMovil === 'graficos' && (
                            <div className="space-y-4">
                                <div>
                                    <div className="mb-3 flex items-center gap-2">
                                        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 text-sm shadow-md">📈</span>
                                        <h2 className="text-sm font-bold text-gray-100">Ventas por Día</h2>
                                    </div>
                                    <div className="h-48">
                                        <Line data={ventasPorDia()} options={baseChartOptions} />
                                    </div>
                                </div>
                                <div className="border-t border-white/10 pt-4">
                                    <div className="mb-3 flex items-center gap-2">
                                        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 text-sm shadow-md">🏆</span>
                                        <h2 className="text-sm font-bold text-gray-100">Top 5 Productos</h2>
                                    </div>
                                    <div className="h-48">
                                        <Bar data={topProductos()} options={baseChartOptions} />
                                    </div>
                                </div>
                            </div>
                        )}

                        {seccionMovil === 'metodos' && (
                            <div>
                                <div className="mb-3 flex items-center gap-2">
                                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 text-sm shadow-md">💳</span>
                                    <h2 className="text-sm font-bold text-gray-100">Métodos de Pago</h2>
                                </div>
                                <div className="flex h-56 items-center justify-center">
                                    <Doughnut data={metodosPago()} options={doughnutOptions} />
                                </div>
                            </div>
                        )}

                        {seccionMovil === 'stock' && (
                            <div>
                                <div className="mb-3 flex items-center gap-2">
                                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-rose-500 to-red-600 text-sm shadow-md">⚠️</span>
                                    <h2 className="text-sm font-bold text-gray-100">Stock Bajo</h2>
                                    {productosBajoStock.length > 0 && (
                                        <span className="ml-auto rounded-full bg-rose-500/15 px-2.5 py-0.5 text-[10px] font-bold text-rose-300 ring-1 ring-rose-400/25">
                                            {productosBajoStock.length}
                                        </span>
                                    )}
                                </div>
                                {productosBajoStock.length === 0 ? (
                                    <EmptyState icon="✅" texto="Todos tienen stock suficiente" />
                                ) : (
                                    <div className="space-y-2">
                                        {productosBajoStock.map((p) => (
                                            <div key={p.id} className="flex items-center justify-between rounded-xl border border-rose-400/20 bg-rose-500/10 p-3">
                                                <div className="min-w-0 flex-1">
                                                    <p className="truncate text-sm font-bold text-gray-100">{p.nombre}</p>
                                                    <p className="text-[11px] text-gray-400">Mínimo: {p.stockMinimo}</p>
                                                </div>
                                                <div className="ml-3 text-right">
                                                    <p className="text-xl font-black text-rose-300">{p.stockActual}</p>
                                                    <p className="text-[10px] font-semibold uppercase text-gray-500">{p.unidadMedida || 'u'}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* ===== DESKTOP ===== */}
                <div className="hidden md:block">
                    <div className="mb-6 grid grid-cols-2 gap-4">
                        <div className={`cc-fade-up ${card} p-5`}>
                            <div className="mb-4 flex items-center gap-2">
                                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-base shadow-md">📈</span>
                                <h2 className="text-lg font-bold text-gray-100">Ventas por Día</h2>
                            </div>
                            <div className="h-64">
                                <Line data={ventasPorDia()} options={baseChartOptions} />
                            </div>
                        </div>

                        <div className={`cc-fade-up ${card} p-5`}>
                            <div className="mb-4 flex items-center gap-2">
                                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 text-base shadow-md">🏆</span>
                                <h2 className="text-lg font-bold text-gray-100">Top 5 Productos</h2>
                            </div>
                            <div className="h-64">
                                <Bar data={topProductos()} options={baseChartOptions} />
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                        <div className={`cc-fade-up ${card} p-5`}>
                            <div className="mb-4 flex items-center gap-2">
                                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-base shadow-md">💳</span>
                                <h2 className="text-lg font-bold text-gray-100">Métodos de Pago</h2>
                            </div>
                            <div className="flex h-64 items-center justify-center">
                                <Doughnut data={metodosPago()} options={doughnutOptions} />
                            </div>
                        </div>

                        <div className={`cc-fade-up ${card} p-5`}>
                            <div className="mb-4 flex items-center gap-2">
                                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-rose-500 to-red-600 text-base shadow-md">⚠️</span>
                                <h2 className="text-lg font-bold text-gray-100">Stock Bajo</h2>
                                {productosBajoStock.length > 0 && (
                                    <span className="ml-auto rounded-full bg-rose-500/15 px-2.5 py-0.5 text-[11px] font-bold text-rose-300 ring-1 ring-rose-400/25">
                                        {productosBajoStock.length}
                                    </span>
                                )}
                            </div>
                            {productosBajoStock.length === 0 ? (
                                <div className="flex h-64 flex-col items-center justify-center gap-2 text-center">
                                    <span className="text-4xl">✅</span>
                                    <p className="text-sm font-semibold text-gray-400">Todos tienen stock suficiente</p>
                                </div>
                            ) : (
                                <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
                                    {productosBajoStock.map((p) => (
                                        <div key={p.id} className="flex items-center justify-between rounded-xl border border-rose-400/20 bg-rose-500/10 p-3 transition-colors duration-150 hover:border-rose-400/40 hover:bg-rose-500/15">
                                            <div className="min-w-0 flex-1">
                                                <p className="truncate text-sm font-bold text-gray-100">{p.nombre}</p>
                                                <p className="text-[11px] text-gray-400">Mínimo: {p.stockMinimo}</p>
                                            </div>
                                            <div className="ml-3 text-right">
                                                <p className="text-2xl font-black text-rose-300">{p.stockActual}</p>
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
        </div>
    );
}