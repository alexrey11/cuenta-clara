import { useState, useEffect, useRef } from 'react';
import { db } from './db';

import { comprimirImagen } from './utils/imageUtils';

import type { Producto, Categoria } from './db';


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
        if (file) {
            const comprimida = await comprimirImagen(file, 600);
            setImagenBase64(comprimida);
        }
    };

    const guardarProducto = async () => {
        if (!nombre.trim() || !precioVenta || !stockActual || !precioCompra) {
            alert('Completa nombre, precio compra, precio venta y stock');
            return;
        }
        const pc = parseFloat(precioCompra);
        const pv = parseFloat(precioVenta);
        if (pc >= pv) {
            if (!confirm('⚠️ Precio compra >= precio venta. ¿Continuar?')) return;
        }
        const datos = {
            categoriaId,
            nombre: nombre.trim(),
            descripcion: descripcion.trim() || undefined,
            precioCompra: pc,
            precioVenta: pv,
            stockActual: parseInt(stockActual),
            stockMinimo: parseInt(stockMinimo) || 0,
            unidadMedida,
            fechaVencimiento: fechaVencimiento ? new Date(fechaVencimiento) : undefined,
            codigoBarras: codigoBarras.trim() || undefined,
            imagen: imagenBase64 || undefined,
            fechaCreacion: productoEditando ? productoEditando.fechaCreacion : new Date()
        };
        if (productoEditando) {
            await db.productos.update(productoEditando.id!, datos);
        } else {
            await db.productos.add(datos);
        }
        limpiarFormulario();
        cargarDatos();
    };

    const editarProducto = (prod: Producto, e: React.MouseEvent) => {
        e.stopPropagation();
        setProductoEditando(prod);
        setNombre(prod.nombre);
        setDescripcion(prod.descripcion || '');
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
        if (confirm('¿Eliminar este producto?')) {
            await db.productos.delete(id);
            cargarDatos();
        }
    };

    const limpiarFormulario = () => {
        setProductoEditando(null);
        setNombre('');
        setDescripcion('');
        setPrecioCompra('');
        setPrecioVenta('');
        setStockActual('');
        setStockMinimo('');
        setUnidadMedida('unidades');
        setFechaVencimiento('');
        setCodigoBarras('');
        setImagenBase64('');
        setModalAbierto(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    return (
        <div className="p-3 md:p-6 bg-gray-50 dark:bg-gray-900 min-h-screen">
            <div className="max-w-7xl mx-auto">
                <div className="flex items-center gap-3 md:gap-4 mb-4 md:mb-6">
                    <button onClick={onVolver} className="bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 p-2 md:p-3 rounded-lg md:rounded-xl transition-colors shadow-md border border-gray-200 dark:border-gray-700">
                        <span className="text-gray-800 dark:text-gray-200 text-lg md:text-xl">←</span>
                    </button>
                    <div className="flex-1 min-w-0">
                        <h1 className="text-xl md:text-3xl font-bold text-gray-800 dark:text-gray-200 mb-1 truncate">{categoria?.nombre}</h1>
                        <p className="text-xs md:text-base text-gray-600 dark:text-gray-400">{productos.length} productos</p>
                    </div>
                    <button onClick={() => setModalAbierto(true)} className="bg-green-600 hover:bg-green-700 text-white px-3 md:px-6 py-2 md:py-3 rounded-lg md:rounded-xl font-semibold text-sm md:text-base shadow-md flex-shrink-0">
                        + Nuevo
                    </button>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-6">
                    {productos.map((prod) => (
                        <div key={prod.id} className="bg-white dark:bg-gray-800 rounded-xl md:rounded-2xl shadow-md overflow-hidden hover:shadow-xl transition-all group border border-gray-100 dark:border-gray-700">
                            <div className="h-32 md:h-48 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-600 relative overflow-hidden">
                                {prod.imagen ? <img src={prod.imagen} alt={prod.nombre} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" /> : <div className="w-full h-full flex items-center justify-center"><span className="text-4xl md:text-6xl text-gray-300 dark:text-gray-500">📦</span></div>}
                                <div className={`absolute top-2 left-2 px-2 py-1 rounded-full text-xs font-bold ${prod.stockActual <= prod.stockMinimo ? 'bg-red-500 text-white' : 'bg-green-500 text-white'}`}>
                                    {prod.stockActual} {prod.unidadMedida}
                                </div>
                                <div className="absolute top-2 right-2 flex gap-1 md:gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={(e) => editarProducto(prod, e)} className="bg-white dark:bg-gray-800 bg-opacity-90 p-1.5 md:p-2 rounded-lg shadow-md hover:bg-blue-50 text-blue-600 text-sm md:text-base">✏️</button>
                                    <button onClick={(e) => eliminarProducto(prod.id!, e)} className="bg-white dark:bg-gray-800 bg-opacity-90 p-1.5 md:p-2 rounded-lg shadow-md hover:bg-red-50 text-red-600 text-sm md:text-base">🗑️</button>
                                </div>
                            </div>
                            <div className="p-2 md:p-4">
                                <h3 className="font-bold text-gray-800 dark:text-gray-200 text-xs md:text-lg mb-1 truncate">{prod.nombre}</h3>
                                <div className="space-y-1">
                                    <div className="flex justify-between text-xs md:text-sm">
                                        <span className="text-gray-500 dark:text-gray-400">Compra:</span>
                                        <span className="text-gray-700 dark:text-gray-300 font-semibold">${(prod.precioCompra || 0).toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-500 dark:text-gray-400 text-xs md:text-sm">Venta:</span>
                                        <span className="text-sm md:text-xl font-bold text-blue-600 dark:text-blue-400">${(prod.precioVenta || 0).toFixed(2)}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {modalAbierto && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end md:items-center justify-center p-0 md:p-4 z-50">
                        <div className="bg-white dark:bg-gray-800 rounded-t-2xl md:rounded-2xl shadow-2xl w-full md:max-w-2xl max-h-[90vh] overflow-y-auto">
                            <div className="bg-gradient-to-r from-green-600 to-green-700 px-4 md:px-6 py-3 md:py-4 flex justify-between items-center sticky top-0 z-10">
                                <h2 className="text-lg md:text-xl font-bold text-white">{productoEditando ? 'Editar' : 'Nuevo'} Producto</h2>
                                <button onClick={limpiarFormulario} className="text-white hover:text-gray-200 text-2xl">&times;</button>
                            </div>
                            <div className="p-4 md:p-6 space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Imagen del producto</label>
                                    <div className="flex flex-col md:flex-row items-start gap-4">
                                        <div className="w-full md:w-32 h-32 bg-gray-100 dark:bg-gray-700 rounded-xl flex items-center justify-center overflow-hidden border-2 border-gray-200 dark:border-gray-600">
                                            {imagenBase64 ? <img src={imagenBase64} alt="Preview" className="w-full h-full object-cover" /> : <span className="text-4xl text-gray-400">📷</span>}
                                        </div>
                                        <div className="flex-1 w-full">
                                            <input
                                                type="file"
                                                accept="image/*"
                                                ref={fileInputRef}
                                                onChange={manejarArchivo}
                                                className="w-full text-sm text-gray-500 dark:text-gray-400 file:mr-4 file:py-3 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-green-50 dark:file:bg-green-900/30 file:text-green-700 dark:file:text-green-400 hover:file:bg-green-100 dark:hover:file:bg-green-900/50"
                                            />
                                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">Toca para seleccionar imagen</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="md:col-span-2">
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nombre *</label>
                                        <input type="text" value={nombre} onChange={(e) => setNombre(e.target.value)} className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg px-4 py-3 text-base" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">💰 Precio Compra *</label>
                                        <input type="number" step="0.01" value={precioCompra} onChange={(e) => setPrecioCompra(e.target.value)} className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg px-4 py-3 text-base" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">💵 Precio Venta *</label>
                                        <input type="number" step="0.01" value={precioVenta} onChange={(e) => setPrecioVenta(e.target.value)} className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg px-4 py-3 text-base" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Stock Actual *</label>
                                        <input type="number" value={stockActual} onChange={(e) => setStockActual(e.target.value)} className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg px-4 py-3 text-base" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Stock Mínimo</label>
                                        <input type="number" value={stockMinimo} onChange={(e) => setStockMinimo(e.target.value)} className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg px-4 py-3 text-base" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">📊 Código Barras</label>
                                        <input type="text" value={codigoBarras} onChange={(e) => setCodigoBarras(e.target.value)} className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg px-4 py-3 text-base font-mono" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">📅 Fecha Vencimiento</label>
                                        <input type="date" value={fechaVencimiento} onChange={(e) => setFechaVencimiento(e.target.value)} className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg px-4 py-3 text-base" />
                                    </div>
                                </div>

                                <div className="flex gap-3 pt-4 border-t border-gray-100 dark:border-gray-700">
                                    <button onClick={limpiarFormulario} className="flex-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 py-3 rounded-lg font-semibold text-base">Cancelar</button>
                                    <button onClick={guardarProducto} className="flex-1 bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 font-semibold text-base">{productoEditando ? 'Guardar' : 'Crear'}</button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}