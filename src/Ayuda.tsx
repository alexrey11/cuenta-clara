import { useState } from 'react';
import type { Usuario } from './db';
import {
    STYLES, BackgroundBlobs, pageWrap, card, cardPadded, titleGradient,

} from './theme';

interface AyudaProps {
    usuarioActual: Usuario;
    onIrAVista: (vista: string) => void;
}

interface Seccion {
    id: string;
    icon: string;
    titulo: string;
    descripcion: string;
    pasos: { icon: string; texto: string }[];
    vistaRelacionada?: string;
    botonVista?: string;
    roles?: string[];
}

const SECCIONES: Seccion[] = [
    {
        id: 'inicio',
        icon: '🚀',
        titulo: 'Primeros pasos',
        descripcion: 'Lo que debes hacer antes de tu primera venta.',
        pasos: [
            { icon: '1️⃣', texto: 'Ve a **Categorías** y crea tus primeras categorías (ej: Bebidas, Alimentos, Aseo).' },
            { icon: '2️⃣', texto: 'Dentro de cada categoría, crea tus **productos** con nombre, precio de compra, precio de venta y stock inicial.' },
            { icon: '3️⃣', texto: 'Si tienes escáner, agrégale el **código de barras** a cada producto para vender más rápido.' },
            { icon: '4️⃣', texto: 'En **Tasas de Cambio**, configura las tasas del dólar, euro y MLC si vas a cobrar en otras monedas.' },
            { icon: '5️⃣', texto: 'Opcional: crea tus **Clientes** para llevar control de fiados.' },
            { icon: '6️⃣', texto: 'Opcional: en **Usuarios**, agrega a tus vendedores para que cada uno tenga su propio PIN.' },
            { icon: '✅', texto: '¡Listo! Ya puedes empezar a vender en **Nueva Venta**.' },
        ],
        vistaRelacionada: 'categorias',
        botonVista: 'Ir a Categorías →',
    },
    {
        id: 'vender',
        icon: '🛒',
        titulo: 'Hacer una venta',
        descripcion: 'El flujo más importante de la app. Domínalo y serás imparable.',
        pasos: [
            { icon: '1️⃣', texto: 'Entra a **Nueva Venta** desde el menú.' },
            { icon: '2️⃣', texto: 'Busca el producto por nombre o toca su tarjeta para agregarlo al carrito.' },
            { icon: '📷', texto: '**Más rápido:** toca "Escanear código" y apunta la cámara al código de barras del producto.' },
            { icon: '🔫', texto: '**Con escáner Bluetooth:** solo dispara al código, la app lo detecta automáticamente.' },
            { icon: '3️⃣', texto: 'Repite para cada producto. El carrito se va llenando en la derecha (o abajo en móvil).' },
            { icon: '4️⃣', texto: 'Cambia la cantidad con los botones **−** y **+** si el cliente quiere más de uno.' },
            { icon: '5️⃣', texto: 'En la sección de **Pago**, selecciona el cliente (o déjalo como "Venta rápida").' },
            { icon: '6️⃣', texto: 'Elige el método de pago: Efectivo, Transferencia o Tarjeta. Puedes combinar varios.' },
            { icon: '7️⃣', texto: 'Si es **Fiado**, marca la casilla. El saldo se sumará a la cuenta del cliente.' },
            { icon: '8️⃣', texto: 'Toca **"✓ Registrar Venta"**. La app te mostrará el vuelto si pagaron de más.' },
        ],
        vistaRelacionada: 'venta',
        botonVista: 'Ir a Nueva Venta →',
    },
    {
        id: 'escaner',
        icon: '📷',
        titulo: 'Usar el escáner',
        descripcion: 'Vende 5 veces más rápido escaneando códigos.',
        pasos: [
            { icon: '📷', texto: '**Con cámara:** toca "Escanear código" en Nueva Venta. Aparecerá la cámara trasera.' },
            { icon: '🎯', texto: 'Apunta al código de barras. Cuando lo detecte, el producto se agrega solo y vibra.' },
            { icon: '🔫', texto: '**Con pistola Bluetooth:** empareja el escáner como si fuera un teclado en los ajustes del teléfono.' },
            { icon: '⚡', texto: 'Con la pistola, solo dispara al código. La app lo captura sin necesidad de abrir la cámara.' },
            { icon: '❌', texto: 'Si el código no está registrado, la app avisa. Ve a **Productos** y agrégalo con su código.' },
            { icon: '💡', texto: '**Tip:** imprime las etiquetas de códigos de barras con una impresora térmica para tus productos.' },
        ],
    },
    {
        id: 'clientes',
        icon: '👥',
        titulo: 'Clientes y fiados',
        descripcion: 'Lleva el control de quién te debe y cuánto.',
        pasos: [
            { icon: '1️⃣', texto: 'Ve a **Clientes** y toca "+ Nuevo" para agregar un cliente.' },
            { icon: '2️⃣', texto: 'Llena nombre, teléfono y dirección (opcional).' },
            { icon: '3️⃣', texto: 'Cuando hagas una venta fiada, selecciona el cliente y marca **"Fiado"**.' },
            { icon: '4️⃣', texto: 'En la lista de Clientes verás quién debe y cuánto (en rojo).' },
            { icon: '5️⃣', texto: 'Cuando el cliente pague, edita su ficha y ajusta el saldo.' },
            { icon: '📄', texto: 'En **Reportes**, genera un PDF con todos los fiados pendientes para cobrar.' },
        ],
        vistaRelacionada: 'clientes',
        botonVista: 'Ir a Clientes →',
    },
    {
        id: 'cierre',
        icon: '💰',
        titulo: 'Cierre de caja',
        descripcion: 'Cierra el día como un profesional.',
        pasos: [
            { icon: '1️⃣', texto: 'Al final del día, ve a **Cierre de Caja**.' },
            { icon: '2️⃣', texto: 'La app te muestra el total vendido y cuánto debería haber en efectivo.' },
            { icon: '3️⃣', texto: 'Cuenta el dinero físico y escriblo en el campo "Efectivo en caja".' },
            { icon: '4️⃣', texto: 'Si hay diferencia (sobra o falta dinero), la app te lo avisa.' },
            { icon: '5️⃣', texto: 'Agrega notas si es necesario (ej: "Faltó por vuelto").' },
            { icon: '6️⃣', texto: 'Toca **"Guardar Cierre"**. El registro queda guardado para consultas futuras.' },
            { icon: '📊', texto: 'En **Reportes** puedes exportar el historial de cierres a CSV.' },
        ],
        vistaRelacionada: 'cierre',
        botonVista: 'Ir a Cierre de Caja →',
    },
    {
        id: 'reportes',
        icon: '📄',
        titulo: 'Reportes y PDFs',
        descripcion: 'Analiza tu negocio y exporta la información.',
        pasos: [
            { icon: '1️⃣', texto: 'En **Reportes** verás el valor total de tu inventario y cuánto te deben los clientes.' },
            { icon: '📦', texto: '**PDF de Inventario:** descarga un reporte completo con todos tus productos, precios y stock.' },
            { icon: '💳', texto: '**PDF de Fiados:** lista de todos los clientes que te deben dinero con sus teléfonos.' },
            { icon: '📊', texto: '**Exportar CSV:** abre la información en Excel para análisis avanzados.' },
            { icon: '💡', texto: '**Tip:** guarda los PDFs mensualmente para llevar tu contabilidad.' },
        ],
        vistaRelacionada: 'reportes',
        botonVista: 'Ir a Reportes →',
    },
    {
        id: 'usuarios',
        icon: '👤',
        titulo: 'Usuarios y vendedores',
        descripcion: 'Cada persona de tu negocio con su propio PIN.',
        pasos: [
            { icon: '1️⃣', texto: 'Ve a **Usuarios** y toca "+ Crear Nuevo Usuario".' },
            { icon: '2️⃣', texto: 'Asigna un nombre (ej: "Caja 1 - María") y un PIN de 4 dígitos.' },
            { icon: '🛒', texto: '**Vendedor:** solo puede vender. Ideal para empleados.' },
            { icon: '🎩', texto: '**Jefe:** acceso completo excepto Licencias. Para ti o tus socios.' },
            { icon: '💰', texto: 'Si el vendedor recibe comisión, escribe el porcentaje (ej: 10%).' },
            { icon: '📜', texto: 'En **Historial Ventas**, cada venta queda registrada con el nombre del vendedor.' },
            { icon: '🔐', texto: 'En **Seguridad** ves quién inició sesión, quién falló el PIN y más.' },
        ],
        vistaRelacionada: 'usuarios',
        botonVista: 'Ir a Usuarios →',
    },
    {
        id: 'backup',
        icon: '💾',
        titulo: 'Backup de datos',
        descripcion: 'Nunca pierdas tu información.',
        pasos: [
            { icon: '1️⃣', texto: 'Ve a **Configuración** → "Backup de Datos".' },
            { icon: '📤', texto: 'Toca **"Exportar Backup"** cada semana o cada mes.' },
            { icon: '📁', texto: 'Se descarga un archivo `.json` con TODOS tus datos.' },
            { icon: '☁️', texto: 'Guarda ese archivo en Google Drive, Telegram o un pendrive.' },
            { icon: '📥', texto: 'Si cambias de teléfono, en el nuevo dispositivo toca **"Importar Backup"** y selecciona el archivo.' },
            { icon: '⚠️', texto: '**Importante:** el backup reemplaza todos los datos actuales. Úsalo solo cuando sea necesario.' },
        ],
        vistaRelacionada: 'configuracion',
        botonVista: 'Ir a Configuración →',
    },
    {
        id: 'offline',
        icon: '📴',
        titulo: 'Funcionamiento offline',
        descripcion: 'CuentaClara funciona sin internet, siempre.',
        pasos: [
            { icon: '✅', texto: 'Todos tus datos se guardan **localmente en tu dispositivo**.' },
            { icon: '📴', texto: 'Puedes usar la app en **modo avión** sin problema.' },
            { icon: '🔋', texto: 'La app funciona sin WiFi y sin datos móviles.' },
            { icon: '💾', texto: 'Los datos se guardan automáticamente cada vez que haces una acción.' },
            { icon: '🔐', texto: 'Nadie más puede acceder a tu información (no hay servidor externo).' },
            { icon: '⚠️', texto: '**Recomendación:** si desinstala la app, se borran los datos. Haz backup primero.' },
        ],
    },
    {
        id: 'faq',
        icon: '❓',
        titulo: 'Preguntas frecuentes',
        descripcion: 'Las dudas más comunes.',
        pasos: [
            { icon: '❓', texto: '**¿Qué pasa si olvido mi PIN?** Contacta al administrador del negocio (jefe) para que te lo resetee desde Usuarios.' },
            { icon: '❓', texto: '**¿Puedo usar la app en varios teléfonos?** Cada teléfono tiene sus propios datos. Para compartir, exporta un backup e impórtalo en el otro.' },
            { icon: '❓', texto: '**¿La app gasta datos móviles?** No, todo es local. Solo gasta batería y almacenamiento.' },
            { icon: '❓', texto: '**¿Qué pasa si cambio de teléfono?** Haz backup en el viejo, e impórtalo en el nuevo.' },
            { icon: '❓', texto: '**¿Puedo cobrar en dólares?** Sí, configura la tasa del USD y al cobrar elige USD como moneda.' },
            { icon: '❓', texto: '**¿Cómo elimino un producto?** Ve a la categoría del producto → toca el botón 🗑️ en su tarjeta.' },
        ],
    },
];

