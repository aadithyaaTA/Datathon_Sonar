// Web Audio API Acoustic Sonar Sound Synthesizer
let audioCtx = null;
let isMuted = false;

function getAudioContext() {
  if (!audioCtx && typeof window !== 'undefined') {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

export function playSonarPing() {
  if (isMuted) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    // Frequency sweep characteristic of marine hydroacoustic echo
    const now = ctx.currentTime;
    osc.frequency.setValueAtTime(950, now);
    osc.frequency.exponentialRampToValueAtTime(1600, now + 0.08);
    osc.frequency.exponentialRampToValueAtTime(600, now + 0.35);

    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.45);
  } catch (e) {
    // Graceful silence if audio context is blocked by browser policy
  }
}

export function playTargetClick() {
  if (isMuted) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    const now = ctx.currentTime;
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(1200, now);
    osc.frequency.exponentialRampToValueAtTime(800, now + 0.05);

    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.06);
  } catch (e) {}
}

export function setAudioMuted(muted) {
  isMuted = muted;
  return isMuted;
}

export function getAudioMuted() {
  return isMuted;
}
