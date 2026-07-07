import { matchRoutes, type RouteObject } from "react-router-dom";

import { routes } from "@/app/router";

describe("route tab leaves", () => {
  it.each([
    "/flow/reynolds",
    "/flow/friction-factor",
    "/flow/hydraulic-diameter",
    "/pump/headloss",
    "/pump/npsh-available",
    "/pump/manometric-head",
    "/components/critical-properties",
    "/components/pure-fluid",
    "/components/state-properties",
    "/components/mixtures",
    "/components/ternary-diagram",
    "/components/binary-vle",
    "/components/mccabe-thiele",
    "/components/property-surface",
    "/components/phase-envelope",
    "/reactor/cstr",
    "/reactor/pfr",
    "/reactor/levenspiel",
    "/reactor/arrhenius",
    "/balance/components",
    "/balance/actions",
    "/balance/streams",
    "/balance/reactions",
    "/balance/splits-recycle",
    "/balance/results",
    "/balance/yields",
    "/glossary/terms",
    "/exercises/catalog",
  ])("defines a route element for %s", (path) => {
    const matches = matchRoutes(routes as RouteObject[], path);

    expect(matches).not.toBeNull();
    expect(matches?.some((match) => Boolean(match.route.element ?? match.route.Component))).toBe(
      true,
    );
  });
});
