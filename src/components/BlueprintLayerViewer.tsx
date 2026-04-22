import { useState } from "react";
import { motion } from "framer-motion";
import { BrickWall, Droplets, FileDown, Layers3, Lightbulb, Ruler } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

type LayerKey = "arch" | "hydro" | "elec";

type LayerState = Record<LayerKey, boolean>;

type LayerOption = {
  key: LayerKey;
  label: string;
  Icon: typeof BrickWall;
  activeClass: string;
};

const layerOptions: LayerOption[] = [
  {
    key: "arch",
    label: "Estrutura & Alvenaria",
    Icon: BrickWall,
    activeClass: "data-[state=checked]:bg-layer-arch",
  },
  {
    key: "hydro",
    label: "Instalações Hidráulicas",
    Icon: Droplets,
    activeClass: "data-[state=checked]:bg-layer-hydro",
  },
  {
    key: "elec",
    label: "Instalações Elétricas",
    Icon: Lightbulb,
    activeClass: "data-[state=checked]:bg-layer-elec",
  },
];

const fadeLayer = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
};

export function BlueprintLayerViewer() {
  const [layers, setLayers] = useState<LayerState>({ arch: true, hydro: false, elec: true });

  const toggleLayer = (key: LayerKey) => {
    setLayers((current) => ({ ...current, [key]: !current[key] }));
  };

  return (
    <section className="relative overflow-hidden rounded-xl border border-border bg-cad-board p-4 shadow-2xl md:p-6">
      <div className="pointer-events-none absolute inset-0 opacity-40 [background-image:linear-gradient(hsl(var(--cad-board-grid))_1px,transparent_1px),linear-gradient(90deg,hsl(var(--cad-board-grid))_1px,transparent_1px)] [background-size:28px_28px]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,hsl(var(--accent)/0.18),transparent_30%),linear-gradient(135deg,hsl(var(--foreground)/0.12),transparent_45%)]" />

      <div className="relative min-h-[620px]">
        <div className="absolute left-4 top-4 z-20 flex items-center gap-2 rounded-lg border border-white/10 bg-foreground/35 px-3 py-2 text-xs font-semibold text-primary-foreground backdrop-blur-md">
          <Layers3 className="h-4 w-4 text-accent" />
          BIM 2D · AI Construct
        </div>

        <LayerControlPanel layers={layers} onToggle={toggleLayer} />

        <div className="flex min-h-[620px] items-center justify-center px-0 py-20 md:px-8 md:py-14">
          <div className="relative aspect-[16/10] w-full max-w-5xl overflow-hidden rounded-lg border border-white/20 bg-cad-paper shadow-[0_28px_80px_hsl(var(--foreground)/0.45)]">
            <BaseBlueprint />

            <motion.div
              className="pointer-events-none absolute inset-0 z-10"
              variants={fadeLayer}
              animate={layers.arch ? "visible" : "hidden"}
              transition={{ duration: 0.3 }}
            >
              <ArchitectureLayer />
            </motion.div>

            <motion.div
              className="pointer-events-none absolute inset-0 z-20"
              variants={fadeLayer}
              animate={layers.hydro ? "visible" : "hidden"}
              transition={{ duration: 0.3 }}
            >
              <HydraulicLayer />
            </motion.div>

            <motion.div
              className="pointer-events-none absolute inset-0 z-30"
              variants={fadeLayer}
              animate={layers.elec ? "visible" : "hidden"}
              transition={{ duration: 0.3 }}
            >
              <ElectricalLayer />
            </motion.div>
          </div>
        </div>

        <div className="absolute bottom-4 left-4 z-20 flex items-center gap-3 rounded-lg border border-white/10 bg-foreground/35 px-3 py-2 text-xs text-primary-foreground backdrop-blur-md">
          <Ruler className="h-4 w-4 text-accent" />
          Escala visual 1:75 · Revisão IA 04
        </div>
      </div>
    </section>
  );
}

function LayerControlPanel({ layers, onToggle }: { layers: LayerState; onToggle: (key: LayerKey) => void }) {
  return (
    <aside className="absolute right-4 top-4 z-40 w-[min(330px,calc(100%-2rem))] rounded-xl border border-white/60 bg-white/90 p-4 shadow-lg backdrop-blur-md">
      <div className="mb-4">
        <div className="flex items-center gap-2 text-sm font-bold text-foreground">
          <Layers3 className="h-4 w-4 text-accent" />
          Camadas do Projeto (IA)
        </div>
        <p className="mt-1 text-xs text-muted-foreground">Ligue ou desligue disciplinas detectadas automaticamente.</p>
      </div>

      <div className="space-y-3">
        {layerOptions.map(({ key, label, Icon, activeClass }) => (
          <div key={key} className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card/80 px-3 py-2.5">
            <div className="flex min-w-0 items-center gap-2.5">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted text-foreground">
                <Icon className="h-4 w-4" />
              </span>
              <span className="truncate text-sm font-semibold text-foreground">{label}</span>
            </div>
            <Switch
              checked={layers[key]}
              onCheckedChange={() => onToggle(key)}
              className={cn("data-[state=unchecked]:bg-input", activeClass)}
              aria-label={`Alternar ${label}`}
            />
          </div>
        ))}
      </div>

      <Button className="mt-4 w-full bg-accent text-accent-foreground hover:bg-accent/90">
        <FileDown className="h-4 w-4" />
        Exportar Vista Atual (PDF)
      </Button>
    </aside>
  );
}

