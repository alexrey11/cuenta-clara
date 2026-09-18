import { useState, useEffect } from 'react';

import type { Usuario } from './db';
import { ThemeProvider } from './ThemeContext';
import Login from './Login';
import WelcomeScreen from './WelcomeScreen';
import Sidebar from './Sidebar';
import NuevaVenta from './NuevaVenta';
import Dashboard from './Dashboard';
import CierreCaja from './CierreCaja';
import GestionUsuarios from './GestionUsuarios';
import Licencias from './Licencias';
import ActivarLicencia from './ActivarLicencia';
import Categorias from './Categorias';
import ProductosCategoria from './ProductosCategoria';
import Clientes from './Clientes';
import TasasCambio from './TasasCambio';
import Reportes from './Reportes';
import Devoluciones from './Devoluciones';
import Comisiones from './Comisiones';
import MovimientosInventario from './MovimientosInventario';
import Configuracion from './Configuracion';
import HistorialVentas from './HistorialVentas';
import LogsSeguridad from './LogsSeguridad';
import {
  esPrimeraInstalacion,
  obtenerFechaInstalacion,
  obtenerInfoLicencia,
} from './utils/trialUtils';

type EstadoApp = 'cargando' | 'bienvenida' | 'activar' | 'login' | 'bloqueado' | 'app';

