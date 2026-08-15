import { lazy, Suspense, type ReactNode } from "react";
import { Outlet, type RouteObject } from "react-router-dom";

import { PidRouteErrorPage, PidServicesBoundary } from "../api/pid-services";

const CreatePidPage = lazy(() =>
  import("../editor/create-pid-page").then(({ CreatePidPage }) => ({
    default: CreatePidPage,
  })),
);
const PidEditorPage = lazy(() =>
  import("../editor/pid-editor-page").then(({ PidEditorPage }) => ({
    default: PidEditorPage,
  })),
);
const RecentPidDiagramsPage = lazy(() =>
  import("../editor/recent-pid-diagrams-page").then(({ RecentPidDiagramsPage }) => ({
    default: RecentPidDiagramsPage,
  })),
);

function PidRouteFallback() {
  return <div role="status">Carregando editor P&ID…</div>;
}

function PidServicesLayout({ children }: { children: ReactNode }) {
  return (
    <PidServicesBoundary>
      <Suspense fallback={<PidRouteFallback />}>
        {children}
      </Suspense>
    </PidServicesBoundary>
  );
}

export const PID_EDITOR_ENABLED = true;

export const pidRoute: RouteObject = {
  path: "pid",
  element: <PidServicesLayout><Outlet /></PidServicesLayout>,
  errorElement: <PidRouteErrorPage />,
  children: [
    { index: true, element: <CreatePidPage /> },
    { path: "meus-diagramas", element: <RecentPidDiagramsPage /> },
  ],
};

export const pidFocusedEditorRoute: RouteObject = {
  path: "pid/:diagramId",
  element: <PidServicesLayout><PidEditorPage /></PidServicesLayout>,
  errorElement: <PidRouteErrorPage />,
};
