import { useState, useEffect, useRef } from 'react';
import { db } from './db';
import type { Categoria, Usuario } from './db';
import { comprimirImagen } from './utils/imageUtils';
import { registrarLog } from './utils/logger';
import {
    STYLES, BackgroundBlobs, pageWrap, card, cardPadded, titleGradient,
    btnPrimary, input, label,
    modalOverlay, modalPanel, modalHeader, modalTitle, modalClose, EmptyState,
} from './theme';

interface CategoriasProps {
    onSeleccionarCategoria: (categoriaId: number) => void;
    usuarioActual: Usuario;
}

export default function Categorias({ onSeleccionarCategoria, usuarioActual }: CategoriasProps) {
    const [categorias, setCategorias] = useState<Categoria[]>([]);
    const [modalAbierto, setModalAbierto] = useState(false);
    const [categoriaEditando, setCategoriaEditando] = useState<Categoria | null>(null);
    const [nombre, setNombre] = useState('');
    const [descripcion, setDescripcion] = useState('');
    const [imagenBase64, setImagenBase64] = useState('');
    const [eliminando, setEliminando] = useState<number | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => { cargarCategorias(); }, []);

    const cargarCategorias = async () => { setCategorias(await db.categorias.toArray()); };

    const manejarArchivo = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) setImagenBase64(await comprimirImagen(file, 400));
    };

    const abrirCrear = () => {
        setCategoriaEditando(null);
        setNombre('');
        setDescripcion('');
        setImagenBase64('');
        setModalAbierto(true);
    };

    const guardarCategoria = async () => {
        if (!nombre.trim()) { alert('Ingresa un nombre'); return; }

        const datos = {
            nombre: nombre.trim(),
            descripcion: descripcion.trim() || undefined,
            imagen: imagenBase64 || undefined,
            creadoEn: categoriaEditando ? categoriaEditando.creadoEn : new Date(),
        };

        if (categoriaEditando) {
            await db.categorias.update(categoriaEditando.id!, datos);
            await registrarLog('categoria_editada', `Categoría "${datos.nombre}" editada`, {
                usuarioId: usuarioActual.id,
                usuarioNombre: usuarioActual.nombre,
                detalles: `ID: ${categoriaEditando.id}`,
            });
        } else {
            const id = await db.categorias.add(datos);
            await registrarLog('categoria_creada', `Categoría "${datos.nombre}" creada`, {
                usuarioId: usuarioActual.id,
                usuarioNombre: usuarioActual.nombre,
                detalles: `ID: ${id}`,
            });
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

    const confirmarEliminar = async () => {
        if (!eliminando) return;
        const cat = categorias.find(c => c.id === eliminando);
        if (!cat) return;

        // Verificar si tiene productos
        const productosAsociados = await db.productos.where('categoriaId').equals(eliminando).count();
        if (productosAsociados > 0) {
            alert(`No se puede eliminar: hay ${productosAsociados} productos en esta categoría.\n\nMueve o elimina primero esos productos.`);
            setEliminando(null);
            return;
        }

        await db.categorias.delete(eliminando);
        await registrarLog('categoria_eliminada', `Categoría "${cat.nombre}" eliminada`, {
            usuarioId: usuarioActual.id,
            usuarioNombre: usuarioActual.nombre,
            detalles: `ID: ${eliminando}`,
        });

        setEliminando(null);
        cargarCategorias();
    };

    const limpiarFormulario = () => {
        setNombre(''); setDescripcion(''); setImagenBase64('');
        setCategoriaEditando(null); setModalAbierto(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const categoriaAEliminar = eliminando ? categorias.find(c => c.id === eliminando) : null;

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
                        <button onClick={abrirCrear} className={btnPrimary}>+ Nueva</button>
                    </div>
                </div>

                {categorias.length === 0 ? (
                    <div className={`${card} p-6`}><EmptyState icon="📂" texto="Aún no hay categorías. Crea la primera." /></div>
                ) : (
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:gap-4 lg:grid-cols-3 xl:grid-cols-4">
                        {categorias.map((cat) => (
                            <div key={cat.id} className={`${card} cc-fade-up flex flex-col overflow-hidden`}>
                                {/* Imagen */}
                                <div className="relative flex h-40 items-center justify-center overflow-hidden bg-gradient-to-br from-slate-800 to-slate-900">
                                    {cat.imagen
                                        ? <img src={cat.imagen} alt={cat.nombre} className="h-full w-full object-cover" />
                                        : <span className="text-6xl opacity-30">📦</span>}
                                </div>

                                {/* Info */}
                                <div className="flex flex-1 flex-col p-4">
                                    <h3 className="mb-1 truncate text-base font-bold text-gray-100">{cat.nombre}</h3>
                                    {cat.descripcion && (
                                        <p className="mb-3 line-clamp-2 text-xs text-gray-400">{cat.descripcion}</p>
                                    )}

                                    {/* Botón principal: ver productos */}
                                    <button
                                        onClick={() => onSeleccionarCategoria(cat.id!)}
                                        className="mb-3 w-full rounded-xl border border-blue-400/20 bg-blue-500/10 py-2.5 text-sm font-bold text-blue-300 transition-colors duration-150 hover:bg-blue-500/20"
                                    >
                                        Ver productos →
                                    </button>

                                    {/* Botones editar/eliminar SIEMPRE VISIBLES */}
                                    <div className="mt-auto flex gap-2">
                                        <button
                                            onClick={() => editarCategoria(cat)}
                                            className="flex-1 rounded-lg border border-amber-400/25 bg-amber-500/10 py-2 text-xs font-bold text-amber-300 transition-colors duration-150 hover:bg-amber-500/20 md:text-sm"
                                        >
                                            ✏️ Editar
                                        </button>
                                        <button
                                            onClick={() => setEliminando(cat.id!)}
                                            className="rounded-lg border border-rose-400/25 bg-rose-500/10 px-3 py-2 text-xs font-bold text-rose-300 transition-colors duration-150 hover:bg-rose-500/20 md:text-sm"
                                        >
                                            🗑️
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* ===== Modal Crear/Editar ===== */}
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
                                    <input type="text" value={nombre} onChange={(e) => setNombre(e.target.value)} className={input} autoFocus />
                                </div>
                                <div>
                                    <label className={label}>Descripción</label>
                                    <textarea value={descripcion} onChange={(e) => setDescripcion(e.target.value)} className={input} rows={2} />
                                </div>
                                <div className="flex gap-3 border-t border-white/10 pt-4">
                                    <button onClick={limpiarFormulario} className="flex-1 rounded-xl border border-white/10 bg-slate-800/60 py-3 text-base font-bold text-gray-300 transition-colors hover:bg-slate-800">
                                        Cancelar
                                    </button>
                                    <button onClick={guardarCategoria} className="flex-1 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 py-3 text-base font-bold text-white shadow-md shadow-blue-500/25 transition-transform hover:-translate-y-0.5">
                                        {categoriaEditando ? 'Guardar' : 'Crear'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* ===== Modal Confirmar Eliminar ===== */}
                {categoriaAEliminar && (
                    <div className={modalOverlay}>
                        <div className={modalPanel}>
                            <div className="flex items-center justify-between bg-gradient-to-r from-rose-500 to-red-600 px-4 py-3 md:px-6 md:py-4">
                                <h2 className={modalTitle}>🗑️ Eliminar categoría</h2>
                                <button onClick={() => setEliminando(null)} className={modalClose}>&times;</button>
                            </div>
                            <div className="space-y-4 p-4 md:p-6">
                                <p className="text-sm text-gray-300">
                                    ¿Seguro que quieres eliminar la categoría <strong className="text-gray-100">"{categoriaAEliminar.nombre}"</strong>?
                                </p>
                                <p className="rounded-xl border border-amber-400/25 bg-amber-500/10 p-3 text-xs text-amber-200">
                                    ⚠️ Esta acción no se puede deshacer. Si la categoría tiene productos, no se eliminará.
                                </p>
                                <div className="flex gap-3">
                                    <button onClick={() => setEliminando(null)} className="flex-1 rounded-xl border border-white/10 bg-slate-800/60 py-3 text-base font-bold text-gray-300 transition-colors hover:bg-slate-800">
                                        Cancelar
                                    </button>
                                    <button onClick={confirmarEliminar} className="flex-1 rounded-xl bg-gradient-to-r from-rose-500 to-red-600 py-3 text-base font-bold text-white shadow-md shadow-rose-500/25 transition-transform hover:-translate-y-0.5">
                                        Eliminar
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