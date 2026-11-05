import { Maximize2, Minimize2 } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";

export function FullscreenToggle() {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const supported =
    typeof document !== "undefined" &&
    "fullscreenEnabled" in document &&
    document.fullscreenEnabled;

  useEffect(() => {
    const onChange = () => setIsFullscreen(Boolean(document.fullscreenElement));
    onChange();
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  if (!supported) return null;

  async function alternar() {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else {
        await document.documentElement.requestFullscreen();
      }
    } catch {
      // Navegador bloqueou ou fullscreen indisponível: silencioso
    }
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      onClick={alternar}
      title={isFullscreen ? "Sair da tela expansiva" : "Tela expansiva"}
      aria-label={isFullscreen ? "Sair da tela expansiva" : "Tela expansiva"}
      aria-pressed={isFullscreen}
      className="size-8 shrink-0 rounded-lg transition-all duration-300 ease-in-out active:scale-95"
    >
      {isFullscreen ? (
        <Minimize2 className="size-4 transition-transform duration-300 ease-in-out" />
      ) : (
        <Maximize2 className="size-4 transition-transform duration-300 ease-in-out" />
      )}
    </Button>
  );
}
