'use client';

import React, { useEffect, useRef, useCallback } from 'react';

export type CelebrationType = 'poppers' | 'stars' | 'ticket-rip' | 'hearts';

export interface CelebrationOptions {
  type?: CelebrationType;
  x?: number;
  y?: number;
  particleCount?: number;
  playAudio?: boolean;
}

// Global dispatcher helper
export function triggerCelebration(options?: CelebrationOptions) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(
    new CustomEvent('jdq:celebrate', {
      detail: options || { type: 'poppers' },
    })
  );
}

// Gentle Web Audio API synthesizer for playful gamified feedback without external MP3 files
function playCelebratoryChime(type: CelebrationType = 'poppers') {
  if (typeof window === 'undefined') return;
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    const now = ctx.currentTime;

    if (type === 'ticket-rip') {
      // Gentle tearing swoosh + harmonic ping
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(320, now);
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.15);
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.35);
    } else {
      // Cheerful party popper bell arpeggio (C5 -> E5 -> G5)
      const notes = [523.25, 659.25, 783.99];
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + i * 0.08);
        gain.gain.setValueAtTime(0.06, now + i * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.3);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + i * 0.08);
        osc.stop(now + i * 0.08 + 0.3);
      });
    }
  } catch {
    // Audio contexts blocked or disabled in client environment
  }
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  w: number;
  h: number;
  color: string;
  rotation: number;
  rotSpeed: number;
  opacity: number;
  life: number;
  maxLife: number;
  type: 'confetti' | 'star' | 'circle' | 'heart';
}

const BRAND_PALETTE = [
  '#2D6A4F', // Pine Green
  '#FFB703', // Sun Gold
  '#F77F00', // Amber
  '#52B788', // Mint
  '#BC4749', // Coral
  '#FFD166', // Butter Gold
  '#582F0E', // Wood Brown
  '#FFFFFF', // Sparkle White
];

