import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link, useBlocker } from "react-router-dom";
import { z } from "zod";

import { ModuleTabsLayout } from "@/components/module-tabs-layout";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Card, CardHeader } from "@/components/ui/card";

import { isPidDocumentError, type CreatedPidDiagram } from "../api/contracts";
import { usePidServices } from "../api/pid-services";
import { pidEditorTabs } from "./pid-tabs";

const createPidFormSchema = z.object({
  title: z.string().trim().min(1, "Informe o título do diagrama."),
  participantName: z.string().trim().min(1, "Informe seu nome."),
});

type FormField = "title" | "participantName";
type FormErrors = Partial<Record<FormField, string>>;

export function CreatePidPage() {
  const { document: documentPort, recent } = usePidServices();
  const [errors, setErrors] = useState<FormErrors>({});
  const [created, setCreated] = useState<CreatedPidDiagram | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [pending, setPending] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [statusIsError, setStatusIsError] = useState(false);
  const submitting = useRef(false);
  const stayButton = useRef<HTMLButtonElement>(null);
  const navigationLocked = Boolean(created && !confirmed);
  const navigationBlocker = useBlocker(navigationLocked);

  useEffect(() => {
    if (!created || confirmed) return;
    const protectCapability = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", protectCapability);
    return () => window.removeEventListener("beforeunload", protectCapability);
  }, [confirmed, created]);

  useEffect(() => {
    if (confirmed && navigationBlocker.state === "blocked") navigationBlocker.proceed();
  }, [confirmed, navigationBlocker]);

  const reportStatus = (message: string, isError = false) => {
    setStatus(message);
    setStatusIsError(isError);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting.current) return;
    const data = new FormData(event.currentTarget);
    const parsed = createPidFormSchema.safeParse({
      title: data.get("title"),
      participantName: data.get("participantName"),
    });
    if (!parsed.success) {
      const nextErrors: FormErrors = {};
      for (const issue of parsed.error.issues) {
        const field = issue.path[0] as FormField | undefined;
        if (field && !nextErrors[field]) nextErrors[field] = issue.message;
      }
      setErrors(nextErrors);
      setStatus(null);
      return;
    }
    if (created && !confirmed) {
      reportStatus("Confirme que copiou o link de edição antes de criar outro diagrama.", true);
      return;
    }
    if (created && !window.confirm("Criar outro diagrama substituirá os links exibidos. Deseja continuar?")) {
      return;
    }

    submitting.current = true;
    setErrors({});
    setPending(true);
    reportStatus("Criando diagrama…");
    try {
      const result = await documentPort.create(parsed.data);
      setCreated(result);
      recent.upsert({
        diagramId: result.diagramId,
        title: result.document.metadata.title,
        scope: "edit",
        url: result.editUrl,
      });
      setConfirmed(false);
      reportStatus("Diagrama criado. Guarde os links de acesso antes de abrir ou sair desta página.");
    } catch (error) {
      reportStatus(
        isPidDocumentError(error)
          ? error.message
          : "Não foi possível criar o diagrama. Tente novamente.",
        true,
      );
    } finally {
      submitting.current = false;
      setPending(false);
    }
  };

  const copyLink = async (label: string, url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      reportStatus(`${label} copiado.`);
    } catch {
      reportStatus("Não foi possível copiar automaticamente. Selecione o link e copie manualmente.", true);
    }
  };

  const proceedBlockedNavigation = () => {
    if (navigationBlocker.state === "blocked") navigationBlocker.proceed();
  };
  const navigationAction = navigationLocked ? (
    <button className="min-h-11 min-w-11 w-fit text-sm font-medium underline opacity-50" disabled type="button">Voltar ao DCOU</button>
  ) : (
    <Link className="inline-flex min-h-11 min-w-11 w-fit items-center text-sm font-medium underline" to="/">Voltar ao DCOU</Link>
  );

  return (
    <ModuleTabsLayout
      action={navigationAction}
      title="Editor P&ID"
      subtitle="Crie diagramas de processo com catálogo livre, links de visualização e edição separados."
      tabs={pidEditorTabs}
    >
      <div className="grid gap-6 xl:grid-cols-[minmax(0,0.95fr)_minmax(20rem,1.05fr)]">
        <Card>
          <CardHeader
            title="Dados do diagrama"
            subtitle="Informe os dados iniciais para gerar os links de acesso."
          />
          <form aria-busy={pending} className="grid gap-4 p-6" noValidate onSubmit={handleSubmit}>
            <div className="grid gap-1">
              <label htmlFor="pid-title">Título do diagrama</label>
              <input
                aria-describedby={errors.title ? "pid-title-error" : undefined}
                aria-invalid={Boolean(errors.title)}
                className="min-h-11 rounded-md border bg-background px-3 py-2"
                id="pid-title"
                name="title"
                required
                type="text"
              />
              {errors.title && <p id="pid-title-error" role="alert" className="text-sm text-destructive">{errors.title}</p>}
            </div>
            <div className="grid gap-1">
              <label htmlFor="pid-participant">Seu nome</label>
              <input
                aria-describedby={errors.participantName ? "pid-participant-error" : undefined}
                aria-invalid={Boolean(errors.participantName)}
                className="min-h-11 rounded-md border bg-background px-3 py-2"
                id="pid-participant"
                name="participantName"
                required
                type="text"
              />
              {errors.participantName && <p id="pid-participant-error" role="alert" className="text-sm text-destructive">{errors.participantName}</p>}
            </div>
            <button className="min-h-11 min-w-11 w-fit rounded-md bg-primary px-4 py-2 text-primary-foreground disabled:opacity-50" disabled={pending} type="submit">
              {pending ? "Criando…" : "Criar diagrama"}
            </button>
          </form>
        </Card>

        <div className="grid content-start gap-4">
          {status && (
            <p
              className="rounded-lg border border-border bg-card px-4 py-3 text-sm text-muted-foreground shadow-sm"
              role={statusIsError ? "alert" : "status"}
              aria-live="polite"
            >
              {status}
            </p>
          )}

          {created && (
            <Card>
              <CardHeader title="Links de acesso" />
              <section aria-labelledby="pid-access-title" className="grid gap-4 p-6 pt-3">
                <h2 id="pid-access-title" className="sr-only">Links de acesso</h2>
                <div className="grid gap-1">
                  <label htmlFor="pid-view-url">Link de visualização</label>
                  <div className="flex flex-wrap items-center gap-3">
                    <input
                      className="min-h-11 min-w-0 flex-1 rounded-md border bg-background px-3 py-2"
                      id="pid-view-url"
                      onFocus={(event) => event.currentTarget.select()}
                      readOnly
                      value={created.viewUrl}
                    />
                    <button type="button" className="min-h-11 min-w-11 rounded-md border px-3 py-2" onClick={() => void copyLink("Link de visualização", created.viewUrl)}>
                      Copiar visualização
                    </button>
                  </div>
                </div>
                <div className="grid gap-1">
                  <label htmlFor="pid-edit-url">Link de edição</label>
                  <div className="flex flex-wrap items-center gap-3">
                    <input
                      className="min-h-11 min-w-0 flex-1 rounded-md border bg-background px-3 py-2"
                      id="pid-edit-url"
                      onFocus={(event) => event.currentTarget.select()}
                      readOnly
                      value={created.editUrl}
                    />
                    <button type="button" className="min-h-11 min-w-11 rounded-md border px-3 py-2" onClick={() => void copyLink("Link de edição", created.editUrl)}>
                      Copiar edição
                    </button>
                  </div>
                </div>
                <label className="flex min-h-11 items-center gap-2">
                  <input checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} type="checkbox" />
                  Copiei o link de edição
                </label>
                <div className="flex flex-wrap gap-3">
                  {confirmed ? (
                    <>
                      <a className="inline-flex min-h-11 min-w-11 w-fit items-center justify-center rounded-md border px-4 py-2" href={created.viewUrl}>Abrir visualização</a>
                      <a className="inline-flex min-h-11 min-w-11 w-fit items-center justify-center rounded-md bg-primary px-4 py-2 text-primary-foreground" href={created.editUrl}>Abrir editor</a>
                    </>
                  ) : (
                    <>
                      <button className="min-h-11 min-w-11 w-fit rounded-md border px-4 py-2 opacity-50" disabled type="button">Abrir visualização</button>
                      <button className="min-h-11 min-w-11 w-fit rounded-md bg-primary px-4 py-2 text-primary-foreground opacity-50" disabled type="button">Abrir editor</button>
                    </>
                  )}
                </div>
              </section>
            </Card>
          )}

        </div>
      </div>
      <AlertDialog
        open={navigationBlocker.state === "blocked"}
        onOpenChange={(open) => {
          if (!open && navigationBlocker.state === "blocked") navigationBlocker.reset();
        }}
      >
        <AlertDialogContent initialFocus={stayButton}>
          <AlertDialogHeader>
            <AlertDialogTitle>Link de edição ainda não confirmado</AlertDialogTitle>
            <AlertDialogDescription>
              Se sair agora, você pode perder o único link com permissão para editar este diagrama.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel ref={stayButton}>Permanecer nesta página</AlertDialogCancel>
            <AlertDialogAction onClick={proceedBlockedNavigation}>
              Sair desta página
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ModuleTabsLayout>
  );
}
