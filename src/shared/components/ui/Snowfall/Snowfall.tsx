import { useEffect, useRef } from "react";

import { usePrefersReducedMotion } from "@/shared/hooks/usePrefersReducedMotion";
import { cx } from "../types";
import styles from "./Snowfall.module.css";

export interface SnowfallProps {
  active: boolean;
  /** Upper bound of flakes on screen. */
  maxFlakes?: number;
  className?: string;
}

interface Flake {
  x: number;
  y: number;
  r: number;
  vy: number;
  vx: number;
  phase: number;
}

/**
 * Lightweight canvas snowfall: a single requestAnimationFrame loop that pauses while the tab
 * is hidden and renders nothing when the user prefers reduced motion. Pointer events pass through.
 */
export function Snowfall({ active, maxFlakes = 80, className }: SnowfallProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const reducedMotion = usePrefersReducedMotion();
  const enabled = active && !reducedMotion;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!enabled || !canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;

    const count = Math.min(maxFlakes, 80);
    let width = 0;
    let height = 0;
    let frame = 0;
    let last = 0;
    let flakes: Flake[] = [];

    const spawn = (fromTop: boolean): Flake => ({
      x: Math.random() * width,
      y: fromTop ? -10 : Math.random() * height,
      r: 1 + Math.random() * 2.2,
      vy: 18 + Math.random() * 28,
      vx: -6 + Math.random() * 12,
      phase: Math.random() * Math.PI * 2,
    });

    const resize = () => {
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      width = canvas.clientWidth;
      height = canvas.clientHeight;
      canvas.width = Math.floor(width * ratio);
      canvas.height = Math.floor(height * ratio);
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      if (flakes.length === 0) flakes = Array.from({ length: count }, () => spawn(false));
    };

    const draw = (time: number) => {
      const delta = last ? Math.min(0.05, (time - last) / 1000) : 0;
      last = time;
      context.clearRect(0, 0, width, height);
      context.fillStyle = "rgba(255, 255, 255, 0.9)";
      context.strokeStyle = "rgba(72, 103, 168, 0.25)";
      context.lineWidth = 1;
      for (let i = 0; i < flakes.length; i += 1) {
        const flake = flakes[i];
        flake.phase += delta;
        flake.y += flake.vy * delta;
        flake.x += (flake.vx + Math.sin(flake.phase) * 10) * delta;
        if (flake.y > height + 10 || flake.x < -10 || flake.x > width + 10) {
          flakes[i] = spawn(true);
        }
        context.beginPath();
        context.arc(flake.x, flake.y, flake.r, 0, Math.PI * 2);
        context.fill();
        context.stroke();
      }
      frame = window.requestAnimationFrame(draw);
    };

    const start = () => {
      if (!frame) {
        last = 0;
        frame = window.requestAnimationFrame(draw);
      }
    };
    const stop = () => {
      if (frame) window.cancelAnimationFrame(frame);
      frame = 0;
    };
    const onVisibility = () => {
      if (document.hidden) stop();
      else start();
    };

    resize();
    start();
    window.addEventListener("resize", resize);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      stop();
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", onVisibility);
      context.clearRect(0, 0, width, height);
    };
  }, [enabled, maxFlakes]);

  if (!enabled) return null;

  return <canvas ref={canvasRef} className={cx(styles.canvas, className)} aria-hidden="true" />;
}
