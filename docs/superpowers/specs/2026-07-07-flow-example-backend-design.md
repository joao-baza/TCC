# Flow Example Backend Design

## Goal

Replace the static worked example used by the Flow module with a backend-provided scenario that yields more coherent and more teachable inputs.

The target is the internal flow page only. The current work is intentionally scoped to the Reynolds and friction-factor flow shown in the same module, with the example values coming from the backend and the frontend only applying them to form state.

## Problem Statement

Today, the Flow page loads a fixed preset from `frontend/src/features/flow/presets.ts`. That makes the example brittle and easy to drift from the backend catalog, and it produces a generic turbulent case rather than a more useful transitional case.

The user wants:

- A backend-owned example, not a frontend-only preset.
- A transitional Reynolds case built from coherent values.
- The Reynolds result to be reused in the friction-factor form.
- Roughness to come from a known material composition rather than a raw custom number.
- The line diameter used in friction-factor to match the Reynolds example diameter.

## Proposed Contract

Add a dedicated backend endpoint for the Flow example, for example:

`GET /flow/example`

The endpoint returns a single scenario payload with two form sections:

- `reynolds`: fields to populate the Reynolds form
- `friction`: fields to populate the friction-factor form

Recommended payload shape:

```json
{
  "metadata": {
    "fluid": "Methane",
    "pressure": 101325,
    "regime": "transitional"
  },
  "reynolds": {
    "characteristicDiameter": "13.843",
    "velocity": "3.923",
    "density": "0.65688",
    "dynamicViscosity": "0.0000111963"
  },
  "friction": {
    "method": "SwameeJain",
    "roughnessSource": "composition",
    "composition": "Aço galvanizado",
    "diameterSource": "custom",
    "customDiameter": "13.843"
  }
}
```

Notes:

- The backend owns the example data and can validate that the chosen fluid and composition still exist in the backend catalog.
- The example payload is not itself a calculated result. The calculation still happens via the existing Reynolds and friction-factor endpoints.
- The returned Reynolds values are intentionally chosen to land in the transitional range.

## Frontend Behavior

The Flow page action button will:

- request the example payload from the backend
- populate the Reynolds form with the returned `reynolds` values
- populate the friction-factor form with the returned `friction` values
- keep the existing success notification
- surface a backend error notification if the example request fails

The existing Reynolds submit flow remains the same:

- the user clicks calculate
- the backend returns the Reynolds result
- the frontend stores that computed Reynolds number in the friction-factor input

That reuse is the key interaction change:

- the saved example fills the friction-factor inputs except Reynolds
- the calculated Reynolds value becomes the input for the friction-factor step

## Backend Data Source

The example data should live on the backend as a small scenario definition, not in the React tree.

The backend should resolve the example against existing backend knowledge:

- `Methane` must be a valid fluid in the components catalog
- `Aço galvanizado` must be a valid composition in the piping catalog

If either item is not available, the endpoint should fail clearly instead of silently falling back to a generic example.

## Error Handling

Expected failures:

- backend example route unavailable
- fluid or composition no longer exists in the backend catalogs
- malformed payload returned by the backend

Required behavior:

- do not partially overwrite unrelated Flow form state if the example request fails
- keep the existing form values intact on failure
- report a clear notification to the user

## Testing

Backend:

- add a test for the example endpoint response shape
- verify the endpoint returns the transitional Reynolds case
- verify the example references the expected fluid and composition values

Frontend:

- update the Flow page test that currently checks the worked example
- mock the new backend example response
- verify the Reynolds fields are populated from the response
- verify the friction form gets the composition and diameter values
- verify the Reynolds result is still written into the friction-factor input after calculation

## Out of Scope

- No redesign of the Flow UI.
- No new frontend example generator logic.
- No migration of other modules in this spec.
- No change to the backend calculation formulas.

## Acceptance Criteria

- The Flow page no longer depends on `frontend/src/features/flow/presets.ts` for its worked example.
- Clicking `Carregar exemplo` loads a backend-provided transitory case.
- The Reynolds example uses:
  - `D = 13.843 mm`
  - `V = 3.923 m/s`
  - `densidade = 0.65688`
  - `viscosidade dinâmica = 0.0000111963`
  - `Methane` at `101325 Pa`
- After Reynolds is calculated, the resulting Reynolds number is copied into the friction-factor field.
- The friction-factor example uses:
  - composition `Aço galvanizado`
  - line diameter `13.843 mm`
  - a reasonable friction method already supported by the backend
- The example is stable, reproducible, and backed by tests.
