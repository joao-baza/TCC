import { forwardRef, useEffect, useId, useImperativeHandle, useRef, useState, type ReactNode } from "react";

import { patchElement, type PidCommand } from "../domain/commands";
import type { ConnectionClass, PidDocument, PidJsonValue, PidProperties } from "../domain/model";
import { LINE_STYLES, LINE_STYLE_INFO, CONNECTION_CLASS_INFO } from "../domain/line-style";
import type { LineStyle } from "../domain/line-style";

export interface PropertiesInspectorProps {
  readonly document: PidDocument;
  readonly selection: readonly string[];
  readonly editable: boolean;
  readonly commitAllowed?: boolean;
  readonly onCommand: (command: PidCommand) => void | InspectorCommandResult;
  readonly onDraftStateChange?: (hasDrafts: boolean) => void;
}

export interface PropertiesInspectorHandle {
  prepareForReadOnly(): { readonly hasUnresolvedDrafts: boolean };
  hasUnresolvedDrafts(): boolean;
}

export type InspectorCommandResult =
  | { readonly ok: true }
  | { readonly ok: false; readonly field: string; readonly message: string };

type FieldValue = string | number | PidProperties;
interface FieldDraft {
  readonly raw: string;
  readonly base: FieldValue;
  readonly conflicted?: boolean;
  readonly preserve?: boolean;
}

