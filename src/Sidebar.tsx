import type { Usuario } from './db';
import { useTheme } from './ThemeContext';


interface SidebarProps {
    usuarioActual: Usuario;
    vistaActual: string;
    onCambiarVista: (vista: string) => void;
    onCerrarSesion: () => void;
    abierto: boolean;
    onToggle: () => void;
}

export default function Sidebar({ usuarioActual, vistaActual, onCambiarVista, onCerrarSesion, abierto, onToggle }: SidebarProps) {
    const { isDark, toggleTheme } = useTheme();

    const menuItems = [
        { id: 'venta', icon: '🛒', label: 'Nueva Venta', roles: ['admin', 'jefe', 'vendedor'] },
        { id: 'categorias', icon: '📂', label: 'Categorías', roles: ['admin', 'jefe'] },
        { id: 'clientes', icon: '👥', label: 'Clientes', roles: ['admin', 'jefe'] },
        { id: 'dashboard', icon: '📊', label: 'Panel de Control', roles: ['admin', 'jefe'] },
        { id: 'historial', icon: '📜', label: 'Historial Ventas', roles: ['admin', 'jefe'] },
        { id: 'cierre', icon: '💰', label: 'Cierre de Caja', roles: ['admin', 'jefe'] },
        { id: 'reportes', icon: '📄', label: 'Reportes', roles: ['admin', 'jefe'] },
        { id: 'devoluciones', icon: '🔄', label: 'Devoluciones', roles: ['admin', 'jefe'] },
        { id: 'comisiones', icon: '💵', label: 'Comisiones', roles: ['admin', 'jefe'] },
        { id: 'movimientos', icon: '📦', label: 'Movimientos', roles: ['admin', 'jefe'] },
        { id: 'tasas', icon: '💱', label: 'Tasas de Cambio', roles: ['admin'] },
        { id: 'usuarios', icon: '👤', label: 'Usuarios', roles: ['admin'] },
        { id: 'licencias', icon: '🔑', label: 'Licencias', roles: ['admin'] },
        { id: 'configuracion', icon: '⚙️', label: 'Configuración', roles: ['admin'] },
    ];

    const itemsFiltrados = menuItems.filter(item => item.roles.includes(usuarioActual.rol));

    const getRolIcon = () => {
        switch (usuarioActual.rol) {
            case 'admin': return '👑';
            case 'jefe': return '🎩';
            case 'vendedor': return '🛒';
            default: return '👤';
        }
    };

    const getRolNombre = () => {
        switch (usuarioActual.rol) {
            case 'admin': return 'Administrador';
            case 'jefe': return 'Jefe';
            case 'vendedor': return 'Vendedor';
            default: return 'Usuario';
        }
    };

    const handleItemClick = (vista: string) => {
        onCambiarVista(vista);
        // Cerrar sidebar en móvil al seleccionar
        if (window.innerWidth < 768) {
            onToggle();
        }
    };

    return (
        <>
            {/* Overlay oscuro en móvil */}
            {abierto && (
                <div
                    className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
                    onClick={onToggle}
                />
            )}

            {/* Sidebar */}
            <div className={`
        fixed top-0 left-0 h-screen w-64 z-50
        bg-white dark:bg-gray-800 shadow-lg
        border-r border-gray-200 dark:border-gray-700
        flex flex-col
        transform transition-transform duration-300 ease-in-out
        ${abierto ? 'translate-x-0' : '-translate-x-full'}
        md:translate-x-0
      `}>
                {/* Header */}
                <div className="bg-gradient-to-br from-blue-600 to-blue-700 text-white p-4 md:p-6 flex justify-between items-start">
                    <div className="flex-1">
                        <h1 className="text-xl md:text-2xl font-bold mb-1">📊 CuentaClara</h1>
                        <p className="text-xs md:text-sm opacity-90">Tu negocio bajo control</p>
                    </div>
                    {/* Botón cerrar en móvil */}
                    <button
                        onClick={onToggle}
                        className="md:hidden text-white text-2xl hover:bg-white/20 rounded-lg p-1"
                    >
                        ✕
                    </button>
                </div>

                {/* Info del Usuario */}
                <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center text-xl flex-shrink-0">
                            {getRolIcon()}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="font-semibold text-gray-800 dark:text-gray-200 truncate">{usuarioActual.nombre}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">{getRolNombre()}</p>
                        </div>
                    </div>
                </div>

                {/* Menú de Navegación */}
                <nav className="flex-1 p-3 md:p-4 overflow-y-auto">
                    <ul className="space-y-1">
                        {itemsFiltrados.map((item) => (
                            <li key={item.id}>
                                <button
                                    onClick={() => handleItemClick(item.id)}
                                    className={`w-full flex items-center gap-3 px-3 md:px-4 py-2.5 md:py-3 rounded-lg transition-all text-left ${vistaActual === item.id
                                            ? 'bg-blue-600 text-white shadow-md'
                                            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                                        }`}
                                >
                                    <span className="text-lg md:text-xl">{item.icon}</span>
                                    <span className="font-medium text-sm md:text-base">{item.label}</span>
                                </button>
                            </li>
                        ))}
                    </ul>
                </nav>

                {/* Footer */}
                <div className="p-3 md:p-4 border-t border-gray-200 dark:border-gray-700 space-y-1 md:space-y-2">
                    <button
                        onClick={toggleTheme}
                        className="w-full flex items-center gap-3 px-3 md:px-4 py-2.5 md:py-3 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all"
                    >
                        <span className="text-lg md:text-xl">{isDark ? '☀️' : '🌙'}</span>
                        <span className="font-medium text-sm md:text-base">{isDark ? 'Modo Claro' : 'Modo Oscuro'}</span>
                    </button>

                    <button
                        onClick={onCerrarSesion}
                        className="w-full flex items-center gap-3 px-3 md:px-4 py-2.5 md:py-3 rounded-lg text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all"
                    >
                        <span className="text-lg md:text-xl">🚪</span>
                        <span className="font-medium text-sm md:text-base">Cerrar Sesión</span>
                    </button>
                </div>
            </div>
        </>
    );
}