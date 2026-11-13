/**
 * src/lib/feedback/audioFeedback.js
 * Sintetizador modular Web Audio API + HTML5 Vibration API para Firmas Multimodales (WCAG 1.4.2).
 * Soporta las 4 firmas de la Actividad Práctica 14:
 *   1. exito       (Acorde ascendente 523 Hz -> 659 Hz -> 784 Hz, 240 ms | Vibración: [40] ms)
 *   2. error       (Disonancia grave 220 Hz -> 165 Hz, 260 ms            | Vibración: [70, 40, 90] ms)
 *   3. cancelacion (Barrido descendente 660 Hz -> 440 Hz, 180 ms         | Vibración: [50, 30, 50] ms)
 *   4. progreso    (Pulso rítmico suave 440 Hz -> 494 Hz, 140 ms         | Vibración: [20] ms)
 */

export const MULTIMODAL_SIGNATURES = {
  exito: {
    id: 'exito',
    label: 'Éxito / Confirmación',
    wave: 'sine',
    freqStart: 523.25,
    freqMid: 659.25,
    freqEnd: 783.99,
    durationMs: 240,
    gainPeak: 0.08,
    vibratePattern: [40],
    description: 'Arpegio ascendente mayor (Do5 → Mi5 → Sol5) que confirma guardado o restauración.',
  },
  error: {
    id: 'error',
    label: 'Error / Alerta Crítica',
    wave: 'triangle',
    freqStart: 220,
    freqEnd: 165,
    durationMs: 260,
    gainPeak: 0.1,
    vibratePattern: [70, 40, 90],
    description: 'Intervalo descendente grave (220 Hz → 165 Hz) con doble vibración firme de alerta.',
  },
  cancelacion: {
    id: 'cancelacion',
    label: 'Eliminación / Cancelación',
    wave: 'sine',
    freqStart: 660,
    freqEnd: 440,
    durationMs: 180,
    gainPeak: 0.07,
    vibratePattern: [50, 30, 50],
    description: 'Earcon descendente breve (660 Hz → 440 Hz en 180 ms) sincronizado con patrón [50, 30, 50] ms.',
  },
  progreso: {
    id: 'progreso',
    label: 'Progreso / Procesando',
    wave: 'sine',
    freqStart: 440,
    freqEnd: 493.88,
    durationMs: 140,
    gainPeak: 0.05,
    vibratePattern: [20],
    description: 'Pulso corto ascendente (La4 → Si4 en 140 ms) con toque táctil ligero de 20 ms.',
  },
};

let sharedContext = null;

export function isSoundAllowed(forceWhenChecked = false) {
  if (typeof window === 'undefined') return false;
  if (forceWhenChecked) return true;
  const muted = localStorage.getItem('fluye_mute_audio') === '1'
    || document.documentElement.dataset.audioMuted === 'true';
  return !muted;
}

export function triggerSignature(type = 'cancelacion', options = {}) {
  const sig = MULTIMODAL_SIGNATURES[type] || MULTIMODAL_SIGNATURES.cancelacion;
  const { forceAudio = false, enableAudio = true, enableHaptic = true } = options;

  // 1. Canal Auditivo (Web Audio API sin await para mantener sincronía física)
  if (enableAudio && isSoundAllowed(forceAudio)) {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (AudioCtx) {
      try {
        if (!sharedContext) sharedContext = new AudioCtx();
        if (sharedContext.state === 'suspended') {
          sharedContext.resume().catch(() => {});
        }
        const now = sharedContext.currentTime;
        const durationSec = sig.durationMs / 1000;
        const osc = sharedContext.createOscillator();
        const gain = sharedContext.createGain();

        osc.type = sig.wave;
        osc.frequency.setValueAtTime(sig.freqStart, now);
        if (sig.freqMid) {
          osc.frequency.setValueAtTime(sig.freqMid, now + durationSec * 0.45);
        }
        osc.frequency.exponentialRampToValueAtTime(sig.freqEnd, now + durationSec * 0.9);

        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.linearRampToValueAtTime(sig.gainPeak, now + 0.012);
        gain.gain.exponentialRampToValueAtTime(0.0008, now + durationSec);

        osc.connect(gain);
        gain.connect(sharedContext.destination);

        osc.onended = () => {
          osc.disconnect();
          gain.disconnect();
        };

        osc.start(now);
        osc.stop(now + durationSec + 0.01);
      } catch {
        // El audio opcional nunca bloquea el flujo principal
      }
    }
  }

  // 2. Canal Háptico (HTML5 Vibration API en el mismo tick)
  if (enableHaptic && typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
    try {
      navigator.vibrate(sig.vibratePattern);
    } catch {
      // Dispositivos sin soporte ignoran de forma segura
    }
  }

  return sig;
}
