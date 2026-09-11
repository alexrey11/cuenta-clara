import { useState, useEffect } from 'react';
import { db, } from './db';
import type { Venta, Devolucion, Usuario } from './db';



interface DevolucionesProps { usuarioActual: Usuario; }

export default function Devoluciones({ usuarioActual }: DevolucionesProps) {
    const [ventas, setVentas] = useState<Venta[]>([]);
    const [devoluciones, setDevoluciones] = useState<Devolucion[]>([]);
    const [modalAbierto, setModalAbierto] = useState(false);
    const [ventaSel, setVentaSel] = useState<Venta | null>(null);
    const [cantDev, setCantDev] = useState('');
    const [motivo, setMotivo] = useState('');
    const [busqueda, setBusqueda] = useState('');

    useEffect(() => { cargarDatos(); }, []);

    const cargarDatos = async () => {
        const [v, d] = await Promise.all([db.ventas.where('estado').equals('completada').toArray(), db.devoluciones.toArray()]);
        setVentas(v); setDevoluciones(d.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime()));
    };

    const procesarDevolucion = async () => {
        if (!ventaSel || !cantDev || !motivo.trim()) { alert('Completa todos los campos'); return; }
        const c = parseInt(cantDev);
        if (c <= 0 || c > ventaSel.cantidad) { alert('Cantidad inválida'); return; }
        const monto = c * ventaSel.precioUnitario;
        await db.devoluciones.add({ ventaId: ventaSel.id!, productoId: ventaSel.productoId, productoNombre: ventaSel.productoNombre, cantidad: c, motivo: motivo.trim(), fecha: new Date(), realizadoPor: usuarioActual.nombre, montoReembolsado: monto });
        if (c === ventaSel.cantidad) { await db.ventas.update(ventaSel.id!, { estado: 'devuelta' }); } else { await db.ventas.update(ventaSel.id!, { cantidad: ventaSel.cantidad - c, total: (ventaSel.cantidad - c) * ventaSel.precioUnitario }); }
        const prod = await db.productos.get(ventaSel.productoId);
        if (prod) await db.productos.update(prod.id!, { stockActual: prod.stockActual + c });
        if (ventaSel.esFiado && ventaSel.clienteId) { const cli = await db.clientes.get(ventaSel.clienteId); if (cli) await db.clientes.update(cli.id!, { saldoPendiente: Math.max(0, cli.saldoPendiente - monto) }); }
        alert(`✅ Devolución: $${monto.toFixed(2)}`);
        setModalAbierto(false); setVentaSel(null); cargarDatos();
    };

    const ventasFiltradas = ventas.filter(v => v.productoNombre.toLowerCase().includes(busqueda.toLowerCase()) || (v.clienteNombre && v.clienteNombre.toLowerCase().includes(busqueda.toLowerCase())));
    const totalReembolsado = devoluciones.reduce((s, d) => s + d.montoReembolsado, 0);

    return (
        <div className="p-6 bg-gray-50 dark:bg-gray-900 min-h-screen">
            <div className="max-w-6xl mx-auto">
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-md p-6 mb-6">
                    <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-200 mb-2">🔄 Devoluciones</h1>
                    <p className="text-gray-600 dark:text-gray-400">Procesa devoluciones y repón stock</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                    <div className="bg-gradient-to-br from-orange-500 to-orange-600 text-white p-6 rounded-2xl shadow-md"><p className="text-sm opacity-90 mb-2">Total Devoluciones</p><p className="text-4xl font-bold">{devoluciones.length}</p></div>
                    <div className="bg-gradient-to-br from-red-500 to-red-600 text-white p-6 rounded-2xl shadow-md"><p className="text-sm opacity-90 mb-2">Reembolsado</p><p className="text-4xl font-bold">${totalReembolsado.toFixed(2)}</p></div>
                    <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white p-6 rounded-2xl shadow-md"><p className="text-sm opacity-90 mb-2">Disponibles</p><p className="text-4xl font-bold">{ventas.length}</p></div>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-md p-4 mb-6">
                    <input type="text" placeholder="🔍 Buscar..." value={busqueda} onChange={(e) => setBusqueda(e.target.value)} className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-md p-6 mb-6">
                    <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-gray-200">Ventas para Devolver</h2>
                    {ventasFiltradas.length === 0 ? <p className="text-gray-500 dark:text-gray-400 text-center py-8">Sin ventas</p> : (
                        <div className="space-y-3">
                            {ventasFiltradas.slice(0, 10).map((v) => (
                                <div key={v.id} className="flex items-center justify-between bg-gray-50 dark:bg-gray-700 p-4 rounded-xl border border-gray-100 dark:border-gray-600">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center text-xl">📦</div>
                                        <div><h3 className="font-semibold text-gray-800 dark:text-gray-200">{v.productoNombre}</h3><p className="text-sm text-gray-500 dark:text-gray-400">{new Date(v.fecha).toLocaleDateString('es-ES')} | {v.vendedorNombre}{v.clienteNombre && ` | 👤 ${v.clienteNombre}`}</p><p className="text-sm text-gray-600 dark:text-gray-300">Cant: {v.cantidad} | Total: ${v.total.toFixed(2)}</p></div>
                                    </div>
                                    <button onClick={() => { setVentaSel(v); setCantDev(v.cantidad.toString()); setMotivo(''); setModalAbierto(true); }} className="bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 px-4 py-2 rounded-lg hover:bg-orange-200 dark:hover:bg-orange-900/50 transition-colors font-semibold">Devolver</button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-md p-6">
                    <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-gray-200">📜 Historial</h2>
                    {devoluciones.length === 0 ? <p className="text-gray-500 dark:text-gray-400 text-center py-8">Sin devoluciones</p> : (
                        <div className="space-y-3">
                            {devoluciones.map((d) => (
                                <div key={d.id} className="bg-gray-50 dark:bg-gray-700 p-4 rounded-xl border border-gray-100 dark:border-gray-600">
                                    <div className="flex justify-between items-start">
                                        <div><h3 className="font-semibold text-gray-800 dark:text-gray-200">{d.productoNombre}</h3><p className="text-sm text-gray-500 dark:text-gray-400">{new Date(d.fecha).toLocaleDateString('es-ES')} | Por: {d.realizadoPor}</p><p className="text-sm text-gray-600 dark:text-gray-300 mt-1">Cant: {d.cantidad} | Reembolso: ${d.montoReembolsado.toFixed(2)}</p><p className="text-sm text-orange-600 dark:text-orange-400 mt-1 italic">Motivo: {d.motivo}</p></div>
                                        <span className="bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 px-3 py-1 rounded-full text-sm font-semibold">Devuelto</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {modalAbierto && ventaSel && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
                        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
                            <div className="bg-gradient-to-r from-orange-500 to-orange-600 px-6 py-4"><h2 className="text-xl font-bold text-white">Procesar Devolución</h2></div>
                            <div className="p-6 space-y-4">
                                <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-xl"><p className="font-semibold text-gray-800 dark:text-gray-200">{ventaSel.productoNombre}</p><p className="text-sm text-gray-500 dark:text-gray-400">Original: {ventaSel.cantidad} | ${ventaSel.total.toFixed(2)}</p></div>
                                <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Cantidad (máx: {ventaSel.cantidad})</label><input type="number" min="1" max={ventaSel.cantidad} value={cantDev} onChange={(e) => setCantDev(e.target.value)} className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg px-4 py-2.5" /></div>
                                <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Motivo *</label><textarea value={motivo} onChange={(e) => setMotivo(e.target.value)} className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg px-4 py-2.5" rows={3} placeholder="Ej: Producto defectuoso..." /></div>
                                <div className="flex gap-3">
                                    <button onClick={() => setModalAbierto(false)} className="flex-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 py-3 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 font-semibold">Cancelar</button>
                                    <button onClick={procesarDevolucion} className="flex-1 bg-orange-600 text-white py-3 rounded-lg hover:bg-orange-700 font-semibold shadow-md">Procesar</button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}