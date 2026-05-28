import { render, screen, fireEvent, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import PanicButton from './PanicButton';

// 1. AISLAMIENTO ABSOLUTO (Mocks)
vi.mock('../contexts/SocketContext', () => ({
  useSocket: () => ({
    socket: { emit: vi.fn(), on: vi.fn(), off: vi.fn() },
    isConnected: true,
    activeAlert: null
  })
}));

const mockGeolocation = {
  watchPosition: vi.fn(),
  clearWatch: vi.fn(),
};

// SOLUCIÓN AL ERROR DE TYPESCRIPT: Usamos la API nativa de Vitest
vi.stubGlobal('navigator', {
  geolocation: mockGeolocation,
  vibrate: vi.fn(), 
});

describe('Lógica de Seguridad del PanicButton (Regla de los 3 Segundos)', () => {
  
  beforeEach(() => {
    // Tomamos el control del tiempo en JavaScript
    vi.useFakeTimers();
    vi.clearAllMocks();
  });

  afterEach(() => {
    // Devolvemos el tiempo a la normalidad al terminar cada test
    vi.useRealTimers();
  });

  it('🔴 FALLO SEGURO: NO debe activarse si se suelta a los 2.9 segundos (2900ms)', () => {
    render(<PanicButton userId="123" />);
    // Buscamos el botón gigante usando una expresión regular
    const button = screen.getByRole('button', { name: /sos/i });

    // 1. El usuario presiona el dedo
    fireEvent.mouseDown(button);

    // 2. Avanzamos el tiempo 2.9 segundos exactos
    act(() => {
      vi.advanceTimersByTime(2900);
    });

    // 3. El usuario se arrepiente y suelta el dedo antes de tiempo
    fireEvent.mouseUp(button);

    // 4. Avanzamos un poco más el tiempo para asegurarnos de que la función no se coló
    act(() => {
      vi.advanceTimersByTime(200); 
    });

    // ASERCIÓN: La pantalla táctica de "Ayuda en Camino" NO debe existir en el DOM
    expect(screen.queryByText('Ayuda en Camino')).not.toBeInTheDocument();
  });

  it('🔴 FALLO SEGURO: NO debe activarse sumando clics interrumpidos (1.5s + 1.5s)', () => {
    render(<PanicButton userId="123" />);
    const button = screen.getByRole('button', { name: /sos/i });

    // Intento 1 (1500ms)
    fireEvent.mouseDown(button);
    act(() => vi.advanceTimersByTime(1500));
    fireEvent.mouseUp(button); // Suelta el dedo, el temporizador debe destruirse aquí

    // Intento 2 (1500ms)
    fireEvent.mouseDown(button);
    act(() => vi.advanceTimersByTime(1500));
    fireEvent.mouseUp(button);

    // ASERCIÓN: Si la lógica está mal, 1500+1500 sumaría 3000 y se activaría. Esto prueba que se resetea a 0.
    expect(screen.queryByText('Ayuda en Camino')).not.toBeInTheDocument();
  });

  it('✅ ÉXITO: DEBE activarse al mantener presionado exactamente 3000ms sin soltar', () => {
    render(<PanicButton userId="123" />);
    const button = screen.getByRole('button', { name: /sos/i });

    // 1. Presiona el dedo
    fireEvent.mouseDown(button);

    // 2. Mantiene durante 3 segundos justos
    act(() => {
      vi.advanceTimersByTime(3000);
    });

    // ASERCIÓN: La vista 2 desaparece y el texto de estado crítico se ha renderizado
    expect(screen.getByText('Ayuda en Camino')).toBeInTheDocument();
    
    // Verificamos que la función watchPosition del GPS se llamó (usando el mock limpio)
    expect(mockGeolocation.watchPosition).toHaveBeenCalledTimes(1);
  });
});