export const PropertiesInspector = forwardRef<PropertiesInspectorHandle, PropertiesInspectorProps>(function PropertiesInspector({
  document,
  selection,
  editable,
  commitAllowed = editable,
  onCommand,
  onDraftStateChange,
}, ref) {
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [announcement, setAnnouncement] = useState("");
  const [drafts, setDrafts] = useState<Record<string, FieldDraft>>({});
  const draftsRef = useRef<Record<string, FieldDraft>>({});
  const activeFieldRef = useRef<string | null>(null);
  const previousCanonicalRef = useRef<{ selectedId?: string; fields: Record<string, FieldValue> }>({ fields: {} });
  const selectedId = selection.length === 1 ? selection[0] : undefined;
  const selected = selectedId ? resolveSelectedElement(document, selectedId) : undefined;
  const selectedValue = selected?.value;
  const canonicalFields = selected ? selectedFieldValues(selected) : {};
  useEffect(() => {
    const previous = previousCanonicalRef.current;
    if (previous.selectedId !== selectedId) {
      activeFieldRef.current = null;
      draftsRef.current = {};
      setDrafts({});
      setFieldErrors({});
      setAnnouncement("");
      previousCanonicalRef.current = { selectedId, fields: canonicalFields };
      return;
    }

    const activeField = activeFieldRef.current;
    const allFields = new Set([...Object.keys(previous.fields), ...Object.keys(canonicalFields)]);
    const nextDrafts = { ...draftsRef.current };
    let draftsChanged = false;
    let conflictField: string | null = null;
    for (const field of allFields) {
      const draft = nextDrafts[field];
      if (!draft) continue;
      if (activeField === field || draft.preserve) {
        if (!sameValue(canonicalFields[field], previous.fields[field])) {
          nextDrafts[field] = { ...draft, conflicted: true, preserve: true };
          conflictField = field;
          draftsChanged = true;
        }
      } else {
        delete nextDrafts[field];
        draftsChanged = true;
      }
    }
    if (draftsChanged) {
      draftsRef.current = nextDrafts;
      setDrafts(nextDrafts);
    }
    const conflictMessage = conflictField
      ? "Este campo mudou remotamente enquanto você editava. Seu rascunho foi preservado; revise-o antes de confirmar."
      : null;
    setFieldErrors((current) => {
      let next = current;
      for (const field of allFields) {
        if (!nextDrafts[field]) next = omitField(next, field);
      }
      return conflictMessage && conflictField ? { ...next, [conflictField]: conflictMessage } : next;
    });
    setAnnouncement(conflictMessage ?? "");
    previousCanonicalRef.current = { selectedId, fields: canonicalFields };
  }, [selectedId, selectedValue]);

  useEffect(() => onDraftStateChange?.(Object.keys(drafts).length > 0), [drafts, onDraftStateChange]);

  const replaceDrafts = (next: Record<string, FieldDraft>) => {
    draftsRef.current = next;
    setDrafts(next);
  };

  const commit = (field: string, value: FieldValue, previous: FieldValue): boolean => {
    if (!selectedId || !commitAllowed) return false;
    if (sameValue(value, previous)) {
      const next = { ...draftsRef.current };
      delete next[field];
      replaceDrafts(next);
      setFieldErrors((current) => omitField(current, field));
      setAnnouncement("");
      return true;
    }
    try {
      const result = onCommand(patchElement(selectedId, { [field]: value }));
      if (result?.ok === false) {
        setFieldErrors((current) => ({ ...current, [result.field]: result.message }));
        setAnnouncement(result.message);
        return false;
      }
      const next = { ...draftsRef.current };
      delete next[field];
      replaceDrafts(next);
      setFieldErrors((current) => omitField(current, field));
      setAnnouncement(`${fieldLabel(field)} atualizado.`);
      return true;
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : "Não foi possível atualizar o campo.";
      setFieldErrors((current) => ({ ...current, [field]: message }));
      setAnnouncement(message);
      return false;
    }
  };
  const reject = (field: string, message: string) => {
    setFieldErrors((current) => ({ ...current, [field]: message }));
    setAnnouncement(message);
  };
  const beginDraft = (field: string) => { activeFieldRef.current = field; };
  const changeDraft = (field: string, raw: string, base: FieldValue) => {
    const previous = draftsRef.current[field];
    const next = {
      ...draftsRef.current,
      [field]: { raw, base: previous?.conflicted ? canonicalFields[field] ?? base : previous?.base ?? base },
    };
    replaceDrafts(next);
    if (previous?.conflicted) {
      setFieldErrors((current) => omitField(current, field));
      setAnnouncement("");
    }
  };
  const endDraft = (field: string) => {
    if (activeFieldRef.current === field) activeFieldRef.current = null;
  };
  const finalizeDraft = (field: string): boolean => {
    endDraft(field);
    const draft = draftsRef.current[field];
    if (!draft) return true;
    if (draft.conflicted) {
      reject(field, "Este campo mudou remotamente. Revise o rascunho antes de confirmar.");
      return false;
    }
    const parsed = parseDraftValue(selected, field, draft.raw);
    if (!parsed.ok) {
      reject(field, parsed.message);
      return false;
    }
    return commit(field, parsed.value, canonicalFields[field] ?? draft.base);
  };
  const prepareForReadOnly = () => {
    activeFieldRef.current = null;
    for (const field of Object.keys(draftsRef.current)) finalizeDraft(field);
    const unresolved = Object.keys(draftsRef.current).length > 0;
    if (unresolved) {
      const next = Object.fromEntries(Object.entries(draftsRef.current).map(([field, draft]) => [field, { ...draft, preserve: true }]));
      replaceDrafts(next);
      setAnnouncement("Há um rascunho que precisa ser corrigido antes de ser salvo.");
    }
    return { hasUnresolvedDrafts: unresolved };
  };
  useImperativeHandle(ref, () => ({
    prepareForReadOnly,
    hasUnresolvedDrafts: () => Object.keys(draftsRef.current).length > 0,
  }));
  const common = { editable, errors: fieldErrors, drafts, beginDraft, changeDraft, finalizeDraft };

  return <div className="pid-properties-inspector">
    <div className="pid-inspector-heading-row">
      <h2 id="pid-inspector-heading">Inspetor</h2>
      {!editable && <span>Somente leitura</span>}
    </div>
    {selection.length === 0 && (
      <div className="pid-inspector-fields">
        <p><strong>{document.metadata.title}</strong></p>
        <p>Livre no documento</p>
        <p>{Object.keys(document.nodes).length} equipamento(s) · {Object.keys(document.edges).length} linha(s)</p>
      </div>
    )}
    {selection.length > 1 && <p>{selection.length} elementos selecionados. Selecione apenas um para editar propriedades.</p>}
    {selected?.kind === "node" && <FieldGroup key={selected.value.id} title="Equipamento" id={selected.value.id}>
      <TextField label="Tag" field="tag" value={selected.value.tag} {...common} />
      <TextField label="Rótulo" field="label" value={selected.value.label} {...common} />
      <NumberField label="Posição X" field="x" value={selected.value.x} {...common} />
      <NumberField label="Posição Y" field="y" value={selected.value.y} {...common} />
      <NumberField label="Largura" field="width" value={selected.value.width} positive {...common} />
      <NumberField label="Altura" field="height" value={selected.value.height} positive {...common} />
      <NumberField label="Rotação" field="rotation" value={selected.value.rotation} rotation {...common} />
      <PropertiesField value={selected.value.properties} {...common} />
    </FieldGroup>}
    {selected?.kind === "port" && <FieldGroup key={selected.value.id} title="Porta" id={selected.value.id}>
      <p><strong>Template:</strong> {selected.value.templateKey}</p>
      <SelectField label="Direção" field="direction" value={selected.value.direction} options={[
        ["input", "Entrada"], ["output", "Saída"], ["bidirectional", "Bidirecional"],
      ]} {...common} />
      <SelectField label="Classe de conexão" field="connectionClass" value={selected.value.connectionClass} options={[
        ["process", "Processo"], ["utility", "Utilidade"], ["signal", "Sinal"],
      ]} {...common} />
      <NumberField label="Capacidade" field="capacity" value={selected.value.capacity} positive integer {...common} />
    </FieldGroup>}
    {selected?.kind === "edge" && <FieldGroup key={selected.value.id} title="Conexão" id={selected.value.id}>
      <TextField label="Tag" field="tag" value={selected.value.tag} {...common} />
      <TextField label="Rótulo" field="label" value={selected.value.label} {...common} />
      <p><strong>Classe:</strong> {CONNECTION_CLASS_INFO[selected.value.connectionClass as ConnectionClass].label}</p>
      <SelectField label="Estilo de linha" field="lineStyle" value={selected.value.lineStyle}
        title={LINE_STYLE_INFO[selected.value.lineStyle as LineStyle].description}
        options={LINE_STYLES.map((style) => [style, LINE_STYLE_INFO[style].label] as const)} {...common} />
      {selected.value.connectionClass === "utility" && (
        <SelectField
          label="Categoria"
          field="utilityCategoryId"
          value={selected.value.utilityCategoryId ?? ""}
          options={[
            ["", "Nenhuma"],
            ...document.metadata.utilityCategories.map((c) => [c.id, c.name] as const),
          ]}
          {...common}
        />
      )}
      <PropertiesField value={selected.value.properties} {...common} />
    </FieldGroup>}
    {selected?.kind === "group" && <FieldGroup key={selected.value.id} title="Grupo" id={selected.value.id}>
      <TextField label="Rótulo" field="label" value={selected.value.label} {...common} />
      <p>{selected.value.memberIds.length} membro(s)</p>
      <PropertiesField value={selected.value.properties} {...common} />
    </FieldGroup>}
    {selected?.kind === "annotation" && <FieldGroup key={selected.value.id} title="Anotação" id={selected.value.id}>
      <SelectField label="Tipo" field="kind" value={selected.value.kind} options={[
        ["text", "Texto"], ["note", "Nota"], ["callout", "Chamada"],
      ]} {...common} />
      <TextField label="Texto" field="text" value={selected.value.text} multiline {...common} />
      <NumberField label="Posição X" field="x" value={selected.value.x} {...common} />
      <NumberField label="Posição Y" field="y" value={selected.value.y} {...common} />
      <NumberField label="Largura" field="width" value={selected.value.width} positive {...common} />
      <NumberField label="Altura" field="height" value={selected.value.height} positive {...common} />
      <NumberField label="Rotação" field="rotation" value={selected.value.rotation} rotation {...common} />
      <PropertiesField value={selected.value.properties} {...common} />
    </FieldGroup>}
    {selectedId && !selected && <p role="alert">O elemento selecionado não existe mais.</p>}
    <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
      {announcement}
    </div>
  </div>;
});