export function CelebrationEffects() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animFrameRef = useRef<number | null>(null);

  const spawnParticles = useCallback((options: CelebrationOptions = {}) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const width = canvas.width;
    const height = canvas.height;
    if (width === 0 || height === 0) return;

    const type = options.type || 'poppers';
    if (options.playAudio !== false) {
      playCelebratoryChime(type);
    }

    const count = options.particleCount || (type === 'ticket-rip' ? 65 : 110);
    const newParticles: Particle[] = [];

    if (type === 'poppers') {
      // Dual cannon burst from bottom corners firing inwards and upwards
      const halfCount = Math.floor(count / 2);

      // Left Cannon (shoots towards upper right)
      for (let i = 0; i < halfCount; i++) {
        const angle = -Math.PI / 4 - (Math.random() * 0.35); // ~ -45° to -65°
        const speed = 14 + Math.random() * 16;
        newParticles.push({
          x: width * 0.08,
          y: height * 0.95,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          w: 8 + Math.random() * 8,
          h: 4 + Math.random() * 6,
          color: BRAND_PALETTE[Math.floor(Math.random() * BRAND_PALETTE.length)],
          rotation: Math.random() * Math.PI * 2,
          rotSpeed: (Math.random() - 0.5) * 0.25,
          opacity: 1,
          life: 0,
          maxLife: 100 + Math.random() * 60,
          type: Math.random() > 0.3 ? 'confetti' : 'star',
        });
      }

      // Right Cannon (shoots towards upper left)
      for (let i = 0; i < halfCount; i++) {
        const angle = -Math.PI * 0.75 + (Math.random() * 0.35); // ~ -135° to -115°
        const speed = 14 + Math.random() * 16;
        newParticles.push({
          x: width * 0.92,
          y: height * 0.95,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          w: 8 + Math.random() * 8,
          h: 4 + Math.random() * 6,
          color: BRAND_PALETTE[Math.floor(Math.random() * BRAND_PALETTE.length)],
          rotation: Math.random() * Math.PI * 2,
          rotSpeed: (Math.random() - 0.5) * 0.25,
          opacity: 1,
          life: 0,
          maxLife: 100 + Math.random() * 60,
          type: Math.random() > 0.3 ? 'confetti' : 'star',
        });
      }
    } else if (type === 'ticket-rip') {
      // Horizontal burst from center (where the ticket perforation rips)
      const originX = options.x ?? width * 0.5;
      const originY = options.y ?? height * 0.45;

      for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 5 + Math.random() * 14;
        newParticles.push({
          x: originX + (Math.random() - 0.5) * 60,
          y: originY + (Math.random() - 0.5) * 20,
          vx: Math.cos(angle) * speed * 1.4,
          vy: Math.sin(angle) * speed - 2,
          w: 6 + Math.random() * 7,
          h: 3 + Math.random() * 5,
          color: BRAND_PALETTE[Math.floor(Math.random() * BRAND_PALETTE.length)],
          rotation: Math.random() * Math.PI * 2,
          rotSpeed: (Math.random() - 0.5) * 0.3,
          opacity: 1,
          life: 0,
          maxLife: 80 + Math.random() * 45,
          type: Math.random() > 0.5 ? 'confetti' : 'star',
        });
      }
    } else if (type === 'stars') {
      // Top shower of golden stars
      for (let i = 0; i < count; i++) {
        newParticles.push({
          x: Math.random() * width,
          y: -10,
          vx: (Math.random() - 0.5) * 3,
          vy: 2 + Math.random() * 5,
          w: 8 + Math.random() * 6,
          h: 8 + Math.random() * 6,
          color: ['#FFB703', '#FFD166', '#FFF8E1', '#F77F00'][Math.floor(Math.random() * 4)],
          rotation: Math.random() * Math.PI * 2,
          rotSpeed: (Math.random() - 0.5) * 0.1,
          opacity: 1,
          life: 0,
          maxLife: 110 + Math.random() * 50,
          type: 'star',
        });
      }
    }

    particlesRef.current.push(...newParticles);

    // Start render loop if not running
    if (!animFrameRef.current) {
      startAnimationLoop();
    }
  }, []);

  const drawStar = (ctx: CanvasRenderingContext2D, cx: number, cy: number, spikes: number, outerRadius: number, innerRadius: number) => {
    let rot = (Math.PI / 2) * 3;
    let x = cx;
    let y = cy;
    const step = Math.PI / spikes;

    ctx.beginPath();
    ctx.moveTo(cx, cy - outerRadius);
    for (let i = 0; i < spikes; i++) {
      x = cx + Math.cos(rot) * outerRadius;
      y = cy + Math.sin(rot) * outerRadius;
      ctx.lineTo(x, y);
      rot += step;

      x = cx + Math.cos(rot) * innerRadius;
      y = cy + Math.sin(rot) * innerRadius;
      ctx.lineTo(x, y);
      rot += step;
    }
    ctx.lineTo(cx, cy - outerRadius);
    ctx.closePath();
    ctx.fill();
  };

  const startAnimationLoop = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const particles = particlesRef.current;
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];

        p.life++;
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.35; // Gravity
        p.vx *= 0.98; // Air drag
        p.vy *= 0.98;
        p.rotation += p.rotSpeed;

        // Fade out during last 30% of lifespan
        const fadeThreshold = p.maxLife * 0.7;
        if (p.life > fadeThreshold) {
          p.opacity = Math.max(0, 1 - (p.life - fadeThreshold) / (p.maxLife - fadeThreshold));
        }

        if (p.life >= p.maxLife || p.opacity <= 0) {
          particles.splice(i, 1);
          continue;
        }

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.globalAlpha = p.opacity;
        ctx.fillStyle = p.color;

        if (p.type === 'confetti') {
          ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        } else if (p.type === 'star') {
          drawStar(ctx, 0, 0, 5, p.w / 1.5, p.w / 3.2);
        }

        ctx.restore();
      }

      if (particles.length > 0) {
        animFrameRef.current = requestAnimationFrame(render);
      } else {
        animFrameRef.current = null;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    };

    animFrameRef.current = requestAnimationFrame(render);
  };

  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    handleResize();
    window.addEventListener('resize', handleResize);

    const onCelebrateEvent = (e: Event) => {
      const custom = e as CustomEvent<CelebrationOptions>;
      spawnParticles(custom.detail || {});
    };

    window.addEventListener('jdq:celebrate', onCelebrateEvent);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('jdq:celebrate', onCelebrateEvent);
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [spawnParticles]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="fixed inset-0 pointer-events-none z-[9999]"
      style={{ width: '100vw', height: '100vh' }}
    />
  );
}
