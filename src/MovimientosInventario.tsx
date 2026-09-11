import { useState, useEffect } from 'react';
import { db } from './db';
import type { MovimientoInventario, Producto, Usuario } from './db';


interface MovimientosProps { usuarioActual: Usuario; }

export default function MovimientosInventario({ usuarioActual }: MovimientosProps) {
    const [movimientos, setMovimientos] = useState<MovimientoInventario[]>([]);
    const [productos, setProductos] = useState<Producto[]>([]);
    const [modalAbierto, setModalAbierto] = useState(false);
    const [productoId, setProductoId] = useState('');
    const [tipo, setTipo] = useState<'entrada' | 'ajuste' | 'perdida'>('entrada');
    const [cantidad, setCantidad] = useState('');
    const [motivo, setMotivo] = useState('');
    const [filtroTipo, setFiltroTipo] = useState<string>('todos');

    const tipoInfo: Record<string, { label: string; color: string; icon: string }> = {
        entrada: { label: 'Entrada', color: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400', icon: '📥' },
        salida: { label: 'Salida', color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400', icon: '📤' },
        ajuste: { label: 'Ajuste', color: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400', icon: '⚙️' },
        perdida: { label: 'Pérdida', color: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400', icon: '⚠️' },
        devolucion: { label: 'Devolución', color: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400', icon: '🔄' }
    };

    useEffect(() => { cargarDatos(); }, []);

    const cargarDatos = async () => {
        const [m, p] = await Promise.all([db.movimientosInventario.toArray(), db.productos.toArray()]);
        setMovimientos(m.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime()));
        setProductos(p);
    };

    const registrar = async () => {
        if (!productoId || !cantidad || !motivo.trim()) { alert('Completa todos los campos'); return; }
        const pid = parseInt(productoId);
        const c = parseInt(cantidad);
        const prod = await db.productos.get(pid);
        if (!prod) { alert('Producto no encontrado'); return; }
        let stockNuevo = prod.stockActual;
        if (tipo === 'entrada') stockNuevo += c;
        else if (tipo === 'ajuste') stockNuevo = c;
        else if (tipo === 'perdida') { if (c > prod.stockActual) { alert(`Stock actual: ${prod.stockActual}`); return; } stockNuevo -= c; }
        await db.movimientosInventario.add({ productoId: pid, productoNombre: prod.nombre, tipo, cantidad: c, motivo: motivo.trim(), fecha: new Date(), realizadoPor: usuarioActual.nombre, stockAnterior: prod.stockActual, stockNuevo });
        await db.productos.update(pid, { stockActual: stockNuevo });
        alert(`✅ Registrado\nStock: ${prod.stockActual} → ${stockNuevo}`);
        setModalAbierto(false); setProductoId(''); setCantidad(''); setMotivo(''); cargarDatos();
    };

    const movFiltrados = filtroTipo === 'todos' ? movimientos : movimientos.filter(m => m.tipo === filtroTipo);

    return (
        <div className="p-6 bg-gray-50 dark:bg-gray-900 min-h-screen">
            <div className="max-w-6xl mx-auto">
                <div className="flex justify-between items-center mb-6">
                    <div><h1 className="text-3xl font-bold text-gray-800 dark:text-gray-200 mb-1">📦 Movimientos</h1><p className="text-gray-600 dark:text-gray-400">Registra entradas, ajustes y pérdidas</p></div>
                    <button onClick={() => setModalAbierto(true)} className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-3 rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all font-semibold shadow-lg">+ Nuevo</button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                    <div className="bg-gradient-to-br from-green-500 to-green-600 text-white p-6 rounded-2xl shadow-md"><p className="text-sm opacity-90 mb-2">📥 Entradas</p><p className="text-4xl font-bold">{movimientos.filter(m => m.tipo === 'entrada').length}</p></div>
                    <div className="bg-gradient-to-br from-red-500 to-red-600 text-white p-6 rounded-2xl shadow-md"><p className="text-sm opacity-90 mb-2">⚠️ Pérdidas</p><p className="text-4xl font-bold">{movimientos.filter(m => m.tipo === 'perdida').length}</p></div>
                    <div className="bg-gradient-to-br from-yellow-500 to-yellow-600 text-white p-6 rounded-2xl shadow-md"><p className="text-sm opacity-90 mb-2">⚙️ Ajustes</p><p className="text-4xl font-bold">{movimientos.filter(m => m.tipo === 'ajuste').length}</p></div>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-md p-4 mb-6">
                    <div className="flex gap-2 flex-wrap">
                        {['todos', 'entrada', 'ajuste', 'perdida'].map((t) => (
                            <button key={t} onClick={() => setFiltroTipo(t)} className={`px-4 py-2 rounded-lg font-semibold transition-colors ${filtroTipo === t ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'}`}>{t === 'todos' ? 'Todos' : tipoInfo[t]?.icon + ' ' + tipoInfo[t]?.label}</button>
                        ))}
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-md p-6">
                    <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-gray-200">Historial</h2>
                    {movFiltrados.length === 0 ? (
                        <p className="text-gray-500 dark:text-gray-400 text-center py-8">Sin movimientos</p>
                    ) : (
                        <div className="space-y-3">
                            {movFiltrados.map((m) => {
                                const info = tipoInfo[m.tipo] || { label: m.tipo, color: 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300', icon: '📦' };
                                return (
                                    <div key={m.id} className="bg-gray-50 dark:bg-gray-700 p-4 rounded-xl border border-gray-100 dark:border-gray-600">
                                        <div className="flex justify-between items-start">
                                            <div className="flex items-start gap-4">
                                                <div className={`w-12 h-12 rounded-full flex items-center justify-center text-xl ${info.color}`}>
                                                    {info.icon}
                                                </div>
                                                <div>
                                                    <h3 className="font-semibold text-gray-800 dark:text-gray-200">{m.productoNombre}</h3>
                                                    <p className="text-sm text-gray-500 dark:text-gray-400">
                                                        {new Date(m.fecha).toLocaleString('es-ES')} | Por: {m.realizadoPor}
                                                    </p>
                                                    <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                                                        <span className="font-semibold">Cant:</span> {m.cantidad}
                                                    </p>
                                                    <p className="text-sm text-gray-600 dark:text-gray-300">
                                                        <span className="font-semibold">Stock:</span> {m.stockAnterior} → {m.stockNuevo}
                                                    </p>
                                                    <p className="text-sm text-gray-500 dark:text-gray-400 italic mt-1">
                                                        Motivo: {m.motivo}
                                                    </p>
                                                </div>
                                            </div>
                                            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${info.color}`}>
                                                {info.label}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {modalAbierto && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
                        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
                            <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4"><h2 className="text-xl font-bold text-white">Nuevo Movimiento</h2></div>
                            <div className="p-6 space-y-4">
                                <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Producto *</label><select value={productoId} onChange={(e) => setProductoId(e.target.value)} className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg px-4 py-2.5"><option value="">Selecciona</option>{productos.map(p => <option key={p.id} value={p.id}>{p.nombre} (Stock: {p.stockActual})</option>)}</select></div>
                                <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tipo *</label><select value={tipo} onChange={(e) => setTipo(e.target.value as any)} className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg px-4 py-2.5"><option value="entrada">📥 Entrada</option><option value="ajuste">⚙️ Ajuste</option><option value="perdida">⚠️ Pérdida</option></select></div>
                                <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Cantidad * {tipo === 'ajuste' && '(stock final)'}</label><input type="number" min="1" value={cantidad} onChange={(e) => setCantidad(e.target.value)} className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg px-4 py-2.5" placeholder={tipo === 'ajuste' ? 'Stock final' : 'Cantidad'} /></div>
                                <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Motivo *</label><textarea value={motivo} onChange={(e) => setMotivo(e.target.value)} className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg px-4 py-2.5" rows={3} placeholder="Ej: Compra a proveedor..." /></div>
                                <div className="flex gap-3">
                                    <button onClick={() => setModalAbierto(false)} className="flex-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 py-3 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 font-semibold">Cancelar</button>
                                    <button onClick={registrar} className="flex-1 bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 font-semibold shadow-md">Registrar</button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}