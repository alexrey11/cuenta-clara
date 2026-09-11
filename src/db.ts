import Dexie from 'dexie';
import type { Table } from 'dexie';

// ===== INTERFACES EXISTENTES =====

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
    precio: number;
    stockActual: number;
    stockMinimo: number;
    unidadMedida?: string;
    imagen?: string;
    fechaCreacion: Date;
    fechaVencimiento?: Date;
    codigoBarras?: string; // NUEVO: Para búsqueda avanzada
}

export interface Usuario {
    id?: number;
    nombre: string;
    pin: string;
    rol: 'admin' | 'vendedor';
    creadoEn: Date;
    comisionPorcentaje?: number; // NUEVO: % de comisión para vendedores
}

// ===== INTERFACES NUEVAS =====

export interface Cliente {
    id?: number;
    nombre: string;
    telefono?: string;
    email?: string;
    direccion?: string;
    notas?: string;
    creadoEn: Date;
    saldoPendiente: number; // NUEVO: Total de fiados
}

export interface TasaCambio {
    id?: number;
    moneda: 'USD' | 'EUR' | 'MLC';
    tasa: number; // Cuántos CUP equivale 1 unidad de esta moneda
    fechaActualizacion: Date;
    actualizadoPor: string;
}

export interface MetodoPago {
    tipo: 'efectivo' | 'transferencia' | 'tarjeta' | 'fiado';
    monto: number;
    moneda: 'CUP' | 'USD' | 'EUR' | 'MLC';
    montoEnCUP: number; // Convertido a CUP para el total
}

export interface Venta {
    id?: number;
    productoId: number;
    productoNombre: string;
    cantidad: number;
    precioUnitario: number;
    total: number;
    fecha: Date;
    vendedorId: number;
    vendedorNombre: string;
    estado: 'completada' | 'cancelada' | 'error' | 'devuelta';
    notaCancelacion?: string;

    // NUEVOS CAMPOS
    clienteId?: number;
    clienteNombre?: string;
    metodosPago: MetodoPago[]; // Array de métodos de pago
    notas?: string; // Notas adicionales de la venta
    comisionVendedor?: number; // Comisión calculada
    esFiado?: boolean; // Si es venta a crédito
    fechaPagoFiado?: Date; // Cuando se pagó el fiado
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

// ===== CLASE DE BASE DE DATOS =====

export class CuentaClaraDB extends Dexie {
    categorias!: Table<Categoria, number>;
    productos!: Table<Producto, number>;
    ventas!: Table<Venta, number>;
    usuarios!: Table<Usuario, number>;
    cierres!: Table<CierreCaja, number>;
    licencias!: Table<Licencia, number>;

    // NUEVAS TABLAS
    clientes!: Table<Cliente, number>;
    tasasCambio!: Table<TasaCambio, number>;
    devoluciones!: Table<Devolucion, number>;
    movimientosInventario!: Table<MovimientoInventario, number>;

    constructor() {
        super('CuentaClaraDB');

        this.version(7).stores({
            categorias: '++id, nombre',
            productos: '++id, categoriaId, nombre, stockActual, codigoBarras',
            ventas: '++id, productoId, fecha, vendedorId, estado, clienteId',
            usuarios: '++id, nombre, pin, rol',
            cierres: '++id, fecha, realizadoPor',
            licencias: '++id, codigo, cliente, estado',

            // NUEVAS TABLAS
            clientes: '++id, nombre, telefono, saldoPendiente',
            tasasCambio: '++id, moneda',
            devoluciones: '++id, ventaId, productoId, fecha',
            movimientosInventario: '++id, productoId, tipo, fecha'
        });
    }
}

export const db = new CuentaClaraDB();

// ===== FUNCIONES AUXILIARES =====

// Obtener tasa de cambio actual
export const obtenerTasaCambio = async (moneda: 'USD' | 'EUR' | 'MLC'): Promise<number> => {
    const tasa = await db.tasasCambio.where('moneda').equals(moneda).first();
    return tasa?.tasa || 1; // Si no existe, retorna 1 (por defecto)
};

// Convertir monto a CUP
export const convertirACUP = async (monto: number, moneda: 'CUP' | 'USD' | 'EUR' | 'MLC'): Promise<number> => {
    if (moneda === 'CUP') return monto;
    const tasa = await obtenerTasaCambio(moneda);
    return monto * tasa;
};

// Calcular comisión de vendedor
export const calcularComision = async (venta: Venta): Promise<number> => {
    const vendedor = await db.usuarios.get(venta.vendedorId);
    if (!vendedor || !vendedor.comisionPorcentaje) return 0;
    return venta.total * (vendedor.comisionPorcentaje / 100);
};