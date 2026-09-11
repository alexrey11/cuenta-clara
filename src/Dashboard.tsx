import { useState, useEffect } from 'react';
import { db } from './db';
import type { Venta, Producto, Usuario } from './db';

import { Line, Bar, Doughnut } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    ArcElement,
    Title,
    Tooltip,
    Legend,
    Filler
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Title, Tooltip, Legend, Filler);

interface DashboardProps {
    onVolver: () => void;
    usuarioActual: Usuario;
}

export default function Dashboard({ onVolver, usuarioActual: _ }: DashboardProps) {
    const [ventas, setVentas] = useState<Venta[]>([]);
    const [productos, setProductos] = useState<Producto[]>([]);
    const [filtroFecha, setFiltroFecha] = useState<'hoy' | 'semana' | 'mes' | 'todo'>('semana');

    useEffect(() => {
        cargarDatos();
    }, [filtroFecha]);

    const cargarDatos = async () => {
        const todasVentas = await db.ventas.toArray();
        const todosProductos = await db.productos.toArray();

        const ahora = new Date();
        let ventasFiltradas = todasVentas.filter(v => v.estado === 'completada');

        if (filtroFecha === 'hoy') {
            const inicio = new Date(ahora);
            inicio.setHours(0, 0, 0, 0);
            ventasFiltradas = ventasFiltradas.filter(v => new Date(v.fecha) >= inicio);
        } else if (filtroFecha === 'semana') {
            const inicio = new Date(ahora);
            inicio.setDate(ahora.getDate() - 7);
            inicio.setHours(0, 0, 0, 0);
            ventasFiltradas = ventasFiltradas.filter(v => new Date(v.fecha) >= inicio);
        } else if (filtroFecha === 'mes') {
            const inicio = new Date(ahora);
            inicio.setDate(1);
            inicio.setHours(0, 0, 0, 0);
            ventasFiltradas = ventasFiltradas.filter(v => new Date(v.fecha) >= inicio);
        }

        setVentas(ventasFiltradas);
        setProductos(todosProductos);
    };

    const totalGeneral = ventas.reduce((sum, v) => sum + v.total, 0);
    const ticketPromedio = ventas.length > 0 ? totalGeneral / ventas.length : 0;
    const productosBajoStock = productos.filter(p => p.stockActual <= p.stockMinimo);

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
                borderColor: 'rgb(59, 130, 246)',
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                fill: true,
                tension: 0.4
            }]
        };
    };

    const topProductos = () => {
        const stats = new Map<string, number>();
        ventas.forEach(v => {
            stats.set(v.productoNombre, (stats.get(v.productoNombre) || 0) + v.cantidad);
        });
        const sorted = Array.from(stats.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5);
        return {
            labels: sorted.map(s => s[0]),
            datasets: [{
                label: 'Unidades Vendidas',
                data: sorted.map(s => s[1]),
                backgroundColor: [
                    'rgba(59, 130, 246, 0.8)',
                    'rgba(16, 185, 129, 0.8)',
                    'rgba(245, 158, 11, 0.8)',
                    'rgba(139, 92, 246, 0.8)',
                    'rgba(239, 68, 68, 0.8)'
                ]
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
            labels: ['Efectivo', 'Transferencia', 'Tarjeta', 'Fiado'],
            datasets: [{
                data: [metodos.efectivo, metodos.transferencia, metodos.tarjeta, metodos.fiado],
                backgroundColor: [
                    'rgba(16, 185, 129, 0.8)',
                    'rgba(59, 130, 246, 0.8)',
                    'rgba(245, 158, 11, 0.8)',
                    'rgba(239, 68, 68, 0.8)'
                ]
            }]
        };
    };

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: false }
        }
    };

    return (
        <div className="p-6 bg-gray-50 dark:bg-gray-900 min-h-screen">
            <div className="max-w-7xl mx-auto">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-200 mb-1">📊 Panel de Control</h1>
                        <p className="text-gray-600 dark:text-gray-400">Estadísticas en tiempo real de tu negocio</p>
                    </div>
                    <button
                        onClick={onVolver}
                        className="bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 px-6 py-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 font-semibold"
                    >
                        ← Volver
                    </button>
                </div>

                {/* Filtros */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-md p-4 mb-6">
                    <div className="flex gap-2 flex-wrap">
                        {(['hoy', 'semana', 'mes', 'todo'] as const).map((f) => (
                            <button
                                key={f}
                                onClick={() => setFiltroFecha(f)}
                                className={`px-4 py-2 rounded-lg font-semibold transition-colors ${filtroFecha === f
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                                    }`}
                            >
                                {f === 'hoy' ? '📅 Hoy' : f === 'semana' ? '📆 Esta Semana' : f === 'mes' ? '🗓️ Este Mes' : '📊 Todo'}
                            </button>
                        ))}
                    </div>
                </div>

                {/* KPIs */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
                    <div className="bg-gradient-to-br from-green-500 to-green-600 text-white p-6 rounded-2xl shadow-md">
                        <p className="text-sm opacity-90 mb-2">💰 Total Vendido</p>
                        <p className="text-4xl font-bold">${totalGeneral.toFixed(2)}</p>
                        <p className="text-sm opacity-90 mt-2">{ventas.length} ventas</p>
                    </div>
                    <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white p-6 rounded-2xl shadow-md">
                        <p className="text-sm opacity-90 mb-2">🎫 Ticket Promedio</p>
                        <p className="text-4xl font-bold">${ticketPromedio.toFixed(2)}</p>
                        <p className="text-sm opacity-90 mt-2">Por venta</p>
                    </div>
                    <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white p-6 rounded-2xl shadow-md">
                        <p className="text-sm opacity-90 mb-2">📦 Productos</p>
                        <p className="text-4xl font-bold">{productos.length}</p>
                        <p className="text-sm opacity-90 mt-2">En inventario</p>
                    </div>
                    <div className="bg-gradient-to-br from-red-500 to-red-600 text-white p-6 rounded-2xl shadow-md">
                        <p className="text-sm opacity-90 mb-2">⚠️ Stock Bajo</p>
                        <p className="text-4xl font-bold">{productosBajoStock.length}</p>
                        <p className="text-sm opacity-90 mt-2">Productos críticos</p>
                    </div>
                </div>

                {/* Gráficos */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-md p-6">
                        <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-gray-200">📈 Ventas por Día</h2>
                        <div className="h-64">
                            <Line data={ventasPorDia()} options={chartOptions} />
                        </div>
                    </div>

                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-md p-6">
                        <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-gray-200">🏆 Top 5 Productos</h2>
                        <div className="h-64">
                            <Bar data={topProductos()} options={chartOptions} />
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-md p-6">
                        <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-gray-200">💳 Métodos de Pago</h2>
                        <div className="h-64 flex items-center justify-center">
                            <Doughnut data={metodosPago()} options={chartOptions} />
                        </div>
                    </div>

                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-md p-6">
                        <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-gray-200">⚠️ Productos con Stock Bajo</h2>
                        {productosBajoStock.length === 0 ? (
                            <div className="h-64 flex items-center justify-center text-gray-400 dark:text-gray-600">
                                <p>✅ Todos los productos tienen stock suficiente</p>
                            </div>
                        ) : (
                            <div className="space-y-2 max-h-64 overflow-y-auto">
                                {productosBajoStock.map(p => (
                                    <div key={p.id} className="flex justify-between items-center bg-red-50 dark:bg-red-900/20 p-3 rounded-lg border border-red-200 dark:border-red-800">
                                        <div>
                                            <p className="font-semibold text-gray-800 dark:text-gray-200">{p.nombre}</p>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">Mínimo: {p.stockMinimo}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-2xl font-bold text-red-600 dark:text-red-400">{p.stockActual}</p>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">{p.unidadMedida || 'unidades'}</p>
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