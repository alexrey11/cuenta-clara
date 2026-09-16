import { useState, useEffect } from 'react';
import { db } from './db';
import type { Venta, Producto } from './db';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import {
    Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Title, Tooltip, Legend, Filler
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Title, Tooltip, Legend, Filler);

interface DashboardProps { onVolver: () => void; }

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
            datasets: [{ label: 'Ventas (CUP)', data: Object.values(dias), borderColor: 'rgb(59, 130, 246)', backgroundColor: 'rgba(59, 130, 246, 0.1)', fill: true, tension: 0.4 }]
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
            datasets: [{ label: 'Unidades', data: sorted.map(s => s[1]), backgroundColor: ['rgba(59, 130, 246, 0.8)', 'rgba(16, 185, 129, 0.8)', 'rgba(245, 158, 11, 0.8)', 'rgba(139, 92, 246, 0.8)', 'rgba(239, 68, 68, 0.8)'] }]
        };
    };

    const metodosPago = () => {
        const metodos: Record<string, number> = { efectivo: 0, transferencia: 0, tarjeta: 0, fiado: 0 };
        ventas.forEach(v => { v.metodosPago?.forEach(mp => { metodos[mp.tipo] = (metodos[mp.tipo] || 0) + mp.montoEnCUP; }); });
        return {
            labels: ['Efectivo', 'Transfer', 'Tarjeta', 'Fiado'],
            datasets: [{ data: [metodos.efectivo, metodos.transferencia, metodos.tarjeta, metodos.fiado], backgroundColor: ['rgba(16, 185, 129, 0.8)', 'rgba(59, 130, 246, 0.8)', 'rgba(245, 158, 11, 0.8)', 'rgba(239, 68, 68, 0.8)'] }]
        };
    };

    const chartOptions = { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } };

    return (
        <div className="p-3 md:p-6 bg-gray-50 dark:bg-gray-900 min-h-screen">
            <div className="max-w-7xl mx-auto">
                {/* Header con botón Volver siempre visible */}
                <div className="bg-white dark:bg-gray-800 rounded-xl md:rounded-2xl shadow-md p-4 md:p-6 mb-4 md:mb-6">
                    <div className="flex justify-between items-center">
                        <div className="flex-1 min-w-0">
                            <h1 className="text-xl md:text-3xl font-bold text-gray-800 dark:text-gray-200 mb-1">📊 Panel de Control</h1>
                            <p className="text-xs md:text-base text-gray-600 dark:text-gray-400 truncate">Estadísticas en tiempo real</p>
                        </div>
                        <button
                            onClick={onVolver}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 md:px-6 md:py-3 rounded-lg md:rounded-xl font-semibold text-sm md:text-base ml-2 flex-shrink-0 shadow-md"
                        >
                            ← Volver
                        </button>
                    </div>
                </div>

                {/* Filtros */}
                <div className="bg-white dark:bg-gray-800 rounded-xl md:rounded-2xl shadow-md p-3 md:p-4 mb-4 md:mb-6">
                    <div className="flex gap-2 flex-wrap">
                        {(['hoy', 'semana', 'mes', 'todo'] as const).map((f) => (
                            <button key={f} onClick={() => setFiltroFecha(f)}
                                className={`px-3 md:px-4 py-2 rounded-lg font-semibold transition-colors text-sm md:text-base ${filtroFecha === f ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'}`}>
                                {f === 'hoy' ? '📅 Hoy' : f === 'semana' ? '📆 Semana' : f === 'mes' ? '🗓️ Mes' : '📊 Todo'}
                            </button>
                        ))}
                    </div>
                </div>

                {/* KPIs */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-6 mb-4 md:mb-6">
                    <div className="bg-gradient-to-br from-green-500 to-green-600 text-white p-3 md:p-6 rounded-xl md:rounded-2xl shadow-md">
                        <p className="text-xs md:text-sm opacity-90 mb-1 md:mb-2">💰 Vendido</p>
                        <p className="text-lg md:text-3xl font-bold truncate">${totalGeneral.toFixed(0)}</p>
                        <p className="text-xs opacity-90 mt-1 hidden md:block">{ventas.length} ventas</p>
                    </div>
                    <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white p-3 md:p-6 rounded-xl md:rounded-2xl shadow-md">
                        <p className="text-xs md:text-sm opacity-90 mb-1 md:mb-2">📈 Ganancia</p>
                        <p className="text-lg md:text-3xl font-bold truncate">${gananciaTotal.toFixed(0)}</p>
                        <p className="text-xs opacity-90 mt-1 hidden md:block">Beneficio real</p>
                    </div>
                    <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white p-3 md:p-6 rounded-xl md:rounded-2xl shadow-md">
                        <p className="text-xs md:text-sm opacity-90 mb-1 md:mb-2">🎫 Ticket</p>
                        <p className="text-lg md:text-3xl font-bold truncate">${ticketPromedio.toFixed(0)}</p>
                        <p className="text-xs opacity-90 mt-1 hidden md:block">Promedio</p>
                    </div>
                    <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 text-white p-3 md:p-6 rounded-xl md:rounded-2xl shadow-md">
                        <p className="text-xs md:text-sm opacity-90 mb-1 md:mb-2">📦 Productos</p>
                        <p className="text-lg md:text-3xl font-bold">{productos.length}</p>
                        <p className="text-xs opacity-90 mt-1 hidden md:block">En inventario</p>
                    </div>
                    <div className="bg-gradient-to-br from-red-500 to-red-600 text-white p-3 md:p-6 rounded-xl md:rounded-2xl shadow-md col-span-2 md:col-span-1">
                        <p className="text-xs md:text-sm opacity-90 mb-1 md:mb-2">⚠️ Stock Bajo</p>
                        <p className="text-lg md:text-3xl font-bold">{productosBajoStock.length}</p>
                        <p className="text-xs opacity-90 mt-1 hidden md:block">Críticos</p>
                    </div>
                </div>

                {/* Gráficos */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6 mb-4 md:mb-6">
                    <div className="bg-white dark:bg-gray-800 rounded-xl md:rounded-2xl shadow-md p-4 md:p-6">
                        <h2 className="text-base md:text-xl font-semibold mb-3 md:mb-4 text-gray-800 dark:text-gray-200">📈 Ventas por Día</h2>
                        <div className="h-56 md:h-64"><Line data={ventasPorDia()} options={chartOptions} /></div>
                    </div>
                    <div className="bg-white dark:bg-gray-800 rounded-xl md:rounded-2xl shadow-md p-4 md:p-6">
                        <h2 className="text-base md:text-xl font-semibold mb-3 md:mb-4 text-gray-800 dark:text-gray-200">🏆 Top 5</h2>
                        <div className="h-56 md:h-64"><Bar data={topProductos()} options={chartOptions} /></div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
                    <div className="bg-white dark:bg-gray-800 rounded-xl md:rounded-2xl shadow-md p-4 md:p-6">
                        <h2 className="text-base md:text-xl font-semibold mb-3 md:mb-4 text-gray-800 dark:text-gray-200">💳 Métodos de Pago</h2>
                        <div className="h-56 md:h-64 flex items-center justify-center"><Doughnut data={metodosPago()} options={chartOptions} /></div>
                    </div>
                    <div className="bg-white dark:bg-gray-800 rounded-xl md:rounded-2xl shadow-md p-4 md:p-6">
                        <h2 className="text-base md:text-xl font-semibold mb-3 md:mb-4 text-gray-800 dark:text-gray-200">⚠️ Stock Bajo</h2>
                        {productosBajoStock.length === 0 ? (
                            <div className="h-56 md:h-64 flex items-center justify-center text-gray-400 dark:text-gray-600 text-center p-4">
                                <p>✅ Todos tienen stock suficiente</p>
                            </div>
                        ) : (
                            <div className="space-y-2 max-h-56 md:max-h-64 overflow-y-auto">
                                {productosBajoStock.map(p => (
                                    <div key={p.id} className="flex justify-between items-center bg-red-50 dark:bg-red-900/20 p-2 md:p-3 rounded-lg border border-red-200 dark:border-red-800">
                                        <div className="flex-1 min-w-0">
                                            <p className="font-semibold text-gray-800 dark:text-gray-200 text-sm truncate">{p.nombre}</p>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">Mín: {p.stockMinimo}</p>
                                        </div>
                                        <div className="text-right ml-2">
                                            <p className="text-xl md:text-2xl font-bold text-red-600 dark:text-red-400">{p.stockActual}</p>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">{p.unidadMedida || 'u'}</p>
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