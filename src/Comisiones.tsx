// ============ src/Comisiones.tsx ============
import { useState, useEffect } from 'react';
import { db } from './db';
import type { Usuario, Venta } from './db';
import {
    STYLES, BackgroundBlobs, pageWrap, card, cardPadded, titleGradient,
    EmptyState,
} from './theme';

interface ComisionesProps { usuarioActual: Usuario; }

const FILTROS = [
    { id: 'hoy', label: 'Hoy', icon: '📅' },
    { id: 'semana', label: 'Semana', icon: '📆' },
    { id: 'mes', label: 'Mes', icon: '🗓️' },
    { id: 'todo', label: 'Todo', icon: '📊' },
] as const;

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
        <div className={pageWrap}>
            <style>{STYLES}</style>
            <BackgroundBlobs />

            <div className="relative mx-auto max-w-4xl">
                <div className={`cc-fade-up mb-4 md:mb-6 ${cardPadded}`}>
                    <div className="flex items-center gap-3">
                        <div className="hidden h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-2xl shadow-md ring-2 ring-white/10 md:flex">💵</div>
                        <div className="min-w-0">
                            <h1 className={`${titleGradient} truncate text-xl md:text-3xl`}>Comisiones</h1>
                            <p className="truncate text-xs text-gray-400 md:text-sm">Comisiones por vendedor</p>
                        </div>
                    </div>
                </div>

                <div className={`cc-fade-up mb-4 md:mb-6 ${card} p-3 md:p-4`}>
                    <div className="flex flex-wrap gap-2">
                        {FILTROS.map((f) => {
                            const activo = filtroFecha === f.id;
                            return (
                                <button key={f.id} onClick={() => setFiltroFecha(f.id)}
                                    className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-bold transition-colors duration-150 md:px-4 md:text-base ${activo
                                        ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/25'
                                        : 'border border-white/10 bg-slate-800/50 text-gray-300 hover:border-blue-400/40 hover:bg-slate-800/80'
                                        }`}>
                                    <span>{f.icon}</span><span>{f.label}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                <div className={`${card} cc-fade-up mb-4 p-4 md:mb-6 md:p-6`}>
                    <div className="flex items-center gap-3">
                        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-2xl shadow-md ring-2 ring-white/10">💰</span>
                        <div>
                            <p className="text-[11px] font-extrabold uppercase tracking-wider text-gray-400">Total Comisiones</p>
                            <p className="text-2xl font-black text-emerald-300 md:text-3xl">${totalComisiones.toFixed(2)}</p>
                            <p className="mt-0.5 text-xs text-gray-500">{comisionesPorVendedor.length} vendedores</p>
                        </div>
                    </div>
                </div>

                {comisionesPorVendedor.length === 0 ? (
                    <div className={`${card} p-6`}><EmptyState icon="💵" texto="Sin comisiones en este período" /></div>
                ) : (
                    <div className="space-y-2 md:space-y-3">
                        {comisionesPorVendedor.map((c, idx) => (
                            <div key={idx} className={`${card} cc-fade-up p-3 md:p-4`}>
                                <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0 flex-1">
                                        <h3 className="truncate text-sm font-bold text-gray-100 md:text-lg">{c.usuario.nombre}</h3>
                                        <p className="text-xs text-gray-400">
                                            {c.usuario.comisionPorcentaje}% comisión · {c.cantidadVentas} ventas
                                        </p>
                                        <p className="text-xs text-gray-500">Ventas: ${c.totalVentas.toFixed(2)}</p>
                                    </div>
                                    <div className="shrink-0 text-right">
                                        <p className="text-xl font-black text-emerald-300 md:text-2xl">${c.comision.toFixed(2)}</p>
                                        <p className="text-xs text-gray-500">Comisión</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}