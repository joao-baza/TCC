import { createBrowserRouter } from "react-router-dom";
import { Navigate } from "react-router-dom";

import { App } from "@/app/app";
import { AppShell } from "@/components/app-shell";
import { ComponentsPage } from "@/features/components/components-page";
import { ExercisesPage } from "@/features/exercises/exercises-page";
import { FlowPage } from "@/features/flow/flow-page";
import { GlossaryPage } from "@/features/glossary/glossary-page";
import { HomePage } from "@/features/home/home-page";
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
  SizingExploratoryTab,
  SizingPage,
  SizingRealDiameterTab,
} from "@/features/sizing/sizing-page";

export const routes = [
  {
    path: "/",
    element: <App />,
    children: [
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
              { path: "exploratory", element: <SizingExploratoryTab /> },
            ],
          },
          {
            path: "flow",
            element: <FlowPage />,
            children: [
              { index: true, element: <Navigate to="reynolds" replace /> },
              { path: "reynolds" },
              { path: "friction-factor" },
              { path: "hydraulic-diameter" },
              { path: "exploratory" },
            ],
          },
          {
            path: "pump",
            element: <PumpPage />,
            children: [
              { index: true, element: <Navigate to="headloss" replace /> },
              { path: "headloss" },
              { path: "npsh-available" },
              { path: "manometric-head" },
              { path: "pressure-profile" },
              { path: "exploratory" },
            ],
          },
          {
            path: "components",
            element: <ComponentsPage />,
            children: [
              { index: true, element: <Navigate to="critical-properties" replace /> },
              { path: "critical-properties" },
              { path: "pure-fluid" },
              { path: "state-properties" },
              { path: "mixtures" },
              { path: "ternary-diagram" },
              { path: "binary-vle" },
              { path: "mccabe-thiele" },
              { path: "property-surface" },
              { path: "phase-envelope" },
              { path: "exploratory" },
            ],
          },
          {
            path: "reactor",
            element: <ReactorPage />,
            children: [
              { index: true, element: <Navigate to="cstr" replace /> },
              { path: "cstr" },
              { path: "pfr" },
              { path: "arrhenius" },
              { path: "exploratory" },
            ],
          },
          {
            path: "balance",
            element: <BalancePage />,
            children: [
              { index: true, element: <Navigate to="components" replace /> },
              { path: "components" },
              { path: "actions" },
              { path: "streams" },
              { path: "reactions" },
              { path: "splits-recycle" },
              { path: "results" },
              { path: "yields" },
              { path: "exploratory" },
            ],
          },
          {
            path: "glossary",
            element: <GlossaryPage />,
            children: [
              { index: true, element: <Navigate to="terms" replace /> },
              { path: "terms" },
            ],
          },
          {
            path: "exercises",
            element: <ExercisesPage />,
            children: [
              { index: true, element: <Navigate to="catalog" replace /> },
              { path: "catalog" },
            ],
          },
        ],
      },
    ],
  }
];

export const router = createBrowserRouter(routes);
