
let ctx: AudioContext | null = null;

const getCtx = () => {
  if (!ctx) {
    const Ctor = window.AudioContext || (window as any).webkitAudioContext;
    ctx = new Ctor();
  }
  if (ctx && ctx.state === 'suspended') {
    ctx.resume();
  }
  return ctx;
};

const createOscillator = (
  type: OscillatorType, 
  startFreq: number, 
  endFreq: number, 
  duration: number, 
  vol: number
) => {
  const context = getCtx();
  if (!context) return;
  
  const osc = context.createOscillator();
  const gain = context.createGain();
  
  osc.type = type;
  osc.frequency.setValueAtTime(startFreq, context.currentTime);
  if (endFreq !== startFreq) {
    osc.frequency.exponentialRampToValueAtTime(endFreq, context.currentTime + duration);
  }
  
  gain.gain.setValueAtTime(vol, context.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.01, context.currentTime + duration);
  
  osc.connect(gain);
  gain.connect(context.destination);
  
  osc.start();
  osc.stop(context.currentTime + duration);
};

export const playSound = (type: 'shoot' | 'hit' | 'gem' | 'levelup' | 'select' | 'die' | 'explosion' | 'powerup') => {
  switch (type) {
    case 'shoot':
      createOscillator('triangle', 400, 100, 0.1, 0.1);
      break;
    case 'hit':
      createOscillator('sawtooth', 100, 50, 0.05, 0.1);
      break;
    case 'gem':
      createOscillator('sine', 800, 1200, 0.05, 0.05);
      break;
    case 'levelup':
      setTimeout(() => createOscillator('square', 400, 400, 0.1, 0.1), 0);
      setTimeout(() => createOscillator('square', 500, 500, 0.1, 0.1), 100);
      setTimeout(() => createOscillator('square', 800, 800, 0.2, 0.1), 200);
      break;
    case 'select':
      createOscillator('sine', 600, 800, 0.1, 0.1);
      break;
    case 'powerup':
      createOscillator('sine', 300, 800, 0.3, 0.2);
      break;
    case 'explosion':
      // Noise is harder with simple oscillators, using low freq sawtooth for rumble
      createOscillator('sawtooth', 100, 10, 0.3, 0.3);
      createOscillator('square', 80, 10, 0.3, 0.2);
      break;
    case 'die':
      createOscillator('sawtooth', 200, 50, 1.0, 0.3);
      break;
  }
};

export const initAudio = () => {
  getCtx();
};