interface SharedFieldProps {
  readonly editable: boolean;
  readonly errors: Record<string, string>;
  readonly drafts: Record<string, FieldDraft>;
  readonly beginDraft: (field: string) => void;
  readonly changeDraft: (field: string, raw: string, base: FieldValue) => void;
  readonly finalizeDraft: (field: string) => boolean;
}

function TextField({ label, field, value, multiline = false, editable, errors, drafts, beginDraft, changeDraft, finalizeDraft }: SharedFieldProps & {
  label: string; field: string; value: string; multiline?: boolean;
}) {
  const id = useId();
  const error = errors[field];
  const props = {
    id,
    "aria-label": label,
    value: drafts[field]?.raw ?? value,
    disabled: !editable,
    "aria-invalid": Boolean(error),
    "aria-describedby": error ? `${id}-error` : undefined,
    onFocus: () => beginDraft(field),
    onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => changeDraft(field, event.currentTarget.value, value),
    onBlur: () => { finalizeDraft(field); },
  };
  return <label className="pid-inspector-field" htmlFor={id}>
    <span>{label}</span>
    {multiline
      ? <textarea {...props} rows={3} />
      : <input {...props} type="text" />}
    <FieldError id={`${id}-error`} message={error} />
  </label>;
}

function NumberField({ label, field, value, positive = false, integer = false, rotation = false, editable, errors, drafts, beginDraft, changeDraft, finalizeDraft }: SharedFieldProps & {
  label: string; field: string; value: number; positive?: boolean; integer?: boolean; rotation?: boolean;
}) {
  const id = useId();
  const error = errors[field];
  return <label className="pid-inspector-field" htmlFor={id}>
    <span>{label}</span>
    <input
      id={id}
      aria-label={label}
      type="number"
      value={drafts[field]?.raw ?? String(value)}
      disabled={!editable}
      step={integer || rotation ? 1 : "any"}
      aria-invalid={Boolean(error)}
      aria-describedby={error ? `${id}-error` : undefined}
      onFocus={() => beginDraft(field)}
      data-positive={positive || undefined}
      data-integer={integer || undefined}
      data-rotation={rotation || undefined}
      onChange={(event) => changeDraft(field, event.currentTarget.value, value)}
      onBlur={() => { finalizeDraft(field); }}
    />
    <FieldError id={`${id}-error`} message={error} />
  </label>;
}

