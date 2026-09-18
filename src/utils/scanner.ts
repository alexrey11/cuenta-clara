// ============================================================
// Servicio de escáner: soporta cámara (ML Kit) y Bluetooth HID
// ============================================================

// ===== DETECCIÓN DE ESCÁNER BLUETOOTH (KEYBOARD WEDGE) =====

// Los escáneres Bluetooth HID se comportan como teclados:
// envían los caracteres del código + Enter al final.
// Detectamos esto midiendo la velocidad de escritura:
// un humano no escribe más de ~15 caracteres por segundo.
// Un escáner escribe 100+ caracteres en menos de 100ms.

let buffer = '';
let ultimaTeclaTiempo = 0;
const VELOCIDAD_MINIMA_MS = 50; // si el intervalo entre teclas es < 50ms, es un escáner

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

export function iniciarEscuchaBluetooth() {
    if (typeof window === 'undefined') return;

    const handler = (e: KeyboardEvent) => {
        const ahora = Date.now();

        // Si pasó mucho tiempo desde la última tecla, reiniciar buffer
        if (ahora - ultimaTeclaTiempo > 100) {
            buffer = '';
        }

        // Si es una tecla imprimible (letra, número, símbolo)
        if (e.key.length === 1) {
            const intervalo = ahora - ultimaTeclaTiempo;
            ultimaTeclaTiempo = ahora;
            buffer += e.key;

            // Si el intervalo entre teclas es muy corto, es un escáner
            if (intervalo < VELOCIDAD_MINIMA_MS || buffer.length > 8) {
                // Prevenir que el carácter se escriba en un input
                e.preventDefault();
            }
        }

        // Enter = fin del escaneo
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

    // Retornar función para limpiar
    return () => {
        window.removeEventListener('keydown', handler);
    };
}

// ===== DETECCIÓN DE CÁMARA (ML KIT) =====

import { BarcodeScanner } from '@capacitor-mlkit/barcode-scanning';

export async function pedirPermisoCamara(): Promise<boolean> {
    try {
        const { camera } = await BarcodeScanner.checkPermissions();
        if (camera === 'granted') return true;
        if (camera === 'denied') {
            // Abrir ajustes del sistema
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

        // El plugin renderiza la cámara DETRÁS del webview.
        // El webview debe ser transparente.
        document.body.classList.add('scanner-activo');

        const { barcodes } = await BarcodeScanner.scan();

        document.body.classList.remove('scanner-activo');

        if (barcodes.length === 0) return null;
        return barcodes[0].rawValue || null;
    } catch (e) {
        document.body.classList.remove('scanner-activo');
        console.error('[scanner] Error escaneando:', e);
        return null;
    }
}