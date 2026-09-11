import type { Usuario } from './db';
import { useTheme } from './ThemeContext';

interface SidebarProps {
    usuarioActual: Usuario;
    vistaActual: string;
    onCambiarVista: (vista: string) => void;
    onCerrarSesion: () => void;
}

export default function Sidebar({ usuarioActual, vistaActual, onCambiarVista, onCerrarSesion }: SidebarProps) {
    const { isDark, toggleTheme } = useTheme();

    const menuItems = [
        { id: 'dashboard', icon: '📊', label: 'Panel de Control', roles: ['admin'] },
        { id: 'venta', icon: '🛒', label: 'Nueva Venta', roles: ['admin', 'vendedor'] },
        { id: 'categorias', icon: '📂', label: 'Categorías', roles: ['admin'] },
        { id: 'clientes', icon: '👥', label: 'Clientes', roles: ['admin'] },
        { id: 'reportes', icon: '📄', label: 'Reportes', roles: ['admin'] },
        { id: 'cierre', icon: '💰', label: 'Cierre de Caja', roles: ['admin'] },
        { id: 'devoluciones', icon: '🔄', label: 'Devoluciones', roles: ['admin'] },
        { id: 'comisiones', icon: '💵', label: 'Comisiones', roles: ['admin'] },
        { id: 'movimientos', icon: '📦', label: 'Movimientos', roles: ['admin'] },
        { id: 'tasas', icon: '💱', label: 'Tasas de Cambio', roles: ['admin'] },
        { id: 'usuarios', icon: '👤', label: 'Usuarios', roles: ['admin'] },
        { id: 'licencias', icon: '🔑', label: 'Licencias', roles: ['admin'] },
        { id: 'configuracion', icon: '⚙️', label: 'Configuración', roles: ['admin'] },
    ];

    const itemsFiltrados = menuItems.filter(item => item.roles.includes(usuarioActual.rol));

    return (
        <div className="bg-white dark:bg-gray-800 shadow-lg h-screen w-64 fixed left-0 top-0 flex flex-col border-r border-gray-200 dark:border-gray-700">
            {/* Header */}
            <div className="bg-gradient-to-br from-blue-600 to-blue-700 text-white p-6">
                <h1 className="text-2xl font-bold mb-1">📊 CuentaClara</h1>
                <p className="text-sm opacity-90">Tu negocio bajo control</p>
            </div>

            {/* Info del Usuario */}
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center text-xl">
                        {usuarioActual.rol === 'admin' ? '👑' : '🛒'}
                    </div>
                    <div>
                        <p className="font-semibold text-gray-800 dark:text-gray-200">{usuarioActual.nombre}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                            {usuarioActual.rol === 'admin' ? 'Administrador' : 'Vendedor'}
                        </p>
                    </div>
                </div>
            </div>

            {/* Menú de Navegación */}
            <nav className="flex-1 p-4 overflow-y-auto">
                <ul className="space-y-1">
                    {itemsFiltrados.map((item) => (
                        <li key={item.id}>
                            <button
                                onClick={() => onCambiarVista(item.id)}
                                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all text-left ${vistaActual === item.id
                                    ? 'bg-blue-600 text-white shadow-md'
                                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                                    }`}
                            >
                                <span className="text-xl">{item.icon}</span>
                                <span className="font-medium">{item.label}</span>
                            </button>
                        </li>
                    ))}
                </ul>
            </nav>

            {/* Footer */}
            <div className="p-4 border-t border-gray-200 dark:border-gray-700 space-y-2">
                {/* Botón Modo Oscuro */}
                <button
                    onClick={toggleTheme}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all"
                >
                    <span className="text-xl">{isDark ? '☀️' : '🌙'}</span>
                    <span className="font-medium">{isDark ? 'Modo Claro' : 'Modo Oscuro'}</span>
                </button>

                {/* Cerrar Sesión */}
                <button
                    onClick={onCerrarSesion}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all"
                >
                    <span className="text-xl">🚪</span>
                    <span className="font-medium">Cerrar Sesión</span>
                </button>
            </div>
        </div>
    );
}