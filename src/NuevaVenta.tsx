import { useState, useEffect } from 'react';
import { db } from './db';


import type { Producto, Venta, Usuario, Cliente, TasaCambio, MetodoPago, ItemCarrito } from './db';

interface Props {
    onVolver: () => void;
    usuarioActual: Usuario;
    onCerrarSesion: () => void;
}

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
    const [metodosPago, setMetodosPago] = useState<MetodoPago[]>([
        { tipo: 'efectivo', monto: 0, moneda: 'CUP', montoEnCUP: 0 }
    ]);
    const [notasVenta, setNotasVenta] = useState('');
    const [esFiado, setEsFiado] = useState(false);

    const [modalCancelacion, setModalCancelacion] = useState<{ abierto: boolean; venta: Venta | null }>({
        abierto: false, venta: null
    });
    const [razonCancelacion, setRazonCancelacion] = useState('');

    useEffect(() => { cargarTodo(); }, []);

    const cargarTodo = async () => {
        const [prods, cats, clis, tasasData] = await Promise.all([
            db.productos.toArray(),
            db.categorias.toArray(),
            db.clientes.toArray(),
            db.tasasCambio.toArray()
        ]);

        setProductos(prods.filter(p => p.stockActual > 0));
        setCategorias(cats);
        setClientes(clis);
        setTasas(tasasData);
        cargarVentasHoy();
    };

    const cargarVentasHoy = async () => {
        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0);

        const todas = await db.ventas.toArray();
        const deHoy = todas.filter(v => new Date(v.fecha) >= hoy);
        const completadas = deHoy.filter(v => v.estado === 'completada');

        setVentasHoy(deHoy);
        setTotalDia(completadas.reduce((sum, v) => sum + v.total, 0));
    };

    const obtenerTasa = (moneda: string): number => {
        if (moneda === 'CUP') return 1;
        const tasa = tasas.find(t => t.moneda === moneda);
        return tasa?.tasa || 1;
    };

    const totalCarrito = carrito.reduce((sum, item) => sum + item.subtotal, 0);

    const agregarAlCarrito = (producto: Producto) => {
        const existente = carrito.find(item => item.productoId === producto.id);

        if (existente) {
            if (existente.cantidad >= producto.stockActual) {
                alert(`No hay suficiente stock. Solo quedan ${producto.stockActual}`);
                return;
            }
            setCarrito(carrito.map(item =>
                item.productoId === producto.id
                    ? { ...item, cantidad: item.cantidad + 1, subtotal: (item.cantidad + 1) * item.precioUnitario }
                    : item
            ));
        } else {
            setCarrito([...carrito, {
                productoId: producto.id!,
                productoNombre: producto.nombre,
                codigoBarras: producto.codigoBarras,
                cantidad: 1,
                precioUnitario: producto.precioVenta || (producto as any).precio || 0,
                precioCompra: producto.precioCompra || 0,
                subtotal: producto.precioVenta || (producto as any).precio || 0
            }]);
        }
    };

    const cambiarCantidad = (productoId: number, nuevaCantidad: number) => {
        const producto = productos.find(p => p.id === productoId);
        if (!producto) return;

        if (nuevaCantidad > producto.stockActual) {
            alert(`No hay suficiente stock. Solo quedan ${producto.stockActual}`);
            return;
        }

        if (nuevaCantidad <= 0) {
            setCarrito(carrito.filter(item => item.productoId !== productoId));
        } else {
            setCarrito(carrito.map(item =>
                item.productoId === productoId
                    ? { ...item, cantidad: nuevaCantidad, subtotal: nuevaCantidad * item.precioUnitario }
                    : item
            ));
        }
    };

    const eliminarDelCarrito = (productoId: number) => {
        setCarrito(carrito.filter(item => item.productoId !== productoId));
    };

    const totalPagadoCUP = metodosPago.reduce((sum, mp) => sum + mp.montoEnCUP, 0);
    const vuelto = totalPagadoCUP - totalCarrito;

    const agregarMetodoPago = () => {
        setMetodosPago([...metodosPago, { tipo: 'efectivo', monto: 0, moneda: 'CUP', montoEnCUP: 0 }]);
    };

    const eliminarMetodoPago = (index: number) => {
        if (metodosPago.length > 1) {
            setMetodosPago(metodosPago.filter((_, i) => i !== index));
        }
    };

    const actualizarMetodoPago = (index: number, campo: keyof MetodoPago, valor: any) => {
        const nuevos = [...metodosPago];
        (nuevos[index] as any)[campo] = valor;

        const tasa = obtenerTasa(nuevos[index].moneda);
        nuevos[index].montoEnCUP = nuevos[index].monto * tasa;

        setMetodosPago(nuevos);
    };

    const registrarVenta = async () => {
        if (carrito.length === 0) {
            alert('El carrito está vacío');
            return;
        }

        if (!esFiado && totalPagadoCUP < totalCarrito) {
            alert(`El monto pagado ($${totalPagadoCUP.toFixed(2)}) es menor al total ($${totalCarrito.toFixed(2)})`);
            return;
        }

        const vendedor = await db.usuarios.get(usuarioActual.id!);
        const comision = vendedor?.comisionPorcentaje ? totalCarrito * (vendedor.comisionPorcentaje / 100) : 0;

        const ventaData: any = {
            items: carrito,
            total: totalCarrito,
            fecha: new Date(),
            vendedorId: usuarioActual.id!,
            vendedorNombre: usuarioActual.nombre,
            estado: 'completada' as const,
            metodosPago: esFiado ? [{ tipo: 'fiado' as const, monto: totalCarrito, moneda: 'CUP' as const, montoEnCUP: totalCarrito }] : metodosPago,
            notas: notasVenta || undefined,
            comisionVendedor: comision,
            esFiado,
            clienteId: clienteSeleccionado?.id,
            clienteNombre: clienteSeleccionado?.nombre,
            vueltoCUP: vuelto > 0 ? vuelto : 0
        };

        await db.ventas.add(ventaData);

        for (const item of carrito) {
            const producto = await db.productos.get(item.productoId);
            if (producto) {
                await db.productos.update(producto.id!, {
                    stockActual: producto.stockActual - item.cantidad
                });
            }
        }

        if (esFiado && clienteSeleccionado) {
            await db.clientes.update(clienteSeleccionado.id!, {
                saldoPendiente: clienteSeleccionado.saldoPendiente + totalCarrito
            });
        }

        let mensajeVuelto = '';
        if (vuelto > 0) {
            mensajeVuelto = `\n\n💰 VUELTO: $${vuelto.toFixed(2)} CUP`;

            const mpUSD = metodosPago.find(m => m.moneda === 'USD' && m.monto > 0);
            if (mpUSD) {
                const tasa = obtenerTasa('USD');
                const vueltoUSD = vuelto / tasa;
                mensajeVuelto += `\n💵 O $${vueltoUSD.toFixed(2)} USD`;
            }
        }

        alert(`✅ ¡Venta registrada!\nTotal: $${totalCarrito.toFixed(2)} CUP${comision > 0 ? `\nComisión: $${comision.toFixed(2)}` : ''}${mensajeVuelto}`);

        setCarrito([]);
        setMetodosPago([{ tipo: 'efectivo', monto: 0, moneda: 'CUP', montoEnCUP: 0 }]);
        setNotasVenta('');
        setEsFiado(false);
        setClienteSeleccionado(null);
        cargarTodo();
    };

    const cancelarVenta = async () => {
        if (!modalCancelacion.venta || !razonCancelacion.trim()) {
            alert('Debes escribir un motivo');
            return;
        }

        const venta = modalCancelacion.venta;

        if (usuarioActual.rol === 'admin') {
            await db.ventas.delete(venta.id!);
        } else {
            await db.ventas.update(venta.id!, { estado: 'error', notaCancelacion: razonCancelacion.trim() });
        }

        // Repone stock: soporta ventas con items (carrito) y ventas antiguas (producto individual)
        if (venta.items && venta.items.length > 0) {
            // Venta nueva con carrito
            for (const item of venta.items) {
                const producto = await db.productos.get(item.productoId);
                if (producto) {
                    await db.productos.update(producto.id!, {
                        stockActual: producto.stockActual + item.cantidad
                    });
                }
            }
        } else if (venta.productoId) {
            // Venta antigua (producto individual)
            const producto = await db.productos.get(venta.productoId);
            if (producto) {
                await db.productos.update(producto.id!, {
                    stockActual: producto.stockActual + (venta.cantidad || 1)
                });
            }
        }

        if (venta.esFiado && venta.clienteId) {
            const cliente = await db.clientes.get(venta.clienteId);
            if (cliente) {
                await db.clientes.update(cliente.id!, {
                    saldoPendiente: Math.max(0, cliente.saldoPendiente - venta.total)
                });
            }
        }

        setModalCancelacion({ abierto: false, venta: null });
        setRazonCancelacion('');
        cargarTodo();
    };

    const productosFiltrados = productos.filter(p => {
        const cat = filtroCategoria === 'todas' || p.categoriaId === filtroCategoria;
        const busq = !busqueda ||
            p.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
            (p.codigoBarras && p.codigoBarras.includes(busqueda));
        return cat && busq;
    });

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-md p-6 mb-6">
                    <div className="flex justify-between items-center">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-200">🛒 Nueva Venta</h1>
                            <p className="text-gray-600 dark:text-gray-400">Vendedor: <strong className="text-blue-600 dark:text-blue-400">{usuarioActual.nombre}</strong></p>
                        </div>
                        <div className="flex gap-2">
                            <button onClick={onVolver} className="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-4 py-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 font-semibold">← Volver</button>
                            <button onClick={onCerrarSesion} className="bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 px-4 py-2 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/50 font-semibold">Salir</button>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Panel Izquierdo: Productos */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Filtros */}
                        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-md p-4">
                            <div className="flex flex-col md:flex-row gap-3">
                                <input
                                    type="text"
                                    placeholder="🔍 Buscar por nombre o código de barras..."
                                    value={busqueda}
                                    onChange={(e) => setBusqueda(e.target.value)}
                                    className="flex-1 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                                <select
                                    value={filtroCategoria}
                                    onChange={(e) => setFiltroCategoria(e.target.value === 'todas' ? 'todas' : parseInt(e.target.value))}
                                    className="border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg px-4 py-3"
                                >
                                    <option value="todas">Todas las categorías</option>
                                    {categorias.map(cat => <option key={cat.id} value={cat.id}>{cat.nombre}</option>)}
                                </select>
                            </div>
                        </div>

                        {/* Productos */}
                        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-md p-6">
                            <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-gray-200">Selecciona Productos</h2>
                            {productosFiltrados.length === 0 ? (
                                <p className="text-gray-500 dark:text-gray-400 text-center py-8">No hay productos disponibles</p>
                            ) : (
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                    {productosFiltrados.map((producto) => (
                                        <button
                                            key={producto.id}
                                            onClick={() => agregarAlCarrito(producto)}
                                            className="p-3 rounded-xl border-2 border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 hover:border-blue-300 dark:hover:border-blue-500 transition-all text-left"
                                        >
                                            <div className="h-20 bg-gray-100 dark:bg-gray-600 rounded-lg mb-2 overflow-hidden flex items-center justify-center">
                                                {producto.imagen ? <img src={producto.imagen} alt="" className="w-full h-full object-cover" /> : <span className="text-2xl text-gray-300 dark:text-gray-500">📦</span>}
                                            </div>
                                            <h3 className="font-semibold text-gray-800 dark:text-gray-200 text-sm truncate">{producto.nombre}</h3>
                                            {producto.codigoBarras && <p className="text-xs text-gray-400 dark:text-gray-500 font-mono">📊 {producto.codigoBarras}</p>}
                                            <p className="text-base font-bold text-blue-600 dark:text-blue-400">${(producto.precioVenta || 0).toFixed(2)}</p>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">Stock: {producto.stockActual}</p>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Panel Derecho: Carrito y Pago */}
                    <div className="space-y-6">
                        {/* Carrito */}
                        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-md p-6">
                            <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-gray-200">🛒 Carrito ({carrito.length})</h2>

                            {carrito.length === 0 ? (
                                <p className="text-gray-500 dark:text-gray-400 text-center py-8">Carrito vacío</p>
                            ) : (
                                <div className="space-y-3 mb-4">
                                    {carrito.map((item) => (
                                        <div key={item.productoId} className="bg-gray-50 dark:bg-gray-700 p-3 rounded-xl">
                                            <div className="flex justify-between items-start mb-2">
                                                <div className="flex-1">
                                                    <p className="font-semibold text-gray-800 dark:text-gray-200 text-sm">{item.productoNombre}</p>
                                                    <p className="text-xs text-gray-500 dark:text-gray-400">${item.precioUnitario.toFixed(2)} c/u</p>
                                                </div>
                                                <button onClick={() => eliminarDelCarrito(item.productoId)} className="text-red-500 dark:text-red-400 hover:text-red-700">✕</button>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => cambiarCantidad(item.productoId, item.cantidad - 1)}
                                                    className="bg-gray-200 dark:bg-gray-600 w-8 h-8 rounded-lg font-bold text-gray-800 dark:text-gray-200"
                                                >-</button>
                                                <span className="flex-1 text-center font-semibold text-gray-800 dark:text-gray-200">{item.cantidad}</span>
                                                <button
                                                    onClick={() => cambiarCantidad(item.productoId, item.cantidad + 1)}
                                                    className="bg-gray-200 dark:bg-gray-600 w-8 h-8 rounded-lg font-bold text-gray-800 dark:text-gray-200"
                                                >+</button>
                                                <span className="text-lg font-bold text-blue-600 dark:text-blue-400 ml-2">${item.subtotal.toFixed(2)}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                                <div className="flex justify-between items-center">
                                    <span className="text-lg font-semibold text-gray-800 dark:text-gray-200">TOTAL:</span>
                                    <span className="text-3xl font-bold text-green-600 dark:text-green-400">${totalCarrito.toFixed(2)}</span>
                                </div>
                            </div>
                        </div>

                        {/* Cliente */}
                        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-md p-6">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">👤 Cliente (opcional)</label>
                            <select
                                value={clienteSeleccionado?.id || ''}
                                onChange={(e) => {
                                    const cli = clientes.find(c => c.id === parseInt(e.target.value));
                                    setClienteSeleccionado(cli || null);
                                }}
                                className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg px-4 py-2.5"
                            >
                                <option value="">Sin cliente (venta rápida)</option>
                                {clientes.map(c => (
                                    <option key={c.id} value={c.id}>{c.nombre} {c.saldoPendiente > 0 ? `(Debe: $${c.saldoPendiente.toFixed(2)})` : ''}</option>
                                ))}
                            </select>
                        </div>

                        {/* Fiado */}
                        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-md p-6">
                            <div className="flex items-center gap-3 bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-xl border border-yellow-200 dark:border-yellow-800">
                                <input
                                    type="checkbox"
                                    id="fiado"
                                    checked={esFiado}
                                    onChange={(e) => setEsFiado(e.target.checked)}
                                    className="w-5 h-5"
                                    disabled={!clienteSeleccionado}
                                />
                                <label htmlFor="fiado" className="font-semibold text-yellow-800 dark:text-yellow-400">💳 Venta Fiada</label>
                                {!clienteSeleccionado && <span className="text-xs text-yellow-600 dark:text-yellow-400">(Selecciona cliente)</span>}
                            </div>
                        </div>

                        {/* Métodos de Pago */}
                        {!esFiado && (
                            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-md p-6">
                                <div className="flex justify-between items-center mb-3">
                                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">💰 Pago</label>
                                    <button onClick={agregarMetodoPago} className="text-blue-600 dark:text-blue-400 text-sm font-semibold">+ Método</button>
                                </div>

                                <div className="space-y-3">
                                    {metodosPago.map((mp, index) => (
                                        <div key={index} className="bg-gray-50 dark:bg-gray-700 p-3 rounded-xl">
                                            <div className="flex gap-2 mb-2">
                                                <select
                                                    value={mp.tipo}
                                                    onChange={(e) => actualizarMetodoPago(index, 'tipo', e.target.value)}
                                                    className="flex-1 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-lg px-2 py-2 text-sm"
                                                >
                                                    <option value="efectivo">💵 Efectivo</option>
                                                    <option value="transferencia">📱 Transfer</option>
                                                    <option value="tarjeta">💳 Tarjeta</option>
                                                </select>
                                                {metodosPago.length > 1 && (
                                                    <button onClick={() => eliminarMetodoPago(index)} className="text-red-500 dark:text-red-400 px-2">✕</button>
                                                )}
                                            </div>
                                            <div className="flex gap-2">
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    placeholder="Monto"
                                                    value={mp.monto || ''}
                                                    onChange={(e) => actualizarMetodoPago(index, 'monto', parseFloat(e.target.value) || 0)}
                                                    className="flex-1 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-lg px-3 py-2"
                                                />
                                                <select
                                                    value={mp.moneda}
                                                    onChange={(e) => actualizarMetodoPago(index, 'moneda', e.target.value)}
                                                    className="border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-lg px-2 py-2 text-sm"
                                                >
                                                    <option value="CUP">🇨🇺 CUP</option>
                                                    <option value="USD">🇺🇸 USD</option>
                                                    <option value="EUR">🇪🇺 EUR</option>
                                                    <option value="MLC">🏦 MLC</option>
                                                </select>
                                            </div>
                                            {mp.moneda !== 'CUP' && mp.monto > 0 && (
                                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">= ${mp.montoEnCUP.toFixed(2)} CUP</p>
                                            )}
                                        </div>
                                    ))}
                                </div>

                                <div className={`mt-4 p-3 rounded-xl ${totalPagadoCUP >= totalCarrito ? 'bg-green-50 dark:bg-green-900/20' : 'bg-red-50 dark:bg-red-900/20'}`}>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-700 dark:text-gray-300">Pagado:</span>
                                        <span className="font-semibold text-gray-800 dark:text-gray-200">${totalPagadoCUP.toFixed(2)} CUP</span>
                                    </div>
                                    {vuelto > 0 && (
                                        <div className="flex justify-between text-lg font-bold mt-2">
                                            <span className="text-green-700 dark:text-green-400">VUELTO:</span>
                                            <span className="text-green-700 dark:text-green-400">${vuelto.toFixed(2)} CUP</span>
                                        </div>
                                    )}
                                    {totalPagadoCUP < totalCarrito && (
                                        <p className="text-sm text-red-700 dark:text-red-400 mt-1">Faltan: ${(totalCarrito - totalPagadoCUP).toFixed(2)} CUP</p>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Notas */}
                        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-md p-6">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">📝 Notas</label>
                            <textarea
                                value={notasVenta}
                                onChange={(e) => setNotasVenta(e.target.value)}
                                className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg px-4 py-2"
                                rows={2}
                                placeholder="Ej: Entrega a domicilio..."
                            />
                        </div>

                        {/* Botón Registrar */}
                        <button
                            onClick={registrarVenta}
                            disabled={carrito.length === 0}
                            className="w-full bg-gradient-to-r from-green-600 to-green-700 text-white px-6 py-4 rounded-xl hover:from-green-700 hover:to-green-800 font-semibold text-lg shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            ✓ Registrar Venta
                        </button>
                    </div>
                </div>
            </div>

            {/* Modal Cancelación */}
            {/* Modal Cancelación */}
            {modalCancelacion.abierto && modalCancelacion.venta && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
                        <div className={`px-6 py-4 ${usuarioActual.rol === 'admin' ? 'bg-red-600' : 'bg-yellow-500'}`}>
                            <h2 className="text-xl font-bold text-white">
                                {usuarioActual.rol === 'admin' ? '🗑️ Eliminar Venta' : '⚠️ Marcar Error'}
                            </h2>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-xl">
                                <p className="font-semibold text-gray-800 dark:text-gray-200">
                                    {modalCancelacion.venta.items && modalCancelacion.venta.items.length > 0
                                        ? modalCancelacion.venta.items.map(i => i.productoNombre).join(', ')
                                        : modalCancelacion.venta.productoNombre || 'Venta'}
                                </p>
                                <p className="text-sm text-gray-500 dark:text-gray-400">Total: ${modalCancelacion.venta.total.toFixed(2)}</p>
                            </div>
                            <textarea
                                value={razonCancelacion}
                                onChange={(e) => setRazonCancelacion(e.target.value)}
                                className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg px-4 py-3"
                                rows={3}
                                placeholder="Motivo..."
                            />
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setModalCancelacion({ abierto: false, venta: null })}
                                    className="flex-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 py-3 rounded-lg font-semibold"
                                >Cancelar</button>
                                <button
                                    onClick={cancelarVenta}
                                    className={`flex-1 py-3 rounded-lg font-semibold text-white ${usuarioActual.rol === 'admin' ? 'bg-red-600' : 'bg-yellow-600'}`}
                                >{usuarioActual.rol === 'admin' ? 'Eliminar' : 'Marcar Error'}</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}