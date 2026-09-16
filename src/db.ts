import Dexie from 'dexie';
import type { Table } from 'dexie';

// ===== INTERFACES =====

export interface Categoria {
    id?: number;
    nombre: string;
    descripcion?: string;
    imagen?: string;
    creadoEn: Date;
}

export interface Producto {
    id?: number;
    categoriaId: number;
    nombre: string;
    descripcion?: string;
    precioCompra: number;
    precioVenta: number;
    stockActual: number;
    stockMinimo: number;
    unidadMedida?: string;
    imagen?: string;
    fechaCreacion: Date;
    fechaVencimiento?: Date;
    codigoBarras?: string;
}

export interface Usuario {
    id?: number;
    nombre: string;
    pin: string;
    rol: 'admin' | 'jefe' | 'vendedor';
    creadoEn: Date;
    comisionPorcentaje?: number;
}

export interface Cliente {
    id?: number;
    nombre: string;
    telefono?: string;
    email?: string;
    direccion?: string;
    notas?: string;
    creadoEn: Date;
    saldoPendiente: number;
}

export interface TasaCambio {
    id?: number;
    moneda: 'USD' | 'EUR' | 'MLC';
    tasa: number;
    fechaActualizacion: Date;
    actualizadoPor: string;
}

export interface MetodoPago {
    tipo: 'efectivo' | 'transferencia' | 'tarjeta' | 'fiado';
    monto: number;
    moneda: 'CUP' | 'USD' | 'EUR' | 'MLC';
    montoEnCUP: number;
}

export interface ItemCarrito {
    productoId: number;
    productoNombre: string;
    codigoBarras?: string;
    cantidad: number;
    precioUnitario: number;
    precioCompra: number;
    subtotal: number;
}

export interface Venta {
    id?: number;
    items?: ItemCarrito[];
    productoId?: number;
    productoNombre?: string;
    cantidad?: number;
    precioUnitario?: number;
    total: number;
    fecha: Date;
    vendedorId: number;
    vendedorNombre: string;
    estado: 'completada' | 'cancelada' | 'error' | 'devuelta';
    notaCancelacion?: string;
    clienteId?: number;
    clienteNombre?: string;
    metodosPago: MetodoPago[];
    notas?: string;
    comisionVendedor?: number;
    esFiado?: boolean;
    fechaPagoFiado?: Date;
    vueltoCUP?: number;
}

export interface Devolucion {
    id?: number;
    ventaId: number;
    productoId: number;
    productoNombre: string;
    cantidad: number;
    motivo: string;
    fecha: Date;
    realizadoPor: string;
    montoReembolsado: number;
}

export interface MovimientoInventario {
    id?: number;
    productoId: number;
    productoNombre: string;
    tipo: 'entrada' | 'salida' | 'ajuste' | 'perdida' | 'devolucion';
    cantidad: number;
    motivo: string;
    fecha: Date;
    realizadoPor: string;
    stockAnterior: number;
    stockNuevo: number;
}

export interface CierreCaja {
    id?: number;
    fecha: Date;
    totalVentas: number;
    cantidadVentas: number;
    montoReal: number;
    diferencia: number;
    notas: string;
    realizadoPor: string;
    ventasPorVendedor: { vendedor: string; total: number }[];
    desgloseMetodosPago?: {
        efectivo: number;
        transferencia: number;
        tarjeta: number;
        fiado: number;
    };
}

export interface Licencia {
    id?: number;
    codigo: string;
    cliente: string;
    fechaCreacion: Date;
    fechaActivacion: Date | null;
    estado: 'disponible' | 'activada' | 'vendida';
    plan: 'mensual' | 'anual';
}

export interface ConfigEntry {
    key: string;
    value: string;
}

/** Trazas de seguridad — registro de eventos importantes */
export type TipoLogSeguridad =
    | 'login_ok'
    | 'login_fallido'
    | 'logout'
    | 'usuario_creado'
    | 'usuario_editado'
    | 'usuario_eliminado'
    | 'acceso_denegado'
    | 'licencia_activada'
    | 'licencia_invalida'
    | 'reset_total'
    | 'datos_borrados'
    | 'backup_exportado'
    | 'backup_importado'
    | 'tasa_editada';

