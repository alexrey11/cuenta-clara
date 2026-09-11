import { useState, useEffect } from 'react';
import { db } from './db';
import type { Venta, Producto, Cliente, CierreCaja, Usuario } from './db';
import jsPDF from 'jspdf';


interface ReportesProps { usuarioActual: Usuario; }

export default function Reportes({ usuarioActual: _ }: ReportesProps) {
    const [ventas, setVentas] = useState<Venta[]>([]);
    const [productos, setProductos] = useState<Producto[]>([]);
    const [clientes, setClientes] = useState<Cliente[]>([]);
    const [cierres, setCierres] = useState<CierreCaja[]>([]);
    const [fechaInicio, setFechaInicio] = useState('');
    const [fechaFin, setFechaFin] = useState('');

    useEffect(() => { cargarDatos(); }, []);

    const cargarDatos = async () => {
        const [v, p, c, ci] = await Promise.all([db.ventas.toArray(), db.productos.toArray(), db.clientes.toArray(), db.cierres.toArray()]);
        setVentas(v); setProductos(p); setClientes(c); setCierres(ci);
    };

    const filtrarVentas = (v: Venta[]) => {
        if (!fechaInicio && !fechaFin) return v;
        return v.filter(x => { const f = new Date(x.fecha); if (fechaInicio && f < new Date(fechaInicio)) return false; if (fechaFin && f > new Date(fechaFin + 'T23:59:59')) return false; return true; });
    };

    const generarPDF = (tipo: string) => {
        const doc = new jsPDF();
        doc.setFontSize(20);
        doc.text(`Reporte de ${tipo}`, 105, 20, { align: 'center' });
        doc.setFontSize(10);
        doc.text(`Generado: ${new Date().toLocaleDateString('es-ES')}`, 105, 30, { align: 'center' });

        let y = 50;
        if (tipo === 'Ventas') {
            const vf = filtrarVentas(ventas.filter(v => v.estado === 'completada'));
            doc.setFont('helvetica', 'bold');
            doc.text('Fecha', 20, y); doc.text('Producto', 50, y); doc.text('Total', 150, y);
            doc.setFont('helvetica', 'normal'); y += 10;
            let total = 0;
            vf.forEach(v => { if (y > 270) { doc.addPage(); y = 20; } doc.text(new Date(v.fecha).toLocaleDateString('es-ES'), 20, y); doc.text(v.productoNombre.substring(0, 30), 50, y); doc.text(`$${v.total.toFixed(2)}`, 150, y); total += v.total; y += 8; });
            y += 10; doc.setFont('helvetica', 'bold'); doc.text(`TOTAL: $${total.toFixed(2)}`, 20, y);
        } else if (tipo === 'Inventario') {
            doc.setFont('helvetica', 'bold');
            doc.text('Producto', 20, y); doc.text('Stock', 100, y); doc.text('Precio', 150, y);
            doc.setFont('helvetica', 'normal'); y += 10;
            let valor = 0;
            productos.forEach(p => { if (y > 270) { doc.addPage(); y = 20; } doc.text(p.nombre.substring(0, 40), 20, y); doc.text(p.stockActual.toString(), 100, y); doc.text(`$${p.precio.toFixed(2)}`, 150, y); valor += p.stockActual * p.precio; y += 8; });
            y += 10; doc.setFont('helvetica', 'bold'); doc.text(`VALOR TOTAL: $${valor.toFixed(2)}`, 20, y);
        } else if (tipo === 'Fiados') {
            const cd = clientes.filter(c => c.saldoPendiente > 0);
            doc.setFont('helvetica', 'bold');
            doc.text('Cliente', 20, y); doc.text('Teléfono', 100, y); doc.text('Saldo', 160, y);
            doc.setFont('helvetica', 'normal'); y += 10;
            let total = 0;
            cd.forEach(c => { if (y > 270) { doc.addPage(); y = 20; } doc.text(c.nombre.substring(0, 40), 20, y); doc.text(c.telefono || 'N/A', 100, y); doc.text(`$${c.saldoPendiente.toFixed(2)}`, 160, y); total += c.saldoPendiente; y += 8; });
            y += 10; doc.setFont('helvetica', 'bold'); doc.text(`TOTAL: $${total.toFixed(2)}`, 20, y);
        }
        doc.save(`${tipo}_${new Date().toISOString().split('T')[0]}.pdf`);
    };

    const exportarCSV = (tipo: string) => {
        let csv = '', filename = '';
        if (tipo === 'ventas') {
            csv = 'Fecha,Producto,Cantidad,Total,Vendedor,Estado\n';
            filtrarVentas(ventas).forEach(v => { csv += `"${new Date(v.fecha).toLocaleDateString('es-ES')}","${v.productoNombre}",${v.cantidad},${v.total},"${v.vendedorNombre}","${v.estado}"\n`; });
            filename = `Ventas_${new Date().toISOString().split('T')[0]}.csv`;
        } else if (tipo === 'inventario') {
            csv = 'Producto,Stock,Precio,Valor\n';
            productos.forEach(p => { csv += `"${p.nombre}",${p.stockActual},${p.precio},${p.stockActual * p.precio}\n`; });
            filename = `Inventario_${new Date().toISOString().split('T')[0]}.csv`;
        } else if (tipo === 'cierres') {
            csv = 'Fecha,Total,Monto Real,Diferencia,Realizado Por\n';
            cierres.forEach(c => { csv += `"${new Date(c.fecha).toLocaleDateString('es-ES')}",${c.totalVentas},${c.montoReal},${c.diferencia},"${c.realizadoPor}"\n`; });
            filename = `Cierres_${new Date().toISOString().split('T')[0]}.csv`;
        }
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = filename;
        link.click();
    };

    return (
        <div className="p-6 bg-gray-50 dark:bg-gray-900 min-h-screen">
            <div className="max-w-6xl mx-auto">
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-md p-6 mb-6">
                    <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-200 mb-2">📊 Reportes</h1>
                    <p className="text-gray-600 dark:text-gray-400">Genera reportes PDF y exporta a CSV</p>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-md p-6 mb-6">
                    <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-gray-200">📅 Filtro por Fecha</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Desde:</label><input type="date" value={fechaInicio} onChange={(e) => setFechaInicio(e.target.value)} className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg px-4 py-2.5" /></div>
                        <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Hasta:</label><input type="date" value={fechaFin} onChange={(e) => setFechaFin(e.target.value)} className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg px-4 py-2.5" /></div>
                    </div>
                    {(fechaInicio || fechaFin) && <button onClick={() => { setFechaInicio(''); setFechaFin(''); }} className="mt-3 text-blue-600 dark:text-blue-400 text-sm font-semibold hover:underline">✕ Limpiar</button>}
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-md p-6 mb-6">
                    <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-gray-200">📄 Reportes PDF</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <button onClick={() => generarPDF('Ventas')} className="bg-gradient-to-br from-blue-500 to-blue-600 text-white p-6 rounded-xl hover:from-blue-600 hover:to-blue-700 transition-all shadow-md"><div className="text-3xl mb-2">💰</div><h3 className="font-bold text-lg mb-1">Ventas</h3><p className="text-sm opacity-90">Todas las ventas</p></button>
                        <button onClick={() => generarPDF('Inventario')} className="bg-gradient-to-br from-green-500 to-green-600 text-white p-6 rounded-xl hover:from-green-600 hover:to-green-700 transition-all shadow-md"><div className="text-3xl mb-2">📦</div><h3 className="font-bold text-lg mb-1">Inventario</h3><p className="text-sm opacity-90">Productos y valor</p></button>
                        <button onClick={() => generarPDF('Fiados')} className="bg-gradient-to-br from-red-500 to-red-600 text-white p-6 rounded-xl hover:from-red-600 hover:to-red-700 transition-all shadow-md"><div className="text-3xl mb-2">💳</div><h3 className="font-bold text-lg mb-1">Fiados</h3><p className="text-sm opacity-90">Cuentas por cobrar</p></button>
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-md p-6">
                    <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-gray-200">📊 Exportar CSV</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <button onClick={() => exportarCSV('ventas')} className="bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 p-6 rounded-xl transition-colors border-2 border-gray-200 dark:border-gray-600"><div className="text-3xl mb-2">💹</div><h3 className="font-bold text-lg mb-1">Ventas</h3><p className="text-sm text-gray-600 dark:text-gray-400">Exportar ventas</p></button>
                        <button onClick={() => exportarCSV('inventario')} className="bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 p-6 rounded-xl transition-colors border-2 border-gray-200 dark:border-gray-600"><div className="text-3xl mb-2">📋</div><h3 className="font-bold text-lg mb-1">Inventario</h3><p className="text-sm text-gray-600 dark:text-gray-400">Exportar productos</p></button>
                        <button onClick={() => exportarCSV('cierres')} className="bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 p-6 rounded-xl transition-colors border-2 border-gray-200 dark:border-gray-600"><div className="text-3xl mb-2">📑</div><h3 className="font-bold text-lg mb-1">Cierres</h3><p className="text-sm text-gray-600 dark:text-gray-400">Exportar historial</p></button>
                    </div>
                </div>
            </div>
        </div>
    );
}