export default function Ayuda({ usuarioActual, onIrAVista }: AyudaProps) {
    const [abierta, setAbierta] = useState<string>('inicio');

    // Filtrar secciones según el rol
    const seccionesVisibles = SECCIONES.filter(s => {
        if (!s.roles) return true;
        return s.roles.includes(usuarioActual.rol);
    });

    const toggle = (id: string) => {
        setAbierta(prev => prev === id ? '' : id);
    };

    return (
        <div className={pageWrap}>
            <style>{STYLES}</style>
            <BackgroundBlobs />

            <div className="relative mx-auto max-w-3xl">
                {/* Header */}
                <div className={`cc-fade-up mb-4 md:mb-6 ${cardPadded}`}>
                    <div className="flex items-center gap-3">
                        <div className="hidden h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 text-2xl shadow-md ring-2 ring-white/10 md:flex">
                            📚
                        </div>
                        <div className="min-w-0">
                            <h1 className={`${titleGradient} truncate text-xl md:text-3xl`}>Guía de uso</h1>
                            <p className="truncate text-xs text-gray-400 md:text-sm">
                                Aprende a dominar CuentaClara paso a paso
                            </p>
                        </div>
                    </div>

                    <div className="mt-4 rounded-xl border border-blue-400/20 bg-blue-500/10 p-3 text-xs text-blue-200 md:text-sm">
                        💡 Toca cualquier sección para expandirla. Si ya sabes usar la app, consulta solo lo que necesites.
                    </div>
                </div>

                {/* Secciones colapsables */}
                <div className="space-y-3">
                    {seccionesVisibles.map((s) => {
                        const estaAbierta = abierta === s.id;
                        return (
                            <div
                                key={s.id}
                                className={`${card} cc-fade-up overflow-hidden transition-all duration-200`}
                            >
                                {/* Header clickeable */}
                                <button
                                    onClick={() => toggle(s.id)}
                                    className="flex w-full items-center gap-3 p-4 text-left transition-colors hover:bg-white/5 md:p-5"
                                >
                                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-slate-700 to-slate-900 text-xl shadow-md ring-1 ring-white/10">
                                        {s.icon}
                                    </span>
                                    <div className="min-w-0 flex-1">
                                        <h2 className="text-base font-bold text-gray-100 md:text-lg">{s.titulo}</h2>
                                        <p className="truncate text-xs text-gray-400 md:text-sm">{s.descripcion}</p>
                                    </div>
                                    <span className={`shrink-0 text-2xl text-gray-500 transition-transform duration-200 ${estaAbierta ? 'rotate-180' : ''}`}>
                                        ⌄
                                    </span>
                                </button>

                                {/* Contenido expandido */}
                                {estaAbierta && (
                                    <div className="border-t border-white/10 p-4 md:p-5">
                                        <ol className="space-y-3">
                                            {s.pasos.map((p, i) => (
                                                <li key={i} className="flex items-start gap-3">
                                                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-800 text-sm ring-1 ring-white/10">
                                                        {p.icon}
                                                    </span>
                                                    <span
                                                        className="min-w-0 flex-1 pt-0.5 text-sm text-gray-300"
                                                        dangerouslySetInnerHTML={{
                                                            __html: p.texto
                                                                .replace(/\*\*(.+?)\*\*/g, '<strong class="text-gray-100 font-bold">$1</strong>')
                                                        }}
                                                    />
                                                </li>
                                            ))}
                                        </ol>

                                        {s.vistaRelacionada && (
                                            <button
                                                onClick={() => onIrAVista(s.vistaRelacionada!)}
                                                className="mt-4 w-full rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 py-3 text-sm font-bold text-white shadow-md shadow-blue-500/25 transition-transform hover:-translate-y-0.5 md:text-base"
                                            >
                                                {s.botonVista || 'Ir a la sección →'}
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>

                {/* Footer con soporte */}
                <div className={`${card} cc-fade-up mt-4 p-4 text-center md:mt-6 md:p-6`}>
                    <p className="mb-2 text-sm font-bold text-gray-200">¿Aún tienes dudas?</p>
                    <p className="text-xs text-gray-400 md:text-sm">
                        Contacta al desarrollador para soporte técnico personalizado.
                    </p>
                </div>
            </div>
        </div>
    );
}