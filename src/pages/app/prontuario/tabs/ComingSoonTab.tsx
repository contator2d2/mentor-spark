// Placeholder reaproveitável — usado nas abas que serão entregues nas próximas fases
import { Card } from "@/components/ui/card";
import { LucideIcon, Lock } from "lucide-react";

interface Props {
  icon?: LucideIcon;
  title: string;
  description: string;
  phase: string;
}

export function ComingSoonTab({ icon: Icon = Lock, title, description, phase }: Props) {
  return (
    <Card className="p-10 text-center">
      <div className="h-14 w-14 mx-auto rounded-2xl bg-muted/40 flex items-center justify-center mb-4">
        <Icon className="h-7 w-7 text-muted-foreground" />
      </div>
      <h3 className="font-display text-lg font-semibold">{title}</h3>
      <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">{description}</p>
      <div className="mt-4 inline-flex items-center gap-2 text-xs uppercase tracking-wider px-3 py-1 rounded-full bg-primary/10 text-primary border border-primary/30">
        Liberado em {phase}
      </div>
    </Card>
  );
}
