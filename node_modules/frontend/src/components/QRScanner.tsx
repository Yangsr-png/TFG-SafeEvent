import { useEffect, useRef } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';

interface QRScannerProps {
  onScanSuccess: (decodedText: string) => void;
}

export default function QRScanner({ onScanSuccess }: QRScannerProps) {
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);

  useEffect(() => {
    scannerRef.current = new Html5QrcodeScanner(
      "qr-reader",
      { fps: 10, qrbox: { width: 250, height: 250 }, aspectRatio: 1.0 },
      false
    );

    scannerRef.current.render(
      (decodedText) => {
        // FIX: Eliminamos el .pause() que causaba el crash al subir imágenes.
        // Simplemente pasamos el texto. App.tsx desmontará el componente.
        onScanSuccess(decodedText);
      },
      (error) => {
        // Los errores de lectura por fotograma son constantes, los ignoramos.
      }
    );

    // Cleanup: Apagar la cámara o limpiar la memoria al desmontar
    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(console.error);
      }
    };
  }, [onScanSuccess]);

  return (
    <div className="w-full max-w-sm mx-auto bg-white p-2 rounded-lg shadow-md text-black overflow-hidden">
      <h3 className="text-center font-bold mb-2">Escanea la Pulsera</h3>
      <div id="qr-reader" className="w-full border-none"></div>
    </div>
  );
}