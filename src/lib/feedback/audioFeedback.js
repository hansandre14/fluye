/**
 * src/lib/feedback/audioFeedback.js
 * Sintetizador polifónico Web Audio API + HTML5 Vibration API para Firmas Multimodales (WCAG 1.4.2).
 * Mejorado con síntesis armónica dual (fundamental + sobretono), envolvente ADSR con meseta de sostenimiento
 * y etapa de compresión dinámica para máxima claridad y volumen audible en parlantes de laptop y proyectores.
 *
 * Soporta las 4 firmas de la Actividad Práctica 14:
 *   1. exito       (Arpegio mayor Do5 -> Mi5 -> Sol5, 320 ms | Vibración: [60] ms)
 *   2. error       (Doble pulso grave-medio 330 Hz -> 220 Hz, 360 ms | Vibración: [90, 45, 110] ms)
 *   3. cancelacion (Barrido descendente 660 Hz -> 440 Hz, 240 ms | Vibración: [50, 30, 50] ms)
 *   4. progreso    (Doble toque ascendente 440 Hz -> 587 Hz, 200 ms | Vibración: [30] ms)
 */

export const MULTIMODAL_SIGNATURES = {
  exito: {
    id: 'exito',
    label: 'Éxito / Confirmación',
    wave: 'triangle',
    harmonicWave: 'sine',
    harmonicRatio: 2,
    freqStart: 523.25,
    freqMid: 659.25,
    freqEnd: 783.99,
    durationMs: 320,
    gainPeak: 0.48,
    vibratePattern: [60],
    description: 'Arpegio ascendente mayor (Do5 → Mi5 → Sol5) de alta claridad que confirma guardado o restauración.',
  },
  error: {
    id: 'error',
    label: 'Error / Alerta Crítica',
    wave: 'sawtooth',
    harmonicWave: 'triangle',
    harmonicRatio: 2,
    freqStart: 330,
    freqMid: 246.94,
    freqEnd: 196,
    durationMs: 360,
    gainPeak: 0.52,
    vibratePattern: [90, 45, 110],
    description: 'Disonancia descendente con armónicos medios (330 Hz → 196 Hz) y doble vibración firme de alerta.',
  },
  cancelacion: {
    id: 'cancelacion',
    label: 'Eliminación / Cancelación',
    wave: 'triangle',
    harmonicWave: 'sine',
    harmonicRatio: 1.5,
    freqStart: 660,
    freqMid: 523.25,
    freqEnd: 440,
    durationMs: 240,
    gainPeak: 0.46,
    vibratePattern: [50, 30, 50],
    description: 'Earcon descendente nítido (660 Hz → 440 Hz en 240 ms) sincronizado con patrón [50, 30, 50] ms.',
  },
  progreso: {
    id: 'progreso',
    label: 'Progreso / Selección Rápida',
    wave: 'triangle',
    harmonicWave: 'sine',
    harmonicRatio: 2,
    freqStart: 440,
    freqMid: 523.25,
    freqEnd: 587.33,
    durationMs: 200,
    gainPeak: 0.42,
    vibratePattern: [30],
    description: 'Pulso ascendente brillante (La4 → Re5 en 200 ms) con toque táctil ligero de 30 ms.',
  },
};

let sharedContext = null;
let masterCompressor = null;

function getAudioEngine() {
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) return null;
  if (!sharedContext) {
    sharedContext = new AudioCtx();
    masterCompressor = sharedContext.createDynamicsCompressor();
    masterCompressor.threshold.setValueAtTime(-14, sharedContext.currentTime);
    masterCompressor.knee.setValueAtTime(12, sharedContext.currentTime);
    masterCompressor.ratio.setValueAtTime(4, sharedContext.currentTime);
    masterCompressor.attack.setValueAtTime(0.003, sharedContext.currentTime);
    masterCompressor.release.setValueAtTime(0.15, sharedContext.currentTime);
    masterCompressor.connect(sharedContext.destination);
  }
  return { ctx: sharedContext, destination: masterCompressor || sharedContext.destination };
}

export function isSoundAllowed(forceWhenChecked = false) {
  if (typeof window === 'undefined') return false;
  if (forceWhenChecked) return true;
  const muted = localStorage.getItem('fluye_mute_audio') === '1'
    || document.documentElement.dataset.audioMuted === 'true';
  return !muted;
}