function BaseBlueprint() {
  return (
    <svg className="absolute inset-0 z-0 h-full w-full" viewBox="0 0 1200 750" role="img" aria-label="Planta baixa em tons de cinza">
      <rect width="1200" height="750" fill="hsl(var(--blueprint-paper))" />
      <path d="M80 90H1120V660H80Z" fill="none" stroke="hsl(var(--muted-foreground)/0.36)" strokeWidth="10" />
      <path d="M290 90V660M560 90V365M560 455V660M840 90V660" stroke="hsl(var(--muted-foreground)/0.32)" strokeWidth="8" />
      <path d="M80 300H560M80 500H1120M840 330H1120" stroke="hsl(var(--muted-foreground)/0.3)" strokeWidth="8" />
      <path d="M170 90v44M390 90v44M680 90v44M935 90v44M1120 210h-48M1120 415h-48M245 660v-48M470 660v-48M725 660v-48M970 660v-48" stroke="hsl(var(--foreground)/0.32)" strokeWidth="6" />
      <g fill="none" stroke="hsl(var(--muted-foreground)/0.28)" strokeWidth="3">
        <path d="M145 235q72 0 72-72" />
        <path d="M345 500q0-78 78-78" />
        <path d="M560 365q-76 0-76-76" />
        <path d="M840 330q72 0 72-72" />
        <path d="M840 500q-76 0-76-76" />
      </g>
      <g fill="hsl(var(--muted-foreground)/0.52)" fontFamily="Inter, sans-serif" fontSize="24" fontWeight="700" opacity="0.45">
        <text x="160" y="195">SUÍTE</text>
        <text x="352" y="195">BANHO</text>
        <text x="645" y="195">ESTAR</text>
        <text x="915" y="230">COZINHA</text>
        <text x="170" y="420">DORM.</text>
        <text x="620" y="595">JANTAR</text>
        <text x="915" y="595">SERVIÇO</text>
      </g>
    </svg>
  );
}

function ArchitectureLayer() {
  return (
    <svg className="h-full w-full" viewBox="0 0 1200 750" aria-hidden="true">
      <g fill="none" stroke="hsl(var(--layer-arch)/0.72)" strokeLinecap="round" strokeLinejoin="round">
        <path d="M80 90H1120V660H80Z" strokeWidth="18" />
        <path d="M290 90V660M560 90V365M560 455V660M840 90V660" strokeWidth="14" />
        <path d="M80 300H560M80 500H1120M840 330H1120" strokeWidth="14" />
      </g>
      <g fill="hsl(var(--layer-arch)/0.2)" stroke="hsl(var(--layer-arch)/0.75)" strokeWidth="4">
        <rect x="152" y="94" width="70" height="28" rx="6" />
        <rect x="655" y="94" width="92" height="28" rx="6" />
        <rect x="952" y="632" width="98" height="28" rx="6" />
      </g>
    </svg>
  );
}

function HydraulicLayer() {
  return (
    <svg className="h-full w-full" viewBox="0 0 1200 750" aria-hidden="true">
      <g fill="none" stroke="hsl(var(--layer-hydro)/0.8)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="7">
        <path d="M415 145C455 195 450 245 420 300S405 415 470 500" />
        <path d="M930 150V300C930 365 978 385 1018 420V595" />
        <path d="M420 300H515C570 300 610 335 610 390V500" strokeDasharray="18 14" />
      </g>
      <g fill="hsl(var(--layer-hydro))" stroke="hsl(var(--background)/0.9)" strokeWidth="5">
        <circle cx="415" cy="145" r="14" />
        <circle cx="420" cy="300" r="14" />
        <circle cx="470" cy="500" r="14" />
        <circle cx="930" cy="150" r="14" />
        <circle cx="1018" cy="420" r="14" />
        <circle cx="1018" cy="595" r="14" />
      </g>
    </svg>
  );
}

function ElectricalLayer() {
  return (
    <svg className="h-full w-full" viewBox="0 0 1200 750" aria-hidden="true">
      <g fill="none" stroke="hsl(var(--layer-elec)/0.86)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="6">
        <path d="M170 175H245V390H150" />
        <path d="M650 190H755V395H925" />
        <path d="M220 575H460V610H720V565H990" strokeDasharray="16 12" />
        <path d="M755 395L720 500" />
      </g>
      <g fill="hsl(var(--layer-elec))" stroke="hsl(var(--foreground)/0.24)" strokeWidth="4">
        <rect x="158" y="163" width="24" height="24" rx="5" />
        <rect x="138" y="378" width="24" height="24" rx="5" />
        <rect x="638" y="178" width="24" height="24" rx="5" />
        <rect x="913" y="383" width="24" height="24" rx="5" />
        <rect x="978" y="553" width="24" height="24" rx="5" />
        <circle cx="720" cy="500" r="15" />
      </g>
    </svg>
  );
}
