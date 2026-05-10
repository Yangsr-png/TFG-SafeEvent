import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';

interface QRScannerProps {
  onScanSuccess: (decodedText: string) => void;
}

export default function QRScanner({ onScanSuccess }: QRScannerProps) {
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // 1. Inicializamos el motor base, NO la interfaz prefabricada
    const html5QrCode = new Html5Qrcode("qr-reader-video");
    html5QrCodeRef.current = html5QrCode;

    const startCamera = async () => {
      try {
        await html5QrCode.start(
          { facingMode: "environment" }, // Forzamos cámara trasera
          { fps: 10, qrbox: { width: 250, height: 250 }, aspectRatio: 1.0 },
          (decodedText) => {
            // 2. Detenemos la cámara antes de devolver el éxito para evitar bloqueos del hardware
            html5QrCode.stop().then(() => onScanSuccess(decodedText)).catch(console.error);
          },
          () => {} // Ignoramos el ruido de lectura de fotogramas vacíos
        );
      } catch (err) {
        console.warn("Cámara inaccesible:", err);
        setErrorMsg("No se detectó cámara o permisos denegados. Sube la imagen de tu entrada.");
      }
    };

    startCamera();

    // Cleanup: Destrucción total de la instancia de cámara al desmontar
    return () => {
      if (html5QrCode.isScanning) {
        html5QrCode.stop().catch(console.error);
      }
    };
  }, [onScanSuccess]);

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    setErrorMsg(null);

    try {
      // 3. Si la cámara estaba activa, la apagamos para evitar conflictos de procesamiento
      if (html5QrCodeRef.current?.isScanning) {
        await html5QrCodeRef.current.stop();
      }

      // Escaneamos el archivo directamente
      const decodedText = await html5QrCodeRef.current!.scanFile(file, false);
      onScanSuccess(decodedText);
      
    } catch (err) {
      setErrorMsg("No se detectó ningún código QR válido en esta imagen.");
      setIsProcessing(false);
      
      // Limpiamos el input para que pueda volver a intentar subir la misma foto si quiere
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="w-full flex flex-col items-center">
      
      {/* Visualizador de Cámara Controlado */}
      <div className="relative w-full aspect-square bg-slate-900 overflow-hidden flex items-center justify-center">
        {isProcessing && (
          <div className="absolute inset-0 z-20 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center">
             <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        )}
        
        {/* El div donde html5-qrcode inyectará el <video> nativo */}
        <div 
          id="qr-reader-video" 
          className="w-full h-full [&>video]:object-cover [&>video]:w-full [&>video]:h-full"
        ></div>
        
        {/* Máscara estética de enfoque */}
        <div className="absolute inset-0 z-10 pointer-events-none border-[50px] border-slate-950/50">
           <div className="w-full h-full border-2 border-blue-500/50 shadow-[0_0_15px_rgba(59,130,246,0.5)]"></div>
        </div>
      </div>

      {errorMsg && (
        <p className="text-red-400 text-xs font-medium text-center my-4 px-2">{errorMsg}</p>
      )}

      {/* Botón Profesional para Archivos */}
      <div className="w-full p-4 bg-slate-900/50 border-t border-slate-800">
        <button
          onClick={() => fileInputRef.current?.click()} // <-- ESTO ABRE LA GALERÍA
          disabled={isProcessing}
          className="w-full flex items-center justify-center gap-2.5 px-4 py-3.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium rounded-xl border border-slate-600 transition-colors active:scale-95 disabled:opacity-50"
        >
          <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
             {/* Icono de imagen */}
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          Subir entrada desde galería
        </button>
        
        {/* INPUT INVISIBLE QUE PROCESA LA IMAGEN */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleImageUpload}
          accept="image/*"
          className="hidden" // <-- Lo ocultamos para que no rompa el diseño
        />
      </div>
    </div>
  );
}