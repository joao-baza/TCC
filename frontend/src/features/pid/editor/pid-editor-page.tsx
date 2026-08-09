import { useEffect, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";

import type { OpenedPidDiagram } from "../api/contracts";
import { PidLocalAdapterError } from "../api/local-pid-api";
import { PidServicesBoundary, usePidServices } from "../api/pid-services";

export function PidEditorPage() {
  return (
    <PidServicesBoundary>
      <PidEditorPageContent />
    </PidServicesBoundary>
  );
}

function PidEditorPageContent() {
  const { document: documentPort } = usePidServices();
  const { diagramId = "" } = useParams();
  const { hash } = useLocation();
  const [opened, setOpened] = useState<OpenedPidDiagram | null>(null);
  const [error, setError] = useState<string | null>(null);
  const token = new URLSearchParams(hash.startsWith("#") ? hash.slice(1) : hash).get("access") ?? "";

  useEffect(() => {
    let active = true;
    setOpened(null);
    setError(null);
    void documentPort.open(diagramId, token).then(
      (result) => {
        if (active) setOpened(result);
      },
      (reason: unknown) => {
        if (!active) return;
        setError(reason instanceof PidLocalAdapterError
          ? reason.message
          : "Não foi possível abrir o diagrama.");
      },
    );
    return () => { active = false; };
  }, [diagramId, documentPort, token]);

  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col gap-6 p-6 md:p-8">
      <header>
        <h1 className="text-3xl font-semibold">Editor P&ID</h1>
      </header>
      {!opened && !error && <p role="status">Carregando diagrama…</p>}
      {error && <p role="alert">{error}</p>}
      {opened && (
        <section aria-labelledby="pid-document-title">
          <h2 id="pid-document-title" className="text-2xl font-semibold">{opened.document.metadata.title}</h2>
          <p>{opened.scope === "edit" ? "Acesso de edição" : "Acesso de visualização"}</p>
        </section>
      )}
      <Link className="w-fit text-sm font-medium underline" to="/">
        Voltar ao DCOU
      </Link>
    </main>
  );
}