function SelectField({ label, field, value, options, title, editable, errors, drafts, beginDraft, changeDraft, finalizeDraft }: SharedFieldProps & {
  label: string; field: string; value: string; options: readonly (readonly [string, string])[]; title?: string;
}) {
  const id = useId();
  const error = errors[field];
  return <label className="pid-inspector-field" htmlFor={id}>
    <span>{label}</span>
    <select
      id={id}
      aria-label={label}
      title={title}
      value={drafts[field]?.raw ?? value}
      disabled={!editable}
      aria-invalid={Boolean(error)}
      aria-describedby={error ? `${id}-error` : undefined}
      onFocus={() => beginDraft(field)}
      onChange={(event) => changeDraft(field, event.currentTarget.value, value)}
      onBlur={() => { finalizeDraft(field); }}
    >
      {options.map(([option, text]) => <option key={option} value={option}>{text}</option>)}
    </select>
    <FieldError id={`${id}-error`} message={error} />
  </label>;
}

function PropertiesField({ value, editable, errors, drafts, beginDraft, changeDraft, finalizeDraft }: SharedFieldProps & { value: PidProperties }) {
  const id = useId();
  const field = "properties";
  const error = errors[field];
  return <label className="pid-inspector-field" htmlFor={id}>
    <span>Propriedades (JSON)</span>
    <textarea
      id={id}
      aria-label="Propriedades (JSON)"
      value={drafts[field]?.raw ?? JSON.stringify(value, null, 2)}
      disabled={!editable}
      rows={5}
      spellCheck={false}
      aria-invalid={Boolean(error)}
      aria-describedby={error ? `${id}-error` : undefined}
      onFocus={() => beginDraft(field)}
      onChange={(event) => changeDraft(field, event.currentTarget.value, value)}
      onBlur={() => { finalizeDraft(field); }}
    />
    <FieldError id={`${id}-error`} message={error} />
  </label>;
}

function FieldGroup({ title, id, children }: { title: string; id: string; children: ReactNode }) {
  return <div className="pid-inspector-fields"><h3>{title}</h3><p className="pid-inspector-id">ID: {id}</p>{children}</div>;
}

