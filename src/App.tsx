import { useState, useEffect } from 'react';
import { db } from './db';
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

function App() {
  const [usuarioActual, setUsuarioActual] = useState<Usuario | null>(null);
  const [vistaActual, setVistaActual] = useState<string>('venta');
  const [primeraVez, setPrimeraVez] = useState<boolean | null>(null);
  const [licenciaActiva, setLicenciaActiva] = useState(true);
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState<number | null>(null);

  // Detectar primera vez
  useEffect(() => {
    const fechaInstalacion = localStorage.getItem('cuenta-clara-fecha-instalacion');
    const usuariosCount = db.usuarios.count();

    usuariosCount.then(count => {
      if (!fechaInstalacion && count === 0) {
        setPrimeraVez(true);
      } else {
        setPrimeraVez(false);
      }
    });
  }, []);

  // Verificar licencia
  useEffect(() => {
    if (usuarioActual) {
      const licenciaGuardada = localStorage.getItem('cuenta-clara-licencia');
      const esDev = localStorage.getItem('cuenta-clara-dev');
      const esPermanente = localStorage.getItem('cuenta-clara-licencia-permanente');
      const fechaInstalacion = localStorage.getItem('cuenta-clara-fecha-instalacion');
      const fechaVencimiento = localStorage.getItem('cuenta-clara-fecha-vencimiento');

      // Si es el desarrollador o tiene licencia permanente, acceso total
      if (licenciaGuardada === 'activa' && (esDev === 'true' || esPermanente === 'true')) {
        setLicenciaActiva(true);
      }
      // Si tiene licencia con fecha de vencimiento
      else if (licenciaGuardada === 'activa' && fechaVencimiento) {
        const ahora = new Date().getTime();
        const vencimiento = new Date(fechaVencimiento).getTime();

        if (ahora < vencimiento) {
          setLicenciaActiva(true);
        } else {
          setLicenciaActiva(false);
        }
      }
      // Si está en período de prueba (15 días)
      else if (fechaInstalacion) {
        const diasTranscurridos = Math.floor(
          (new Date().getTime() - new Date(fechaInstalacion).getTime()) / (1000 * 60 * 60 * 24)
        );
        if (diasTranscurridos <= 15) {
          setLicenciaActiva(true);
        } else {
          setLicenciaActiva(false);
        }
      }
      // Primera vez sin fecha, dar prueba gratis
      else {
        localStorage.setItem('cuenta-clara-fecha-instalacion', new Date().toISOString());
        setLicenciaActiva(true);
      }
    }
  }, [usuarioActual]);

  const cerrarSesion = () => {
    setUsuarioActual(null);
    setVistaActual('venta');
    setCategoriaSeleccionada(null);
  };

  // FLUJO 1: Primera vez
  if (primeraVez === true) {
    return (
      <ThemeProvider>
        <WelcomeScreen
          onComenzarPrueba={() => {
            setPrimeraVez(false);
            window.location.reload();
          }}
          onActivarLicencia={() => {
            setPrimeraVez(false);
            window.location.reload();
          }}
        />
      </ThemeProvider>
    );
  }

  // FLUJO 2: Sin usuario
  if (!usuarioActual) {
    return (
      <ThemeProvider>
        <Login onLogin={(usuario) => {
          setUsuarioActual(usuario);
          setVistaActual(usuario.rol === 'vendedor' ? 'venta' : 'dashboard');
        }} />
      </ThemeProvider>
    );
  }

  // FLUJO 3: Sin licencia
  if (!licenciaActiva) {
    return (
      <ThemeProvider>
        <ActivarLicencia onActivar={() => setLicenciaActiva(true)} />
      </ThemeProvider>
    );
  }

  // Renderizado de vistas
  const renderVista = () => {
    switch (vistaActual) {
      case 'venta':
        return <NuevaVenta onVolver={() => setVistaActual('dashboard')} usuarioActual={usuarioActual} onCerrarSesion={cerrarSesion} />;

      case 'categorias':
        if (categoriaSeleccionada) {
          return (
            <ProductosCategoria
              usuarioActual={usuarioActual}
              categoriaId={categoriaSeleccionada}
              onVolver={() => setCategoriaSeleccionada(null)}
            />
          );
        }
        return (
          <Categorias
            usuarioActual={usuarioActual}
            onSeleccionarCategoria={(id) => setCategoriaSeleccionada(id)}
          />
        );

      case 'dashboard':
        return <Dashboard onVolver={() => setVistaActual('venta')} usuarioActual={usuarioActual} />;

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

      case 'historial':
        return <HistorialVentas usuarioActual={usuarioActual} />;

      case 'devoluciones':
        return <Devoluciones usuarioActual={usuarioActual} />;

      case 'comisiones':
        return <Comisiones usuarioActual={usuarioActual} />;

      case 'movimientos':
        return <MovimientosInventario usuarioActual={usuarioActual} />;

      case 'configuracion':
        return <Configuracion usuarioActual={usuarioActual} />;

      default:
        return <Dashboard onVolver={() => setVistaActual('venta')} usuarioActual={usuarioActual} />;
    }
  };

  return (
    <ThemeProvider>
      <div className="flex">
        <Sidebar
          usuarioActual={usuarioActual}
          vistaActual={vistaActual}
          onCambiarVista={(vista) => {
            setVistaActual(vista);
            if (vista !== 'categorias') {
              setCategoriaSeleccionada(null);
            }
          }}
          onCerrarSesion={cerrarSesion}
        />
        <div className="flex-1 ml-64">
          {renderVista()}
        </div>
      </div>
    </ThemeProvider>
  );
}

export default App;