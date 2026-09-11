import { useState, useEffect, useRef } from 'react';
import { db } from './db';
import type { Categoria, Usuario } from './db';
import { comprimirImagen } from './utils/imageUtils';



interface CategoriasProps {
    usuarioActual: Usuario;
    onSeleccionarCategoria: (categoriaId: number) => void;
}

export default function Categorias({ onSeleccionarCategoria }: CategoriasProps) {
    const [categorias, setCategorias] = useState<Categoria[]>([]);
    const [modalAbierto, setModalAbierto] = useState(false);
    const [editando, setEditando] = useState<Categoria | null>(null);
    const [nombre, setNombre] = useState('');
    const [descripcion, setDescripcion] = useState('');
    const [imagenBase64, setImagenBase64] = useState<string>('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => { cargarCategorias(); }, []);

    const cargarCategorias = async () => { setCategorias(await db.categorias.toArray()); };

    const manejarArchivo = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) { const c = await comprimirImagen(file, 400); setImagenBase64(c); }
    };

    const guardarCategoria = async () => {
        if (!nombre.trim()) { alert('El nombre es obligatorio'); return; }
        const datos = { nombre: nombre.trim(), descripcion: descripcion.trim() || undefined, imagen: imagenBase64 || undefined, creadoEn: new Date() };
        if (editando) { await db.categorias.update(editando.id!, datos); } else { await db.categorias.add(datos); }
        limpiarFormulario(); cargarCategorias();
    };

    const editarCategoria = (cat: Categoria, e: React.MouseEvent) => {
        e.stopPropagation(); setEditando(cat); setNombre(cat.nombre); setDescripcion(cat.descripcion || ''); setImagenBase64(cat.imagen || ''); setModalAbierto(true);
    };

    const eliminarCategoria = async (id: number, e: React.MouseEvent) => {
        e.stopPropagation();
        const count = await db.productos.where('categoriaId').equals(id).count();
        if (count > 0) { alert(`No se puede eliminar. Hay ${count} productos en esta categoría.`); return; }
        if (confirm('¿Eliminar esta categoría?')) { await db.categorias.delete(id); cargarCategorias(); }
    };

    const limpiarFormulario = () => {
        setEditando(null); setNombre(''); setDescripcion(''); setImagenBase64(''); setModalAbierto(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    return (
        <div className="p-6 bg-gray-50 dark:bg-gray-900 min-h-screen">
            <div className="max-w-7xl mx-auto">
                <div className="flex justify-between items-center mb-8">
                    <div><h1 className="text-3xl font-bold text-gray-800 dark:text-gray-200 mb-1">📂 Categorías</h1><p className="text-gray-600 dark:text-gray-400">Selecciona una categoría para ver sus productos</p></div>
                    <button onClick={() => setModalAbierto(true)} className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-3 rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all font-semibold flex items-center gap-2 shadow-lg"><span className="text-xl">+</span> Nueva Categoría</button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {categorias.map((cat) => (
                        <div key={cat.id} onClick={() => onSeleccionarCategoria(cat.id!)} className="bg-white dark:bg-gray-800 rounded-2xl shadow-md overflow-hidden hover:shadow-xl hover:scale-[1.02] transition-all cursor-pointer group border border-gray-100 dark:border-gray-700">
                            <div className="h-40 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-600 relative overflow-hidden">
                                {cat.imagen ? <img src={cat.imagen} alt={cat.nombre} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><span className="text-6xl text-gray-300 dark:text-gray-500 group-hover:scale-110 transition-transform">📁</span></div>}
                                <div className="absolute top-3 right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={(e) => editarCategoria(cat, e)} className="bg-white dark:bg-gray-800 bg-opacity-90 p-2 rounded-lg shadow-md hover:bg-blue-50 dark:hover:bg-blue-900/30 text-blue-600 dark:text-blue-400">✏️</button>
                                    <button onClick={(e) => eliminarCategoria(cat.id!, e)} className="bg-white dark:bg-gray-800 bg-opacity-90 p-2 rounded-lg shadow-md hover:bg-red-50 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400">🗑️</button>
                                </div>
                            </div>
                            <div className="p-5"><h3 className="font-bold text-gray-800 dark:text-gray-200 text-xl mb-1">{cat.nombre}</h3>{cat.descripcion && <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2">{cat.descripcion}</p>}<div className="mt-4 flex items-center justify-between text-sm text-gray-400 dark:text-gray-500"><span>Ver productos →</span></div></div>
                        </div>
                    ))}
                    <button onClick={() => setModalAbierto(true)} className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-2xl min-h-[280px] flex flex-col items-center justify-center text-gray-400 dark:text-gray-500 hover:border-blue-400 dark:hover:border-blue-500 hover:text-blue-500 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-all group">
                        <span className="text-5xl mb-3 group-hover:scale-110 transition-transform">+</span><span className="font-semibold text-lg">Agregar Categoría</span>
                    </button>
                </div>

                {modalAbierto && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
                        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
                            <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4 flex justify-between items-center">
                                <h2 className="text-xl font-bold text-white">{editando ? 'Editar Categoría' : 'Nueva Categoría'}</h2>
                                <button onClick={limpiarFormulario} className="text-white hover:text-gray-200 text-2xl">&times;</button>
                            </div>
                            <div className="p-6 space-y-4">
                                <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Nombre *</label><input type="text" value={nombre} onChange={(e) => setNombre(e.target.value)} className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Ej: Bebidas..." /></div>
                                <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Descripción</label><textarea value={descripcion} onChange={(e) => setDescripcion(e.target.value)} className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500" rows={3} placeholder="Descripción opcional..." /></div>
                                <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Imagen</label><div className="flex items-center gap-4"><div className="w-20 h-20 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center overflow-hidden border border-gray-200 dark:border-gray-600">{imagenBase64 ? <img src={imagenBase64} alt="Preview" className="w-full h-full object-cover" /> : <span className="text-2xl text-gray-400">🖼️</span>}</div><input type="file" accept="image/*" ref={fileInputRef} onChange={manejarArchivo} className="flex-1 text-sm text-gray-500 dark:text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 dark:file:bg-blue-900/30 file:text-blue-700 dark:file:text-blue-400 hover:file:bg-blue-100 dark:hover:file:bg-blue-900/50" /></div></div>
                                <div className="flex gap-3 pt-4">
                                    <button onClick={limpiarFormulario} className="flex-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 py-3 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors font-semibold">Cancelar</button>
                                    <button onClick={guardarCategoria} className="flex-1 bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition-colors font-semibold shadow-md">{editando ? 'Guardar' : 'Crear'}</button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}