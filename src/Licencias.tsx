import { useState, useEffect } from 'react';
import { db } from './db';
import type { Usuario } from './db';

interface Licencia {
    id?: number;
    codigo: string;
    cliente: string;
    fechaCreacion: Date;
    fechaActivacion: Date | null;
    estado: 'disponible' | 'activada' | 'vendida';
    plan: 'mensual' | 'anual';
}

interface LicenciasProps {
    usuarioActual: Usuario;
}

export default function Licencias({ usuarioActual: _ }: LicenciasProps) {
    const [licencias, setLicencias] = useState<Licencia[]>([]);
    const [clienteNombre, setClienteNombre] = useState('');
    const [plan, setPlan] = useState<'mensual' | 'anual'>('anual');

    useEffect(() => { cargarLicencias(); }, []);

    const cargarLicencias = async () => {
        const todas = await db.licencias.toArray();
        todas.sort((a, b) => new Date(b.fechaCreacion).getTime() - new Date(a.fechaCreacion).getTime());
        setLicencias(todas);
    };

    const generarCodigo = (): string => {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        let codigo = 'CC-';
        for (let i = 0; i < 4; i++) {
            for (let j = 0; j < 4; j++) {
                codigo += chars.charAt(Math.floor(Math.random() * chars.length));
            }
            if (i < 3) codigo += '-';
        }
        return codigo;
    };

    const crearLicencia = async () => {
        if (!clienteNombre.trim()) {
            alert('Escribe el nombre del cliente o negocio');
            return;
        }

        const codigo = generarCodigo();

        await db.licencias.add({
            codigo,
            cliente: clienteNombre.trim(),
            fechaCreacion: new Date(),
            fechaActivacion: null,
            estado: 'vendida',
            plan
        });

        setClienteNombre('');
        cargarLicencias();
        alert(`✅ Licencia generada!\n\nCódigo: ${codigo}\nCliente: ${clienteNombre}\n\nEnvíale este código por WhatsApp`);
    };

    const copiarCodigo = (codigo: string) => {
        navigator.clipboard.writeText(codigo).then(() => {
            alert('Código copiado al portapapeles');
        }).catch(() => {
            alert(`Código: ${codigo}`);
        });
    };

    const eliminarLicencia = async (id: number) => {
        if (confirm('¿Eliminar esta licencia?')) {
            await db.licencias.delete(id);
            cargarLicencias();
        }
    };

    const disponibles = licencias.filter(l => l.estado === 'disponible');
    const vendidas = licencias.filter(l => l.estado === 'vendida');
    const activadas = licencias.filter(l => l.estado === 'activada');

    return (
        <div className="p-3 md:p-6 bg-gray-50 dark:bg-gray-900 min-h-screen">
            <div className="max-w-5xl mx-auto">
                <div className="bg-white dark:bg-gray-800 rounded-xl md:rounded-2xl shadow-md p-4 md:p-6 mb-4 md:mb-6">
                    <h1 className="text-xl md:text-3xl font-bold text-gray-800 dark:text-gray-200 mb-1">
                        🔑 Gestión de Licencias
                    </h1>
                    <p className="text-xs md:text-base text-gray-600 dark:text-gray-400">Genera y administra códigos de activación</p>
                </div>

                {/* KPIs */}
                <div className="grid grid-cols-3 gap-2 md:gap-6 mb-4 md:mb-6">
                    <div className="bg-gradient-to-br from-yellow-500 to-yellow-600 text-white p-3 md:p-6 rounded-xl md:rounded-2xl shadow-md">
                        <p className="text-xs md:text-sm opacity-90 mb-1">Disponibles</p>
                        <p className="text-xl md:text-4xl font-bold">{disponibles.length}</p>
                    </div>
                    <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white p-3 md:p-6 rounded-xl md:rounded-2xl shadow-md">
                        <p className="text-xs md:text-sm opacity-90 mb-1">Vendidas</p>
                        <p className="text-xl md:text-4xl font-bold">{vendidas.length}</p>
                    </div>
                    <div className="bg-gradient-to-br from-green-500 to-green-600 text-white p-3 md:p-6 rounded-xl md:rounded-2xl shadow-md">
                        <p className="text-xs md:text-sm opacity-90 mb-1">Activadas</p>
                        <p className="text-xl md:text-4xl font-bold">{activadas.length}</p>
                    </div>
                </div>

                {/* Generar Nueva Licencia */}
                <div className="bg-white dark:bg-gray-800 rounded-xl md:rounded-2xl shadow-md p-4 md:p-6 mb-4 md:mb-6">
                    <h2 className="text-base md:text-xl font-semibold mb-3 md:mb-4 text-gray-800 dark:text-gray-200">Generar Nueva Licencia</h2>
                    <div className="space-y-3 md:space-y-0 md:grid md:grid-cols-3 md:gap-4">
                        <input
                            type="text"
                            placeholder="Nombre del cliente"
                            value={clienteNombre}
                            onChange={(e) => setClienteNombre(e.target.value)}
                            className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <select
                            value={plan}
                            onChange={(e) => setPlan(e.target.value as 'mensual' | 'anual')}
                            className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="mensual">Mensual - 500 CUP</option>
                            <option value="anual">Anual - 5,000 CUP</option>
                        </select>
                        <button
                            onClick={crearLicencia}
                            className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-semibold text-base"
                        >
                            🔑 Generar Código
                        </button>
                    </div>
                </div>

                {/* Lista de Licencias */}
                <div className="bg-white dark:bg-gray-800 rounded-xl md:rounded-2xl shadow-md p-4 md:p-6">
                    <h2 className="text-base md:text-xl font-semibold mb-3 md:mb-4 text-gray-800 dark:text-gray-200">
                        Todas las Licencias ({licencias.length})
                    </h2>
                    {licencias.length === 0 ? (
                        <p className="text-gray-500 dark:text-gray-400 text-center py-8 text-sm md:text-base">
                            No hay licencias generadas todavía
                        </p>
                    ) : (
                        <div className="space-y-2 md:space-y-3">
                            {licencias.map((licencia) => (
                                <div
                                    key={licencia.id}
                                    className="bg-gray-50 dark:bg-gray-700 p-3 md:p-4 rounded-lg md:rounded-xl border border-gray-200 dark:border-gray-600"
                                >
                                    <div className="flex items-start gap-3">
                                        <div className={`w-3 h-3 rounded-full mt-1 flex-shrink-0 ${licencia.estado === 'activada' ? 'bg-green-500' :
                                                licencia.estado === 'vendida' ? 'bg-blue-500' : 'bg-yellow-500'
                                            }`}></div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-mono font-bold text-sm md:text-lg text-gray-800 dark:text-gray-200 break-all">
                                                {licencia.codigo}
                                            </p>
                                            <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400 mt-1">
                                                Cliente: <strong>{licencia.cliente}</strong>
                                            </p>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                                Plan: {licencia.plan === 'anual' ? 'Anual (5,000 CUP)' : 'Mensual (500 CUP)'}
                                            </p>
                                            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                                                {new Date(licencia.fechaCreacion).toLocaleDateString('es-ES')}
                                                {licencia.fechaActivacion && ` → ${new Date(licencia.fechaActivacion).toLocaleDateString('es-ES')}`}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex flex-wrap gap-2 mt-3 ml-6">
                                        <span className={`px-2 md:px-3 py-1 rounded-full text-xs font-semibold ${licencia.estado === 'activada' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' :
                                                licencia.estado === 'vendida' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400'
                                            }`}>
                                            {licencia.estado === 'activada' ? '✅ Activada' :
                                                licencia.estado === 'vendida' ? '💳 Vendida' : '⏳ Disponible'}
                                        </span>
                                        <button
                                            onClick={() => copiarCodigo(licencia.codigo)}
                                            className="bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 px-3 py-1 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors text-xs md:text-sm font-semibold"
                                        >
                                            📋 Copiar
                                        </button>
                                        <button
                                            onClick={() => eliminarLicencia(licencia.id!)}
                                            className="bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 px-3 py-1 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors text-xs md:text-sm"
                                        >
                                            🗑️
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}