import { useEffect, useMemo, useRef, useState } from "react";
import { motion, useMotionValue, useSpring } from "framer-motion";
import { ArrowDownUp, Calculator, Ruler, Sparkles } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type ParametricValues = {
  area: number;
  ceilingHeight: number;
};

type CostSummary = {
  material: number;
  labor: number;
  total: number;
};

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  maximumFractionDigits: 2,
});

const calculateBudget = ({ area, ceilingHeight }: ParametricValues): CostSummary => {
  const normalizedArea = Number.isFinite(area) ? Math.max(area, 0) : 0;
  const normalizedHeight = Number.isFinite(ceilingHeight) ? Math.max(ceilingHeight, 0) : 0;
  const heightFactor = normalizedHeight / 2.8;
  const material = normalizedArea * 1450 * heightFactor;
  const labor = normalizedArea * 1050 * (0.88 + heightFactor * 0.12);

  return {
    material,
    labor,
    total: material + labor,
  };
};

function AnimatedCurrency({ value, active }: { value: number; active: boolean }) {
  const motionValue = useMotionValue(value);
  const springValue = useSpring(motionValue, { stiffness: 120, damping: 24, mass: 0.45 });
  const [displayValue, setDisplayValue] = useState(value);

  useEffect(() => {
    motionValue.set(value);
  }, [motionValue, value]);

  useEffect(() => springValue.on("change", (latest) => setDisplayValue(latest)), [springValue]);

  return (
    <motion.span
      animate={{ scale: active ? [1, 1.025, 1] : 1 }}
      transition={{ duration: 0.45, ease: "easeOut" }}
      className="tabular-nums"
    >
      {currencyFormatter.format(displayValue)}
    </motion.span>
  );
}

function CostBlock({
  title,
  value,
  active,
  emphasis = false,
}: {
  title: string;
  value: number;
  active: boolean;
  emphasis?: boolean;
}) {
  return (
    <motion.div
      animate={{
        backgroundColor: active ? "hsl(var(--accent) / 0.1)" : "hsl(var(--card))",
        borderColor: active ? "hsl(var(--accent) / 0.35)" : "hsl(var(--border))",
      }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className={cn(
        "rounded-lg border p-4 shadow-sm transition-colors",
        emphasis && "md:col-span-1 ring-1 ring-accent/20",
      )}
    >
      <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{title}</p>
      <p className={cn("mt-2 font-mono text-xl font-bold text-foreground", emphasis && "text-2xl text-accent")}>
        <AnimatedCurrency value={value} active={active} />
      </p>
    </motion.div>
  );
}

export function ParametricSyncForm() {
  const [inputs, setInputs] = useState<ParametricValues>({ area: 120, ceilingHeight: 2.8 });
  const [debouncedInputs, setDebouncedInputs] = useState(inputs);
  const [isRecalculating, setIsRecalculating] = useState(false);
  const recalculationTimer = useRef<number>();

  useEffect(() => {
    setIsRecalculating(true);
    window.clearTimeout(recalculationTimer.current);

    recalculationTimer.current = window.setTimeout(() => {
      setDebouncedInputs(inputs);
      window.setTimeout(() => setIsRecalculating(false), 520);
    }, 400);

    return () => window.clearTimeout(recalculationTimer.current);
  }, [inputs]);

  const costs = useMemo(() => calculateBudget(debouncedInputs), [debouncedInputs]);

  const updateInput = (field: keyof ParametricValues, value: string) => {
    setInputs((current) => ({
      ...current,
      [field]: Number(value),
    }));
  };

  return (
    <section className="w-full rounded-lg border border-border bg-card p-5 text-foreground shadow-sm md:p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-accent/20 bg-accent/10 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-accent">
            <span className="relative flex size-2.5">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-accent opacity-60" />
              <span className="relative inline-flex size-2.5 rounded-full bg-accent" />
            </span>
            Sincronização Paramétrica Ativa
          </div>
          <h2 className="mt-4 text-2xl font-bold tracking-normal text-foreground">Inteligência Paramétrica</h2>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Ajuste os quantitativos da planta e acompanhe a atualização financeira em tempo real.
          </p>
        </div>

        <div className="flex items-center gap-2 rounded-lg border border-border bg-secondary px-3 py-2 text-sm font-semibold text-foreground">
          <Sparkles className="size-4 text-accent" />
          BIM 2D Sync
        </div>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="parametric-area" className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Ruler className="size-4 text-accent" />
            Área Total Construída (m²)
          </Label>
          <Input
            id="parametric-area"
            type="number"
            min="0"
            step="1"
            value={inputs.area}
            onChange={(event) => updateInput("area", event.target.value)}
            className="h-12 rounded-lg border-border bg-card text-base font-semibold text-foreground shadow-sm focus-visible:ring-accent"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="parametric-height" className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <ArrowDownUp className="size-4 text-accent" />
            Pé-direito (m)
          </Label>
          <Input
            id="parametric-height"
            type="number"
            min="0"
            step="0.05"
            value={inputs.ceilingHeight}
            onChange={(event) => updateInput("ceilingHeight", event.target.value)}
            className="h-12 rounded-lg border-border bg-card text-base font-semibold text-foreground shadow-sm focus-visible:ring-accent"
          />
        </div>
      </div>

      <motion.div
        animate={{
          backgroundColor: isRecalculating ? "hsl(var(--accent) / 0.08)" : "hsl(var(--secondary))",
        }}
        transition={{ duration: 0.45, ease: "easeOut" }}
        className="mt-6 rounded-lg border border-border p-4 md:p-5"
      >
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Calculator className="size-5 text-accent" />
            <h3 className="text-base font-bold text-foreground">Resumo de Custos</h3>
          </div>
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            {isRecalculating ? "Recalculando" : "Atualizado"}
          </span>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <CostBlock title="Custo de Material" value={costs.material} active={isRecalculating} />
          <CostBlock title="Custo de Mão de Obra" value={costs.labor} active={isRecalculating} />
          <CostBlock title="Custo Total" value={costs.total} active={isRecalculating} emphasis />
        </div>
      </motion.div>
    </section>
  );
}

export default ParametricSyncForm;