function scheduleSynthVoice(ctx, destination, sig, startTime) {
  const durationSec = sig.durationMs / 1000;
  const oscMain = ctx.createOscillator();
  const oscHarmonic = ctx.createOscillator();
  const filter = ctx.createBiquadFilter();
  const gainMain = ctx.createGain();
  const gainHarmonic = ctx.createGain();

  // Filtro pasa-bajos suave para que las ondas sawtooth/triangle suenen cálidas pero potentes
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(sig.id === 'error' ? 1650 : 2800, startTime);
  filter.Q.setValueAtTime(1.2, startTime);

  oscMain.type = sig.wave;
  oscHarmonic.type = sig.harmonicWave || 'sine';

  const ratio = sig.harmonicRatio || 2;

  if (sig.id === 'exito') {
    // 3 notas articuladas (Do5 -> Mi5 -> Sol5) tipo chime bancario
    const step1 = startTime + durationSec * 0.32;
    const step2 = startTime + durationSec * 0.64;
    oscMain.frequency.setValueAtTime(sig.freqStart, startTime);
    oscMain.frequency.setValueAtTime(sig.freqMid, step1);
    oscMain.frequency.setValueAtTime(sig.freqEnd, step2);

    oscHarmonic.frequency.setValueAtTime(sig.freqStart * ratio, startTime);
    oscHarmonic.frequency.setValueAtTime(sig.freqMid * ratio, step1);
    oscHarmonic.frequency.setValueAtTime(sig.freqEnd * ratio, step2);
  } else if (sig.id === 'error') {
    // 2 pulsos de alerta claramente articulados (330 Hz -> pausa breve -> 196 Hz)
    const midPoint = startTime + durationSec * 0.48;
    oscMain.frequency.setValueAtTime(sig.freqStart, startTime);
    oscMain.frequency.exponentialRampToValueAtTime(sig.freqMid || 246.94, midPoint - 0.01);
    oscMain.frequency.setValueAtTime(sig.freqMid || 246.94, midPoint);
    oscMain.frequency.exponentialRampToValueAtTime(sig.freqEnd, startTime + durationSec * 0.95);

    oscHarmonic.frequency.setValueAtTime(sig.freqStart * ratio, startTime);
    oscHarmonic.frequency.setValueAtTime((sig.freqMid || 246.94) * ratio, midPoint);
    oscHarmonic.frequency.exponentialRampToValueAtTime(sig.freqEnd * ratio, startTime + durationSec * 0.95);
  } else {
    // Barrido melódico de 2 etapas (cancelacion / progreso)
    const midTime = startTime + durationSec * 0.45;
    oscMain.frequency.setValueAtTime(sig.freqStart, startTime);
    if (sig.freqMid) {
      oscMain.frequency.setValueAtTime(sig.freqMid, midTime);
    }
    oscMain.frequency.exponentialRampToValueAtTime(sig.freqEnd, startTime + durationSec * 0.92);

    oscHarmonic.frequency.setValueAtTime(sig.freqStart * ratio, startTime);
    if (sig.freqMid) {
      oscHarmonic.frequency.setValueAtTime(sig.freqMid * ratio, midTime);
    }
    oscHarmonic.frequency.exponentialRampToValueAtTime(sig.freqEnd * ratio, startTime + durationSec * 0.92);
  }

  // Envolvente ADSR con meseta real de sostenimiento para que se escuche fuerte y claro
  const attackEnd = startTime + 0.012;
  const sustainEnd = startTime + durationSec * 0.74;
  const releaseEnd = startTime + durationSec;

  gainMain.gain.setValueAtTime(0.001, startTime);
  gainMain.gain.linearRampToValueAtTime(sig.gainPeak, attackEnd);
  if (sig.id === 'error') {
    // Modulación de doble pulso en error para mayor distinción perceptual
    const dipTime = startTime + durationSec * 0.44;
    const pulse2Time = startTime + durationSec * 0.50;
    gainMain.gain.setValueAtTime(sig.gainPeak * 0.92, dipTime - 0.02);
    gainMain.gain.linearRampToValueAtTime(sig.gainPeak * 0.18, dipTime);
    gainMain.gain.linearRampToValueAtTime(sig.gainPeak, pulse2Time);
  }
  gainMain.gain.setValueAtTime(sig.gainPeak * 0.88, sustainEnd);
  gainMain.gain.exponentialRampToValueAtTime(0.001, releaseEnd);

  const harmonicPeak = sig.gainPeak * 0.35;
  gainHarmonic.gain.setValueAtTime(0.001, startTime);
  gainHarmonic.gain.linearRampToValueAtTime(harmonicPeak, attackEnd);
  gainHarmonic.gain.setValueAtTime(harmonicPeak * 0.8, sustainEnd);
  gainHarmonic.gain.exponentialRampToValueAtTime(0.0008, releaseEnd);

  oscMain.connect(filter);
  filter.connect(gainMain);
  gainMain.connect(destination);

  oscHarmonic.connect(gainHarmonic);
  gainHarmonic.connect(destination);

  oscMain.onended = () => {
    oscMain.disconnect();
    oscHarmonic.disconnect();
    filter.disconnect();
    gainMain.disconnect();
    gainHarmonic.disconnect();
  };

  oscMain.start(startTime);
  oscHarmonic.start(startTime);
  oscMain.stop(releaseEnd + 0.015);
  oscHarmonic.stop(releaseEnd + 0.015);
}

export function triggerSignature(type = 'cancelacion', options = {}) {
  const sig = MULTIMODAL_SIGNATURES[type] || MULTIMODAL_SIGNATURES.cancelacion;
  const { forceAudio = false, enableAudio = true, enableHaptic = true } = options;

  // 1. Canal Auditivo (Web Audio API polifónico)
  if (enableAudio && isSoundAllowed(forceAudio)) {
    try {
      const engine = getAudioEngine();
      if (engine) {
        const { ctx, destination } = engine;
        if (ctx.state === 'suspended') {
          ctx.resume().then(() => {
            scheduleSynthVoice(ctx, destination, sig, ctx.currentTime + 0.005);
          }).catch(() => {});
        } else {
          scheduleSynthVoice(ctx, destination, sig, ctx.currentTime + 0.005);
        }
      }
    } catch {
      // El audio opcional nunca bloquea el flujo principal
    }
  }

  // 2. Canal Háptico (HTML5 Vibration API en el mismo ciclo)
  if (enableHaptic && typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
    try {
      navigator.vibrate(sig.vibratePattern);
    } catch {
      // Dispositivos sin soporte ignoran de forma segura
    }
  }

  return sig;
}
