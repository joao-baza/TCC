import { Link, type RouteObject } from "react-router-dom";

export const PID_EDITOR_ENABLED = false;

export function PidDisabledPage() {
  return (
    <main className="mx-auto grid min-h-screen max-w-2xl content-center gap-4 p-6">
      <h1 className="text-3xl font-semibold">Editor P&ID indisponível</h1>
      <p role="alert">
        O editor P&ID não está habilitado nesta distribuição.
      </p>
      <p className="text-sm text-muted-foreground">
        A versão local permanece disponível apenas nos builds de desenvolvimento e desktop.
      </p>
      <Link className="w-fit text-sm font-medium underline" to="/">Voltar ao DCOU</Link>
    </main>
  );
}

export const pidRoute: RouteObject = {
  path: "pid/*",
  element: <PidDisabledPage />,
};

export const pidFocusedEditorRoute: RouteObject = {
  path: "pid/:diagramId",
  element: <PidDisabledPage />,
};
