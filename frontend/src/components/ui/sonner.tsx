"use client"

import { useEffect, useState, type CSSProperties } from "react"
import { CircleCheckIcon, InfoIcon, Loader2Icon, OctagonXIcon, TriangleAlertIcon } from "lucide-react"
import { type ToasterProps, Toaster as Sonner } from "sonner"

const MOBILE_TOAST_QUERY = "(max-width: 639px)"
const TOAST_BASE_CLASS =
  [
    "rounded-[calc(var(--radius)+0.25rem)]",
    "border",
    "shadow-[0_18px_36px_rgba(15,23,42,0.14)]",
    "backdrop-blur-md",
    "backdrop-saturate-110",
    "text-foreground",
    "[&_[data-content]]:gap-0.5",
    "[&_[data-title]]:font-semibold",
    "[&_[data-title]]:tracking-[-0.01em]",
    "[&_[data-description]]:text-current/80",
    "[&_[data-icon]]:text-current",
    "[&_[data-button]]:rounded-md",
    "[&_[data-button]]:border",
    "[&_[data-button]]:bg-current/10",
    "[&_[data-button]]:text-inherit",
    "[&_[data-button]]:border-current/20",
    "[&_[data-close-button]]:rounded-md",
    "[&_[data-close-button]]:border",
    "[&_[data-close-button]]:bg-current/10",
    "[&_[data-close-button]]:text-inherit",
    "[&_[data-close-button]]:border-current/20",
  ].join(" ")

const TOAST_VARIANT_CLASSES = {
  default: "bg-background text-foreground border-border",
  info:
    "bg-[linear-gradient(135deg,hsl(var(--primary)/0.10)_0%,hsl(var(--secondary)/0.14)_100%)] text-foreground border-primary/20",
  success:
    "bg-emerald-50 text-emerald-950 border-emerald-200 dark:bg-emerald-950/35 dark:text-emerald-50 dark:border-emerald-700/50",
  warning:
    "bg-amber-50 text-amber-950 border-amber-200 dark:bg-amber-950/35 dark:text-amber-50 dark:border-amber-700/50",
  error:
    "bg-rose-50 text-rose-950 border-rose-200 dark:bg-rose-950/35 dark:text-rose-50 dark:border-rose-700/50",
  loading: "bg-muted text-foreground border-border",
} as const

function useResponsiveToastPosition() {
  const [position, setPosition] = useState<ToasterProps["position"]>("top-right")

  useEffect(() => {
    const mediaQuery = window.matchMedia(MOBILE_TOAST_QUERY)

    const updatePosition = () => {
      setPosition(mediaQuery.matches ? "top-center" : "top-right")
    }

    updatePosition()

    if (typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", updatePosition)
      return () => mediaQuery.removeEventListener("change", updatePosition)
    }

    mediaQuery.addListener(updatePosition)

    return () => mediaQuery.removeListener(updatePosition)
  }, [])

  return position
}

const Toaster = ({ position: explicitPosition, toastOptions, style, ...props }: ToasterProps) => {
  const responsivePosition = useResponsiveToastPosition()
  const position = explicitPosition ?? responsivePosition

  return (
    <Sonner
      {...props}
      theme="system"
      position={position}
      className="toaster group"
      icons={{
        success: (
          <CircleCheckIcon className="size-4" />
        ),
        info: (
          <InfoIcon className="size-4" />
        ),
        warning: (
          <TriangleAlertIcon className="size-4" />
        ),
        error: (
          <OctagonXIcon className="size-4" />
        ),
        loading: (
          <Loader2Icon className="size-4 animate-spin" />
        ),
      }}
      style={
        {
          "--normal-bg": "var(--background)",
          "--normal-text": "var(--foreground)",
          "--normal-border": "var(--border)",
          "--border-radius": "var(--radius)",
          ...style,
        } as CSSProperties
      }
      toastOptions={{
        ...toastOptions,
        unstyled: true,
        classNames: {
          ...toastOptions?.classNames,
          toast: [TOAST_BASE_CLASS, toastOptions?.classNames?.toast].filter(Boolean).join(" "),
          default: [TOAST_VARIANT_CLASSES.default, toastOptions?.classNames?.default].filter(Boolean).join(" "),
          info: [TOAST_VARIANT_CLASSES.info, toastOptions?.classNames?.info].filter(Boolean).join(" "),
          success: [TOAST_VARIANT_CLASSES.success, toastOptions?.classNames?.success].filter(Boolean).join(" "),
          warning: [TOAST_VARIANT_CLASSES.warning, toastOptions?.classNames?.warning].filter(Boolean).join(" "),
          error: [TOAST_VARIANT_CLASSES.error, toastOptions?.classNames?.error].filter(Boolean).join(" "),
          loading: [TOAST_VARIANT_CLASSES.loading, toastOptions?.classNames?.loading].filter(Boolean).join(" "),
        },
      }}
    />
  )
}

export { Toaster }
