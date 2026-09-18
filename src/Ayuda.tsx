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

// ⚠️ CAMBIA ESTOS VALORES SI QUIERES
const SOPORTE_WHATSAPP = '5355501545';
const SOPORTE_NOMBRE = 'Soporte CuentaClara';
const SOPORTE_MENSAJE = 'Hola! Necesito ayuda con CuentaClara 🛒';

const urlWhatsApp = (mensaje: string = SOPORTE_MENSAJE) =>
    `https://wa.me/${SOPORTE_WHATSAPP}?text=${encodeURIComponent(mensaje)}`;

const telefonoFormateado = () => `+${SOPORTE_WHATSAPP}`;

const SECCIONES: Seccion[] = [
    {
        id: 'inicio',
        icon: '🚀',
        titulo: 'Primeros pasos',
        descripcion: 'Lo que debes hacer antes de tu primera venta.',
        pasos: [
            { icon: '1️⃣', texto: 'Ve a **Puntos de Venta** y crea tus locales (ej: Tienda Centro, Carnecería, Frutería). Cada uno tiene su propio catálogo y stock.' },
            { icon: '2️⃣', texto: 'Selecciona un punto de venta en el **selector del sidebar** (arriba a la izquierda) para empezar a trabajar en él.' },
            { icon: '3️⃣', texto: 'Ve a **Categorías** y crea las categorías de ese punto de venta (ej: Bebidas, Alimentos, Aseo).' },
            { icon: '4️⃣', texto: 'Dentro de cada categoría, crea tus **productos** con nombre, precio de compra, precio de venta y stock inicial.' },
            { icon: '5️⃣', texto: 'Si tienes escáner, agrégale el **código de barras** a cada producto para vender más rápido.' },
            { icon: '6️⃣', texto: 'En **Tasas de Cambio**, configura las tasas del dólar, euro y MLC si vas a cobrar en otras monedas.' },
            { icon: '7️⃣', texto: 'Opcional: crea tus **Clientes** para llevar control de fiados.' },
            { icon: '8️⃣', texto: 'Opcional: en **Usuarios**, agrega a tus vendedores y asígnales los puntos de venta donde pueden trabajar.' },
            { icon: '✅', texto: '¡Listo! Ya puedes empezar a vender en **Nueva Venta**.' },
        ],
        vistaRelacionada: 'puntos-venta',
        botonVista: 'Ir a Puntos de Venta →',
    },
    {
        id: 'pdv',
        icon: '🏪',
        titulo: 'Puntos de venta (sucursales)',
        descripcion: 'Cómo gestionar varios locales con catálogos independientes.',
        pasos: [
            { icon: '🏪', texto: 'Un **Punto de Venta** es cada local o sucursal de tu negocio (ej: Tienda Centro, Carnecería El Rápido).' },
            { icon: '📦', texto: '**Cada PDV tiene sus propios productos, stock, precios y categorías.** No se comparten entre locales.' },
            { icon: '➕', texto: 'Ve a **Puntos de Venta** → "+ Nuevo" → ponle un icono (🏪🥩🍎), nombre y dirección.' },
            { icon: '🔄', texto: 'Usa el **selector del sidebar** (arriba a la izquierda) para cambiar entre locales. La app se recarga con los productos de ese PDV.' },
            { icon: '👑', texto: 'Si eres **jefe**, puedes elegir "🌐 Todos los PDV" para ver estadísticas globales de todo el negocio.' },
            { icon: '⏸️', texto: 'Si un local cierra temporalmente, **desactívalo** en lugar de eliminarlo. Deja de aparecer pero guarda los datos.' },
            { icon: '🗑️', texto: '**No se puede eliminar un PDV con ventas o productos.** Primero vacíalo o desactívalo.' },
        ],
        vistaRelacionada: 'puntos-venta',
        botonVista: 'Ir a Puntos de Venta →',
        roles: ['admin', 'jefe'],
    },
    {
        id: 'vender',
        icon: '🛒',
        titulo: 'Hacer una venta',
        descripcion: 'El flujo más importante de la app. Domínalo y serás imparable.',
        pasos: [
            { icon: '1️⃣', texto: 'Asegúrate de tener un **punto de venta seleccionado** en el sidebar (no "Todos").' },
            { icon: '2️⃣', texto: 'Entra a **Nueva Venta** desde el menú.' },
            { icon: '3️⃣', texto: 'Busca el producto por nombre o toca su tarjeta para agregarlo al carrito.' },
            { icon: '📷', texto: '**Más rápido:** toca "Escanear código" y apunta la cámara al código de barras del producto.' },
            { icon: '🔫', texto: '**Con escáner Bluetooth:** solo dispara al código, la app lo detecta automáticamente.' },
            { icon: '4️⃣', texto: 'Repite para cada producto. El carrito se va llenando en la derecha (o abajo en móvil).' },
            { icon: '5️⃣', texto: 'Cambia la cantidad con los botones **−** y **+** si el cliente quiere más de uno.' },
            { icon: '6️⃣', texto: 'En la sección de **Pago**, selecciona el cliente (o déjalo como "Venta rápida").' },
            { icon: '7️⃣', texto: 'Elige el método de pago: Efectivo, Transferencia o Tarjeta. Puedes combinar varios.' },
            { icon: '8️⃣', texto: 'Si es **Fiado**, marca la casilla. El saldo se sumará a la cuenta del cliente.' },
            { icon: '9️⃣', texto: 'Toca **"✓ Registrar Venta"**. La app te mostrará el vuelto si pagaron de más.' },
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
            { icon: '🎯', texto: 'Apunta al código de barras. Cuando lo detecte, el producto se agrega solo.' },
            { icon: '🔫', texto: '**Con pistola Bluetooth:** empareja el escáner como si fuera un teclado en los ajustes del teléfono.' },
            { icon: '⚡', texto: 'Con la pistola, solo dispara al código. La app lo captura sin necesidad de abrir la cámara.' },
            { icon: '❌', texto: 'Si el código no está registrado, la app avisa. Ve a **Productos** y agrégalo con su código.' },
            { icon: '⚠️', texto: '**Importante:** El escáner busca SOLO en el punto de venta activo. Si el producto no existe en ese PDV, no lo encontrará.' },
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
            { icon: '💡', texto: '**Los clientes se comparten entre todos los PDV.** Un cliente puede deberte en varias tiendas.' },
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
            { icon: '1️⃣', texto: 'Al final del día, selecciona el **punto de venta** que vas a cerrar en el sidebar.' },
            { icon: '2️⃣', texto: 'Ve a **Cierre de Caja**.' },
            { icon: '3️⃣', texto: 'La app te muestra el total vendido **solo de ese PDV** y cuánto debería haber en efectivo.' },
            { icon: '4️⃣', texto: 'Cuenta el dinero físico y escríbelo en el campo "Efectivo en caja".' },
            { icon: '5️⃣', texto: 'Si hay diferencia (sobra o falta dinero), la app te lo avisa.' },
            { icon: '6️⃣', texto: 'Agrega notas si es necesario (ej: "Faltó por vuelto").' },
            { icon: '7️⃣', texto: 'Toca **"Guardar Cierre"**. El registro queda guardado con el nombre del PDV.' },
            { icon: '💡', texto: '**Cada PDV se cierra por separado.** Si tienes 3 tiendas, haces 3 cierres.' },
        ],
        vistaRelacionada: 'cierre',
        botonVista: 'Ir a Cierre de Caja →',
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
            { icon: '🏪', texto: '**Asigna puntos de venta al vendedor.** Puedes darle 1, 2 o más según dónde trabaje.' },
            { icon: '🔄', texto: 'Si un vendedor trabaja en varios PDV, **al entrar elegirá dónde trabajar hoy**.' },
            { icon: '💰', texto: 'Si el vendedor recibe comisión, escribe el porcentaje (ej: 10%).' },
            { icon: '📜', texto: 'En **Historial Ventas**, cada venta queda registrada con el nombre del vendedor y su PDV.' },
            { icon: '🔐', texto: 'En **Seguridad** ves quién inició sesión, quién falló el PIN y más.' },
        ],
        vistaRelacionada: 'usuarios',
        botonVista: 'Ir a Usuarios →',
        roles: ['admin', 'jefe'],
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
        roles: ['admin', 'jefe'],
    },
    {
        id: 'backup',
        icon: '💾',
        titulo: 'Backup de datos',
        descripcion: 'Nunca pierdas tu información.',
        pasos: [
            { icon: '1️⃣', texto: 'Ve a **Configuración** → "Backup de Datos".' },
            { icon: '📤', texto: 'Toca **"Exportar Backup"** cada semana o cada mes.' },
            { icon: '📁', texto: 'Se descarga un archivo `.json` con TODOS tus datos (productos, ventas, clientes, PDVs, etc).' },
            { icon: '☁️', texto: 'Guarda ese archivo en Google Drive, Telegram o un pendrive.' },
            { icon: '📥', texto: 'Si cambias de teléfono, en el nuevo dispositivo toca **"Importar Backup"** y selecciona el archivo.' },
            { icon: '⚠️', texto: '**Importante:** el backup reemplaza todos los datos actuales. Úsalo solo cuando sea necesario.' },
        ],
        vistaRelacionada: 'configuracion',
        botonVista: 'Ir a Configuración →',
        roles: ['admin', 'jefe'],
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
            { icon: '⚠️', texto: '**Recomendación:** si desinstalas la app, se borran los datos. Haz backup primero.' },
        ],
    },
    {
        id: 'faq',
        icon: '❓',
        titulo: 'Preguntas frecuentes',
        descripcion: 'Las dudas más comunes.',
        pasos: [
            { icon: '❓', texto: '**¿Puedo tener varias tiendas con productos distintos?** Sí. Crea un PDV por cada local. Cada uno tiene su propio catálogo.' },
            { icon: '❓', texto: '**¿Los productos se comparten entre PDV?** No. Cada PDV tiene sus productos independientes con su propio stock y precio.' },
            { icon: '❓', texto: '**¿Un vendedor puede trabajar en varias tiendas?** Sí. Asígnale varios PDV y al entrar elegirá dónde trabajar hoy.' },
            { icon: '❓', texto: '**¿Qué pasa si olvido mi PIN?** Contacta al jefe para que te lo resetee desde Usuarios.' },
            { icon: '❓', texto: '**¿Puedo usar la app en varios teléfonos?** Cada teléfono tiene sus propios datos. Para compartir, exporta un backup e impórtalo en el otro.' },
            { icon: '❓', texto: '**¿La app gasta datos móviles?** No, todo es local. Solo gasta batería y almacenamiento.' },
            { icon: '❓', texto: '**¿Qué pasa si cambio de teléfono?** Haz backup en el viejo, e impórtalo en el nuevo.' },
            { icon: '❓', texto: '**¿Puedo cobrar en dólares?** Sí, configura la tasa del USD y al cobrar elige USD como moneda.' },
            { icon: '❓', texto: '**¿Cómo elimino un producto?** Ve a la categoría del producto → toca el botón 🗑️ en su tarjeta.' },
            { icon: '❓', texto: '**¿Puedo eliminar un PDV?** Solo si no tiene productos ni ventas. Si tiene, desactívalo en su lugar.' },
        ],
    },
];

