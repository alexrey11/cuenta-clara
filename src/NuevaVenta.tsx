// ============ src/NuevaVenta.tsx ============
import { useState, useEffect } from 'react';
import { db } from './db';
import type { Producto, Venta, Usuario, Cliente, TasaCambio, MetodoPago, ItemCarrito } from './db';
import {
    STYLES, BackgroundBlobs, pageWrap, card, cardPadded, titleGradient,
    input, label, sectionTitle, btnSecondary,
    modalOverlay, modalPanel, modalTitle, modalClose, EmptyState,
} from './theme';

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
            db.productos.toArray(), db.categorias.toArray(), db.clientes.toArray(), db.tasasCambio.toArray(),
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
            clienteId: clienteSeleccionado?.id, clienteNombre: clienteSeleccionado?.nombre, vueltoCUP: vuelto > 0 ? vuelto : 0,
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
        <div className={pageWrap}>
            <style>{STYLES}</style>
            <BackgroundBlobs />

            <div className="relative mx-auto max-w-7xl">
                {/* Header */}
                <div className={`cc-fade-up mb-4 md:mb-6 ${cardPadded}`}>
                    <div className="flex items-center justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-3">
                            <div className="hidden h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-2xl shadow-md ring-2 ring-white/10 md:flex">🛒</div>
                            <div className="min-w-0">
                                <h1 className={`${titleGradient} truncate text-xl md:text-3xl`}>Nueva Venta</h1>
                                <p className="truncate text-xs text-gray-400 md:text-sm">Vendedor: <strong className="text-blue-300">{usuarioActual.nombre}</strong></p>
                            </div>
                        </div>
                        <div className="flex shrink-0 gap-1.5 md:gap-2">
                            <button onClick={onVolver} className={btnSecondary}>←</button>
                            <button onClick={onCerrarSesion}
                                className="rounded-xl border border-rose-400/25 bg-rose-500/10 px-3 py-2.5 text-sm font-bold text-rose-300 transition-colors hover:bg-rose-500/20 md:px-4 md:text-base">
                                Salir
                            </button>
                        </div>
                    </div>
                </div>

                {/* Barra flotante móvil (carrito) */}
                {carrito.length > 0 && !mostrarPagoMovil && (
                    <div className="fixed bottom-0 left-0 right-0 z-30 flex items-center justify-between border-t border-white/10 bg-gradient-to-r from-blue-600 to-indigo-600 p-3 text-white shadow-2xl lg:hidden">
                        <div>
                            <p className="text-xs opacity-80">{carrito.length} producto(s)</p>
                            <p className="text-xl font-black">${totalCarrito.toFixed(2)}</p>
                        </div>
                        <button onClick={() => setMostrarPagoMovil(true)}
                            className="rounded-xl bg-white px-5 py-2 text-sm font-black text-blue-700 transition-transform hover:-translate-y-0.5">
                            Cobrar →
                        </button>
                    </div>
                )}

                <div className="grid grid-cols-1 gap-4 pb-20 lg:grid-cols-3 lg:gap-6 lg:pb-0">
                    {/* Productos */}
                    <div className="space-y-4 lg:col-span-2 lg:space-y-6">
                        <div className={`${card} cc-fade-up p-3 md:p-4`}>
                            <div className="flex flex-col gap-2 md:flex-row">
                                <input type="text" placeholder="🔍 Buscar producto o código..."
                                    value={busqueda} onChange={(e) => setBusqueda(e.target.value)}
                                    className={`${input} md:flex-1`} />
                                <select value={filtroCategoria} onChange={(e) => setFiltroCategoria(e.target.value === 'todas' ? 'todas' : parseInt(e.target.value))}
                                    className={`${input} md:w-56`}>
                                    <option value="todas">Todas las categorías</option>
                                    {categorias.map(cat => <option key={cat.id} value={cat.id}>{cat.nombre}</option>)}
                                </select>
                            </div>
                        </div>

                        <div className={`${card} cc-fade-up p-3 md:p-5`}>
                            <h2 className={`${sectionTitle} mb-3 md:mb-4`}>Productos ({productosFiltrados.length})</h2>
                            {productosFiltrados.length === 0 ? (
                                <EmptyState icon="📦" texto="No hay productos que coincidan" />
                            ) : (
                                <div className="grid grid-cols-2 gap-2 md:grid-cols-3 md:gap-3">
                                    {productosFiltrados.map((p) => (
                                        <button key={p.id} onClick={() => agregarAlCarrito(p)}
                                            className="group rounded-xl border border-white/10 bg-slate-800/40 p-2 text-left transition-all duration-150 hover:-translate-y-0.5 hover:border-blue-400/50 hover:bg-slate-800/70 md:p-3">
                                            <div className="mb-1 flex h-16 items-center justify-center overflow-hidden rounded-lg bg-slate-900/60 md:mb-2 md:h-20">
                                                {p.imagen ? <img src={p.imagen} alt="" className="h-full w-full object-cover" /> : <span className="text-xl opacity-40 md:text-2xl">📦</span>}
                                            </div>
                                            <h3 className="truncate text-xs font-bold text-gray-100 md:text-sm">{p.nombre}</h3>
                                            <p className="text-sm font-black text-blue-300 md:text-base">${(p.precioVenta || 0).toFixed(2)}</p>
                                            <p className="text-[10px] text-gray-500 md:text-xs">Stock: {p.stockActual}</p>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Carrito + Pago */}
                    <div className={`${mostrarPagoMovil ? 'block' : 'hidden lg:block'} space-y-4 lg:space-y-6`}>
                        <div className={`${card} p-4 md:p-5`}>
                            <div className="mb-3 flex items-center justify-between md:mb-4">
                                <h2 className={sectionTitle}>🛒 Carrito ({carrito.length})</h2>
                                <button onClick={() => setMostrarPagoMovil(false)} className="text-2xl text-gray-400 hover:text-white lg:hidden">✕</button>
                            </div>
                            {carrito.length === 0 ? (
                                <p className="py-8 text-center text-sm text-gray-500">Vacío · Toca un producto para agregar</p>
                            ) : (
                                <div className="mb-4 space-y-2">
                                    {carrito.map((item) => (
                                        <div key={item.productoId} className="rounded-xl border border-white/10 bg-slate-800/50 p-2 md:p-3">
                                            <div className="mb-2 flex items-start justify-between gap-2">
                                                <p className="min-w-0 flex-1 truncate text-sm font-semibold text-gray-100">{item.productoNombre}</p>
                                                <button onClick={() => eliminarDelCarrito(item.productoId)} className="text-rose-400 hover:text-rose-300">✕</button>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <button onClick={() => cambiarCantidad(item.productoId, item.cantidad - 1)}
                                                    className="h-7 w-7 rounded-lg border border-white/10 bg-slate-700 font-bold text-gray-100 transition-colors hover:bg-slate-600 md:h-8 md:w-8">−</button>
                                                <span className="flex-1 text-center text-sm font-black text-gray-100">{item.cantidad}</span>
                                                <button onClick={() => cambiarCantidad(item.productoId, item.cantidad + 1)}
                                                    className="h-7 w-7 rounded-lg border border-white/10 bg-slate-700 font-bold text-gray-100 transition-colors hover:bg-slate-600 md:h-8 md:w-8">+</button>
                                                <span className="ml-2 text-base font-black text-blue-300 md:text-lg">${item.subtotal.toFixed(2)}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                            <div className="border-t border-white/10 pt-3 md:pt-4">
                                <div className="flex justify-between">
                                    <span className="text-base font-bold text-gray-200 md:text-lg">TOTAL:</span>
                                    <span className="text-2xl font-black text-emerald-300 md:text-3xl">${totalCarrito.toFixed(2)}</span>
                                </div>
                            </div>
                        </div>

                        <div className={`${card} p-4 md:p-5`}>
                            <h2 className={`${sectionTitle} mb-3 md:mb-4`}>💰 Pago</h2>

                            <div className="mb-4">
                                <label className={label}>👤 Cliente</label>
                                <select value={clienteSeleccionado?.id || ''} onChange={(e) => setClienteSeleccionado(clientes.find(c => c.id === parseInt(e.target.value)) || null)} className={input}>
                                    <option value="">Venta rápida (sin cliente)</option>
                                    {clientes.map(c => <option key={c.id} value={c.id}>{c.nombre} {c.saldoPendiente > 0 ? `(Debe $${c.saldoPendiente.toFixed(0)})` : ''}</option>)}
                                </select>
                            </div>

                            <div className={`mb-4 flex items-center gap-3 rounded-xl border p-3 ${clienteSeleccionado ? 'border-amber-400/25 bg-amber-500/10' : 'border-white/10 bg-slate-800/40 opacity-60'}`}>
                                <input type="checkbox" id="fiado" checked={esFiado}
                                    onChange={(e) => setEsFiado(e.target.checked)}
                                    disabled={!clienteSeleccionado}
                                    className="h-5 w-5 accent-amber-500" />
                                <label htmlFor="fiado" className="text-sm font-bold text-amber-200">💳 Marcar como Fiado</label>
                            </div>

                            {!esFiado && (
                                <div className="mb-4">
                                    <div className="mb-2 flex items-center justify-between">
                                        <span className="text-sm font-semibold text-gray-300">Métodos de pago</span>
                                        <button onClick={agregarMetodoPago} className="text-sm font-bold text-blue-300 hover:text-blue-200">+ Método</button>
                                    </div>
                                    <div className="space-y-2">
                                        {metodosPago.map((mp, i) => (
                                            <div key={i} className="rounded-xl border border-white/10 bg-slate-800/50 p-2 md:p-3">
                                                <div className="flex gap-2">
                                                    <select value={mp.tipo} onChange={(e) => actualizarMetodoPago(i, 'tipo', e.target.value)}
                                                        className="rounded-lg border border-white/10 bg-slate-800 px-2 py-2 text-sm text-gray-100 outline-none">
                                                        <option value="efectivo">💵</option>
                                                        <option value="transferencia">📱</option>
                                                        <option value="tarjeta">💳</option>
                                                    </select>
                                                    <input type="number" step="0.01" placeholder="Monto" value={mp.monto || ''}
                                                        onChange={(e) => actualizarMetodoPago(i, 'monto', parseFloat(e.target.value) || 0)}
                                                        className="flex-1 rounded-lg border border-white/10 bg-slate-800 px-3 py-2 text-sm text-gray-100 outline-none focus:border-blue-400/60" />
                                                    <select value={mp.moneda} onChange={(e) => actualizarMetodoPago(i, 'moneda', e.target.value)}
                                                        className="rounded-lg border border-white/10 bg-slate-800 px-2 py-2 text-sm text-gray-100 outline-none">
                                                        <option value="CUP">CUP</option>
                                                        <option value="USD">USD</option>
                                                        <option value="EUR">EUR</option>
                                                        <option value="MLC">MLC</option>
                                                    </select>
                                                    {metodosPago.length > 1 && (
                                                        <button onClick={() => eliminarMetodoPago(i)} className="text-rose-400">✕</button>
                                                    )}
                                                </div>
                                                {mp.moneda !== 'CUP' && mp.monto > 0 && (
                                                    <p className="mt-1.5 text-xs text-gray-400">= ${mp.montoEnCUP.toFixed(2)} CUP</p>
                                                )}
                                            </div>
                                        ))}
                                    </div>

                                    <div className={`mt-3 rounded-xl border p-3 ${totalPagadoCUP >= totalCarrito
                                        ? 'border-emerald-400/25 bg-emerald-500/10'
                                        : 'border-rose-400/25 bg-rose-500/10'
                                        }`}>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-gray-300">Pagado:</span>
                                            <span className="font-semibold text-gray-100">${totalPagadoCUP.toFixed(2)}</span>
                                        </div>
                                        {vuelto > 0 && (
                                            <div className="mt-1 flex justify-between text-base font-black md:text-lg">
                                                <span className="text-emerald-300">VUELTO:</span>
                                                <span className="text-emerald-300">${vuelto.toFixed(2)} CUP</span>
                                            </div>
                                        )}
                                        {totalPagadoCUP < totalCarrito && (
                                            <p className="mt-1 text-sm text-rose-300">Faltan: ${(totalCarrito - totalPagadoCUP).toFixed(2)}</p>
                                        )}
                                    </div>
                                </div>
                            )}

                            <textarea value={notasVenta} onChange={(e) => setNotasVenta(e.target.value)}
                                className={`${input} mb-4`} rows={2} placeholder="📝 Notas (opcional)" />

                            <button onClick={registrarVenta} disabled={carrito.length === 0}
                                className="w-full rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 px-6 py-3.5 text-base font-black text-white shadow-lg shadow-emerald-500/30 transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0 md:py-4 md:text-lg">
                                ✓ Registrar Venta
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {modalCancelacion.abierto && modalCancelacion.venta && (
                <div className={modalOverlay}>
                    <div className={modalPanel}>
                        <div className={`flex items-center justify-between px-4 py-3 md:px-6 md:py-4 ${usuarioActual.rol === 'admin' ? 'bg-gradient-to-r from-rose-500 to-red-600' : 'bg-gradient-to-r from-amber-500 to-orange-600'}`}>
                            <h2 className={modalTitle}>{usuarioActual.rol === 'admin' ? '🗑️ Eliminar' : '⚠️ Error'}</h2>
                            <button onClick={() => setModalCancelacion({ abierto: false, venta: null })} className={modalClose}>&times;</button>
                        </div>
                        <div className="space-y-4 p-6">
                            <div className="rounded-xl border border-white/10 bg-slate-800/50 p-4">
                                <p className="font-semibold text-gray-100">
                                    {modalCancelacion.venta.items && modalCancelacion.venta.items.length > 0
                                        ? modalCancelacion.venta.items.map(i => i.productoNombre).join(', ')
                                        : modalCancelacion.venta.productoNombre || 'Venta'}
                                </p>
                                <p className="text-sm text-gray-400">Total: ${modalCancelacion.venta.total.toFixed(2)}</p>
                            </div>
                            <textarea value={razonCancelacion} onChange={(e) => setRazonCancelacion(e.target.value)}
                                className={input} rows={3} placeholder="Motivo..." />
                            <div className="flex gap-3">
                                <button onClick={() => setModalCancelacion({ abierto: false, venta: null })}
                                    className="flex-1 rounded-xl border border-white/10 bg-slate-800/60 py-3 text-base font-bold text-gray-300 transition-colors hover:bg-slate-800">
                                    Cancelar
                                </button>
                                <button onClick={cancelarVenta}
                                    className={`flex-1 rounded-xl py-3 text-base font-bold text-white shadow-md transition-transform hover:-translate-y-0.5 ${usuarioActual.rol === 'admin' ? 'bg-gradient-to-r from-rose-500 to-red-600 shadow-rose-500/25' : 'bg-gradient-to-r from-amber-500 to-orange-600 shadow-amber-500/25'}`}>
                                    {usuarioActual.rol === 'admin' ? 'Eliminar' : 'Marcar'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}