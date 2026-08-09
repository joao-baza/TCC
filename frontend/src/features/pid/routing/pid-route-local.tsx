import { lazy, Suspense } from "react";
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

function PidRouteFallback() {
  return <div role="status">Carregando editor P&ID…</div>;
}

function PidServicesLayout() {
  return (
    <PidServicesBoundary>
      <Suspense fallback={<PidRouteFallback />}>
        <Outlet />
      </Suspense>
    </PidServicesBoundary>
  );
}

export const PID_EDITOR_ENABLED = true;

export const pidRoute: RouteObject = {
  path: "pid",
  element: <PidServicesLayout />,
  errorElement: <PidRouteErrorPage />,
  children: [
    { index: true, element: <CreatePidPage /> },
    { path: ":diagramId", element: <PidEditorPage /> },
  ],
};
