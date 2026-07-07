import * as React from "react"

import { cn } from "@/lib/utils"

function Card({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card"
      className={cn(
        "flex min-w-0 flex-col rounded-2xl border border-border bg-card text-card-foreground shadow-sm",
        className
      )}
      {...props}
    />
  )
}

type CardHeaderProps = React.ComponentProps<"div"> & {
  title?: React.ReactNode
  subtitle?: React.ReactNode
  action?: React.ReactNode
  level?: 1 | 2 | 3
  variant?: "section" | "hero"
}

function CardHeader({
  className,
  title,
  subtitle,
  action,
  level = 2,
  variant = "section",
  children,
  ...props
}: CardHeaderProps) {
  if (title == null && subtitle == null && action == null) {
    return (
      <div
        data-slot="card-header"
        className={cn(
          "grid auto-rows-min items-start gap-1 px-6 pt-6",
          className
        )}
        {...props}
      >
        {children}
      </div>
    )
  }

  const isHero = variant === "hero"
  const wrapperClassName = cn(
    "px-6 pt-6",
    isHero
      ? "flex flex-col gap-4 pb-6 md:flex-row md:items-start md:justify-between"
      : "grid auto-rows-min items-start gap-1",
    className
  )
  const titleClassName = cn(
    "font-heading leading-snug font-medium",
    level === 1 ? "text-3xl font-semibold" : level === 2 ? "text-xl font-semibold" : "text-sm font-semibold uppercase tracking-[0.16em] text-muted-foreground"
  )
  const TitleTag = level === 1 ? "h1" : level === 2 ? "h2" : "h3"

  return (
    <div data-slot="card-header" className={wrapperClassName} {...props}>
      <div className={cn("space-y-3", isHero ? "max-w-3xl" : undefined)}>
        {title != null ? (
          <TitleTag data-slot="card-title" className={titleClassName}>
            {title}
          </TitleTag>
        ) : null}
        {subtitle != null ? (
          <div
            data-slot="card-description"
            className="text-sm text-muted-foreground"
          >
            {subtitle}
          </div>
        ) : null}
      </div>
      {action != null ? (
        <div
          data-slot="card-action"
          className={cn("shrink-0", isHero ? "md:self-start" : "self-start")}
        >
          {action}
        </div>
      ) : null}
      {children}
    </div>
  )
}

function CardTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-title"
      className={cn(
        "font-heading text-base leading-snug font-medium",
        className
      )}
      {...props}
    />
  )
}

function CardDescription({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-description"
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  )
}

function CardAction({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-action"
      className={cn(
        "col-start-2 row-span-2 row-start-1 self-start justify-self-end",
        className
      )}
      {...props}
    />
  )
}

function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-content"
      className={cn("px-6 pb-6", className)}
      {...props}
    />
  )
}

function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-footer"
      className={cn(
        "flex items-center rounded-b-2xl border-t border-border bg-muted px-6 py-4",
        className
      )}
      {...props}
    />
  )
}

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardAction,
  CardDescription,
  CardContent,
}
