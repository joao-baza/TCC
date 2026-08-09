import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { z } from "zod";

import type { CreatedPidDiagram } from "../api/contracts";
import { PidServicesBoundary, usePidServices } from "../api/pid-services";

const createPidFormSchema = z.object({
  title: z.string().trim().min(1, "Informe o título do diagrama."),
  standard: z.enum(["isa", "iso", "free"]),
  participantName: z.string().trim().min(1, "Informe seu nome."),
});

type FormField = "title" | "standard" | "participantName";
type FormErrors = Partial<Record<FormField, string>>;

export function CreatePidPage() {
  return (
    <PidServicesBoundary>
      <CreatePidPageContent />
    </PidServicesBoundary>
  );
}

function CreatePidPageContent() {
  const { document: documentPort } = usePidServices();
  const [errors, setErrors] = useState<FormErrors>({});
  const [created, setCreated] = useState<CreatedPidDiagram | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [pending, setPending] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const parsed = createPidFormSchema.safeParse({
      title: data.get("title"),
      standard: data.get("standard"),
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

    setErrors({});
    setCreated(null);
    setConfirmed(false);
    setPending(true);
    setStatus("Criando diagrama…");
    try {
      const result = await documentPort.create(parsed.data);
      setCreated(result);
      setStatus("Diagrama criado. Guarde os links de acesso antes de abrir o editor.");
    } catch {
      setStatus("Não foi possível criar o diagrama. Tente novamente.");
    } finally {
      setPending(false);
    }
  };

  const copyLink = async (label: string, url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setStatus(`${label} copiado.`);
    } catch {
      setStatus("Não foi possível copiar automaticamente. Selecione o link e copie manualmente.");
    }
  };

  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col gap-6 p-6 md:p-8">
      <header>
        <h1 className="text-3xl font-semibold">Editor P&ID</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Crie um diagrama local e guarde separadamente os links de visualização e edição.
        </p>
      </header>
      <form className="grid max-w-xl gap-4" noValidate onSubmit={handleSubmit}>
        <div className="grid gap-1">
          <label htmlFor="pid-title">Título do diagrama</label>
          <input
            aria-describedby={errors.title ? "pid-title-error" : undefined}
            aria-invalid={Boolean(errors.title)}
            className="rounded-md border bg-background px-3 py-2"
            id="pid-title"
            name="title"
            required
            type="text"
          />
          {errors.title && <p id="pid-title-error" role="alert" className="text-sm text-destructive">{errors.title}</p>}
        </div>
        <div className="grid gap-1">
          <label htmlFor="pid-standard">Norma</label>
          <select className="rounded-md border bg-background px-3 py-2" defaultValue="isa" id="pid-standard" name="standard" required>
            <option value="isa">ISA</option>
            <option value="iso">ISO</option>
            <option value="free">Livre</option>
          </select>
        </div>
        <div className="grid gap-1">
          <label htmlFor="pid-participant">Seu nome</label>
          <input
            aria-describedby={errors.participantName ? "pid-participant-error" : undefined}
            aria-invalid={Boolean(errors.participantName)}
            className="rounded-md border bg-background px-3 py-2"
            id="pid-participant"
            name="participantName"
            required
            type="text"
          />
          {errors.participantName && <p id="pid-participant-error" role="alert" className="text-sm text-destructive">{errors.participantName}</p>}
        </div>
        <button className="w-fit rounded-md bg-primary px-4 py-2 text-primary-foreground disabled:opacity-50" disabled={pending} type="submit">
          {pending ? "Criando…" : "Criar diagrama"}
        </button>
      </form>

      {status && (
        <p role={status.startsWith("Não foi") ? "alert" : "status"} aria-live="polite">
          {status}
        </p>
      )}

      {created && (
        <section aria-labelledby="pid-access-title" className="grid max-w-2xl gap-4 rounded-lg border p-4">
          <h2 id="pid-access-title" className="text-xl font-semibold">Links de acesso</h2>
          <div className="flex flex-wrap items-center gap-3">
            <a className="break-all underline" href={created.viewUrl}>Link de visualização</a>
            <button type="button" className="rounded-md border px-3 py-1" onClick={() => void copyLink("Link de visualização", created.viewUrl)}>
              Copiar visualização
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <a className="break-all underline" href={created.editUrl}>Link de edição</a>
            <button type="button" className="rounded-md border px-3 py-1" onClick={() => void copyLink("Link de edição", created.editUrl)}>
              Copiar edição
            </button>
          </div>
          <label className="flex items-center gap-2">
            <input checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} type="checkbox" />
            Copiei o link de edição
          </label>
          {confirmed ? (
            <a className="w-fit rounded-md bg-primary px-4 py-2 text-primary-foreground" href={created.editUrl}>Abrir editor</a>
          ) : (
            <button className="w-fit rounded-md bg-primary px-4 py-2 text-primary-foreground opacity-50" disabled type="button">Abrir editor</button>
          )}
        </section>
      )}
      <Link className="w-fit text-sm font-medium underline" to="/">
        Voltar ao DCOU
      </Link>
    </main>
  );
}
