"use client"

import type { ReactNode } from "react"
import {
  CircleCheckIcon,
  InfoIcon,
  Loader2Icon,
  OctagonXIcon,
  TriangleAlertIcon,
  XIcon,
} from "lucide-react"
import { toast } from "sonner"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type ToastVariant = "default" | "info" | "success" | "warning" | "error" | "loading"

type ToastCalloutProps = {
  id: string | number
  message: string
  variant: ToastVariant
}

const TOAST_CALL_OUT_CLASS_NAME =
  "!border-0 !bg-transparent !p-0 !shadow-none !ring-0 !backdrop-blur-0"

const TOAST_VARIANT_META: Record<
  ToastVariant,
  {
    title: string
    icon: ReactNode
    shellClassName: string
    chipClassName: string
  }
> = {
  default: {
    title: "Aviso",
    icon: <InfoIcon aria-hidden="true" className="size-4" />,
    shellClassName: "border-border bg-card/95 text-card-foreground",
    chipClassName: "bg-muted text-muted-foreground",
  },
  info: {
          title: "Informação",
          icon: <InfoIcon aria-hidden="true" className="size-4" />,
          shellClassName:
            "border-primary/20 bg-[linear-gradient(135deg,hsl(var(--primary)/0.10)_0%,hsl(var(--secondary)/0.14)_100%)] text-card-foreground",
    chipClassName: "bg-primary/10 text-primary",
  },
  success: {
    title: "Sucesso",
    icon: <CircleCheckIcon aria-hidden="true" className="size-4" />,
    shellClassName:
      "border-emerald-200 bg-emerald-50/95 text-emerald-950 dark:border-emerald-700/50 dark:bg-emerald-950/35 dark:text-emerald-50",
    chipClassName:
      "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-200",
  },
  warning: {
    title: "Atenção",
    icon: <TriangleAlertIcon aria-hidden="true" className="size-4" />,
    shellClassName:
      "border-amber-200 bg-amber-50/95 text-amber-950 dark:border-amber-700/50 dark:bg-amber-950/35 dark:text-amber-50",
    chipClassName:
      "bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-200",
  },
  error: {
    title: "Erro",
    icon: <OctagonXIcon aria-hidden="true" className="size-4" />,
    shellClassName:
      "border-rose-200 bg-rose-50/95 text-rose-950 dark:border-rose-700/50 dark:bg-rose-950/35 dark:text-rose-50",
    chipClassName: "bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-200",
  },
  loading: {
    title: "Carregando",
    icon: <Loader2Icon aria-hidden="true" className="size-4 animate-spin" />,
    shellClassName: "border-border bg-muted/95 text-foreground",
    chipClassName: "bg-background text-muted-foreground",
  },
}

function ToastCallout({ id, message, variant }: ToastCalloutProps) {
  const meta = TOAST_VARIANT_META[variant]

  return (
    <Alert
      variant="default"
      className={cn(
        "w-full max-w-md rounded-2xl px-4 py-3 shadow-lg shadow-slate-900/5 backdrop-blur-md",
        meta.shellClassName,
      )}
    >
      <div className="flex items-start gap-3">
        <div
          className={cn(
            "mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full",
            meta.chipClassName,
          )}
        >
          {meta.icon}
        </div>
        <div className="min-w-0 flex-1 space-y-1">
          <AlertTitle className="text-sm font-semibold leading-5 text-inherit">
            {meta.title}
          </AlertTitle>
          <AlertDescription className="text-sm leading-5 text-inherit opacity-80">
            {message}
          </AlertDescription>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="shrink-0 rounded-full opacity-60 hover:bg-black/5 hover:opacity-100 dark:hover:bg-white/10"
          onClick={() => toast.dismiss(id)}
          aria-label="Fechar alerta"
        >
          <XIcon aria-hidden="true" />
        </Button>
      </div>
    </Alert>
  )
}

export { TOAST_CALL_OUT_CLASS_NAME, ToastCallout, type ToastVariant }
