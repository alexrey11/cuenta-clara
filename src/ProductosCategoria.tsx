// ============ src/ProductosCategoria.tsx ============
import { useState, useEffect, useRef } from 'react';
import { db } from './db';
import { comprimirImagen } from './utils/imageUtils';
import type { Producto, Categoria } from './db';
import {
    STYLES, BackgroundBlobs, pageWrap, card, cardPadded, titleGradient,
    btnPrimary, input, label,
    modalOverlay, modalPanel, modalHeader, modalTitle, modalClose, EmptyState,
} from './theme';

interface ProductosCategoriaProps {
    categoriaId: number;
    onVolver: () => void;
}

export default function ProductosCategoria({ categoriaId, onVolver }: ProductosCategoriaProps) {
    const [categoria, setCategoria] = useState<Categoria | null>(null);
    const [productos, setProductos] = useState<Producto[]>([]);
    const [modalAbierto, setModalAbierto] = useState(false);
    const [productoEditando, setProductoEditando] = useState<Producto | null>(null);
    const [nombre, setNombre] = useState('');
    const [descripcion, setDescripcion] = useState('');
    const [precioCompra, setPrecioCompra] = useState('');
    const [precioVenta, setPrecioVenta] = useState('');
    const [stockActual, setStockActual] = useState('');
    const [stockMinimo, setStockMinimo] = useState('');
    const [unidadMedida, setUnidadMedida] = useState('unidades');
    const [fechaVencimiento, setFechaVencimiento] = useState('');
    const [codigoBarras, setCodigoBarras] = useState('');
    const [imagenBase64, setImagenBase64] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => { cargarDatos(); }, [categoriaId]);

    const cargarDatos = async () => {
        const cat = await db.categorias.get(categoriaId);
        setCategoria(cat || null);
        const prods = await db.productos.where('categoriaId').equals(categoriaId).toArray();
        setProductos(prods);
    };

    const manejarArchivo = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) setImagenBase64(await comprimirImagen(file, 600));
    };

    const guardarProducto = async () => {
        if (!nombre.trim() || !precioVenta || !stockActual || !precioCompra) {
            alert('Completa nombre, precio compra, precio venta y stock');
            return;
        }
        const pc = parseFloat(precioCompra);
        const pv = parseFloat(precioVenta);
        if (pc >= pv && !confirm('⚠️ Precio compra >= precio venta. ¿Continuar?')) return;

        const datos = {
            categoriaId, nombre: nombre.trim(),
            descripcion: descripcion.trim() || undefined,
            precioCompra: pc, precioVenta: pv,
            stockActual: parseInt(stockActual),
            stockMinimo: parseInt(stockMinimo) || 0,
            unidadMedida,
            fechaVencimiento: fechaVencimiento ? new Date(fechaVencimiento) : undefined,
            codigoBarras: codigoBarras.trim() || undefined,
            imagen: imagenBase64 || undefined,
            fechaCreacion: productoEditando ? productoEditando.fechaCreacion : new Date(),
        };
        if (productoEditando) await db.productos.update(productoEditando.id!, datos);
        else await db.productos.add(datos);
        limpiarFormulario(); cargarDatos();
    };

    const editarProducto = (prod: Producto, e: React.MouseEvent) => {
        e.stopPropagation();
        setProductoEditando(prod);
        setNombre(prod.nombre); setDescripcion(prod.descripcion || '');
        setPrecioCompra(prod.precioCompra?.toString() || '0');
        setPrecioVenta(prod.precioVenta?.toString() || '');
        setStockActual(prod.stockActual.toString());
        setStockMinimo(prod.stockMinimo.toString());
        setUnidadMedida(prod.unidadMedida || 'unidades');
        setFechaVencimiento(prod.fechaVencimiento ? new Date(prod.fechaVencimiento).toISOString().split('T')[0] : '');
        setCodigoBarras(prod.codigoBarras || '');
        setImagenBase64(prod.imagen || '');
        setModalAbierto(true);
    };

    const eliminarProducto = async (id: number, e: React.MouseEvent) => {
        e.stopPropagation();
        if (confirm('¿Eliminar este producto?')) { await db.productos.delete(id); cargarDatos(); }
    };

    const limpiarFormulario = () => {
        setProductoEditando(null); setNombre(''); setDescripcion('');
        setPrecioCompra(''); setPrecioVenta(''); setStockActual(''); setStockMinimo('');
        setUnidadMedida('unidades'); setFechaVencimiento(''); setCodigoBarras('');
        setImagenBase64(''); setModalAbierto(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    return (
        <div className={pageWrap}>
            <style>{STYLES}</style>
            <BackgroundBlobs />

            <div className="relative mx-auto max-w-7xl">
                <div className={`cc-fade-up mb-4 md:mb-6 ${cardPadded}`}>
                    <div className="flex items-center gap-3">
                        <button onClick={onVolver} aria-label="Volver"
                            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-slate-800/60 text-lg font-black text-gray-300 transition-colors hover:border-blue-400/60 hover:bg-blue-500/15 hover:text-blue-300">
                            ←
                        </button>
                        <div className="min-w-0 flex-1">
                            <h1 className={`${titleGradient} truncate text-xl md:text-3xl`}>{categoria?.nombre || 'Productos'}</h1>
                            <p className="truncate text-xs text-gray-400 md:text-sm">{productos.length} productos</p>
                        </div>
                        <button onClick={() => setModalAbierto(true)} className={btnPrimary}>+ Nuevo</button>
                    </div>
                </div>

                {productos.length === 0 ? (
                    <div className={`${card} p-6`}><EmptyState icon="📦" texto="Sin productos en esta categoría" /></div>
                ) : (
                    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4 lg:grid-cols-4">
                        {productos.map((prod) => {
                            const bajo = prod.stockActual <= prod.stockMinimo;
                            return (
                                <div key={prod.id} className={`${card} cc-fade-up group overflow-hidden transition-transform duration-200 hover:-translate-y-0.5`}>
                                    <div className="relative h-32 overflow-hidden bg-gradient-to-br from-slate-800 to-slate-900 md:h-40">
                                        {prod.imagen
                                            ? <img src={prod.imagen} alt={prod.nombre} className="h-full w-full object-cover" />
                                            : <div className="flex h-full w-full items-center justify-center"><span className="text-4xl opacity-30 md:text-5xl">📦</span></div>}
                                        <div className={`absolute top-2 left-2 rounded-full px-2 py-0.5 text-[10px] font-black text-white ${bajo ? 'bg-rose-500' : 'bg-emerald-500'}`}>
                                            {prod.stockActual} {prod.unidadMedida}
                                        </div>
                                        <div className="absolute top-2 right-2 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                                            <button onClick={(e) => editarProducto(prod, e)} className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/10 bg-slate-900/80 text-xs text-blue-300 hover:bg-blue-500/20 md:h-8 md:w-8 md:text-sm">✏️</button>
                                            <button onClick={(e) => eliminarProducto(prod.id!, e)} className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/10 bg-slate-900/80 text-xs text-rose-300 hover:bg-rose-500/20 md:h-8 md:w-8 md:text-sm">🗑️</button>
                                        </div>
                                    </div>
                                    <div className="p-2 md:p-3">
                                        <h3 className="mb-1 truncate text-xs font-bold text-gray-100 md:text-sm">{prod.nombre}</h3>
                                        <div className="space-y-0.5">
                                            <div className="flex justify-between text-[10px] md:text-xs">
                                                <span className="text-gray-500">Compra:</span>
                                                <span className="font-semibold text-gray-300">${(prod.precioCompra || 0).toFixed(2)}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-[10px] text-gray-500 md:text-xs">Venta:</span>
                                                <span className="text-sm font-black text-blue-300 md:text-base">${(prod.precioVenta || 0).toFixed(2)}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {modalAbierto && (
                    <div className={modalOverlay}>
                        <div className={`${modalPanel} md:max-w-2xl`}>
                            <div className={modalHeader}>
                                <h2 className={modalTitle}>{productoEditando ? 'Editar' : 'Nuevo'} Producto</h2>
                                <button onClick={limpiarFormulario} className={modalClose}>&times;</button>
                            </div>
                            <div className="space-y-4 p-4 md:p-6">
                                <div>
                                    <label className={label}>Imagen del producto</label>
                                    <div className="flex flex-col items-start gap-4 md:flex-row">
                                        <div className="flex h-32 w-full items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-slate-800/60 md:w-32">
                                            {imagenBase64 ? <img src={imagenBase64} alt="Preview" className="h-full w-full object-cover" /> : <span className="text-4xl text-gray-600">📷</span>}
                                        </div>
                                        <div className="w-full flex-1">
                                            <input type="file" accept="image/*" ref={fileInputRef} onChange={manejarArchivo}
                                                className="w-full text-sm text-gray-400 file:mr-4 file:rounded-lg file:border-0 file:bg-blue-500/15 file:px-4 file:py-2.5 file:text-sm file:font-bold file:text-blue-300 hover:file:bg-blue-500/25" />
                                            <p className="mt-2 text-xs text-gray-500">Toca para seleccionar imagen</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                    <div className="md:col-span-2">
                                        <label className={label}>Nombre *</label>
                                        <input type="text" value={nombre} onChange={(e) => setNombre(e.target.value)} className={input} />
                                    </div>
                                    <div>
                                        <label className={label}>💰 Precio Compra *</label>
                                        <input type="number" step="0.01" value={precioCompra} onChange={(e) => setPrecioCompra(e.target.value)} className={input} />
                                    </div>
                                    <div>
                                        <label className={label}>💵 Precio Venta *</label>
                                        <input type="number" step="0.01" value={precioVenta} onChange={(e) => setPrecioVenta(e.target.value)} className={input} />
                                    </div>
                                    <div>
                                        <label className={label}>Stock Actual *</label>
                                        <input type="number" value={stockActual} onChange={(e) => setStockActual(e.target.value)} className={input} />
                                    </div>
                                    <div>
                                        <label className={label}>Stock Mínimo</label>
                                        <input type="number" value={stockMinimo} onChange={(e) => setStockMinimo(e.target.value)} className={input} />
                                    </div>
                                    <div>
                                        <label className={label}>📊 Código Barras</label>
                                        <input type="text" value={codigoBarras} onChange={(e) => setCodigoBarras(e.target.value)} className={`${input} font-mono`} />
                                    </div>
                                    <div>
                                        <label className={label}>📅 Vencimiento</label>
                                        <input type="date" value={fechaVencimiento} onChange={(e) => setFechaVencimiento(e.target.value)} className={input} />
                                    </div>
                                </div>

                                <div className="flex gap-3 border-t border-white/10 pt-4">
                                    <button onClick={limpiarFormulario}
                                        className="flex-1 rounded-xl border border-white/10 bg-slate-800/60 py-3 text-base font-bold text-gray-300 transition-colors hover:bg-slate-800">
                                        Cancelar
                                    </button>
                                    <button onClick={guardarProducto}
                                        className="flex-1 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 py-3 text-base font-bold text-white shadow-md shadow-emerald-500/25 transition-transform hover:-translate-y-0.5">
                                        {productoEditando ? 'Guardar' : 'Crear'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}