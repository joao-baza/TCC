# TCC Term Normalization Design

## Goal

Normalize terminology in user-facing documentation and text so the TCC project consistently distinguishes physical piping, process streams, and flow phenomena.

## Scope

Apply the terminology rules to documentation and visible text only:

- `final-paper/` LaTeX source and captions.
- `slides/` presentation text.
- `README.md` and other documentation files if they mention the terms.
- Frontend labels, headings, helper text, empty states, chart labels, and test expectations tied to visible text.
- Backend-facing text exposed to users, such as OpenAPI descriptions, example labels, catalog descriptions, and translated validation messages.

Do not rename routes, variables, functions, classes, modules, schema fields, payload keys, API paths, or internal English domain identifiers such as `piping`, `pipe`, `stream`, and `streams`.

## Terminology Rules

Use **tubulação** for the physical or cataloged structure:

- Materials, roughness, schedules, nominal diameter, pipe length, fittings, catalog data, and the Tubulações module.
- Prefer "tubulação" over generic "tubo", "duto", "conduto", or "linha" when the text refers to the installed or selected physical system.

Use **corrente** for the process material being transported or balanced:

- Flow rate, composition, state, inlet, outlet, product, recycle, purge, and mass-balance stream tables.
- Keep "corrente" when the focus is the material and its process properties, even if it passes through a tubulação.

Use **escoamento** for the phenomenon:

- Reynolds number, flow regime, velocity profile, friction factor, head loss, hydraulic diameter, and velocity behavior.
- Use this when the sentence is about what the fluid is doing rather than the physical object or process stream identity.

Use **linha** only for established expressions or graphical concepts:

- Keep terms such as "linha de sucção", "linha q", "linha de enriquecimento", "linha de esgotamento", "linha-guia", and "linhas operacionais".
- Avoid "linha" as a generic synonym for tubulação.

Use **duto**, **conduto**, or **tubo** only when geometry or a specific technical object is the point:

- Keep "duto circular", "dutos não circulares", "tubo concêntrico", "tubo comercial", and "reator tubular" when that precision matters.
- Avoid replacing these occurrences mechanically if the sentence is about shape, standard pipe dimensions, or reactor type.

## Implementation Strategy

First audit the occurrences by file group and classify them as keep, replace, or review manually. Then edit only user-facing strings and documentation passages. Avoid broad search-and-replace because several valid exceptions exist.

After edits, run focused searches for the target terms and verify that remaining uses match the rules above. For documentation, compile or build the affected artifacts when practical. For frontend/backend text changes, run the relevant tests or at minimum type/build checks tied to changed files.

## Out of Scope

- API contract changes.
- Route renames, including `/piping`.
- Python or TypeScript variable/class/module renames.
- Payload schema field renames.
- Recreating screenshots solely to change embedded text, unless the screenshot is regenerated naturally from updated UI text.
- Editing generated LaTeX artifacts such as `.aux`, `.log`, `.toc`, `.lof`, `.lot`, `.bbl`, and PDFs directly.
