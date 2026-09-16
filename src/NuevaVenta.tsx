import { useState, useEffect } from 'react';
import { db } from './db';

import type { Producto, Venta, Usuario, Cliente, TasaCambio, MetodoPago, ItemCarrito } from './db';

interface Props { onVolver: () => void; usuarioActual: Usuario; onCerrarSesion: () => void; }

export default function NuevaVenta({ onVolver, usuarioActual, onCerrarSesion }: Props) {
    const [productos, setProductos] = useState<Producto[]>([]);
    const [categorias, setCategorias] = useState<any[]>([]);
    const [clientes, setClientes] = useState<Cliente[]>([]);
    const [tasas, setTasas] = useState<TasaCambio[]>([]);
    const [carrito, setCarrito] = useState<ItemCarrito[]>([]);
    const [, setVentasHoy] = useState<Venta[]>([]);
    const [, setTotalDia] = useState(0);
    const [filtroCategoria, setFiltroCategoria] = useState<number | 'todas'>('todas');
    const [busqueda, setBusqueda] = useState('');
    const [clienteSeleccionado, setClienteSeleccionado] = useState<Cliente | null>(null);
    const [metodosPago, setMetodosPago] = useState<MetodoPago[]>([{ tipo: 'efectivo', monto: 0, moneda: 'CUP', montoEnCUP: 0 }]);
    const [notasVenta, setNotasVenta] = useState('');
    const [esFiado, setEsFiado] = useState(false);
    const [modalCancelacion, setModalCancelacion] = useState<{ abierto: boolean; venta: Venta | null }>({ abierto: false, venta: null });
    const [razonCancelacion, setRazonCancelacion] = useState('');
    const [mostrarPagoMovil, setMostrarPagoMovil] = useState(false);

    useEffect(() => { cargarTodo(); }, []);

    const cargarTodo = async () => {
        const [prods, cats, clis, tasasData] = await Promise.all([
            db.productos.toArray(), db.categorias.toArray(), db.clientes.toArray(), db.tasasCambio.toArray()
        ]);
        setProductos(prods.filter(p => p.stockActual > 0));
        setCategorias(cats); setClientes(clis); setTasas(tasasData); cargarVentasHoy();
    };

    const cargarVentasHoy = async () => {
        const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
        const todas = await db.ventas.toArray();
        const deHoy = todas.filter(v => new Date(v.fecha) >= hoy);
        setVentasHoy(deHoy);
        setTotalDia(deHoy.filter(v => v.estado === 'completada').reduce((sum, v) => sum + v.total, 0));
    };

    const obtenerTasa = (moneda: string): number => moneda === 'CUP' ? 1 : (tasas.find(t => t.moneda === moneda)?.tasa || 1);
    const totalCarrito = carrito.reduce((sum, item) => sum + item.subtotal, 0);

    const agregarAlCarrito = (producto: Producto) => {
        const existente = carrito.find(item => item.productoId === producto.id);
        if (existente) {
            if (existente.cantidad >= producto.stockActual) { alert(`Solo quedan ${producto.stockActual}`); return; }
            setCarrito(carrito.map(item => item.productoId === producto.id ? { ...item, cantidad: item.cantidad + 1, subtotal: (item.cantidad + 1) * item.precioUnitario } : item));
        } else {
            const pv = producto.precioVenta || 0;
            setCarrito([...carrito, { productoId: producto.id!, productoNombre: producto.nombre, codigoBarras: producto.codigoBarras, cantidad: 1, precioUnitario: pv, precioCompra: producto.precioCompra || 0, subtotal: pv }]);
        }
    };

    const cambiarCantidad = (productoId: number, nuevaCantidad: number) => {
        const producto = productos.find(p => p.id === productoId);
        if (!producto) return;
        if (nuevaCantidad > producto.stockActual) { alert(`Solo quedan ${producto.stockActual}`); return; }
        if (nuevaCantidad <= 0) setCarrito(carrito.filter(item => item.productoId !== productoId));
        else setCarrito(carrito.map(item => item.productoId === productoId ? { ...item, cantidad: nuevaCantidad, subtotal: nuevaCantidad * item.precioUnitario } : item));
    };

    const eliminarDelCarrito = (productoId: number) => setCarrito(carrito.filter(item => item.productoId !== productoId));
    const totalPagadoCUP = metodosPago.reduce((sum, mp) => sum + mp.montoEnCUP, 0);
    const vuelto = totalPagadoCUP - totalCarrito;
    const agregarMetodoPago = () => setMetodosPago([...metodosPago, { tipo: 'efectivo', monto: 0, moneda: 'CUP', montoEnCUP: 0 }]);
    const eliminarMetodoPago = (index: number) => { if (metodosPago.length > 1) setMetodosPago(metodosPago.filter((_, i) => i !== index)); };

    const actualizarMetodoPago = (index: number, campo: keyof MetodoPago, valor: any) => {
        const nuevos = [...metodosPago];
        (nuevos[index] as any)[campo] = valor;
        nuevos[index].montoEnCUP = nuevos[index].monto * obtenerTasa(nuevos[index].moneda);
        setMetodosPago(nuevos);
    };

    const registrarVenta = async () => {
        if (carrito.length === 0) { alert('Carrito vacío'); return; }
        if (!esFiado && totalPagadoCUP < totalCarrito) { alert(`Faltan $${(totalCarrito - totalPagadoCUP).toFixed(2)}`); return; }
        const vendedor = await db.usuarios.get(usuarioActual.id!);
        const comision = vendedor?.comisionPorcentaje ? totalCarrito * (vendedor.comisionPorcentaje / 100) : 0;
        await db.ventas.add({
            items: carrito, total: totalCarrito, fecha: new Date(),
            vendedorId: usuarioActual.id!, vendedorNombre: usuarioActual.nombre, estado: 'completada',
            metodosPago: esFiado ? [{ tipo: 'fiado', monto: totalCarrito, moneda: 'CUP', montoEnCUP: totalCarrito }] : metodosPago,
            notas: notasVenta || undefined, comisionVendedor: comision, esFiado,
            clienteId: clienteSeleccionado?.id, clienteNombre: clienteSeleccionado?.nombre, vueltoCUP: vuelto > 0 ? vuelto : 0
        });
        for (const item of carrito) {
            const prod = await db.productos.get(item.productoId);
            if (prod) await db.productos.update(prod.id!, { stockActual: prod.stockActual - item.cantidad });
        }
        if (esFiado && clienteSeleccionado) await db.clientes.update(clienteSeleccionado.id!, { saldoPendiente: clienteSeleccionado.saldoPendiente + totalCarrito });
        let msg = `✅ Venta: $${totalCarrito.toFixed(2)} CUP`;
        if (vuelto > 0) {
            msg += `\n💰 VUELTO: $${vuelto.toFixed(2)} CUP`;
            const mpUSD = metodosPago.find(m => m.moneda === 'USD' && m.monto > 0);
            if (mpUSD) msg += `\n💵 O $${(vuelto / obtenerTasa('USD')).toFixed(2)} USD`;
        }
        alert(msg);
        setCarrito([]); setMetodosPago([{ tipo: 'efectivo', monto: 0, moneda: 'CUP', montoEnCUP: 0 }]);
        setNotasVenta(''); setEsFiado(false); setClienteSeleccionado(null); setMostrarPagoMovil(false); cargarTodo();
    };

    const cancelarVenta = async () => {
        if (!modalCancelacion.venta || !razonCancelacion.trim()) { alert('Escribe motivo'); return; }
        const v = modalCancelacion.venta;
        if (usuarioActual.rol === 'admin') await db.ventas.delete(v.id!);
        else await db.ventas.update(v.id!, { estado: 'error', notaCancelacion: razonCancelacion.trim() });
        const items = v.items && v.items.length > 0 ? v.items : [{ productoId: v.productoId || 0, cantidad: v.cantidad || 1 }];
        for (const item of items) {
            const prod = await db.productos.get(item.productoId);
            if (prod) await db.productos.update(prod.id!, { stockActual: prod.stockActual + item.cantidad });
        }
        if (v.esFiado && v.clienteId) {
            const cli = await db.clientes.get(v.clienteId);
            if (cli) await db.clientes.update(cli.id!, { saldoPendiente: Math.max(0, cli.saldoPendiente - v.total) });
        }
        setModalCancelacion({ abierto: false, venta: null }); setRazonCancelacion(''); cargarTodo();
    };

    const productosFiltrados = productos.filter(p => {
        const cat = filtroCategoria === 'todas' || p.categoriaId === filtroCategoria;
        const busq = !busqueda || p.nombre.toLowerCase().includes(busqueda.toLowerCase()) || (p.codigoBarras && p.codigoBarras.includes(busqueda));
        return cat && busq;
    });

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-3 md:p-6">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="bg-white dark:bg-gray-800 rounded-xl md:rounded-2xl shadow-md p-4 md:p-6 mb-4 md:mb-6">
                    <div className="flex justify-between items-center">
                        <div className="flex-1 min-w-0">
                            <h1 className="text-xl md:text-3xl font-bold text-gray-800 dark:text-gray-200">🛒 Nueva Venta</h1>
                            <p className="text-sm text-gray-600 dark:text-gray-400 truncate">Vendedor: <strong className="text-blue-600 dark:text-blue-400">{usuarioActual.nombre}</strong></p>
                        </div>
                        <div className="flex gap-1 md:gap-2 ml-2">
                            <button onClick={onVolver} className="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-2 md:px-4 py-2 rounded-lg font-semibold text-sm md:text-base">←</button>
                            <button onClick={onCerrarSesion} className="bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 px-2 md:px-4 py-2 rounded-lg font-semibold text-sm md:text-base">Salir</button>
                        </div>
                    </div>
                </div>

                {/* Barra flotante móvil */}
                {carrito.length > 0 && !mostrarPagoMovil && (
                    <div className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-blue-600 text-white p-3 flex justify-between items-center shadow-lg">
                        <div>
                            <p className="text-xs opacity-80">{carrito.length} producto(s)</p>
                            <p className="text-xl font-bold">${totalCarrito.toFixed(2)}</p>
                        </div>
                        <button onClick={() => setMostrarPagoMovil(true)} className="bg-white text-blue-600 px-5 py-2 rounded-lg font-bold text-sm">Cobrar →</button>
                    </div>
                )}

                {/* Layout principal */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6 pb-20 lg:pb-0">
                    {/* Productos (2 cols en desktop) */}
                    <div className="lg:col-span-2 space-y-4 md:space-y-6">
                        <div className="bg-white dark:bg-gray-800 rounded-xl md:rounded-2xl shadow-md p-3 md:p-4">
                            <div className="flex flex-col gap-2">
                                <input type="text" placeholder="🔍 Buscar..." value={busqueda} onChange={(e) => setBusqueda(e.target.value)}
                                    className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg px-4 py-3" />
                                <select value={filtroCategoria} onChange={(e) => setFiltroCategoria(e.target.value === 'todas' ? 'todas' : parseInt(e.target.value))}
                                    className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg px-4 py-3">
                                    <option value="todas">Todas</option>
                                    {categorias.map(cat => <option key={cat.id} value={cat.id}>{cat.nombre}</option>)}
                                </select>
                            </div>
                        </div>

                        <div className="bg-white dark:bg-gray-800 rounded-xl md:rounded-2xl shadow-md p-3 md:p-6">
                            <h2 className="text-lg md:text-xl font-semibold mb-3 md:mb-4 text-gray-800 dark:text-gray-200">Productos</h2>
                            {productosFiltrados.length === 0 ? (
                                <p className="text-gray-500 dark:text-gray-400 text-center py-8">No hay productos</p>
                            ) : (
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 md:gap-3">
                                    {productosFiltrados.map((p) => (
                                        <button key={p.id} onClick={() => agregarAlCarrito(p)}
                                            className="p-2 md:p-3 rounded-lg md:rounded-xl border-2 border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 hover:border-blue-400 transition-all text-left">
                                            <div className="h-16 md:h-20 bg-gray-100 dark:bg-gray-600 rounded-lg mb-1 md:mb-2 overflow-hidden flex items-center justify-center">
                                                {p.imagen ? <img src={p.imagen} alt="" className="w-full h-full object-cover" /> : <span className="text-xl md:text-2xl text-gray-300">📦</span>}
                                            </div>
                                            <h3 className="font-semibold text-gray-800 dark:text-gray-200 text-xs md:text-sm truncate">{p.nombre}</h3>
                                            <p className="text-sm md:text-base font-bold text-blue-600 dark:text-blue-400">${(p.precioVenta || 0).toFixed(2)}</p>
                                            <p className="text-[10px] md:text-xs text-gray-500 dark:text-gray-400">Stock: {p.stockActual}</p>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Panel Derecho: Carrito + Pago (1 col en desktop) */}
                    <div className={`${mostrarPagoMovil ? 'block' : 'hidden lg:block'} space-y-4 md:space-y-6`}>
                        {/* Carrito */}
                        <div className="bg-white dark:bg-gray-800 rounded-xl md:rounded-2xl shadow-md p-4 md:p-6">
                            <div className="flex justify-between items-center mb-3 md:mb-4">
                                <h2 className="text-lg md:text-xl font-semibold text-gray-800 dark:text-gray-200">🛒 Carrito ({carrito.length})</h2>
                                <button onClick={() => setMostrarPagoMovil(false)} className="lg:hidden text-gray-500 text-2xl">✕</button>
                            </div>
                            {carrito.length === 0 ? <p className="text-gray-500 dark:text-gray-400 text-center py-8">Vacío</p> : (
                                <div className="space-y-2 md:space-y-3 mb-4">
                                    {carrito.map((item) => (
                                        <div key={item.productoId} className="bg-gray-50 dark:bg-gray-700 p-2 md:p-3 rounded-lg md:rounded-xl">
                                            <div className="flex justify-between items-start mb-2">
                                                <p className="font-semibold text-gray-800 dark:text-gray-200 text-sm flex-1">{item.productoNombre}</p>
                                                <button onClick={() => eliminarDelCarrito(item.productoId)} className="text-red-500 ml-2">✕</button>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <button onClick={() => cambiarCantidad(item.productoId, item.cantidad - 1)} className="bg-gray-200 dark:bg-gray-600 w-7 h-7 md:w-8 md:h-8 rounded-lg font-bold text-gray-800 dark:text-gray-200 text-sm">-</button>
                                                <span className="flex-1 text-center font-semibold text-gray-800 dark:text-gray-200">{item.cantidad}</span>
                                                <button onClick={() => cambiarCantidad(item.productoId, item.cantidad + 1)} className="bg-gray-200 dark:bg-gray-600 w-7 h-7 md:w-8 md:h-8 rounded-lg font-bold text-gray-800 dark:text-gray-200 text-sm">+</button>
                                                <span className="text-base md:text-lg font-bold text-blue-600 dark:text-blue-400 ml-2">${item.subtotal.toFixed(2)}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                            <div className="border-t border-gray-200 dark:border-gray-700 pt-3 md:pt-4">
                                <div className="flex justify-between"><span className="text-base md:text-lg font-semibold text-gray-800 dark:text-gray-200">TOTAL:</span><span className="text-2xl md:text-3xl font-bold text-green-600 dark:text-green-400">${totalCarrito.toFixed(2)}</span></div>
                            </div>
                        </div>

                        {/* Pago */}
                        <div className="bg-white dark:bg-gray-800 rounded-xl md:rounded-2xl shadow-md p-4 md:p-6">
                            <h2 className="text-lg md:text-xl font-semibold mb-3 md:mb-4 text-gray-800 dark:text-gray-200">💰 Pago</h2>

                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">👤 Cliente</label>
                                <select value={clienteSeleccionado?.id || ''} onChange={(e) => setClienteSeleccionado(clientes.find(c => c.id === parseInt(e.target.value)) || null)}
                                    className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg px-3 py-2.5 text-sm md:text-base">
                                    <option value="">Venta rápida</option>
                                    {clientes.map(c => <option key={c.id} value={c.id}>{c.nombre} {c.saldoPendiente > 0 ? `(Debe $${c.saldoPendiente.toFixed(0)})` : ''}</option>)}
                                </select>
                            </div>

                            <div className="flex items-center gap-3 bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded-lg border border-yellow-200 dark:border-yellow-800 mb-4">
                                <input type="checkbox" id="fiado" checked={esFiado} onChange={(e) => setEsFiado(e.target.checked)} className="w-5 h-5" disabled={!clienteSeleccionado} />
                                <label htmlFor="fiado" className="font-semibold text-yellow-800 dark:text-yellow-400 text-sm">💳 Fiado</label>
                            </div>

                            {!esFiado && (
                                <div className="mb-4">
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Métodos</span>
                                        <button onClick={agregarMetodoPago} className="text-blue-600 dark:text-blue-400 text-sm font-semibold">+ Método</button>
                                    </div>
                                    <div className="space-y-2">
                                        {metodosPago.map((mp, i) => (
                                            <div key={i} className="bg-gray-50 dark:bg-gray-700 p-2 md:p-3 rounded-lg">
                                                <div className="flex gap-2 mb-1">
                                                    <select value={mp.tipo} onChange={(e) => actualizarMetodoPago(i, 'tipo', e.target.value)}
                                                        className="border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-lg px-2 py-2 text-sm">
                                                        <option value="efectivo">💵</option><option value="transferencia">📱</option><option value="tarjeta">💳</option>
                                                    </select>
                                                    <input type="number" step="0.01" placeholder="Monto" value={mp.monto || ''} onChange={(e) => actualizarMetodoPago(i, 'monto', parseFloat(e.target.value) || 0)}
                                                        className="flex-1 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-lg px-3 py-2 text-sm" />
                                                    <select value={mp.moneda} onChange={(e) => actualizarMetodoPago(i, 'moneda', e.target.value)}
                                                        className="border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-lg px-2 py-2 text-sm">
                                                        <option value="CUP">CUP</option><option value="USD">USD</option><option value="EUR">EUR</option><option value="MLC">MLC</option>
                                                    </select>
                                                    {metodosPago.length > 1 && <button onClick={() => eliminarMetodoPago(i)} className="text-red-500">✕</button>}
                                                </div>
                                                {mp.moneda !== 'CUP' && mp.monto > 0 && <p className="text-xs text-gray-500 dark:text-gray-400">= ${mp.montoEnCUP.toFixed(2)} CUP</p>}
                                            </div>
                                        ))}
                                    </div>

                                    <div className={`mt-3 p-3 rounded-lg ${totalPagadoCUP >= totalCarrito ? 'bg-green-50 dark:bg-green-900/20' : 'bg-red-50 dark:bg-red-900/20'}`}>
                                        <div className="flex justify-between text-sm"><span className="text-gray-700 dark:text-gray-300">Pagado:</span><span className="font-semibold text-gray-800 dark:text-gray-200">${totalPagadoCUP.toFixed(2)}</span></div>
                                        {vuelto > 0 && <div className="flex justify-between text-base md:text-lg font-bold mt-1"><span className="text-green-700 dark:text-green-400">VUELTO:</span><span className="text-green-700 dark:text-green-400">${vuelto.toFixed(2)} CUP</span></div>}
                                        {totalPagadoCUP < totalCarrito && <p className="text-sm text-red-600 dark:text-red-400 mt-1">Faltan: ${(totalCarrito - totalPagadoCUP).toFixed(2)}</p>}
                                    </div>
                                </div>
                            )}

                            <textarea value={notasVenta} onChange={(e) => setNotasVenta(e.target.value)} className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg px-3 py-2 text-sm mb-4" rows={2} placeholder="📝 Notas..." />

                            <button onClick={registrarVenta} disabled={carrito.length === 0}
                                className="w-full bg-green-600 text-white px-6 py-3 md:py-4 rounded-xl hover:bg-green-700 font-semibold text-base md:text-lg shadow-lg disabled:opacity-50">
                                ✓ Registrar Venta
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Modal Cancelación */}
            {modalCancelacion.abierto && modalCancelacion.venta && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end md:items-center justify-center p-0 md:p-4 z-50">
                    <div className="bg-white dark:bg-gray-800 rounded-t-2xl md:rounded-2xl shadow-2xl w-full md:max-w-md max-h-[80vh] overflow-y-auto">
                        <div className={`px-6 py-4 ${usuarioActual.rol === 'admin' ? 'bg-red-600' : 'bg-yellow-500'} rounded-t-2xl`}>
                            <h2 className="text-xl font-bold text-white">{usuarioActual.rol === 'admin' ? '🗑️ Eliminar' : '⚠️ Error'}</h2>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-xl">
                                <p className="font-semibold text-gray-800 dark:text-gray-200">
                                    {modalCancelacion.venta.items && modalCancelacion.venta.items.length > 0 ? modalCancelacion.venta.items.map(i => i.productoNombre).join(', ') : modalCancelacion.venta.productoNombre || 'Venta'}
                                </p>
                                <p className="text-sm text-gray-500 dark:text-gray-400">Total: ${modalCancelacion.venta.total.toFixed(2)}</p>
                            </div>
                            <textarea value={razonCancelacion} onChange={(e) => setRazonCancelacion(e.target.value)} className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg px-4 py-3" rows={3} placeholder="Motivo..." />
                            <div className="flex gap-3">
                                <button onClick={() => setModalCancelacion({ abierto: false, venta: null })} className="flex-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 py-3 rounded-lg font-semibold">Cancelar</button>
                                <button onClick={cancelarVenta} className={`flex-1 py-3 rounded-lg font-semibold text-white ${usuarioActual.rol === 'admin' ? 'bg-red-600' : 'bg-yellow-600'}`}>{usuarioActual.rol === 'admin' ? 'Eliminar' : 'Marcar'}</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}