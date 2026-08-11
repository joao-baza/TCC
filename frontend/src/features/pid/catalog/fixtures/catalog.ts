import { createTrustedCatalogManifest } from "../catalog-symbol";
import drawioCatalogSymbols from "../generated/drawio-catalog.json";
import drawioPid2CatalogSymbols from "../generated/drawio-pid2-catalog.json";
import { projectFittingsCatalog } from "./project-fittings";
export type { CatalogProvenance, CatalogSourceKind, CatalogSymbol } from "../catalog-symbol";

export const localCatalog = createTrustedCatalogManifest([
  ...projectFittingsCatalog,
  ...drawioCatalogSymbols,
  ...drawioPid2CatalogSymbols,
]);