export interface LogSeguridad {
    id?: number;
    tipo: TipoLogSeguridad;
    descripcion: string;
    usuarioId?: number;
    usuarioNombre?: string;
    detalles?: string;
    fecha: Date;
}

// ===== CLASE DE BASE DE DATOS =====

export class CuentaClaraDB extends Dexie {
    categorias!: Table<Categoria, number>;
    productos!: Table<Producto, number>;
    ventas!: Table<Venta, number>;
    usuarios!: Table<Usuario, number>;
    cierres!: Table<CierreCaja, number>;
    licencias!: Table<Licencia, number>;
    clientes!: Table<Cliente, number>;
    tasasCambio!: Table<TasaCambio, number>;
    devoluciones!: Table<Devolucion, number>;
    movimientosInventario!: Table<MovimientoInventario, number>;
    config!: Table<ConfigEntry, string>;
    logsSeguridad!: Table<LogSeguridad, number>;

    constructor() {
        super('CuentaClaraDB');

        this.version(8).stores({
            categorias: '++id, nombre',
            productos: '++id, categoriaId, nombre, stockActual, codigoBarras',
            ventas: '++id, fecha, vendedorId, estado, clienteId',
            usuarios: '++id, nombre, pin, rol',
            cierres: '++id, fecha, realizadoPor',
            licencias: '++id, codigo, cliente, estado',
            clientes: '++id, nombre, telefono, saldoPendiente',
            tasasCambio: '++id, moneda',
            devoluciones: '++id, ventaId, productoId, fecha',
            movimientosInventario: '++id, productoId, tipo, fecha',
        });

        this.version(9).stores({
            categorias: '++id, nombre',
            productos: '++id, categoriaId, nombre, stockActual, codigoBarras',
            ventas: '++id, fecha, vendedorId, estado, clienteId',
            usuarios: '++id, nombre, pin, rol',
            cierres: '++id, fecha, realizadoPor',
            licencias: '++id, codigo, cliente, estado',
            clientes: '++id, nombre, telefono, saldoPendiente',
            tasasCambio: '++id, moneda',
            devoluciones: '++id, ventaId, productoId, fecha',
            movimientosInventario: '++id, productoId, tipo, fecha',
            config: 'key',
        });

        // v10: agrega logs de seguridad
        this.version(10).stores({
            categorias: '++id, nombre',
            productos: '++id, categoriaId, nombre, stockActual, codigoBarras',
            ventas: '++id, fecha, vendedorId, estado, clienteId',
            usuarios: '++id, nombre, pin, rol',
            cierres: '++id, fecha, realizadoPor',
            licencias: '++id, codigo, cliente, estado',
            clientes: '++id, nombre, telefono, saldoPendiente',
            tasasCambio: '++id, moneda',
            devoluciones: '++id, ventaId, productoId, fecha',
            movimientosInventario: '++id, productoId, tipo, fecha',
            config: 'key',
            logsSeguridad: '++id, tipo, fecha, usuarioNombre',
        });
    }
}

export const db = new CuentaClaraDB();

// ===== FUNCIONES AUXILIARES =====

export const obtenerTasaCambio = async (moneda: 'USD' | 'EUR' | 'MLC'): Promise<number> => {
    const tasa = await db.tasasCambio.where('moneda').equals(moneda).first();
    return tasa?.tasa || 1;
};

export const convertirACUP = async (monto: number, moneda: 'CUP' | 'USD' | 'EUR' | 'MLC'): Promise<number> => {
    if (moneda === 'CUP') return monto;
    const tasa = await obtenerTasaCambio(moneda);
    return monto * tasa;
};

export const calcularComision = async (venta: Venta): Promise<number> => {
    const vendedor = await db.usuarios.get(venta.vendedorId);
    if (!vendedor || !vendedor.comisionPorcentaje) return 0;
    return venta.total * (vendedor.comisionPorcentaje / 100);
};