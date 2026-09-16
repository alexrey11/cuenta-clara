import { useState, useEffect } from 'react';
import { db } from './db';
import type { Usuario, Venta } from './db';


interface ComisionesProps {
    usuarioActual: Usuario;
}

export default function Comisiones({ usuarioActual: _ }: ComisionesProps) {
    const [ventas, setVentas] = useState<Venta[]>([]);
    const [usuarios, setUsuarios] = useState<Usuario[]>([]);
    const [filtroFecha, setFiltroFecha] = useState<'hoy' | 'semana' | 'mes' | 'todo'>('mes');

    useEffect(() => { cargarDatos(); }, [filtroFecha]);

    const cargarDatos = async () => {
        const todasVentas = await db.ventas.toArray();
        const todosUsuarios = await db.usuarios.toArray();
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
        setUsuarios(todosUsuarios);
    };

    const comisionesPorVendedor = usuarios.map(u => {
        const ventasVendedor = ventas.filter(v => v.vendedorId === u.id);
        const totalVentas = ventasVendedor.reduce((s, v) => s + v.total, 0);
        const comision = u.comisionPorcentaje ? totalVentas * (u.comisionPorcentaje / 100) : 0;
        return { usuario: u, totalVentas, comision, cantidadVentas: ventasVendedor.length };
    }).filter(c => c.cantidadVentas > 0);

    const totalComisiones = comisionesPorVendedor.reduce((s, c) => s + c.comision, 0);

    return (
        <div className="p-3 md:p-6 bg-gray-50 dark:bg-gray-900 min-h-screen">
            <div className="max-w-4xl mx-auto">
                <div className="bg-white dark:bg-gray-800 rounded-xl md:rounded-2xl shadow-md p-4 md:p-6 mb-4 md:mb-6">
                    <h1 className="text-xl md:text-3xl font-bold text-gray-800 dark:text-gray-200 mb-1">💵 Comisiones</h1>
                    <p className="text-xs md:text-base text-gray-600 dark:text-gray-400">Comisiones por vendedor</p>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-xl md:rounded-2xl shadow-md p-3 md:p-4 mb-4 md:mb-6">
                    <div className="flex gap-2 flex-wrap">
                        {(['hoy', 'semana', 'mes', 'todo'] as const).map(f => (
                            <button key={f} onClick={() => setFiltroFecha(f)}
                                className={`px-3 md:px-4 py-2 rounded-lg font-semibold transition-colors text-sm md:text-base ${filtroFecha === f ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                                    }`}>
                                {f === 'hoy' ? '📅 Hoy' : f === 'semana' ? '📆 Semana' : f === 'mes' ? '🗓️ Mes' : '📊 Todo'}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="bg-gradient-to-br from-green-500 to-green-600 text-white p-4 md:p-6 rounded-xl md:rounded-2xl shadow-md mb-4 md:mb-6">
                    <p className="text-xs md:text-sm opacity-90 mb-1">💰 Total Comisiones</p>
                    <p className="text-2xl md:text-3xl font-bold">${totalComisiones.toFixed(2)}</p>
                    <p className="text-xs opacity-90 mt-1">{comisionesPorVendedor.length} vendedores</p>
                </div>

                <div className="space-y-2 md:space-y-3">
                    {comisionesPorVendedor.map((c, idx) => (
                        <div key={idx} className="bg-white dark:bg-gray-800 p-3 md:p-4 rounded-xl md:rounded-2xl shadow-md border border-gray-100 dark:border-gray-700">
                            <div className="flex justify-between items-start">
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-bold text-gray-800 dark:text-gray-200 text-sm md:text-lg truncate">{c.usuario.nombre}</h3>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                        {c.usuario.comisionPorcentaje}% comisión • {c.cantidadVentas} ventas
                                    </p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                        Ventas: ${c.totalVentas.toFixed(2)}
                                    </p>
                                </div>
                                <div className="text-right ml-2 flex-shrink-0">
                                    <p className="text-xl md:text-2xl font-bold text-green-600 dark:text-green-400">${c.comision.toFixed(2)}</p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">Comisión</p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}