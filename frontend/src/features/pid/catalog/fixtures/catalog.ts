import { createTrustedCatalogManifest } from "../catalog-symbol";
import drawioCatalogSymbols from "../generated/drawio-catalog.json";
import drawioPid2CatalogSymbols from "../generated/drawio-pid2-catalog.json";
export type { CatalogProvenance, CatalogSourceKind, CatalogSymbol } from "../catalog-symbol";

export const localCatalog = createTrustedCatalogManifest([
  ...drawioCatalogSymbols,
  ...drawioPid2CatalogSymbols,
]);
