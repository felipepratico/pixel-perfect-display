import { useEffect, useRef, useState } from "react";

/**
 * Count-up animado: interpola de 0 até o valor alvo com easing cubic-out.
 * Roda em todo `target` novo (page load ou mudança de filtro).
 */
export function useCountUp(target: number, duration = 900): number {
  const [value, setValue] = useState(0);
  const frameRef = useRef<number | null>(null);

  useEffect(() => {
    if (!Number.isFinite(target)) return;
    if (target === 0) {
      setValue(0);
      return;
    }

    const start = performance.now();
    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(target * eased);
      if (progress < 1) frameRef.current = requestAnimationFrame(tick);
    };

    frameRef.current = requestAnimationFrame(tick);
    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, [target, duration]);

  return value;
}

/** Formata com casas decimais (pt-BR). */
export function useCountUpFormatted(target: number, formatter: (n: number) => string): string {
  const value = useCountUp(target);
  return formatter(value);
}