function FieldError({ id, message }: { id: string; message?: string }) {
  return message ? <span id={id} className="pid-inspector-field-error">{message}</span> : null;
}

function resolveSelectedElement(document: PidDocument, id: string) {
  if (document.nodes[id]) return { kind: "node" as const, value: document.nodes[id] };
  if (document.ports[id]) return { kind: "port" as const, value: document.ports[id] };
  if (document.edges[id]) return { kind: "edge" as const, value: document.edges[id] };
  if (document.groups[id]) return { kind: "group" as const, value: document.groups[id] };
  if (document.annotations[id]) return { kind: "annotation" as const, value: document.annotations[id] };
  return undefined;
}

function selectedFieldValues(selected: NonNullable<ReturnType<typeof resolveSelectedElement>>): Record<string, FieldValue> {
  switch (selected.kind) {
    case "node":
      return {
        tag: selected.value.tag,
        label: selected.value.label,
        x: selected.value.x,
        y: selected.value.y,
        width: selected.value.width,
        height: selected.value.height,
        rotation: selected.value.rotation,
        properties: selected.value.properties,
      };
    case "port":
      return {
        direction: selected.value.direction,
        connectionClass: selected.value.connectionClass,
        capacity: selected.value.capacity,
      };
    case "edge":
      return { tag: selected.value.tag, label: selected.value.label, lineStyle: selected.value.lineStyle, properties: selected.value.properties, utilityCategoryId: selected.value.utilityCategoryId ?? "" };
    case "group":
      return { label: selected.value.label, properties: selected.value.properties };
    case "annotation":
      return {
        kind: selected.value.kind,
        text: selected.value.text,
        x: selected.value.x,
        y: selected.value.y,
        width: selected.value.width,
        height: selected.value.height,
        rotation: selected.value.rotation,
        properties: selected.value.properties,
      };
  }
}

function sameValue(left: FieldValue | undefined, right: FieldValue | undefined): boolean {
  return typeof left === "object" || typeof right === "object"
    ? JSON.stringify(left) === JSON.stringify(right)
    : left === right;
}

function parseDraftValue(
  selected: ReturnType<typeof resolveSelectedElement>,
  field: string,
  raw: string,
): { readonly ok: true; readonly value: FieldValue } | { readonly ok: false; readonly message: string } {
  if (field === "properties") {
    try {
      const parsed: unknown = JSON.parse(raw);
      return isProperties(parsed)
        ? { ok: true, value: parsed }
        : { ok: false, message: "Informe um objeto JSON válido." };
    } catch {
      return { ok: false, message: "Informe um objeto JSON válido." };
    }
  }
  const numeric = field === "x" || field === "y" || field === "width" || field === "height"
    || field === "rotation" || field === "capacity";
  if (!numeric) return { ok: true, value: raw };
  const trimmed = raw.trim();
  if (trimmed === "") return { ok: false, message: "Informe um número." };
  const value = Number(trimmed);
  if (!Number.isFinite(value)) return { ok: false, message: "Informe um número finito." };
  if (field === "capacity" && (value <= 0 || !Number.isInteger(value))) {
    return { ok: false, message: "Informe um inteiro positivo." };
  }
  if ((field === "width" || field === "height") && value <= 0) {
    return { ok: false, message: "Informe um número positivo." };
  }
  if (field === "rotation" && value % 90 !== 0) {
    return { ok: false, message: "A rotação deve ser múltipla de 90 graus." };
  }
  if (!selected) return { ok: false, message: "O elemento selecionado não existe mais." };
  return { ok: true, value };
}

function isProperties(value: unknown): value is Record<string, PidJsonValue> {
  return typeof value === "object" && value !== null && !Array.isArray(value) && Object.getPrototypeOf(value) === Object.prototype;
}

function omitField(source: Record<string, string>, field: string): Record<string, string> {
  if (!(field in source)) return source;
  return Object.fromEntries(Object.entries(source).filter(([key]) => key !== field));
}

function fieldLabel(field: string): string {
  return field === "tag" ? "Tag" : field === "label" ? "Rótulo" : field === "text" ? "Texto" : "Campo";
}
