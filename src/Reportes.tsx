import { useState, useEffect } from 'react';
import { db } from './db';
import type { Producto, Cliente, CierreCaja, Usuario } from './db';
import jsPDF from 'jspdf';


interface ReportesProps { usuarioActual: Usuario; }


export default function Reportes({ usuarioActual: _ }: ReportesProps) {
    const [productos, setProductos] = useState<Producto[]>([]);
    const [clientes, setClientes] = useState<Cliente[]>([]);
    const [cierres, setCierres] = useState<CierreCaja[]>([]);

    useEffect(() => { cargarDatos(); }, []);

    const cargarDatos = async () => {
        const [p, c, ci] = await Promise.all([
            db.productos.toArray(), db.clientes.toArray(), db.cierres.toArray()
        ]);
        setProductos(p); setClientes(c); setCierres(ci);
    };

    // ===== PDF INVENTARIO =====
    const generarPDFInventario = () => {
        const doc = new jsPDF();

        doc.setFontSize(18);
        doc.text('Reporte de Inventario', 105, 20, { align: 'center' });
        doc.setFontSize(9);
        doc.text(`Generado: ${new Date().toLocaleDateString('es-ES')}`, 105, 28, { align: 'center' });

        let y = 42;
        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        doc.text('Producto', 14, y);
        doc.text('Cod.Barras', 70, y);
        doc.text('Stock', 100, y);
        doc.text('P.Compra', 118, y);
        doc.text('P.Venta', 138, y);
        doc.text('Valor Total', 158, y);
        doc.text('Ganancia Pot.', 178, y);

        doc.setFont('helvetica', 'normal');
        y += 8;

        let valorTotalCompra = 0;
        let valorTotalVenta = 0;
        let gananciaPotencial = 0;
        let productosBajoStock = 0;

        productos.forEach(p => {
            if (y > 275) { doc.addPage(); y = 20; }

            const pc = p.precioCompra || 0;
            const pv = p.precioVenta || 0;
            const valorCompra = p.stockActual * pc;
            const valorVenta = p.stockActual * pv;
            const ganancia = valorVenta - valorCompra;

            if (p.stockActual <= p.stockMinimo) {
                productosBajoStock++;
                doc.setTextColor(255, 0, 0);
            } else {
                doc.setTextColor(0, 0, 0);
            }

            doc.text(p.nombre.substring(0, 28), 14, y);
            doc.text(p.codigoBarras || '-', 70, y);
            doc.text(p.stockActual.toString(), 100, y);
            doc.text(`$${pc.toFixed(2)}`, 118, y);
            doc.text(`$${pv.toFixed(2)}`, 138, y);
            doc.text(`$${valorCompra.toFixed(2)}`, 158, y);
            doc.text(`$${ganancia.toFixed(2)}`, 178, y);

            valorTotalCompra += valorCompra;
            valorTotalVenta += valorVenta;
            gananciaPotencial += ganancia;
            y += 6;
        });

        doc.setTextColor(0, 0, 0);
        y += 10;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.text(`VALOR INVENTARIO (compra): $${valorTotalCompra.toFixed(2)} CUP`, 14, y);
        doc.text(`VALOR INVENTARIO (venta):  $${valorTotalVenta.toFixed(2)} CUP`, 14, y + 8);
        doc.text(`GANANCIA POTENCIAL:        $${gananciaPotencial.toFixed(2)} CUP`, 14, y + 16);
        doc.text(`Productos con stock bajo: ${productosBajoStock}`, 14, y + 24);

        doc.save(`Inventario_${new Date().toISOString().split('T')[0]}.pdf`);
    };

    // ===== PDF FIADOS =====
    const generarPDFFiados = () => {
        const doc = new jsPDF();
        const cd = clientes.filter(c => c.saldoPendiente > 0);

        doc.setFontSize(18);
        doc.text('Cuentas por Cobrar (Fiados)', 105, 20, { align: 'center' });
        doc.setFontSize(9);
        doc.text(`Generado: ${new Date().toLocaleDateString('es-ES')}`, 105, 28, { align: 'center' });

        let y = 42;
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.text('Cliente', 14, y);
        doc.text('Telefono', 80, y);
        doc.text('Saldo Pendiente', 140, y);

        doc.setFont('helvetica', 'normal');
        y += 10;

        let total = 0;
        cd.forEach(c => {
            if (y > 275) { doc.addPage(); y = 20; }
            doc.text(c.nombre.substring(0, 30), 14, y);
            doc.text(c.telefono || 'N/A', 80, y);
            doc.text(`$${c.saldoPendiente.toFixed(2)}`, 140, y);
            total += c.saldoPendiente;
            y += 8;
        });

        y += 10;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.text(`TOTAL POR COBRAR: $${total.toFixed(2)} CUP`, 14, y);
        doc.text(`${cd.length} clientes con deuda`, 14, y + 10);

        doc.save(`Fiados_${new Date().toISOString().split('T')[0]}.pdf`);
    };

    // ===== EXPORTAR CSV =====
    const exportarCSV = (tipo: string) => {
        let csv = '', filename = '';

        if (tipo === 'inventario') {
            csv = 'Producto,Cod.Barras,Stock,Stock Min,Precio Compra,Precio Venta,Valor Compra,Valor Venta,Ganancia Potencial\n';
            productos.forEach(p => {
                const pc = p.precioCompra || 0;
                const pv = p.precioVenta || 0;
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

    // ===== RESUMEN RAPIDO =====
    const valorInventario = productos.reduce((s, p) => s + p.stockActual * (p.precioCompra || 0), 0);
    const valorVentaInventario = productos.reduce((s, p) => s + p.stockActual * (p.precioVenta || 0), 0);
    const totalFiado = clientes.reduce((s, c) => s + c.saldoPendiente, 0);

    return (
        <div className="p-6 bg-gray-50 dark:bg-gray-900 min-h-screen">
            <div className="max-w-6xl mx-auto">
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-md p-6 mb-6">
                    <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-200 mb-2">📊 Reportes</h1>
                    <p className="text-gray-600 dark:text-gray-400">Reportes de inventario, fiados y cierres de caja</p>
                </div>

                {/* Resumen Rapido */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                    <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white p-6 rounded-2xl shadow-md">
                        <p className="text-sm opacity-90">📦 Valor Inventario</p>
                        <p className="text-3xl font-bold">${valorInventario.toFixed(2)}</p>
                        <p className="text-xs opacity-75 mt-1">A precio de compra</p>
                    </div>
                    <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white p-6 rounded-2xl shadow-md">
                        <p className="text-sm opacity-90">💰 Valor Venta</p>
                        <p className="text-3xl font-bold">${valorVentaInventario.toFixed(2)}</p>
                        <p className="text-xs opacity-75 mt-1">Si vendes todo</p>
                    </div>
                    <div className="bg-gradient-to-br from-red-500 to-red-600 text-white p-6 rounded-2xl shadow-md">
                        <p className="text-sm opacity-90">💳 Total Fiado</p>
                        <p className="text-3xl font-bold">${totalFiado.toFixed(2)}</p>
                        <p className="text-xs opacity-75 mt-1">{clientes.filter(c => c.saldoPendiente > 0).length} clientes</p>
                    </div>
                </div>

                {/* PDFs */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-md p-6 mb-6">
                    <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-gray-200">📄 Reportes PDF</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <button onClick={generarPDFInventario} className="bg-gradient-to-br from-green-500 to-green-600 text-white p-6 rounded-xl hover:from-green-600 hover:to-green-700 transition-all shadow-md">
                            <div className="text-3xl mb-2">📦</div>
                            <h3 className="font-bold text-lg mb-1">Inventario</h3>
                            <p className="text-sm opacity-90">Valor y ganancia potencial</p>
                        </button>
                        <button onClick={generarPDFFiados} className="bg-gradient-to-br from-red-500 to-red-600 text-white p-6 rounded-xl hover:from-red-600 hover:to-red-700 transition-all shadow-md">
                            <div className="text-3xl mb-2">💳</div>
                            <h3 className="font-bold text-lg mb-1">Fiados</h3>
                            <p className="text-sm opacity-90">Cuentas por cobrar</p>
                        </button>
                    </div>
                </div>

                {/* CSV */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-md p-6">
                    <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-gray-200">📊 Exportar CSV</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <button onClick={() => exportarCSV('inventario')} className="bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 p-6 rounded-xl transition-colors border-2 border-gray-200 dark:border-gray-600">
                            <div className="text-3xl mb-2">📋</div>
                            <h3 className="font-bold text-lg mb-1">Inventario</h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400">Valor y ganancia potencial</p>
                        </button>
                        <button onClick={() => exportarCSV('cierres')} className="bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 p-6 rounded-xl transition-colors border-2 border-gray-200 dark:border-gray-600">
                            <div className="text-3xl mb-2">📑</div>
                            <h3 className="font-bold text-lg mb-1">Cierres</h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400">Historial completo</p>
                        </button>
                        <button onClick={() => exportarCSV('clientes')} className="bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 p-6 rounded-xl transition-colors border-2 border-gray-200 dark:border-gray-600">
                            <div className="text-3xl mb-2">👥</div>
                            <h3 className="font-bold text-lg mb-1">Clientes</h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400">Lista completa</p>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}