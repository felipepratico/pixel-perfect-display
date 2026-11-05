import { Clock, UserCheck, UserX } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import type { PerfilPagamento } from "@/lib/adimplencia";

const PERFIL_CONFIG: Record<
  PerfilPagamento,
  { label: string; icon: React.ElementType; className: string }
> = {
  ADIMPLENTE: {
    label: "Bom padrão",
    icon: UserCheck,
    className: "border-emerald-200 bg-emerald-50 text-emerald-700",
  },
  ATRASADOR_LEVE: {
    label: "Atraso leve",
    icon: Clock,
    className: "border-amber-200 bg-amber-50 text-amber-700",
  },
  INADIMPLENTE: {
    label: "Inadimplente",
    icon: UserX,
    className: "border-destructive/20 bg-destructive/50 text-destructive",
  },
};

export function BadgePerfilPagamento({
  perfil,
  size = "sm",
}: {
  perfil: PerfilPagamento;
  size?: "sm" | "default";
}) {
  const config = PERFIL_CONFIG[perfil];
  const Icon = config.icon;
  return (
    <Badge variant="outline" className={`flex items-center gap-1.5 px-2 py-1 ${config.className}`}>
      <Icon className={`size-3 ${size === "sm" ? "size-2.5" : ""}`} />
      <span className={size === "sm" ? "text-[10px]" : "text-xs"}>{config.label}</span>
    </Badge>
  );
}
