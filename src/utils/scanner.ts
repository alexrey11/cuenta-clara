// ============================================================
// Servicio de escáner: soporta cámara (ML Kit) y Bluetooth HID
// ============================================================

import { Capacitor } from '@capacitor/core';
import { BarcodeScanner } from '@capacitor-mlkit/barcode-scanning';

// ===== DETECCIÓN DE ESCÁNER BLUETOOTH (KEYBOARD WEDGE) =====

let buffer = '';
let ultimaTeclaTiempo = 0;
const VELOCIDAD_MINIMA_MS = 50;

export interface ScannerListener {
    (codigo: string): void;
}

let listeners: ScannerListener[] = [];

export function onScanBluetooth(callback: ScannerListener): () => void {
    listeners.push(callback);
    return () => {
        listeners = listeners.filter(l => l !== callback);
    };
}

export function iniciarEscuchaBluetooth(): () => void {
    if (typeof window === 'undefined') return () => { };

    const handler = (e: KeyboardEvent) => {
        const ahora = Date.now();

        if (ahora - ultimaTeclaTiempo > 100) {
            buffer = '';
        }

        if (e.key.length === 1) {
            const intervalo = ahora - ultimaTeclaTiempo;
            ultimaTeclaTiempo = ahora;
            buffer += e.key;

            if (intervalo < VELOCIDAD_MINIMA_MS || buffer.length > 8) {
                e.preventDefault();
            }
        }

        if (e.key === 'Enter' && buffer.length >= 4) {
            const codigo = buffer.trim();
            buffer = '';
            ultimaTeclaTiempo = 0;

            if (codigo.length >= 4) {
                e.preventDefault();
                listeners.forEach(l => l(codigo));
            }
        }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
}

// ===== CÁMARA (ML KIT) =====

export async function pedirPermisoCamara(): Promise<boolean> {
    try {
        const { camera } = await BarcodeScanner.checkPermissions();
        if (camera === 'granted') return true;
        if (camera === 'denied') {
            await BarcodeScanner.openSettings();
            return false;
        }
        const { camera: nuevo } = await BarcodeScanner.requestPermissions();
        return nuevo === 'granted';
    } catch (e) {
        console.error('[scanner] Error pidiendo permiso de cámara:', e);
        return false;
    }
}

export async function escanearConCamara(): Promise<string | null> {
    try {
        const permiso = await pedirPermisoCamara();
        if (!permiso) return null;

        // En Android, verificar que el módulo de Google Barcode Scanner esté instalado
        if (Capacitor.getPlatform() === 'android') {
            const { available } = await BarcodeScanner.isGoogleBarcodeScannerModuleAvailable();

            if (!available) {
                // El módulo no está instalado → descargarlo
                await BarcodeScanner.installGoogleBarcodeScannerModule();
                // Esperar un momento a que se complete
                await new Promise(r => setTimeout(r, 1500));
            }
        }

        const { barcodes } = await BarcodeScanner.scan();

        if (barcodes.length === 0) return null;
        return barcodes[0].rawValue || null;
    } catch (e: any) {
        console.error('[scanner] Error escaneando:', e);

        const msg = e?.message || String(e);
        if (msg.includes('Failed to scan code')) {
            alert(
                '⚠️ El escáner de Google no está listo.\n\n' +
                'Conéctate a internet una vez, abre la app y espera 10 segundos. ' +
                'Después funcionará offline.'
            );
        } else if (msg.includes('cancel') || msg.includes('Cancel')) {
            // El usuario cerró la cámara, no hacemos nada
        } else {
            alert(`No se pudo abrir la cámara: ${msg}`);
        }
        return null;
    }
}