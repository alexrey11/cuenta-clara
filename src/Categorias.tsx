// ============ src/Categorias.tsx ============
import { useState, useEffect, useRef } from 'react';
import { db } from './db';
import type { Categoria } from './db';
import { comprimirImagen } from './utils/imageUtils';
import {
    STYLES, BackgroundBlobs, pageWrap, card, cardPadded, titleGradient,
    btnPrimary, input, label,
    modalOverlay, modalPanel, modalHeader, modalTitle, modalClose, EmptyState,
} from './theme';

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

    const cargarCategorias = async () => { setCategorias(await db.categorias.toArray()); };

    const manejarArchivo = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) setImagenBase64(await comprimirImagen(file, 400));
    };

    const guardarCategoria = async () => {
        if (!nombre.trim()) { alert('Ingresa un nombre'); return; }
        const datos = {
            nombre: nombre.trim(),
            descripcion: descripcion.trim() || undefined,
            imagen: imagenBase64 || undefined,
            creadoEn: categoriaEditando ? categoriaEditando.creadoEn : new Date(),
        };
        if (categoriaEditando) await db.categorias.update(categoriaEditando.id!, datos);
        else await db.categorias.add(datos);
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
        if (confirm('¿Eliminar esta categoría?')) { await db.categorias.delete(id); cargarCategorias(); }
    };

    const limpiarFormulario = () => {
        setNombre(''); setDescripcion(''); setImagenBase64('');
        setCategoriaEditando(null); setModalAbierto(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    return (
        <div className={pageWrap}>
            <style>{STYLES}</style>
            <BackgroundBlobs />

            <div className="relative mx-auto max-w-7xl">
                <div className={`cc-fade-up mb-4 md:mb-6 ${cardPadded}`}>
                    <div className="flex items-center justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-3">
                            <div className="hidden h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-2xl shadow-md ring-2 ring-white/10 md:flex">📂</div>
                            <div className="min-w-0">
                                <h1 className={`${titleGradient} truncate text-xl md:text-3xl`}>Categorías</h1>
                                <p className="truncate text-xs text-gray-400 md:text-sm">{categorias.length} categorías · Organiza tus productos</p>
                            </div>
                        </div>
                        <button onClick={() => setModalAbierto(true)} className={btnPrimary}>+ Nueva</button>
                    </div>
                </div>

                {categorias.length === 0 ? (
                    <div className={`${card} p-6`}><EmptyState icon="📂" texto="Aún no hay categorías. Crea la primera." /></div>
                ) : (
                    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4 lg:grid-cols-4">
                        {categorias.map((cat) => (
                            <div key={cat.id} className={`${card} cc-fade-up group overflow-hidden transition-transform duration-200 hover:-translate-y-0.5`}>
                                <div className="relative flex h-32 items-center justify-center overflow-hidden bg-gradient-to-br from-slate-800 to-slate-900 md:h-40">
                                    {cat.imagen
                                        ? <img src={cat.imagen} alt={cat.nombre} className="h-full w-full object-cover" />
                                        : <span className="text-5xl opacity-30">📦</span>}
                                    <div className="absolute top-2 right-2 flex gap-1.5 opacity-0 transition-opacity duration-150 group-hover:opacity-100">
                                        <button onClick={() => editarCategoria(cat)} className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-slate-900/80 text-sm text-blue-300 backdrop-blur-sm hover:border-blue-400/60 hover:bg-blue-500/20">✏️</button>
                                        <button onClick={() => eliminarCategoria(cat.id!)} className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-slate-900/80 text-sm text-rose-300 backdrop-blur-sm hover:border-rose-400/60 hover:bg-rose-500/20">🗑️</button>
                                    </div>
                                </div>
                                <div className="p-3 md:p-4">
                                    <h3 className="mb-1 truncate text-sm font-bold text-gray-100 md:text-base">{cat.nombre}</h3>
                                    {cat.descripcion && <p className="mb-2 line-clamp-2 text-xs text-gray-400">{cat.descripcion}</p>}
                                    <button onClick={() => onSeleccionarCategoria(cat.id!)} className="w-full rounded-lg border border-blue-400/20 bg-blue-500/10 py-2 text-xs font-bold text-blue-300 transition-colors duration-150 hover:bg-blue-500/20 md:text-sm">
                                        Ver productos →
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {modalAbierto && (
                    <div className={modalOverlay}>
                        <div className={modalPanel}>
                            <div className={modalHeader}>
                                <h2 className={modalTitle}>{categoriaEditando ? 'Editar' : 'Nueva'} Categoría</h2>
                                <button onClick={limpiarFormulario} className={modalClose}>&times;</button>
                            </div>
                            <div className="space-y-4 p-4 md:p-6">
                                <div>
                                    <label className={label}>Imagen</label>
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
                                <div>
                                    <label className={label}>Nombre *</label>
                                    <input type="text" value={nombre} onChange={(e) => setNombre(e.target.value)} className={input} />
                                </div>
                                <div>
                                    <label className={label}>Descripción</label>
                                    <textarea value={descripcion} onChange={(e) => setDescripcion(e.target.value)} className={input} rows={2} />
                                </div>
                                <div className="flex gap-3 border-t border-white/10 pt-4">
                                    <button onClick={limpiarFormulario} className="flex-1 rounded-xl border border-white/10 bg-slate-800/60 py-3 text-base font-bold text-gray-300 transition-colors hover:bg-slate-800">Cancelar</button>
                                    <button onClick={guardarCategoria} className="flex-1 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 py-3 text-base font-bold text-white shadow-md shadow-blue-500/25 transition-transform hover:-translate-y-0.5">
                                        {categoriaEditando ? 'Guardar' : 'Crear'}
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