export default function Ayuda({ usuarioActual, onIrAVista }: AyudaProps) {
    const [abierta, setAbierta] = useState<string>('inicio');
    const [copiado, setCopiado] = useState(false);

    const seccionesVisibles = SECCIONES.filter(s => {
        if (!s.roles) return true;
        return s.roles.includes(usuarioActual.rol);
    });

    const toggle = (id: string) => {
        setAbierta(prev => prev === id ? '' : id);
    };

    const copiarTelefono = async () => {
        try {
            await navigator.clipboard.writeText(telefonoFormateado());
            setCopiado(true);
            setTimeout(() => setCopiado(false), 1800);
        } catch {
            alert(`Teléfono: ${telefonoFormateado()}`);
        }
    };

    const abrirWhatsApp = () => {
        window.open(urlWhatsApp(), '_blank');
    };

    return (
        <div className={pageWrap}>
            <style>{STYLES}</style>
            <BackgroundBlobs />

            <div className="relative mx-auto max-w-3xl">
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

                {/* ===== TARJETA DE CONTACTO / SOPORTE ===== */}
                <div className="cc-fade-up mb-4 overflow-hidden rounded-2xl border border-emerald-400/25 bg-gradient-to-br from-emerald-500/15 to-teal-500/10 p-4 md:mb-6 md:p-5">
                    <div className="mb-3 flex items-center gap-3">
                        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-xl shadow-md">
                            💬
                        </span>
                        <div className="min-w-0">
                            <h2 className="text-base font-bold text-gray-100 md:text-lg">¿Necesitas ayuda?</h2>
                            <p className="text-xs text-gray-300 md:text-sm">Escríbenos por WhatsApp y te atendemos</p>
                        </div>
                    </div>

                    <button
                        onClick={abrirWhatsApp}
                        className="mb-2 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 px-4 py-3 text-sm font-black text-white shadow-md shadow-emerald-500/30 transition-transform duration-150 hover:-translate-y-0.5 active:translate-y-0 md:text-base"
                    >
                        <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current">
                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                        </svg>
                        Abrir WhatsApp
                    </button>

                    <button
                        onClick={copiarTelefono}
                        className="w-full rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-2.5 text-xs font-bold text-emerald-300 transition-colors duration-150 hover:bg-emerald-500/20 md:text-sm"
                    >
                        {copiado ? '✅ ¡Copiado!' : `📋 Copiar número: ${telefonoFormateado()}`}
                    </button>

                    <p className="mt-3 text-center text-[11px] text-emerald-300/70">
                        {SOPORTE_NOMBRE} · Respuesta en horario laboral
                    </p>
                </div>

                <div className="space-y-3">
                    {seccionesVisibles.map((s) => {
                        const estaAbierta = abierta === s.id;
                        return (
                            <div
                                key={s.id}
                                className={`${card} cc-fade-up overflow-hidden transition-all duration-200`}
                            >
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

                {/* ===== FOOTER CON CONTACTO ===== */}
                <div className={`${card} cc-fade-up mt-4 p-4 text-center md:mt-6 md:p-6`}>
                    <p className="mb-3 text-sm font-bold text-gray-200">¿Aún tienes dudas?</p>
                    <p className="mb-4 text-xs text-gray-400 md:text-sm">
                        Contáctanos por WhatsApp para soporte personalizado
                    </p>
                    <button
                        onClick={abrirWhatsApp}
                        className="mx-auto flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 px-6 py-3 text-sm font-bold text-white shadow-md shadow-emerald-500/30 transition-transform duration-150 hover:-translate-y-0.5 md:text-base"
                    >
                        💬 Escribir por WhatsApp
                    </button>
                    <p className="mt-3 text-xs text-gray-500">{telefonoFormateado()}</p>
                </div>
            </div>
        </div>
    );
}