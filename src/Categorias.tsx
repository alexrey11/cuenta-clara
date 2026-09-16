import { useState, useEffect, useRef } from 'react';
import { db } from './db';
import type { Categoria } from './db';



import { comprimirImagen } from './utils/imageUtils';

interface CategoriasProps {
    onSeleccionarCategoria: (categoriaId: number) => void;
}

export default function Categorias({ onSeleccionarCategoria }: CategoriasProps) {
    const [categorias, setCategorias] = useState<Categoria[]>([]);
    const [modalAbierto, setModalAbierto] = useState(false);
    const [categoriaEditando, setCategoriaEditando] = useState<Categoria | null>(null);
    const [nombre, setNombre] = useState('');
    const [descripcion, setDescripcion] = useState('');
    const [imagenBase64, setImagenBase64] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => { cargarCategorias(); }, []);

    const cargarCategorias = async () => {
        const cats = await db.categorias.toArray();
        setCategorias(cats);
    };

    const manejarArchivo = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const comprimida = await comprimirImagen(file, 400);
            setImagenBase64(comprimida);
        }
    };

    const guardarCategoria = async () => {
        if (!nombre.trim()) { alert('Ingresa un nombre'); return; }
        const datos = {
            nombre: nombre.trim(),
            descripcion: descripcion.trim() || undefined,
            imagen: imagenBase64 || undefined,
            creadoEn: categoriaEditando ? categoriaEditando.creadoEn : new Date()
        };
        if (categoriaEditando) {
            await db.categorias.update(categoriaEditando.id!, datos);
        } else {
            await db.categorias.add(datos);
        }
        limpiarFormulario();
        cargarCategorias();
    };

    const editarCategoria = (cat: Categoria) => {
        setCategoriaEditando(cat);
        setNombre(cat.nombre);
        setDescripcion(cat.descripcion || '');
        setImagenBase64(cat.imagen || '');
        setModalAbierto(true);
    };

    const eliminarCategoria = async (id: number) => {
        if (confirm('¿Eliminar esta categoría?')) {
            await db.categorias.delete(id);
            cargarCategorias();
        }
    };

    const limpiarFormulario = () => {
        setNombre('');
        setDescripcion('');
        setImagenBase64('');
        setCategoriaEditando(null);
        setModalAbierto(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    return (
        <div className="p-3 md:p-6 bg-gray-50 dark:bg-gray-900 min-h-screen">
            <div className="max-w-7xl mx-auto">
                <div className="bg-white dark:bg-gray-800 rounded-xl md:rounded-2xl shadow-md p-4 md:p-6 mb-4 md:mb-6">
                    <div className="flex justify-between items-center">
                        <div>
                            <h1 className="text-xl md:text-3xl font-bold text-gray-800 dark:text-gray-200 mb-1">📂 Categorías</h1>
                            <p className="text-xs md:text-base text-gray-600 dark:text-gray-400">Organiza tus productos</p>
                        </div>
                        <button onClick={() => setModalAbierto(true)} className="bg-blue-600 hover:bg-blue-700 text-white px-3 md:px-6 py-2 md:py-3 rounded-lg md:rounded-xl font-semibold text-sm md:text-base shadow-md">
                            + Nueva
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-6">
                    {categorias.map((cat) => (
                        <div key={cat.id} className="bg-white dark:bg-gray-800 rounded-xl md:rounded-2xl shadow-md overflow-hidden hover:shadow-xl transition-shadow group border border-gray-100 dark:border-gray-700">
                            <div className="h-32 md:h-48 bg-gradient-to-br from-blue-500 to-blue-600 relative overflow-hidden flex items-center justify-center">
                                {cat.imagen ? <img src={cat.imagen} alt={cat.nombre} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" /> : <span className="text-5xl md:text-6xl text-white opacity-50">📦</span>}
                                <div className="absolute top-2 right-2 flex gap-1 md:gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => editarCategoria(cat)} className="bg-white bg-opacity-90 p-1.5 md:p-2 rounded-lg shadow-md hover:bg-blue-50 text-blue-600 text-sm md:text-base">✏️</button>
                                    <button onClick={() => eliminarCategoria(cat.id!)} className="bg-white bg-opacity-90 p-1.5 md:p-2 rounded-lg shadow-md hover:bg-red-50 text-red-600 text-sm md:text-base">🗑️</button>
                                </div>
                            </div>
                            <div className="p-3 md:p-4">
                                <h3 className="font-bold text-gray-800 dark:text-gray-200 text-sm md:text-lg mb-1 truncate">{cat.nombre}</h3>
                                {cat.descripcion && <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400 line-clamp-2">{cat.descripcion}</p>}
                                <button onClick={() => onSeleccionarCategoria(cat.id!)} className="w-full mt-2 md:mt-3 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 py-2 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-900/50 font-semibold text-xs md:text-sm transition-colors">
                                    Ver productos →
                                </button>
                            </div>
                        </div>
                    ))}
                </div>

                {modalAbierto && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end md:items-center justify-center p-0 md:p-4 z-50">
                        <div className="bg-white dark:bg-gray-800 rounded-t-2xl md:rounded-2xl shadow-2xl w-full md:max-w-md max-h-[90vh] overflow-y-auto">
                            <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-4 md:px-6 py-3 md:py-4 flex justify-between items-center sticky top-0 z-10">
                                <h2 className="text-lg md:text-xl font-bold text-white">{categoriaEditando ? 'Editar' : 'Nueva'} Categoría</h2>
                                <button onClick={limpiarFormulario} className="text-white hover:text-gray-200 text-2xl">&times;</button>
                            </div>
                            <div className="p-4 md:p-6 space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Imagen</label>
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
                                                className="w-full text-sm text-gray-500 dark:text-gray-400 file:mr-4 file:py-3 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 dark:file:bg-blue-900/30 file:text-blue-700 dark:file:text-blue-400 hover:file:bg-blue-100 dark:hover:file:bg-blue-900/50"
                                            />
                                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">Toca para seleccionar imagen</p>
                                        </div>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nombre *</label>
                                    <input type="text" value={nombre} onChange={(e) => setNombre(e.target.value)} className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg px-4 py-3 text-base" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Descripción</label>
                                    <textarea value={descripcion} onChange={(e) => setDescripcion(e.target.value)} className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg px-4 py-3 text-base" rows={2} />
                                </div>
                                <div className="flex gap-3 pt-4 border-t border-gray-100 dark:border-gray-700">
                                    <button onClick={limpiarFormulario} className="flex-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 py-3 rounded-lg font-semibold text-base">Cancelar</button>
                                    <button onClick={guardarCategoria} className="flex-1 bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 font-semibold text-base">{categoriaEditando ? 'Guardar' : 'Crear'}</button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}