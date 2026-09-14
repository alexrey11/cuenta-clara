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
    // NUEVO FORMATO (carrito)
    items?: ItemCarrito[];
    // FORMATO ANTIGUO (producto individual) - para compatibilidad
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

export interface LicenciaSecreta {
    codigo: string;
    estado: 'disponible' | 'activada' | 'vencida';
    fechaActivacion?: Date;
    fechaVencimiento?: Date;
    clienteNombre?: string;
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

// ===== 200 LICENCIAS SECRETAS =====

export const LICENCIAS_SECRETAS: LicenciaSecreta[] = [
    { codigo: 'CC-A1B2-C3D4-E5F6-G7H8', estado: 'disponible' },
    { codigo: 'CC-I9J0-K1L2-M3N4-O5P6', estado: 'disponible' },
    { codigo: 'CC-Q7R8-S9T0-U1V2-W3X4', estado: 'disponible' },
    { codigo: 'CC-Y5Z6-A7B8-C9D0-E1F2', estado: 'disponible' },
    { codigo: 'CC-G3H4-I5J6-K7L8-M9N0', estado: 'disponible' },
    { codigo: 'CC-O1P2-Q3R4-S5T6-U7V8', estado: 'disponible' },
    { codigo: 'CC-W9X0-Y1Z2-A3B4-C5D6', estado: 'disponible' },
    { codigo: 'CC-E7F8-G9H0-I1J2-K3L4', estado: 'disponible' },
    { codigo: 'CC-M5N6-O7P8-Q9R0-S1T2', estado: 'disponible' },
    { codigo: 'CC-U3V4-W5X6-Y7Z8-A9B0', estado: 'disponible' },
    { codigo: 'CC-C1D2-E3F4-G5H6-I7J8', estado: 'disponible' },
    { codigo: 'CC-K9L0-M1N2-O3P4-Q5R6', estado: 'disponible' },
    { codigo: 'CC-S7T8-U9V0-W1X2-Y3Z4', estado: 'disponible' },
    { codigo: 'CC-A5B6-C7D8-E9F0-G1H2', estado: 'disponible' },
    { codigo: 'CC-I3J4-K5L6-M7N8-O9P0', estado: 'disponible' },
    { codigo: 'CC-Q1R2-S3T4-U5V6-W7X8', estado: 'disponible' },
    { codigo: 'CC-Y9Z0-A1B2-C3D4-E5F6', estado: 'disponible' },
    { codigo: 'CC-G7H8-I9J0-K1L2-M3N4', estado: 'disponible' },
    { codigo: 'CC-O5P6-Q7R8-S9T0-U1V2', estado: 'disponible' },
    { codigo: 'CC-W3X4-Y5Z6-A7B8-C9D0', estado: 'disponible' },
    { codigo: 'CC-E1F2-G3H4-I5J6-K7L8', estado: 'disponible' },
    { codigo: 'CC-M9N0-O1P2-Q3R4-S5T6', estado: 'disponible' },
    { codigo: 'CC-U7V8-W9X0-Y1Z2-A3B4', estado: 'disponible' },
    { codigo: 'CC-C5D6-E7F8-G9H0-I1J2', estado: 'disponible' },
    { codigo: 'CC-K3L4-M5N6-O7P8-Q9R0', estado: 'disponible' },
    { codigo: 'CC-S1T2-U3V4-W5X6-Y7Z8', estado: 'disponible' },
    { codigo: 'CC-A9B0-C1D2-E3F4-G5H6', estado: 'disponible' },
    { codigo: 'CC-I7J8-K9L0-M1N2-O3P4', estado: 'disponible' },
    { codigo: 'CC-Q5R6-S7T8-U9V0-W1X2', estado: 'disponible' },
    { codigo: 'CC-Y3Z4-A5B6-C7D8-E9F0', estado: 'disponible' },
    { codigo: 'CC-G1H2-I3J4-K5L6-M7N8', estado: 'disponible' },
    { codigo: 'CC-O9P0-Q1R2-S3T4-U5V6', estado: 'disponible' },
    { codigo: 'CC-W7X8-Y9Z0-A1B2-C3D4', estado: 'disponible' },
    { codigo: 'CC-E5F6-G7H8-I9J0-K1L2', estado: 'disponible' },
    { codigo: 'CC-M3N4-O5P6-Q7R8-S9T0', estado: 'disponible' },
    { codigo: 'CC-U1V2-W3X4-Y5Z6-A7B8', estado: 'disponible' },
    { codigo: 'CC-C9D0-E1F2-G3H4-I5J6', estado: 'disponible' },
    { codigo: 'CC-K7L8-M9N0-O1P2-Q3R4', estado: 'disponible' },
    { codigo: 'CC-S5T6-U7V8-W9X0-Y1Z2', estado: 'disponible' },
    { codigo: 'CC-A3B4-C5D6-E7F8-G9H0', estado: 'disponible' },
    { codigo: 'CC-I1J2-K3L4-M5N6-O7P8', estado: 'disponible' },
    { codigo: 'CC-Q9R0-S1T2-U3V4-W5X6', estado: 'disponible' },
    { codigo: 'CC-Y7Z8-A9B0-C1D2-E3F4', estado: 'disponible' },
    { codigo: 'CC-G5H6-I7J8-K9L0-M1N2', estado: 'disponible' },
    { codigo: 'CC-O3P4-Q5R6-S7T8-U9V0', estado: 'disponible' },
    { codigo: 'CC-W1X2-Y3Z4-A5B6-C7D8', estado: 'disponible' },
    { codigo: 'CC-E9F0-G1H2-I3J4-K5L6', estado: 'disponible' },
    { codigo: 'CC-M7N8-O9P0-Q1R2-S3T4', estado: 'disponible' },
    { codigo: 'CC-U5V6-W7X8-Y9Z0-A1B2', estado: 'disponible' },
    { codigo: 'CC-C3D4-E5F6-G7H8-I9J0', estado: 'disponible' },
    { codigo: 'CC-K1L2-M3N4-O5P6-Q7R8', estado: 'disponible' },
    { codigo: 'CC-S9T0-U1V2-W3X4-Y5Z6', estado: 'disponible' },
    { codigo: 'CC-A7B8-C9D0-E1F2-G3H4', estado: 'disponible' },
    { codigo: 'CC-I5J6-K7L8-M9N0-O1P2', estado: 'disponible' },
    { codigo: 'CC-Q3R4-S5T6-U7V8-W9X0', estado: 'disponible' },
    { codigo: 'CC-Y1Z2-A3B4-C5D6-E7F8', estado: 'disponible' },
    { codigo: 'CC-G9H0-I1J2-K3L4-M5N6', estado: 'disponible' },
    { codigo: 'CC-O7P8-Q9R0-S1T2-U3V4', estado: 'disponible' },
    { codigo: 'CC-W5X6-Y7Z8-A9B0-C1D2', estado: 'disponible' },
    { codigo: 'CC-E3F4-G5H6-I7J8-K9L0', estado: 'disponible' },
    { codigo: 'CC-M1N2-O3P4-Q5R6-S7T8', estado: 'disponible' },
    { codigo: 'CC-U9V0-W1X2-Y3Z4-A5B6', estado: 'disponible' },
    { codigo: 'CC-C7D8-E9F0-G1H2-I3J4', estado: 'disponible' },
    { codigo: 'CC-K5L6-M7N8-O9P0-Q1R2', estado: 'disponible' },
    { codigo: 'CC-S3T4-U5V6-W7X8-Y9Z0', estado: 'disponible' },
    { codigo: 'CC-A1B2-C3D4-E5F6-G7H9', estado: 'disponible' },
    { codigo: 'CC-I9J0-K1L2-M3N4-O5P7', estado: 'disponible' },
    { codigo: 'CC-Q7R8-S9T0-U1V2-W3X5', estado: 'disponible' },
    { codigo: 'CC-Y5Z6-A7B8-C9D0-E1F3', estado: 'disponible' },
    { codigo: 'CC-G3H4-I5J6-K7L8-M9N1', estado: 'disponible' },
    { codigo: 'CC-O1P2-Q3R4-S5T6-U7V9', estado: 'disponible' },
    { codigo: 'CC-W9X0-Y1Z2-A3B4-C5D7', estado: 'disponible' },
    { codigo: 'CC-E7F8-G9H0-I1J2-K3L5', estado: 'disponible' },
    { codigo: 'CC-M5N6-O7P8-Q9R0-S1T3', estado: 'disponible' },
    { codigo: 'CC-U3V4-W5X6-Y7Z8-A9B1', estado: 'disponible' },
    { codigo: 'CC-C1D2-E3F4-G5H6-I7J9', estado: 'disponible' },
    { codigo: 'CC-K9L0-M1N2-O3P4-Q5R7', estado: 'disponible' },
    { codigo: 'CC-S7T8-U9V0-W1X2-Y3Z5', estado: 'disponible' },
    { codigo: 'CC-A5B6-C7D8-E9F0-G1H3', estado: 'disponible' },
    { codigo: 'CC-I3J4-K5L6-M7N8-O9P1', estado: 'disponible' },
    { codigo: 'CC-Q1R2-S3T4-U5V6-W7X9', estado: 'disponible' },
    { codigo: 'CC-Y9Z0-A1B2-C3D4-E5F7', estado: 'disponible' },
    { codigo: 'CC-G7H8-I9J0-K1L2-M3N5', estado: 'disponible' },
    { codigo: 'CC-O5P6-Q7R8-S9T0-U1V3', estado: 'disponible' },
    { codigo: 'CC-W3X4-Y5Z6-A7B8-C9D1', estado: 'disponible' },
    { codigo: 'CC-E1F2-G3H4-I5J6-K7L9', estado: 'disponible' },
    { codigo: 'CC-M9N0-O1P2-Q3R4-S5T7', estado: 'disponible' },
    { codigo: 'CC-U7V8-W9X0-Y1Z2-A3B5', estado: 'disponible' },
    { codigo: 'CC-C5D6-E7F8-G9H0-I1J3', estado: 'disponible' },
    { codigo: 'CC-K3L4-M5N6-O7P8-Q9R1', estado: 'disponible' },
    { codigo: 'CC-S1T2-U3V4-W5X6-Y7Z9', estado: 'disponible' },
    { codigo: 'CC-A9B0-C1D2-E3F4-G5H7', estado: 'disponible' },
    { codigo: 'CC-I7J8-K9L0-M1N2-O3P5', estado: 'disponible' },
    { codigo: 'CC-Q5R6-S7T8-U9V0-W1X3', estado: 'disponible' },
    { codigo: 'CC-Y3Z4-A5B6-C7D8-E9F1', estado: 'disponible' },
    { codigo: 'CC-G1H2-I3J4-K5L6-M7N9', estado: 'disponible' },
    { codigo: 'CC-O9P0-Q1R2-S3T4-U5V7', estado: 'disponible' },
    { codigo: 'CC-W7X8-Y9Z0-A1B2-C3D5', estado: 'disponible' },
    { codigo: 'CC-E5F6-G7H8-I9J0-K1L3', estado: 'disponible' },
    { codigo: 'CC-M3N4-O5P6-Q7R8-S9T1', estado: 'disponible' },
    { codigo: 'CC-U1V2-W3X4-Y5Z6-A7B9', estado: 'disponible' },
    { codigo: 'CC-C9D0-E1F2-G3H4-I5J7', estado: 'disponible' },
    { codigo: 'CC-K7L8-M9N0-O1P2-Q3R5', estado: 'disponible' },
    { codigo: 'CC-S5T6-U7V8-W9X0-Y1Z3', estado: 'disponible' },
    { codigo: 'CC-A3B4-C5D6-E7F8-G9H1', estado: 'disponible' },
    { codigo: 'CC-I1J2-K3L4-M5N6-O7P9', estado: 'disponible' },
    { codigo: 'CC-Q9R0-S1T2-U3V4-W5X7', estado: 'disponible' },
    { codigo: 'CC-Y7Z8-A9B0-C1D2-E3F5', estado: 'disponible' },
    { codigo: 'CC-G5H6-I7J8-K9L0-M1N3', estado: 'disponible' },
    { codigo: 'CC-O3P4-Q5R6-S7T8-U9V1', estado: 'disponible' },
    { codigo: 'CC-W1X2-Y3Z4-A5B6-C7D9', estado: 'disponible' },
    { codigo: 'CC-E9F0-G1H2-I3J4-K5L7', estado: 'disponible' },
    { codigo: 'CC-M7N8-O9P0-Q1R2-S3T5', estado: 'disponible' },
    { codigo: 'CC-U5V6-W7X8-Y9Z0-A1B3', estado: 'disponible' },
    { codigo: 'CC-C3D4-E5F6-G7H8-I9J1', estado: 'disponible' },
    { codigo: 'CC-K1L2-M3N4-O5P6-Q7R9', estado: 'disponible' },
    { codigo: 'CC-S9T0-U1V2-W3X4-Y5Z7', estado: 'disponible' },
    { codigo: 'CC-A7B8-C9D0-E1F2-G3H5', estado: 'disponible' },
    { codigo: 'CC-I5J6-K7L8-M9N0-O1P3', estado: 'disponible' },
    { codigo: 'CC-Q3R4-S5T6-U7V8-W9X1', estado: 'disponible' },
    { codigo: 'CC-Y1Z2-A3B4-C5D6-E7F9', estado: 'disponible' },
    { codigo: 'CC-G9H0-I1J2-K3L4-M5N7', estado: 'disponible' },
    { codigo: 'CC-O7P8-Q9R0-S1T2-U3V5', estado: 'disponible' },
    { codigo: 'CC-W5X6-Y7Z8-A9B0-C1D3', estado: 'disponible' },
    { codigo: 'CC-E3F4-G5H6-I7J8-K9L1', estado: 'disponible' },
    { codigo: 'CC-M1N2-O3P4-Q5R6-S7T9', estado: 'disponible' },
    { codigo: 'CC-U9V0-W1X2-Y3Z4-A5B7', estado: 'disponible' },
    { codigo: 'CC-C7D8-E9F0-G1H2-I3J5', estado: 'disponible' },
    { codigo: 'CC-K5L6-M7N8-O9P0-Q1R3', estado: 'disponible' },
    { codigo: 'CC-S3T4-U5V6-W7X8-Y9Z1', estado: 'disponible' },
    { codigo: 'CC-A1B2-C3D4-E5F6-G7H0', estado: 'disponible' },
    { codigo: 'CC-I9J0-K1L2-M3N4-O5P8', estado: 'disponible' },
    { codigo: 'CC-Q7R8-S9T0-U1V2-W3X6', estado: 'disponible' },
    { codigo: 'CC-Y5Z6-A7B8-C9D0-E1F4', estado: 'disponible' },
    { codigo: 'CC-G3H4-I5J6-K7L8-M9N2', estado: 'disponible' },
    { codigo: 'CC-O1P2-Q3R4-S5T6-U7V0', estado: 'disponible' },
    { codigo: 'CC-W9X0-Y1Z2-A3B4-C5D8', estado: 'disponible' },
    { codigo: 'CC-E7F8-G9H0-I1J2-K3L6', estado: 'disponible' },
    { codigo: 'CC-M5N6-O7P8-Q9R0-S1T4', estado: 'disponible' },
    { codigo: 'CC-U3V4-W5X6-Y7Z8-A9B2', estado: 'disponible' },
    { codigo: 'CC-C1D2-E3F4-G5H6-I7J0', estado: 'disponible' },
    { codigo: 'CC-K9L0-M1N2-O3P4-Q5R8', estado: 'disponible' },
    { codigo: 'CC-S7T8-U9V0-W1X2-Y3Z6', estado: 'disponible' },
    { codigo: 'CC-A5B6-C7D8-E9F0-G1H4', estado: 'disponible' },
    { codigo: 'CC-I3J4-K5L6-M7N8-O9P2', estado: 'disponible' },
    { codigo: 'CC-Q1R2-S3T4-U5V6-W7X0', estado: 'disponible' },
    { codigo: 'CC-Y9Z0-A1B2-C3D4-E5F8', estado: 'disponible' },
    { codigo: 'CC-G7H8-I9J0-K1L2-M3N6', estado: 'disponible' },
    { codigo: 'CC-O5P6-Q7R8-S9T0-U1V4', estado: 'disponible' },
    { codigo: 'CC-W3X4-Y5Z6-A7B8-C9D2', estado: 'disponible' },
    { codigo: 'CC-E1F2-G3H4-I5J6-K7L0', estado: 'disponible' },
    { codigo: 'CC-M9N0-O1P2-Q3R4-S5T8', estado: 'disponible' },
    { codigo: 'CC-U7V8-W9X0-Y1Z2-A3B6', estado: 'disponible' },
    { codigo: 'CC-C5D6-E7F8-G9H0-I1J4', estado: 'disponible' },
    { codigo: 'CC-K3L4-M5N6-O7P8-Q9R2', estado: 'disponible' },
    { codigo: 'CC-S1T2-U3V4-W5X6-Y7Z0', estado: 'disponible' },
    { codigo: 'CC-A9B0-C1D2-E3F4-G5H8', estado: 'disponible' },
    { codigo: 'CC-I7J8-K9L0-M1N2-O3P6', estado: 'disponible' },
    { codigo: 'CC-Q5R6-S7T8-U9V0-W1X4', estado: 'disponible' },
    { codigo: 'CC-Y3Z4-A5B6-C7D8-E9F2', estado: 'disponible' },
    { codigo: 'CC-G1H2-I3J4-K5L6-M7N0', estado: 'disponible' },
    { codigo: 'CC-O9P0-Q1R2-S3T4-U5V8', estado: 'disponible' },
    { codigo: 'CC-W7X8-Y9Z0-A1B2-C3D6', estado: 'disponible' },
    { codigo: 'CC-E5F6-G7H8-I9J0-K1L4', estado: 'disponible' },
    { codigo: 'CC-M3N4-O5P6-Q7R8-S9T2', estado: 'disponible' },
    { codigo: 'CC-U1V2-W3X4-Y5Z6-A7B0', estado: 'disponible' },
    { codigo: 'CC-C9D0-E1F2-G3H4-I5J8', estado: 'disponible' },
    { codigo: 'CC-K7L8-M9N0-O1P2-Q3R6', estado: 'disponible' },
    { codigo: 'CC-S5T6-U7V8-W9X0-Y1Z4', estado: 'disponible' },
    { codigo: 'CC-A3B4-C5D6-E7F8-G9H2', estado: 'disponible' },
    { codigo: 'CC-I1J2-K3L4-M5N6-O7P0', estado: 'disponible' },
    { codigo: 'CC-Q9R0-S1T2-U3V4-W5X8', estado: 'disponible' },
    { codigo: 'CC-Y7Z8-A9B0-C1D2-E3F6', estado: 'disponible' },
    { codigo: 'CC-G5H6-I7J8-K9L0-M1N4', estado: 'disponible' },
    { codigo: 'CC-O3P4-Q5R6-S7T8-U9V2', estado: 'disponible' },
    { codigo: 'CC-W1X2-Y3Z4-A5B6-C7D0', estado: 'disponible' },
    { codigo: 'CC-E9F0-G1H2-I3J4-K5L8', estado: 'disponible' },
    { codigo: 'CC-M7N8-O9P0-Q1R2-S3T6', estado: 'disponible' },
    { codigo: 'CC-U5V6-W7X8-Y9Z0-A1B4', estado: 'disponible' },
    { codigo: 'CC-C3D4-E5F6-G7H8-I9J2', estado: 'disponible' },
    { codigo: 'CC-K1L2-M3N4-O5P6-Q7R0', estado: 'disponible' },
    { codigo: 'CC-S9T0-U1V2-W3X4-Y5Z8', estado: 'disponible' },
    { codigo: 'CC-A7B8-C9D0-E1F2-G3H6', estado: 'disponible' },
    { codigo: 'CC-I5J6-K7L8-M9N0-O1P4', estado: 'disponible' },
    { codigo: 'CC-Q3R4-S5T6-U7V8-W9X2', estado: 'disponible' },
    { codigo: 'CC-Y1Z2-A3B4-C5D6-E7F0', estado: 'disponible' },
    { codigo: 'CC-G9H0-I1J2-K3L4-M5N8', estado: 'disponible' },
    { codigo: 'CC-O7P8-Q9R0-S1T2-U3V6', estado: 'disponible' },
    { codigo: 'CC-W5X6-Y7Z8-A9B0-C1D4', estado: 'disponible' },
    { codigo: 'CC-E3F4-G5H6-I7J8-K9L2', estado: 'disponible' },
    { codigo: 'CC-M1N2-O3P4-Q5R6-S7T0', estado: 'disponible' },
    { codigo: 'CC-U9V0-W1X2-Y3Z4-A5B8', estado: 'disponible' },
    { codigo: 'CC-C7D8-E9F0-G1H2-I3J6', estado: 'disponible' },
    { codigo: 'CC-K5L6-M7N8-O9P0-Q1R4', estado: 'disponible' },
    { codigo: 'CC-S3T4-U5V6-W7X8-Y9Z2', estado: 'disponible' },
    { codigo: 'CC-A1B2-C3D4-E5F6-G7H1', estado: 'disponible' },
    { codigo: 'CC-I9J0-K1L2-M3N4-O5P9', estado: 'disponible' },
    { codigo: 'CC-Q7R8-S9T0-U1V2-W3X7', estado: 'disponible' },
    { codigo: 'CC-Y5Z6-A7B8-C9D0-E1F5', estado: 'disponible' },
    { codigo: 'CC-G3H4-I5J6-K7L8-M9N3', estado: 'disponible' },
    { codigo: 'CC-O1P2-Q3R4-S5T6-U7V1', estado: 'disponible' },
    { codigo: 'CC-W9X0-Y1Z2-A3B4-C5D9', estado: 'disponible' },
    { codigo: 'CC-E7F8-G9H0-I1J2-K3L7', estado: 'disponible' },
    { codigo: 'CC-M5N6-O7P8-Q9R0-S1T5', estado: 'disponible' },
    { codigo: 'CC-U3V4-W5X6-Y7Z8-A9B3', estado: 'disponible' },
    { codigo: 'CC-C1D2-E3F4-G5H6-I7J1', estado: 'disponible' },
    { codigo: 'CC-K9L0-M1N2-O3P4-Q5R9', estado: 'disponible' },
    { codigo: 'CC-S7T8-U9V0-W1X2-Y3Z7', estado: 'disponible' },
    { codigo: 'CC-A5B6-C7D8-E9F0-G1H5', estado: 'disponible' },
    { codigo: 'CC-I3J4-K5L6-M7N8-O9P3', estado: 'disponible' },
    { codigo: 'CC-Q1R2-S3T4-U5V6-W7X1', estado: 'disponible' },
    { codigo: 'CC-Y9Z0-A1B2-C3D4-E5F9', estado: 'disponible' },
    { codigo: 'CC-G7H8-I9J0-K1L2-M3N7', estado: 'disponible' },
    { codigo: 'CC-O5P6-Q7R8-S9T0-U1V5', estado: 'disponible' },
    { codigo: 'CC-W3X4-Y5Z6-A7B8-C9D3', estado: 'disponible' },
    { codigo: 'CC-E1F2-G3H4-I5J6-K7L1', estado: 'disponible' },
    { codigo: 'CC-M9N0-O1P2-Q3R4-S5T9', estado: 'disponible' },
    { codigo: 'CC-U7V8-W9X0-Y1Z2-A3B7', estado: 'disponible' },
    { codigo: 'CC-C5D6-E7F8-G9H0-I1J5', estado: 'disponible' },
    { codigo: 'CC-K3L4-M5N6-O7P8-Q9R3', estado: 'disponible' },
    { codigo: 'CC-S1T2-U3V4-W5X6-Y7Z1', estado: 'disponible' },
    { codigo: 'CC-A9B0-C1D2-E3F4-G5H9', estado: 'disponible' },
    { codigo: 'CC-I7J8-K9L0-M1N2-O3P7', estado: 'disponible' },
    { codigo: 'CC-Q5R6-S7T8-U9V0-W1X5', estado: 'disponible' },
    { codigo: 'CC-Y3Z4-A5B6-C7D8-E9F3', estado: 'disponible' },
    { codigo: 'CC-G1H2-I3J4-K5L6-M7N1', estado: 'disponible' },
    { codigo: 'CC-O9P0-Q1R2-S3T4-U5V9', estado: 'disponible' },
    { codigo: 'CC-W7X8-Y9Z0-A1B2-C3D7', estado: 'disponible' },
    { codigo: 'CC-E5F6-G7H8-I9J0-K1L5', estado: 'disponible' },
    { codigo: 'CC-M3N4-O5P6-Q7R8-S9T3', estado: 'disponible' },
    { codigo: 'CC-U1V2-W3X4-Y5Z6-A7B1', estado: 'disponible' },
    { codigo: 'CC-C9D0-E1F2-G3H4-I5J9', estado: 'disponible' },
    { codigo: 'CC-K7L8-M9N0-O1P2-Q3R7', estado: 'disponible' },
    { codigo: 'CC-S5T6-U7V8-W9X0-Y1Z5', estado: 'disponible' },
    { codigo: 'CC-A3B4-C5D6-E7F8-G9H3', estado: 'disponible' },
    { codigo: 'CC-I1J2-K3L4-M5N6-O7P1', estado: 'disponible' },
    { codigo: 'CC-Q9R0-S1T2-U3V4-W5X9', estado: 'disponible' },
    { codigo: 'CC-Y7Z8-A9B0-C1D2-E3F7', estado: 'disponible' },
    { codigo: 'CC-G5H6-I7J8-K9L0-M1N5', estado: 'disponible' },
    { codigo: 'CC-O3P4-Q5R6-S7T8-U9V3', estado: 'disponible' },
    { codigo: 'CC-W1X2-Y3Z4-A5B6-C7D1', estado: 'disponible' },
    { codigo: 'CC-E9F0-G1H2-I3J4-K5L9', estado: 'disponible' },
    { codigo: 'CC-M7N8-O9P0-Q1R2-S3T7', estado: 'disponible' },
    { codigo: 'CC-U5V6-W7X8-Y9Z0-A1B5', estado: 'disponible' },
    { codigo: 'CC-C3D4-E5F6-G7H8-I9J3', estado: 'disponible' },
    { codigo: 'CC-K1L2-M3N4-O5P6-Q7R1', estado: 'disponible' },
    { codigo: 'CC-S9T0-U1V2-W3X4-Y5Z9', estado: 'disponible' },
    { codigo: 'CC-A7B8-C9D0-E1F2-G3H7', estado: 'disponible' },
    { codigo: 'CC-I5J6-K7L8-M9N0-O1P5', estado: 'disponible' },
    { codigo: 'CC-Q3R4-S5T6-U7V8-W9X3', estado: 'disponible' },
    { codigo: 'CC-Y1Z2-A3B4-C5D6-E7F1', estado: 'disponible' },
    { codigo: 'CC-G9H0-I1J2-K3L4-M5N9', estado: 'disponible' },
    { codigo: 'CC-O7P8-Q9R0-S1T2-U3V7', estado: 'disponible' },
    { codigo: 'CC-W5X6-Y7Z8-A9B0-C1D5', estado: 'disponible' },
    { codigo: 'CC-E3F4-G5H6-I7J8-K9L3', estado: 'disponible' },
    { codigo: 'CC-M1N2-O3P4-Q5R6-S7T1', estado: 'disponible' },
    { codigo: 'CC-U9V0-W1X2-Y3Z4-A5B9', estado: 'disponible' },
    { codigo: 'CC-C7D8-E9F0-G1H2-I3J7', estado: 'disponible' },
    { codigo: 'CC-K5L6-M7N8-O9P0-Q1R5', estado: 'disponible' },
    { codigo: 'CC-S3T4-U5V6-W7X8-Y9Z3', estado: 'disponible' },
];

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
            movimientosInventario: '++id, productoId, tipo, fecha'
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