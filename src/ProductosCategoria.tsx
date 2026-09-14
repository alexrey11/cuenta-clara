import { useState, useEffect, useRef } from 'react';
import { db } from './db';
import type { Producto, Categoria, Usuario } from './db';
import { comprimirImagen } from './utils/imageUtils';

interface ProductosCategoriaProps {
    usuarioActual: Usuario;
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

        // Migrar productos antiguos: si tienen "precio" pero no "precioVenta"
        const prodsMigrados = prods.map(p => {
            const anyP = p as any;
            if (anyP.precio && !p.precioVenta) {
                p.precioVenta = anyP.precio;
                if (!p.precioCompra) p.precioCompra = 0;
            }
            return p;
        });

        setProductos(prodsMigrados);
    };

    const manejarArchivo = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const c = await comprimirImagen(file, 600);
            setImagenBase64(c);
        }
    };

    const guardarProducto = async () => {
        if (!nombre.trim() || !precioVenta || !stockActual || !precioCompra) {
            alert('Completa nombre, precio de compra, precio de venta y stock');
            return;
        }

        const pc = parseFloat(precioCompra);
        const pv = parseFloat(precioVenta);

        if (pc >= pv) {
            if (!confirm('⚠️ El precio de compra es mayor o igual al de venta. ¿Continuar de todos modos?')) {
                return;
            }
        }

        const datos: any = {
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
        alert(productoEditando ? '✅ Producto actualizado' : '✅ Producto creado');
    };

    const editarProducto = (prod: Producto, e: React.MouseEvent) => {
        e.stopPropagation();
        setProductoEditando(prod);
        setNombre(prod.nombre);
        setDescripcion(prod.descripcion || '');
        setPrecioCompra(prod.precioCompra?.toString() || '0');
        setPrecioVenta(prod.precioVenta?.toString() || (prod as any).precio?.toString() || '');
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

    // Alerta de productos próximos a vencer (30 días)
    const productosProximosVencer = productos.filter(p => {
        if (!p.fechaVencimiento) return false;
        const dias = Math.ceil((new Date(p.fechaVencimiento).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
        return dias <= 30 && dias >= 0;
    });

    const productosVencidos = productos.filter(p => {
        if (!p.fechaVencimiento) return false;
        return new Date(p.fechaVencimiento) < new Date();
    });

    return (
        <div className="p-6 bg-gray-50 dark:bg-gray-900 min-h-screen">
            <div className="max-w-7xl mx-auto">
                <div className="flex items-center gap-4 mb-6">
                    <button onClick={onVolver} className="bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 p-3 rounded-xl transition-colors shadow-md border border-gray-200 dark:border-gray-700">
                        <span className="text-gray-800 dark:text-gray-200">←</span>
                    </button>
                    <div className="flex-1">
                        <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-200 mb-1">{categoria?.nombre}</h1>
                        <p className="text-gray-600 dark:text-gray-400">{productos.length} productos</p>
                    </div>
                    <button onClick={() => setModalAbierto(true)} className="bg-gradient-to-r from-green-600 to-green-700 text-white px-6 py-3 rounded-xl hover:from-green-700 hover:to-green-800 transition-all font-semibold flex items-center gap-2 shadow-lg">
                        <span className="text-xl">+</span> Nuevo Producto
                    </button>
                </div>

                {/* Alertas */}
                {productosVencidos.length > 0 && (
                    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 mb-4">
                        <p className="text-red-700 dark:text-red-400 font-semibold">⚠️ Productos VENCIDOS ({productosVencidos.length}):</p>
                        <p className="text-sm text-red-600 dark:text-red-300">{productosVencidos.map(p => p.nombre).join(', ')}</p>
                    </div>
                )}

                {productosProximosVencer.length > 0 && (
                    <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-4 mb-4">
                        <p className="text-yellow-700 dark:text-yellow-400 font-semibold">⏰ Próximos a vencer (30 días): {productosProximosVencer.length}</p>
                        <p className="text-sm text-yellow-600 dark:text-yellow-300">{productosProximosVencer.map(p => p.nombre).join(', ')}</p>
                    </div>
                )}

                {productos.some(p => p.stockActual <= p.stockMinimo) && (
                    <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-xl p-4 mb-4">
                        <p className="text-orange-700 dark:text-orange-400 font-semibold">📦 Stock bajo:</p>
                        <p className="text-sm text-orange-600 dark:text-orange-300">{productos.filter(p => p.stockActual <= p.stockMinimo).map(p => p.nombre).join(', ')}</p>
                    </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {productos.map((prod) => {
                        const vencido = prod.fechaVencimiento && new Date(prod.fechaVencimiento) < new Date();
                        const proxVencer = prod.fechaVencimiento && !vencido && Math.ceil((new Date(prod.fechaVencimiento).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) <= 30;

                        return (
                            <div key={prod.id} className={`bg-white dark:bg-gray-800 rounded-2xl shadow-md overflow-hidden hover:shadow-xl transition-all group border ${vencido ? 'border-red-400 dark:border-red-600' : proxVencer ? 'border-yellow-400 dark:border-yellow-600' : 'border-gray-100 dark:border-gray-700'
                                }`}>
                                <div className="h-48 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-600 relative overflow-hidden">
                                    {prod.imagen ? <img src={prod.imagen} alt={prod.nombre} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" /> : <div className="w-full h-full flex items-center justify-center"><span className="text-6xl text-gray-300 dark:text-gray-500">📦</span></div>}

                                    <div className={`absolute top-3 left-3 px-3 py-1 rounded-full text-xs font-bold ${prod.stockActual <= prod.stockMinimo ? 'bg-red-500 text-white' : 'bg-green-500 text-white'
                                        }`}>
                                        {prod.stockActual} {prod.unidadMedida}
                                    </div>

                                    {vencido && <div className="absolute top-3 right-3 bg-red-600 text-white px-2 py-1 rounded text-xs font-bold">VENCIDO</div>}
                                    {proxVencer && <div className="absolute top-3 right-3 bg-yellow-500 text-white px-2 py-1 rounded text-xs font-bold">⏰ 30 días</div>}

                                    <div className="absolute top-3 right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={(e) => editarProducto(prod, e)} className="bg-white dark:bg-gray-800 bg-opacity-90 p-2 rounded-lg shadow-md hover:bg-blue-50 dark:hover:bg-blue-900/30 text-blue-600 dark:text-blue-400">✏️</button>
                                        <button onClick={(e) => eliminarProducto(prod.id!, e)} className="bg-white dark:bg-gray-800 bg-opacity-90 p-2 rounded-lg shadow-md hover:bg-red-50 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400">🗑️</button>
                                    </div>
                                </div>
                                <div className="p-5">
                                    <h3 className="font-bold text-gray-800 dark:text-gray-200 text-lg mb-1 truncate">{prod.nombre}</h3>
                                    {prod.codigoBarras && <p className="text-xs text-gray-400 dark:text-gray-500 font-mono mb-1">📊 {prod.codigoBarras}</p>}
                                    {prod.descripcion && <p className="text-sm text-gray-500 dark:text-gray-400 mb-2 line-clamp-2">{prod.descripcion}</p>}

                                    <div className="space-y-1 mt-3">
                                        <div className="flex justify-between text-sm">
                                            <span className="text-gray-500 dark:text-gray-400">Compra:</span>
                                            <span className="text-gray-700 dark:text-gray-300 font-semibold">${(prod.precioCompra || 0).toFixed(2)}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-500 dark:text-gray-400">Venta:</span>
                                            <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">${(prod.precioVenta || 0).toFixed(2)}</span>
                                        </div>
                                        <div className="flex justify-between text-xs">
                                            <span className="text-gray-400 dark:text-gray-500">Ganancia:</span>
                                            <span className="text-green-600 dark:text-green-400 font-semibold">
                                                ${((prod.precioVenta || 0) - (prod.precioCompra || 0)).toFixed(2)}
                                            </span>
                                        </div>
                                    </div>

                                    {prod.fechaVencimiento && (
                                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
                                            📅 Vence: {new Date(prod.fechaVencimiento).toLocaleDateString('es-ES')}
                                        </p>
                                    )}
                                </div>
                            </div>
                        );
                    })}

                    <button onClick={() => setModalAbierto(true)} className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-2xl min-h-[300px] flex flex-col items-center justify-center text-gray-400 dark:text-gray-500 hover:border-green-400 dark:hover:border-green-500 hover:text-green-500 dark:hover:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/10 transition-all">
                        <span className="text-5xl mb-3">+</span>
                        <span className="font-semibold">Agregar Producto</span>
                    </button>
                </div>

                {modalAbierto && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
                        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden max-h-[90vh] overflow-y-auto">
                            <div className="bg-gradient-to-r from-green-600 to-green-700 px-6 py-4 flex justify-between items-center sticky top-0">
                                <h2 className="text-xl font-bold text-white">{productoEditando ? 'Editar Producto' : 'Nuevo Producto'}</h2>
                                <button onClick={limpiarFormulario} className="text-white hover:text-gray-200 text-2xl">&times;</button>
                            </div>
                            <div className="p-6 space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Imagen</label>
                                    <div className="flex items-center gap-4">
                                        <div className="w-32 h-32 bg-gray-100 dark:bg-gray-700 rounded-xl flex items-center justify-center overflow-hidden border-2 border-gray-200 dark:border-gray-600">
                                            {imagenBase64 ? <img src={imagenBase64} alt="Preview" className="w-full h-full object-cover" /> : <span className="text-4xl text-gray-400">📷</span>}
                                        </div>
                                        <input type="file" accept="image/*" ref={fileInputRef} onChange={manejarArchivo} className="flex-1 text-sm text-gray-500 dark:text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 dark:file:bg-blue-900/30 file:text-blue-700 dark:file:text-blue-400" />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="md:col-span-2">
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nombre *</label>
                                        <input type="text" value={nombre} onChange={(e) => setNombre(e.target.value)} className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-green-500" />
                                    </div>

                                    <div className="md:col-span-2">
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Descripción</label>
                                        <textarea value={descripcion} onChange={(e) => setDescripcion(e.target.value)} className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-green-500" rows={2} />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">💰 Precio Compra (CUP) *</label>
                                        <input type="number" step="0.01" value={precioCompra} onChange={(e) => setPrecioCompra(e.target.value)} className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-green-500" placeholder="0.00" />
                                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Lo que te cuesta el producto</p>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">💵 Precio Venta (CUP) *</label>
                                        <input type="number" step="0.01" value={precioVenta} onChange={(e) => setPrecioVenta(e.target.value)} className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-green-500" placeholder="0.00" />
                                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Lo que cobra al cliente</p>
                                    </div>

                                    {precioCompra && precioVenta && parseFloat(precioCompra) > 0 && (
                                        <div className="md:col-span-2 bg-green-50 dark:bg-green-900/20 p-3 rounded-lg">
                                            <p className="text-sm text-green-700 dark:text-green-400">
                                                <strong>Ganancia por unidad:</strong> ${(parseFloat(precioVenta) - parseFloat(precioCompra)).toFixed(2)}
                                                <span className="ml-2">({((parseFloat(precioVenta) - parseFloat(precioCompra)) / parseFloat(precioCompra) * 100).toFixed(1)}%)</span>
                                            </p>
                                        </div>
                                    )}

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Unidad de medida</label>
                                        <select value={unidadMedida} onChange={(e) => setUnidadMedida(e.target.value)} className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-green-500">
                                            <option value="unidades">Unidades</option>
                                            <option value="pomos">Pomos</option>
                                            <option value="latas">Latas</option>
                                            <option value="kg">Kilogramos</option>
                                            <option value="lb">Libras</option>
                                            <option value="m">Metros</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">📊 Código de Barras</label>
                                        <input type="text" value={codigoBarras} onChange={(e) => setCodigoBarras(e.target.value)} className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-green-500 font-mono" placeholder="Opcional" />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Stock Actual *</label>
                                        <input type="number" value={stockActual} onChange={(e) => setStockActual(e.target.value)} className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-green-500" />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Stock Mínimo (alerta)</label>
                                        <input type="number" value={stockMinimo} onChange={(e) => setStockMinimo(e.target.value)} className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-green-500" placeholder="0" />
                                    </div>

                                    <div className="md:col-span-2">
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">📅 Fecha de Vencimiento</label>
                                        <input type="date" value={fechaVencimiento} onChange={(e) => setFechaVencimiento(e.target.value)} className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-green-500" />
                                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Deja vacío si no aplica</p>
                                    </div>
                                </div>

                                <div className="flex gap-3 pt-4 border-t border-gray-100 dark:border-gray-700">
                                    <button onClick={limpiarFormulario} className="flex-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 py-3 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors font-semibold">Cancelar</button>
                                    <button onClick={guardarProducto} className="flex-1 bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 transition-colors font-semibold shadow-md">{productoEditando ? 'Guardar Cambios' : 'Crear Producto'}</button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}