import { Link } from "react-router-dom";

import { ModuleTabsLayout } from "@/components/module-tabs-layout";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

import { usePidServices } from "../api/pid-services";
import { pidEditorTabs } from "./pid-tabs";

export function RecentPidDiagramsPage() {
  const { recent } = usePidServices();
  const diagrams = recent.list();

  return (
    <ModuleTabsLayout
      title="Editor P&ID"
      subtitle="Reabra diagramas criados ou acessados neste navegador."
      tabs={pidEditorTabs}
    >
      <Card>
        <CardHeader
          title="Meus diagramas"
          subtitle="Histórico local deste navegador."
        />
        <CardContent className="grid gap-3">
          {diagrams.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Os diagramas criados ou abertos neste navegador aparecerão aqui.
            </p>
          ) : diagrams.map((diagram) => (
            <article
              key={diagram.diagramId}
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border p-4"
            >
              <div className="min-w-0">
                <h2 className="truncate text-base font-semibold">{diagram.title}</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Último acesso: {formatRecentDate(diagram.lastOpenedAt)} · {diagram.scope === "edit" ? "Acesso de edição" : "Somente visualização"}
                </p>
              </div>
              <Link
                className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
                to={diagram.url}
              >
                {diagram.scope === "edit" ? "Abrir editor" : "Abrir visualização"}
              </Link>
            </article>
          ))}
        </CardContent>
      </Card>
    </ModuleTabsLayout>
  );
}

function formatRecentDate(value: string): string {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "data indisponível";
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}
