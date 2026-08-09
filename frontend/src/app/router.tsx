import { lazy, Suspense } from "react";
import { createBrowserRouter, Navigate, Outlet } from "react-router-dom";

import { App } from "@/app/app";
import { AppShell } from "@/components/app-shell";
import { ComponentsPage } from "@/features/components/components-page";
import { FlowPage } from "@/features/flow/flow-page";
import { GlossaryPage } from "@/features/glossary/glossary-page";
import { HomePage } from "@/features/home/home-page";
import { PidRouteErrorPage, PidServicesBoundary } from "@/features/pid/api/pid-services";
import {
  PipingConnectionsTab,
  PipingPage,
  PipingSchedulesDiametersTab,
  PipingCompositionsTab,
} from "@/features/piping/piping-page";
import { PumpPage } from "@/features/pump/pump-page";
import { BalancePage } from "@/features/balance/balance-page";
import { ReactorPage } from "@/features/reactor/reactor-page";
import {
  SizingCalculatedDiameterTab,
  SizingPage,
  SizingRealDiameterTab,
} from "@/features/sizing/sizing-page";

const CreatePidPage = lazy(() =>
  import("@/features/pid/editor/create-pid-page").then(({ CreatePidPage }) => ({
    default: CreatePidPage,
  })),
);
const PidEditorPage = lazy(() =>
  import("@/features/pid/editor/pid-editor-page").then(({ PidEditorPage }) => ({
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

function EmptyRoute() {
  return null;
}

export const routes = [
  {
    path: "/",
    element: <App />,
    children: [
      {
        path: "pid",
        element: <PidServicesLayout />,
        errorElement: <PidRouteErrorPage />,
        children: [
          { index: true, element: <CreatePidPage /> },
          { path: ":diagramId", element: <PidEditorPage /> },
        ],
      },
      {
        element: <AppShell />,
        children: [
          { index: true, element: <HomePage /> },
          {
            path: "piping",
            element: <PipingPage />,
            children: [
              { index: true, element: <Navigate to="compositions" replace /> },
              { path: "compositions", element: <PipingCompositionsTab /> },
              { path: "schedules-diameters", element: <PipingSchedulesDiametersTab /> },
              { path: "connections", element: <PipingConnectionsTab /> },
            ],
          },
          {
            path: "sizing",
            element: <SizingPage />,
            children: [
              { index: true, element: <Navigate to="calculated-diameter" replace /> },
              { path: "calculated-diameter", element: <SizingCalculatedDiameterTab /> },
              { path: "real-diameter", element: <SizingRealDiameterTab /> },
            ],
          },
          {
            path: "flow",
            element: <FlowPage />,
            children: [
              { index: true, element: <Navigate to="reynolds" replace /> },
              { path: "reynolds", element: <EmptyRoute /> },
              { path: "friction-factor", element: <EmptyRoute /> },
              { path: "hydraulic-diameter", element: <EmptyRoute /> },
            ],
          },
          {
            path: "pump",
            element: <PumpPage />,
            children: [
              { index: true, element: <Navigate to="headloss" replace /> },
              { path: "headloss", element: <EmptyRoute /> },
              { path: "npsh-available", element: <EmptyRoute /> },
              { path: "manometric-head", element: <EmptyRoute /> },
            ],
          },
          {
            path: "components",
            element: <ComponentsPage />,
            children: [
              { index: true, element: <Navigate to="critical-properties" replace /> },
              { path: "critical-properties", element: <EmptyRoute /> },
              { path: "pure-fluid", element: <EmptyRoute /> },
              { path: "state-properties", element: <EmptyRoute /> },
              { path: "mixtures", element: <EmptyRoute /> },
              { path: "ternary-diagram", element: <EmptyRoute /> },
              { path: "binary-vle", element: <EmptyRoute /> },
              { path: "mccabe-thiele", element: <EmptyRoute /> },
              { path: "property-surface", element: <EmptyRoute /> },
              { path: "phase-envelope", element: <EmptyRoute /> },
            ],
          },
          {
            path: "reactor",
            element: <ReactorPage />,
            children: [
              { index: true, element: <Navigate to="cstr" replace /> },
              { path: "cstr", element: <EmptyRoute /> },
              { path: "pfr", element: <EmptyRoute /> },
              { path: "levenspiel", element: <EmptyRoute /> },
              { path: "arrhenius", element: <EmptyRoute /> },
            ],
          },
          {
            path: "balance",
            element: <BalancePage />,
            children: [
              { index: true, element: <Navigate to="components" replace /> },
              { path: "components", element: <EmptyRoute /> },
              { path: "actions", element: <Navigate to="../results" replace /> },
              { path: "streams", element: <EmptyRoute /> },
              { path: "reactions", element: <EmptyRoute /> },
              { path: "splits-recycle", element: <EmptyRoute /> },
              { path: "results", element: <EmptyRoute /> },
              { path: "yields", element: <Navigate to="../results" replace /> },
            ],
          },
          {
            path: "glossary",
            element: <GlossaryPage />,
            children: [
              { index: true, element: <Navigate to="terms" replace /> },
              { path: "terms", element: <EmptyRoute /> },
            ],
          },
        ],
      },
    ],
  }
];

export const router = createBrowserRouter(routes);
