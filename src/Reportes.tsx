// ============ src/Reportes.tsx ============
import { useState, useEffect } from 'react';
import { db } from './db';
import type { Producto, Cliente, CierreCaja, Usuario } from './db';
import jsPDF from 'jspdf';
import {
    STYLES, BackgroundBlobs, pageWrap, card, cardPadded, titleGradient,
    sectionTitle, MetricCard,
} from './theme';

interface ReportesProps { usuarioActual: Usuario; }

export default function Reportes({ usuarioActual: _ }: ReportesProps) {
    const [productos, setProductos] = useState<Producto[]>([]);
    const [clientes, setClientes] = useState<Cliente[]>([]);
    const [cierres, setCierres] = useState<CierreCaja[]>([]);

    useEffect(() => { cargarDatos(); }, []);

    const cargarDatos = async () => {
        const [p, c, ci] = await Promise.all([
            db.productos.toArray(), db.clientes.toArray(), db.cierres.toArray(),
        ]);
        setProductos(p); setClientes(c); setCierres(ci);
    };

    const generarPDFInventario = () => {
        const doc = new jsPDF();
        doc.setFontSize(18); doc.text('Reporte de Inventario', 105, 20, { align: 'center' });
        doc.setFontSize(9); doc.text(`Generado: ${new Date().toLocaleDateString('es-ES')}`, 105, 28, { align: 'center' });
        let y = 42;
        doc.setFontSize(8); doc.setFont('helvetica', 'bold');
        doc.text('Producto', 14, y); doc.text('Cod.Barras', 70, y); doc.text('Stock', 100, y);
        doc.text('P.Compra', 118, y); doc.text('P.Venta', 138, y); doc.text('Valor Total', 158, y); doc.text('Ganancia Pot.', 178, y);
        doc.setFont('helvetica', 'normal'); y += 8;
        let valorTotalCompra = 0, valorTotalVenta = 0, gananciaPotencial = 0, productosBajoStock = 0;
        productos.forEach(p => {
            if (y > 275) { doc.addPage(); y = 20; }
            const pc = p.precioCompra || 0, pv = p.precioVenta || 0;
            const valorCompra = p.stockActual * pc, valorVenta = p.stockActual * pv;
            const ganancia = valorVenta - valorCompra;
            if (p.stockActual <= p.stockMinimo) { productosBajoStock++; doc.setTextColor(255, 0, 0); } else { doc.setTextColor(0, 0, 0); }
            doc.text(p.nombre.substring(0, 28), 14, y);
            doc.text(p.codigoBarras || '-', 70, y);
            doc.text(p.stockActual.toString(), 100, y);
            doc.text(`$${pc.toFixed(2)}`, 118, y);
            doc.text(`$${pv.toFixed(2)}`, 138, y);
            doc.text(`$${valorCompra.toFixed(2)}`, 158, y);
            doc.text(`$${ganancia.toFixed(2)}`, 178, y);
            valorTotalCompra += valorCompra; valorTotalVenta += valorVenta; gananciaPotencial += ganancia;
            y += 6;
        });
        doc.setTextColor(0, 0, 0); y += 10;
        doc.setFont('helvetica', 'bold'); doc.setFontSize(10);
        doc.text(`VALOR INVENTARIO (compra): $${valorTotalCompra.toFixed(2)} CUP`, 14, y);
        doc.text(`VALOR INVENTARIO (venta):  $${valorTotalVenta.toFixed(2)} CUP`, 14, y + 8);
        doc.text(`GANANCIA POTENCIAL:        $${gananciaPotencial.toFixed(2)} CUP`, 14, y + 16);
        doc.text(`Productos con stock bajo: ${productosBajoStock}`, 14, y + 24);
        doc.save(`Inventario_${new Date().toISOString().split('T')[0]}.pdf`);
    };

    const generarPDFFiados = () => {
        const doc = new jsPDF();
        const cd = clientes.filter(c => c.saldoPendiente > 0);
        doc.setFontSize(18); doc.text('Cuentas por Cobrar (Fiados)', 105, 20, { align: 'center' });
        doc.setFontSize(9); doc.text(`Generado: ${new Date().toLocaleDateString('es-ES')}`, 105, 28, { align: 'center' });
        let y = 42;
        doc.setFontSize(9); doc.setFont('helvetica', 'bold');
        doc.text('Cliente', 14, y); doc.text('Telefono', 80, y); doc.text('Saldo Pendiente', 140, y);
        doc.setFont('helvetica', 'normal'); y += 10;
        let total = 0;
        cd.forEach(c => {
            if (y > 275) { doc.addPage(); y = 20; }
            doc.text(c.nombre.substring(0, 30), 14, y);
            doc.text(c.telefono || 'N/A', 80, y);
            doc.text(`$${c.saldoPendiente.toFixed(2)}`, 140, y);
            total += c.saldoPendiente; y += 8;
        });
        y += 10; doc.setFont('helvetica', 'bold'); doc.setFontSize(11);
        doc.text(`TOTAL POR COBRAR: $${total.toFixed(2)} CUP`, 14, y);
        doc.text(`${cd.length} clientes con deuda`, 14, y + 10);
        doc.save(`Fiados_${new Date().toISOString().split('T')[0]}.pdf`);
    };

    const exportarCSV = (tipo: string) => {
        let csv = '', filename = '';
        if (tipo === 'inventario') {
            csv = 'Producto,Cod.Barras,Stock,Stock Min,Precio Compra,Precio Venta,Valor Compra,Valor Venta,Ganancia Potencial\n';
            productos.forEach(p => {
                const pc = p.precioCompra || 0, pv = p.precioVenta || 0;
                csv += `"${p.nombre}","${p.codigoBarras || ''}",${p.stockActual},${p.stockMinimo},${pc},${pv},${(p.stockActual * pc).toFixed(2)},${(p.stockActual * pv).toFixed(2)},${(p.stockActual * (pv - pc)).toFixed(2)}\n`;
            });
            filename = `Inventario_${new Date().toISOString().split('T')[0]}.csv`;
        } else if (tipo === 'cierres') {
            csv = 'Fecha,Total Ventas,Cantidad,Monto Real,Diferencia,Realizado Por\n';
            cierres.forEach(c => {
                csv += `"${new Date(c.fecha).toLocaleDateString('es-ES')}",${c.totalVentas},${c.cantidadVentas},${c.montoReal},${c.diferencia},"${c.realizadoPor}"\n`;
            });
            filename = `Cierres_${new Date().toISOString().split('T')[0]}.csv`;
        } else if (tipo === 'clientes') {
            csv = 'Nombre,Telefono,Direccion,Saldo Pendiente,Notas\n';
            clientes.forEach(c => {
                csv += `"${c.nombre}","${c.telefono || ''}","${c.direccion || ''}",${c.saldoPendiente},"${c.notas || ''}"\n`;
            });
            filename = `Clientes_${new Date().toISOString().split('T')[0]}.csv`;
        }
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = filename;
        link.click();
    };

    const valorInventario = productos.reduce((s, p) => s + p.stockActual * (p.precioCompra || 0), 0);
    const valorVentaInventario = productos.reduce((s, p) => s + p.stockActual * (p.precioVenta || 0), 0);
    const gananciaPotencial = valorVentaInventario - valorInventario;
    const totalFiado = clientes.reduce((s, c) => s + c.saldoPendiente, 0);
    const productosBajoStock = productos.filter(p => p.stockActual <= p.stockMinimo).length;

    const pdfCards = [
        {
            onClick: generarPDFInventario,
            icon: '📦',
            titulo: 'Reporte de Inventario',
            desc: 'Valor, ganancia potencial y productos con stock bajo',
            tile: 'from-emerald-500 to-teal-600',
            glow: 'shadow-emerald-500/30',
        },
        {
            onClick: generarPDFFiados,
            icon: '💳',
            titulo: 'Cuentas por Cobrar',
            desc: 'Lista de clientes con saldo pendiente y total a cobrar',
            tile: 'from-rose-500 to-red-600',
            glow: 'shadow-rose-500/30',
        },
    ];

    const csvCards = [
        { onClick: () => exportarCSV('inventario'), icon: '📋', titulo: 'Inventario', desc: 'Valor y ganancia por producto', tile: 'from-blue-500 to-indigo-600' },
        { onClick: () => exportarCSV('cierres'), icon: '📑', titulo: 'Cierres', desc: 'Historial completo de cierres', tile: 'from-violet-500 to-purple-600' },
        { onClick: () => exportarCSV('clientes'), icon: '👥', titulo: 'Clientes', desc: 'Base de datos completa', tile: 'from-amber-500 to-orange-600' },
    ];

    return (
        <div className={pageWrap}>
            <style>{STYLES}</style>
            <BackgroundBlobs />

            <div className="relative mx-auto max-w-6xl">
                <div className={`cc-fade-up mb-4 md:mb-6 ${cardPadded}`}>
                    <div className="flex items-center gap-3">
                        <div className="hidden h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 text-2xl shadow-md ring-2 ring-white/10 md:flex">📊</div>
                        <div className="min-w-0">
                            <h1 className={`${titleGradient} truncate text-xl md:text-3xl`}>Reportes</h1>
                            <p className="truncate text-xs text-gray-400 md:text-sm">Genera reportes PDF y exporta a CSV</p>
                        </div>
                    </div>
                </div>

                {/* KPIs */}
                <div className="mb-4 grid grid-cols-2 gap-3 md:mb-6 md:grid-cols-4 md:gap-4">
                    <MetricCard icon="📦" label="Inversión" value={`$${valorInventario.toFixed(0)}`} sub="Precio compra" tile="from-violet-500 to-purple-600" />
                    <MetricCard icon="💰" label="Valor venta" value={`$${valorVentaInventario.toFixed(0)}`} sub="Si vendes todo" tile="from-blue-500 to-indigo-600" />
                    <MetricCard icon="📈" label="Ganancia pot." value={`$${gananciaPotencial.toFixed(0)}`} sub="Proyectada" tile="from-emerald-500 to-teal-600" />
                    <MetricCard icon="💳" label="Fiado" value={`$${totalFiado.toFixed(0)}`} sub={`${clientes.filter(c => c.saldoPendiente > 0).length} clientes`} tile="from-rose-500 to-red-600" />
                </div>

                {/* Reportes PDF */}
                <div className={`${card} cc-fade-up mb-4 p-4 md:mb-6 md:p-6`}>
                    <div className="mb-4 flex items-center gap-2">
                        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-rose-500 to-red-600 text-base shadow-md">📄</span>
                        <h2 className={`${sectionTitle}`}>Reportes PDF</h2>
                    </div>
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-4">
                        {pdfCards.map((r, i) => (
                            <button key={i} onClick={r.onClick}
                                className="group relative overflow-hidden rounded-2xl border border-white/10 bg-slate-800/50 p-4 text-left transition-all duration-200 hover:-translate-y-1 hover:border-blue-400/40 hover:bg-slate-800/80 md:p-5">
                                <div className={`absolute -right-6 -top-6 h-24 w-24 rounded-full bg-gradient-to-br ${r.tile} opacity-20 blur-2xl transition-opacity duration-300 group-hover:opacity-40`} />
                                <div className="relative">
                                    <span className={`mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${r.tile} text-2xl shadow-lg ${r.glow} transition-transform duration-200 group-hover:scale-110`}>
                                        {r.icon}
                                    </span>
                                    <h3 className="mb-1 text-base font-black text-gray-100 md:text-lg">{r.titulo}</h3>
                                    <p className="text-xs text-gray-400 md:text-sm">{r.desc}</p>
                                    <div className="mt-3 flex items-center gap-1 text-xs font-bold text-blue-300 md:text-sm">
                                        <span>Descargar</span>
                                        <span className="transition-transform duration-200 group-hover:translate-x-1">→</span>
                                    </div>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Exportar CSV */}
                <div className={`${card} cc-fade-up p-4 md:p-6`}>
                    <div className="mb-4 flex items-center gap-2">
                        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-base shadow-md">📊</span>
                        <h2 className={`${sectionTitle}`}>Exportar a CSV</h2>
                    </div>
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-3 md:gap-4">
                        {csvCards.map((c, i) => (
                            <button key={i} onClick={c.onClick}
                                className="group flex items-center gap-3 rounded-2xl border border-white/10 bg-slate-800/40 p-3 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-blue-400/40 hover:bg-slate-800/70 md:p-4">
                                <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${c.tile} text-xl shadow-md transition-transform duration-200 group-hover:scale-110`}>
                                    {c.icon}
                                </span>
                                <div className="min-w-0">
                                    <h3 className="truncate text-sm font-bold text-gray-100 md:text-base">{c.titulo}</h3>
                                    <p className="truncate text-xs text-gray-400">{c.desc}</p>
                                </div>
                            </button>
                        ))}
                    </div>
                    {productosBajoStock > 0 && (
                        <div className="mt-4 flex items-center gap-2 rounded-xl border border-amber-400/25 bg-amber-500/10 p-3">
                            <span className="text-lg">⚠️</span>
                            <p className="text-xs font-semibold text-amber-200 md:text-sm">
                                Tienes <strong>{productosBajoStock}</strong> producto{productosBajoStock !== 1 ? 's' : ''} con stock bajo
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}