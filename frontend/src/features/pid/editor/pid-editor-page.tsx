import { useEffect, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";

import { isPidDocumentError, type OpenedPidDiagram } from "../api/contracts";
import { usePidServices } from "../api/pid-services";

export function PidEditorPage() {
  const { document: documentPort } = usePidServices();
  const { diagramId = "" } = useParams();
  const { hash } = useLocation();
  const [opened, setOpened] = useState<OpenedPidDiagram | null>(null);
  const [error, setError] = useState<string | null>(null);
  // The approved local flow retains the capability in fragment + memory so it
  // never reaches the server; browser history/extensions remain a tradeoff.
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
        setError(isPidDocumentError(reason)
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
