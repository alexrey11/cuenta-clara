import { useState, useEffect } from 'react';
import { db } from './db';
import type { Producto, Venta, Usuario, Cliente, TasaCambio, MetodoPago } from './db';

interface Props { onVolver: () => void; usuarioActual: Usuario; onCerrarSesion: () => void; }

export default function NuevaVenta({ onVolver, usuarioActual, onCerrarSesion }: Props) {
    const [productos, setProductos] = useState<Producto[]>([]);
    const [categorias, setCategorias] = useState<any[]>([]);
    const [clientes, setClientes] = useState<Cliente[]>([]);
    const [tasas, setTasas] = useState<TasaCambio[]>([]);
    const [sel, setSel] = useState<Producto | null>(null);
    const [cant, setCant] = useState('1');
    const [ventasHoy, setVentasHoy] = useState<Venta[]>([]);
    const [totalDia, setTotalDia] = useState(0);
    const [filtroCat, setFiltroCat] = useState<number | 'todas'>('todas');
    const [busq, setBusq] = useState('');
    const [cliente, setCliente] = useState<Cliente | null>(null);
    const [metodos, setMetodos] = useState<MetodoPago[]>([{ tipo: 'efectivo', monto: 0, moneda: 'CUP', montoEnCUP: 0 }]);
    const [notasV, setNotasV] = useState('');
    const [fiado, setFiado] = useState(false);
    const [modalC, setModalC] = useState<{ abierto: boolean; venta: Venta | null }>({ abierto: false, venta: null });
    const [razon, setRazon] = useState('');

    useEffect(() => { cargar(); }, []);

    const cargar = async () => {
        const [p, c, cl, t] = await Promise.all([db.productos.toArray(), db.categorias.toArray(), db.clientes.toArray(), db.tasasCambio.toArray()]);
        setProductos(p.filter(x => x.stockActual > 0)); setCategorias(c); setClientes(cl); setTasas(t);
        const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
        const v = await db.ventas.toArray(); const dh = v.filter(x => new Date(x.fecha) >= hoy);
        setVentasHoy(dh); setTotalDia(dh.filter(x => x.estado === 'completada').reduce((s, x) => s + x.total, 0));
    };

    const tasa = (m: string) => m === 'CUP' ? 1 : (tasas.find(t => t.moneda === m)?.tasa || 1);
    const totalV = sel ? parseInt(cant || '0') * sel.precio : 0;
    const totalPag = metodos.reduce((s, m) => s + m.montoEnCUP, 0);

    const updMetodo = (i: number, campo: string, val: any) => {
        const n = [...metodos]; (n[i] as any)[campo] = val;
        n[i].montoEnCUP = n[i].monto * tasa(n[i].moneda); setMetodos(n);
    };

    const registrar = async () => {
        if (!sel || !cant) { alert('Selecciona producto y cantidad'); return; }
        const c = parseInt(cant);
        if (c > sel.stockActual) { alert('Stock insuficiente'); return; }
        if (!fiado && totalPag < totalV) { alert(`Faltan $${(totalV - totalPag).toFixed(2)}`); return; }
        const vend = await db.usuarios.get(usuarioActual.id!);
        const com = vend?.comisionPorcentaje ? totalV * (vend.comisionPorcentaje / 100) : 0;
        await db.ventas.add({ productoId: sel.id!, productoNombre: sel.nombre, cantidad: c, precioUnitario: sel.precio, total: totalV, fecha: new Date(), vendedorId: usuarioActual.id!, vendedorNombre: usuarioActual.nombre, estado: 'completada', metodosPago: fiado ? [{ tipo: 'fiado', monto: totalV, moneda: 'CUP', montoEnCUP: totalV }] : metodos, notas: notasV || undefined, comisionVendedor: com, esFiado: fiado, clienteId: cliente?.id, clienteNombre: cliente?.nombre });
        await db.productos.update(sel.id!, { stockActual: sel.stockActual - c });
        if (fiado && cliente) await db.clientes.update(cliente.id!, { saldoPendiente: cliente.saldoPendiente + totalV });
        alert(`✅ Venta: $${totalV.toFixed(2)}`);
        setSel(null); setCant('1'); setMetodos([{ tipo: 'efectivo', monto: 0, moneda: 'CUP', montoEnCUP: 0 }]); setNotasV(''); setFiado(false); setCliente(null); cargar();
    };

    const cancelar = async () => {
        if (!modalC.venta || !razon.trim()) { alert('Escribe motivo'); return; }
        const v = modalC.venta;
        if (usuarioActual.rol === 'admin') { await db.ventas.delete(v.id!); } else { await db.ventas.update(v.id!, { estado: 'error', notaCancelacion: razon }); }
        const p = await db.productos.get(v.productoId); if (p) await db.productos.update(p.id!, { stockActual: p.stockActual + v.cantidad });
        if (v.esFiado && v.clienteId) { const cl = await db.clientes.get(v.clienteId); if (cl) await db.clientes.update(cl.id!, { saldoPendiente: Math.max(0, cl.saldoPendiente - v.total) }); }
        setModalC({ abierto: false, venta: null }); setRazon(''); cargar();
    };

    const filtrados = productos.filter(p => (filtroCat === 'todas' || p.categoriaId === filtroCat) && (!busq || p.nombre.toLowerCase().includes(busq.toLowerCase())));

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
            <div className="max-w-7xl mx-auto">
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-md p-6 mb-6">
                    <div className="flex justify-between items-center">
                        <div><h1 className="text-3xl font-bold text-gray-800 dark:text-gray-200">🛒 Nueva Venta</h1><p className="text-gray-600 dark:text-gray-400">Vendedor: <strong className="text-blue-600 dark:text-blue-400">{usuarioActual.nombre}</strong></p></div>
                        <div className="flex gap-2">
                            <button onClick={onVolver} className="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-4 py-2 rounded-lg font-semibold">← Volver</button>
                            <button onClick={onCerrarSesion} className="bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 px-4 py-2 rounded-lg font-semibold">Salir</button>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 space-y-6">
                        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-md p-4">
                            <div className="flex flex-col md:flex-row gap-3">
                                <input type="text" placeholder="🔍 Buscar..." value={busq} onChange={(e) => setBusq(e.target.value)} className="flex-1 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                                <select value={filtroCat} onChange={(e) => setFiltroCat(e.target.value === 'todas' ? 'todas' : parseInt(e.target.value))} className="border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg px-4 py-3">
                                    <option value="todas">Todas</option>{categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                                </select>
                            </div>
                        </div>

                        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-md p-6">
                            <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-gray-200">Producto</h2>
                            {filtrados.length === 0 ? <p className="text-gray-500 dark:text-gray-400 text-center py-8">Sin productos</p> : (
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                    {filtrados.map(p => (
                                        <button key={p.id} onClick={() => setSel(p)} className={`p-3 rounded-xl border-2 transition-all text-left ${sel?.id === p.id ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30' : 'border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 hover:border-blue-300 dark:hover:border-blue-500'}`}>
                                            <div className="h-20 bg-gray-100 dark:bg-gray-600 rounded-lg mb-2 overflow-hidden flex items-center justify-center">{p.imagen ? <img src={p.imagen} alt="" className="w-full h-full object-cover" /> : <span className="text-2xl text-gray-400">📦</span>}</div>
                                            <h3 className="font-semibold text-gray-800 dark:text-gray-200 text-sm truncate">{p.nombre}</h3>
                                            <p className="text-base font-bold text-blue-600 dark:text-blue-400">${p.precio.toFixed(2)}</p>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">Stock: {p.stockActual}</p>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {sel && (
                            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-md p-6 space-y-4">
                                <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200">Detalle</h2>
                                <div className="flex items-center gap-4 bg-gray-50 dark:bg-gray-700 p-4 rounded-xl">
                                    <div className="w-16 h-16 bg-gray-200 dark:bg-gray-600 rounded-lg overflow-hidden flex items-center justify-center flex-shrink-0">{sel.imagen ? <img src={sel.imagen} alt="" className="w-full h-full object-cover" /> : <span className="text-2xl">📦</span>}</div>
                                    <div className="flex-1"><p className="font-semibold text-gray-800 dark:text-gray-200">{sel.nombre}</p><p className="text-sm text-gray-500 dark:text-gray-400">${sel.precio.toFixed(2)} × <input type="number" min="1" max={sel.stockActual} value={cant} onChange={(e) => setCant(e.target.value)} className="w-16 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-600 text-gray-800 dark:text-gray-200 rounded px-2 py-1 text-center" /></p></div>
                                    <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">${totalV.toFixed(2)}</p>
                                </div>

                                <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">👤 Cliente</label>
                                    <select value={cliente?.id || ''} onChange={(e) => setCliente(clientes.find(c => c.id === parseInt(e.target.value)) || null)} className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg px-4 py-2.5">
                                        <option value="">Venta rápida</option>{clientes.map(c => <option key={c.id} value={c.id}>{c.nombre} {c.saldoPendiente > 0 ? `(Debe: $${c.saldoPendiente.toFixed(2)})` : ''}</option>)}
                                    </select>
                                </div>

                                <div className="flex items-center gap-3 bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-xl border border-yellow-200 dark:border-yellow-800">
                                    <input type="checkbox" id="fiado" checked={fiado} onChange={(e) => setFiado(e.target.checked)} className="w-5 h-5" disabled={!cliente} />
                                    <label htmlFor="fiado" className="font-semibold text-yellow-800 dark:text-yellow-400">💳 Fiado</label>
                                </div>

                                {!fiado && (
                                    <div>
                                        <div className="flex justify-between items-center mb-2"><label className="text-sm font-medium text-gray-700 dark:text-gray-300">💰 Métodos de Pago</label><button onClick={() => setMetodos([...metodos, { tipo: 'efectivo', monto: 0, moneda: 'CUP', montoEnCUP: 0 }])} className="text-blue-600 dark:text-blue-400 text-sm font-semibold">+ Agregar</button></div>
                                        <div className="space-y-3">{metodos.map((m, i) => (
                                            <div key={i} className="flex gap-2 items-center bg-gray-50 dark:bg-gray-700 p-3 rounded-xl">
                                                <select value={m.tipo} onChange={(e) => updMetodo(i, 'tipo', e.target.value)} className="border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-lg px-2 py-2 text-sm">
                                                    <option value="efectivo">💵 Efectivo</option><option value="transferencia">📱 Transfer</option><option value="tarjeta">💳 Tarjeta</option>
                                                </select>
                                                <input type="number" step="0.01" placeholder="Monto" value={m.monto || ''} onChange={(e) => updMetodo(i, 'monto', parseFloat(e.target.value) || 0)} className="flex-1 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-lg px-3 py-2" />
                                                <select value={m.moneda} onChange={(e) => updMetodo(i, 'moneda', e.target.value)} className="border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-lg px-2 py-2 text-sm">
                                                    <option value="CUP">🇨🇺</option><option value="USD">🇺🇸</option><option value="EUR">🇪🇺</option><option value="MLC">🏦</option>
                                                </select>
                                                {m.moneda !== 'CUP' && <span className="text-xs text-gray-500 dark:text-gray-400">=${m.montoEnCUP.toFixed(0)}</span>}
                                                {metodos.length > 1 && <button onClick={() => setMetodos(metodos.filter((_, x) => x !== i))} className="text-red-500">✕</button>}
                                            </div>
                                        ))}</div>
                                        <div className={`mt-3 p-3 rounded-xl text-sm font-semibold ${totalPag >= totalV ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400' : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400'}`}>Pagado: ${totalPag.toFixed(2)} {totalPag >= totalV ? '✓' : `(Faltan $${(totalV - totalPag).toFixed(2)})`}</div>
                                    </div>
                                )}

                                <textarea value={notasV} onChange={(e) => setNotasV(e.target.value)} className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg px-4 py-2" rows={2} placeholder="📝 Notas..." />
                                <button onClick={registrar} className="w-full bg-green-600 text-white py-4 rounded-xl hover:bg-green-700 font-semibold text-lg shadow-lg">✓ Registrar Venta</button>
                            </div>
                        )}
                    </div>

                    <div className="space-y-6">
                        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-md p-6">
                            <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-gray-200">Resumen</h2>
                            <div className="bg-gradient-to-br from-green-500 to-green-600 text-white p-6 rounded-xl"><p className="text-sm opacity-90">Total hoy:</p><p className="text-4xl font-bold">${totalDia.toFixed(2)}</p><p className="text-sm opacity-90 mt-1">{ventasHoy.filter(v => v.estado === 'completada').length} ventas</p></div>
                        </div>
                        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-md p-6">
                            <h3 className="font-semibold mb-3 text-gray-800 dark:text-gray-200">Últimas Ventas:</h3>
                            <div className="space-y-2 max-h-[500px] overflow-y-auto">
                                {ventasHoy.slice().reverse().map(v => (
                                    <div key={v.id} className={`p-3 rounded-xl border ${v.estado === 'completada' ? 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600' : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'}`}>
                                        <div className="flex justify-between"><div><p className="font-semibold text-gray-800 dark:text-gray-200 text-sm">{v.productoNombre}</p><p className="text-xs text-gray-500 dark:text-gray-400">{new Date(v.fecha).toLocaleTimeString()} | {v.vendedorNombre}</p>{v.clienteNombre && <p className="text-xs text-blue-600 dark:text-blue-400">👤 {v.clienteNombre}</p>}{v.esFiado && <span className="text-xs bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 px-2 py-0.5 rounded">FIADO</span>}{v.estado === 'error' && <p className="text-xs text-red-600 dark:text-red-400">⚠️ {v.notaCancelacion}</p>}</div><p className={`font-bold ${v.estado === 'completada' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400 line-through'}`}>${v.total.toFixed(2)}</p></div>
                                        {v.estado === 'completada' && <button onClick={() => setModalC({ abierto: true, venta: v })} className={`w-full text-xs px-3 py-1.5 rounded-lg mt-2 font-semibold ${usuarioActual.rol === 'admin' ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400' : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400'}`}>{usuarioActual.rol === 'admin' ? '🗑️ Eliminar' : '⚠️ Error'}</button>}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {modalC.abierto && modalC.venta && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
                        <div className={`px-6 py-4 ${usuarioActual.rol === 'admin' ? 'bg-red-600' : 'bg-yellow-500'}`}><h2 className="text-xl font-bold text-white">{usuarioActual.rol === 'admin' ? '🗑️ Eliminar' : '⚠️ Error'}</h2></div>
                        <div className="p-6 space-y-4">
                            <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-xl"><p className="font-semibold text-gray-800 dark:text-gray-200">{modalC.venta.productoNombre}</p><p className="text-sm text-gray-500 dark:text-gray-400">${modalC.venta.total.toFixed(2)}</p></div>
                            <textarea value={razon} onChange={(e) => setRazon(e.target.value)} className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg px-4 py-3" rows={3} placeholder="Motivo..." />
                            <div className="flex gap-3">
                                <button onClick={() => setModalC({ abierto: false, venta: null })} className="flex-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 py-3 rounded-lg font-semibold">Cancelar</button>
                                <button onClick={cancelar} className={`flex-1 py-3 rounded-lg font-semibold text-white ${usuarioActual.rol === 'admin' ? 'bg-red-600' : 'bg-yellow-600'}`}>{usuarioActual.rol === 'admin' ? 'Eliminar' : 'Marcar'}</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}