function App() {
  const [estado, setEstado] = useState<EstadoApp>('cargando');
  const [usuarioActual, setUsuarioActual] = useState<Usuario | null>(null);
  const [vistaActual, setVistaActual] = useState<string>('venta');
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState<number | null>(null);
  const [sidebarAbierto, setSidebarAbierto] = useState(false);

  // Info de licencia para el Sidebar
  const [esMaster, setEsMaster] = useState(false);
  const [licenciaActiva, setLicenciaActiva] = useState(false);
  const [diasRestantes, setDiasRestantes] = useState(15);

  // ===== Arranque =====
  useEffect(() => {
    (async () => {
      // ⚠️ IMPORTANTE: primero verificamos primera instalación.
      // Esta llamada NO crea el trial (solo lee).
      const esPrimera = await esPrimeraInstalacion();
      if (esPrimera) {
        setEstado('bienvenida');
        return;
      }

      // Ya hay trial o licencia → obtenemos info
      const info = await obtenerInfoLicencia();
      setEsMaster(info.esMaster);
      setLicenciaActiva(info.activa);
      setDiasRestantes(info.diasRestantes);

      if (info.activa) { setEstado('login'); return; }
      setEstado(info.diasRestantes > 0 ? 'login' : 'bloqueado');
    })();
  }, []);

  const refrescarInfoLicencia = async () => {
    const info = await obtenerInfoLicencia();
    setEsMaster(info.esMaster);
    setLicenciaActiva(info.activa);
    setDiasRestantes(info.diasRestantes);
  };

  // ===== Handlers de la pantalla de bienvenida =====
  const comenzarPrueba = async () => {
    await obtenerFechaInstalacion(); // aquí SÍ se crea el trial
    await refrescarInfoLicencia();
    setEstado('login');
  };

  const irAActivar = () => {
    // No creamos trial todavía. Si el usuario cancela, puede volver a "bienvenida"
    // (aunque como no hay botón atrás, simplemente se queda en la pantalla de activación)
    setEstado('activar');
  };

  // ===== Login =====
  const handleLogin = (usuario: Usuario) => {
    setUsuarioActual(usuario);
    setVistaActual(usuario.rol === 'vendedor' ? 'venta' : 'dashboard');
    setEstado('app');
  };

  const cerrarSesion = () => {
    setUsuarioActual(null);
    setVistaActual('venta');
    setCategoriaSeleccionada(null);
    setSidebarAbierto(false);
    setEstado('login');
  };

  const toggleSidebar = () => setSidebarAbierto(!sidebarAbierto);

  const cambiarVista = (vista: string) => {
    setVistaActual(vista);
    if (vista !== 'categorias') setCategoriaSeleccionada(null);
    setSidebarAbierto(false);
  };

  // ===== Render por estado =====
  if (estado === 'cargando') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950">
        <div className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-blue-500/30 border-t-blue-500" />
          <p className="text-sm font-semibold text-gray-400">Cargando CuentaClara…</p>
        </div>
      </div>
    );
  }

  if (estado === 'bienvenida') {
    return (
      <ThemeProvider>
        <WelcomeScreen
          onComenzarPrueba={comenzarPrueba}
          onActivarLicencia={irAActivar}
        />
      </ThemeProvider>
    );
  }

  if (estado === 'activar') {
    return (
      <ThemeProvider>
        <ActivarLicencia
          bloqueada={false}
          onActivar={async () => {
            await refrescarInfoLicencia();
            setEstado('login');
          }}
        />
      </ThemeProvider>
    );
  }

  if (estado === 'bloqueado') {
    return (
      <ThemeProvider>
        <ActivarLicencia
          bloqueada={true}
          onActivar={async () => {
            await refrescarInfoLicencia();
            setEstado('login');
          }}
        />
      </ThemeProvider>
    );
  }

  if (estado === 'login' || !usuarioActual) {
    return (
      <ThemeProvider>
        <Login onLogin={handleLogin} />
      </ThemeProvider>
    );
  }

  const renderVista = () => {
    switch (vistaActual) {
      case 'venta':
        return <NuevaVenta onVolver={() => setVistaActual('dashboard')} usuarioActual={usuarioActual} onCerrarSesion={cerrarSesion} />;
      case 'categorias':
        if (categoriaSeleccionada) {
          return <ProductosCategoria categoriaId={categoriaSeleccionada} onVolver={() => setCategoriaSeleccionada(null)} usuarioActual={usuarioActual} />;
        }
        return <Categorias onSeleccionarCategoria={(id) => setCategoriaSeleccionada(id)} usuarioActual={usuarioActual} />;
        return <Dashboard onVolver={() => setVistaActual('venta')} />;
      case 'cierre':
        return <CierreCaja onVolver={() => setVistaActual('dashboard')} usuarioActual={usuarioActual} />;
      case 'usuarios':
        return <GestionUsuarios onVolver={() => setVistaActual('dashboard')} usuarioActual={usuarioActual} />;
      case 'licencias':
        return <Licencias usuarioActual={usuarioActual} />;
      case 'clientes':
        return <Clientes usuarioActual={usuarioActual} />;
      case 'tasas':
        return <TasasCambio usuarioActual={usuarioActual} />;
      case 'reportes':
        return <Reportes usuarioActual={usuarioActual} />;
      case 'devoluciones':
        return <Devoluciones usuarioActual={usuarioActual} />;
      case 'comisiones':
        return <Comisiones usuarioActual={usuarioActual} />;
      case 'movimientos':
        return <MovimientosInventario usuarioActual={usuarioActual} />;
      case 'configuracion':
        return <Configuracion usuarioActual={usuarioActual} />;
      case 'seguridad':
        return <LogsSeguridad usuarioActual={usuarioActual} />;
      case 'historial':
        return <HistorialVentas usuarioActual={usuarioActual} />;
      default:
        return <Dashboard onVolver={() => setVistaActual('venta')} />;
    }
  };

  return (
    <ThemeProvider>
      <div className="relative min-h-screen bg-slate-950">
        {sidebarAbierto && (
          <button
            aria-label="Cerrar menú"
            onClick={toggleSidebar}
            className="fixed inset-0 z-20 bg-slate-950/70 md:hidden"
          />
        )}

        <button
          onClick={toggleSidebar}
          className="group fixed left-3 top-3 z-30 flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-slate-900/70 text-gray-100 shadow-[0_10px_30px_-10px_rgba(0,0,0,0.8)] ring-1 ring-inset ring-white/5 transition-all duration-200 hover:-translate-y-0.5 hover:border-blue-400/60 hover:bg-blue-500/15 hover:text-blue-300 active:scale-95 md:hidden"
          aria-label={sidebarAbierto ? 'Cerrar menú' : 'Abrir menú'}
        >
          {sidebarAbierto ? (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 transition-transform duration-200 group-hover:scale-110" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          )}
        </button>

        <Sidebar
          usuarioActual={usuarioActual}
          vistaActual={vistaActual}
          onCambiarVista={cambiarVista}
          onCerrarSesion={cerrarSesion}
          abierto={sidebarAbierto}
          onToggle={toggleSidebar}
          esMaster={esMaster}
          licenciaActiva={licenciaActiva}
          diasRestantes={diasRestantes}
        />

        <div className="md:ml-64">
          {renderVista()}
        </div>
      </div>
    </ThemeProvider>
  );
}

export default App;