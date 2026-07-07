"use client"

import { useEffect, useState, type CSSProperties } from "react"
import { CircleCheckIcon, InfoIcon, Loader2Icon, OctagonXIcon, TriangleAlertIcon } from "lucide-react"
import { type ToasterProps, Toaster as Sonner } from "sonner"

const MOBILE_TOAST_QUERY = "(max-width: 639px)"

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
        classNames: {
          ...toastOptions?.classNames,
          toast: ["cn-toast", toastOptions?.classNames?.toast].filter(Boolean).join(" "),
        },
      }}
    />
  )
}

export { Toaster }
