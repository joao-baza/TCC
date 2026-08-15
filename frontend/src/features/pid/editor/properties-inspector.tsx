import { forwardRef, useEffect, useId, useImperativeHandle, useRef, useState, type ReactNode } from "react";

import { patchElement, type PidCommand } from "../domain/commands";
import {
  annotationColorsFromProperties,
  annotationPropertiesWithColor,
  annotationPropertiesWithTextAlign,
  annotationPropertiesWithTextVerticalAlign,
  annotationTextAlignFromProperties,
  annotationTextVerticalAlignFromProperties,
  ANNOTATION_TEXT_ALIGNMENTS,
  ANNOTATION_TEXT_VERTICAL_ALIGNMENTS,
  isAnnotationColorField,
  isAnnotationTextAlign,
  isAnnotationTextAlignField,
  isAnnotationTextVerticalAlign,
  isAnnotationTextVerticalAlignField,
  isHexColor,
} from "../domain/annotation-style";
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
  const optimisticAnnotationPropertiesRef = useRef<{ selectedId: string; properties: PidProperties } | null>(null);
  const selectedId = selection.length === 1 ? selection[0] : undefined;
  const selected = selectedId ? resolveSelectedElement(document, selectedId) : undefined;
  const selectedValue = selected?.value;
  const canonicalFields = selected ? selectedFieldValues(selected) : {};
  useEffect(() => {
    const previous = previousCanonicalRef.current;
    if (previous.selectedId !== selectedId) {
      activeFieldRef.current = null;
      optimisticAnnotationPropertiesRef.current = null;
      draftsRef.current = {};
      setDrafts({});
      setFieldErrors({});
      setAnnouncement("");
      previousCanonicalRef.current = { selectedId, fields: canonicalFields };
      return;
    }

    const activeField = activeFieldRef.current;
    if (selectedId && selected?.kind === "annotation") {
      optimisticAnnotationPropertiesRef.current = { selectedId, properties: selected.value.properties };
    }
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
      let nextOptimisticAnnotationProperties: PidProperties | null = null;
      const patch = selected?.kind === "annotation" && isAnnotationColorField(field)
        ? (() => {
          nextOptimisticAnnotationProperties = annotationPropertiesWithColor(
            optimisticAnnotationPropertiesRef.current?.selectedId === selectedId
              ? optimisticAnnotationPropertiesRef.current.properties
              : selected.value.properties,
            field,
            String(value),
          );
          return { properties: nextOptimisticAnnotationProperties };
        })()
        : selected?.kind === "annotation" && isAnnotationTextAlignField(field)
          ? (() => {
            nextOptimisticAnnotationProperties = annotationPropertiesWithTextAlign(
              optimisticAnnotationPropertiesRef.current?.selectedId === selectedId
                ? optimisticAnnotationPropertiesRef.current.properties
                : selected.value.properties,
              String(value),
            );
            return { properties: nextOptimisticAnnotationProperties };
          })()
          : selected?.kind === "annotation" && isAnnotationTextVerticalAlignField(field)
            ? (() => {
              nextOptimisticAnnotationProperties = annotationPropertiesWithTextVerticalAlign(
                optimisticAnnotationPropertiesRef.current?.selectedId === selectedId
                  ? optimisticAnnotationPropertiesRef.current.properties
                  : selected.value.properties,
                String(value),
              );
              return { properties: nextOptimisticAnnotationProperties };
            })()
        : { [field]: value };
      const result = onCommand(patchElement(selectedId, patch));
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
      if (nextOptimisticAnnotationProperties) {
        optimisticAnnotationPropertiesRef.current = { selectedId, properties: nextOptimisticAnnotationProperties };
      }
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
    <div className="pid-inspector-selection-summary" aria-label="Resumo da seleção">
      <span className="pid-inspector-summary-label">{selectionSummary(selected, selection.length).kind}</span>
      <strong>{selectionSummary(selected, selection.length).label}</strong>
      <span>{editable ? "Pronto para editar" : "Modo de leitura"}</span>
    </div>
    {selection.length === 0 && (
      <div className="pid-inspector-fields">
        <p><strong>{document.metadata.title}</strong></p>
        <p>Livre no documento</p>
        <p>{Object.keys(document.nodes).length} equipamento(s)</p>
      </div>
    )}
    {selection.length > 1 && <p>{selection.length} elementos selecionados. Selecione apenas um para editar propriedades.</p>}
    {selected?.kind === "node" && <FieldGroup key={selected.value.id} title="Equipamento">
      <TextField label="Tag" field="tag" value={selected.value.tag} {...common} />
      <TextField label="Rótulo" field="label" value={selected.value.label} {...common} />
      <PropertiesField value={selected.value.properties} {...common} />
    </FieldGroup>}
    {selected?.kind === "port" && <FieldGroup key={selected.value.id} title="Porta">
      <p><strong>Template:</strong> {selected.value.templateKey}</p>
      <SelectField label="Direção" field="direction" value={selected.value.direction} options={[
        ["input", "Entrada"], ["output", "Saída"], ["bidirectional", "Bidirecional"],
      ]} {...common} />
      <SelectField label="Classe de conexão" field="connectionClass" value={selected.value.connectionClass} options={[
        ["process", "Processo"], ["utility", "Utilidade"], ["signal", "Sinal"],
      ]} {...common} />
      <NumberField label="Capacidade" field="capacity" value={selected.value.capacity} positive integer {...common} />
    </FieldGroup>}
    {selected?.kind === "edge" && <FieldGroup key={selected.value.id} title="Conexão">
      <TextField label="Tag" field="tag" value={selected.value.tag} {...common} />
      <TextField label="Rótulo" field="label" value={selected.value.label} {...common} />
      <p><strong>Classe:</strong> {CONNECTION_CLASS_INFO[selected.value.connectionClass as ConnectionClass].label}</p>
      {selected.value.connectionClass === "signal"
        ? <SelectField label="Estilo de linha" field="lineStyle" value={selected.value.lineStyle}
          title={LINE_STYLE_INFO[selected.value.lineStyle as LineStyle].description}
          options={LINE_STYLES.map((style) => [style, LINE_STYLE_INFO[style].label] as const)} {...common} />
        : selected.value.connectionClass === "utility" && <p><strong>Estilo de linha:</strong> Liso normal</p>}
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
    {selected?.kind === "group" && <FieldGroup key={selected.value.id} title="Grupo">
      <TextField label="Rótulo" field="label" value={selected.value.label} {...common} />
      <p>{selected.value.memberIds.length} membro(s)</p>
      <PropertiesField value={selected.value.properties} {...common} />
    </FieldGroup>}
    {selected?.kind === "annotation" && <FieldGroup key={selected.value.id} title="Anotação">
      <TextField label="Texto" field="text" value={selected.value.text} multiline {...common} />
      <SelectField label="Alinhamento do texto" field="annotationTextAlign" value={annotationTextAlignFromProperties(selected.value.properties)} options={ANNOTATION_TEXT_ALIGNMENTS.map((alignment) => [alignment, annotationTextAlignLabel(alignment)] as const)} {...common} />
      <SelectField label="Alinhamento vertical" field="annotationTextVerticalAlign" value={annotationTextVerticalAlignFromProperties(selected.value.properties)} options={ANNOTATION_TEXT_VERTICAL_ALIGNMENTS.map((alignment) => [alignment, annotationTextVerticalAlignLabel(alignment)] as const)} {...common} />
      <ColorField
        label="Cor do card"
        field="annotationFillColor"
        value={annotationColorsFromProperties(selected.value.properties).fillColor}
        {...common}
      />
      <ColorField
        label="Cor do texto"
        field="annotationTextColor"
        value={annotationColorsFromProperties(selected.value.properties).textColor}
        {...common}
      />
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

function ColorField({ label, field, value, editable, errors, drafts, beginDraft, changeDraft, finalizeDraft }: SharedFieldProps & {
  label: string; field: string; value: string;
}) {
  const id = useId();
  const error = errors[field];
  return <label className="pid-inspector-field pid-inspector-color-field" htmlFor={id}>
    <span>{label}</span>
    <input
      id={id}
      aria-label={label}
      type="color"
      value={drafts[field]?.raw ?? value}
      disabled={!editable}
      aria-invalid={Boolean(error)}
      aria-describedby={error ? `${id}-error` : undefined}
      onFocus={() => beginDraft(field)}
      onChange={(event) => {
        changeDraft(field, event.currentTarget.value, value);
        finalizeDraft(field);
      }}
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
      onChange={(event) => {
        changeDraft(field, event.currentTarget.value, value);
        finalizeDraft(field);
      }}
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

function FieldGroup({ title, children }: { title: string; children: ReactNode }) {
  return <div className="pid-inspector-fields"><h3>{title}</h3>{children}</div>;
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

function selectionSummary(selected: ReturnType<typeof resolveSelectedElement>, selectionLength: number): { kind: string; label: string } {
  if (selectionLength > 1) return { kind: "Seleção", label: `${selectionLength} elementos` };
  if (!selected) return { kind: "Documento", label: "Nenhum elemento selecionado" };
  const kind = {
    node: "Equipamento",
    port: "Porta",
    edge: "Conexão",
    group: "Grupo",
    annotation: "Anotação",
  }[selected.kind];
  const label = selected.kind === "node"
    ? selected.value.tag || selected.value.label || "Equipamento sem rótulo"
    : selected.kind === "edge"
      ? selected.value.tag || selected.value.label || "Conexão sem rótulo"
      : selected.kind === "annotation"
        ? selected.value.text || "Anotação sem texto"
        : selected.kind === "group"
          ? selected.value.label || "Grupo sem rótulo"
          : "Porta selecionada";
  return { kind, label };
}

function selectedFieldValues(selected: NonNullable<ReturnType<typeof resolveSelectedElement>>): Record<string, FieldValue> {
  switch (selected.kind) {
    case "node":
      return {
        tag: selected.value.tag,
        label: selected.value.label,
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
      const colors = annotationColorsFromProperties(selected.value.properties);
      return {
        text: selected.value.text,
        annotationTextAlign: annotationTextAlignFromProperties(selected.value.properties),
        annotationTextVerticalAlign: annotationTextVerticalAlignFromProperties(selected.value.properties),
        annotationFillColor: colors.fillColor,
        annotationTextColor: colors.textColor,
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
  if (isAnnotationColorField(field)) {
    return isHexColor(raw)
      ? { ok: true, value: raw.toLowerCase() }
      : { ok: false, message: "Informe uma cor hexadecimal válida." };
  }
  if (isAnnotationTextAlignField(field)) {
    return isAnnotationTextAlign(raw)
      ? { ok: true, value: raw }
      : { ok: false, message: "Informe um alinhamento de texto válido." };
  }
  if (isAnnotationTextVerticalAlignField(field)) {
    return isAnnotationTextVerticalAlign(raw)
      ? { ok: true, value: raw }
      : { ok: false, message: "Informe um alinhamento vertical válido." };
  }
  const numeric = field === "capacity";
  if (!numeric) return { ok: true, value: raw };
  const trimmed = raw.trim();
  if (trimmed === "") return { ok: false, message: "Informe um número." };
  const value = Number(trimmed);
  if (!Number.isFinite(value)) return { ok: false, message: "Informe um número finito." };
  if (field === "capacity" && (value <= 0 || !Number.isInteger(value))) {
    return { ok: false, message: "Informe um inteiro positivo." };
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
  return field === "tag"
    ? "Tag"
    : field === "label"
      ? "Rótulo"
      : field === "text"
        ? "Texto"
        : field === "annotationTextAlign"
          ? "Alinhamento do texto"
          : field === "annotationTextVerticalAlign"
            ? "Alinhamento vertical"
            : field === "annotationFillColor"
              ? "Cor do card"
              : field === "annotationTextColor"
                ? "Cor do texto"
                : "Campo";
}

function annotationTextAlignLabel(alignment: string): string {
  return alignment === "left"
    ? "Esquerda"
    : alignment === "center"
      ? "Centralizado"
      : alignment === "right"
        ? "Direita"
        : "Justificado";
}

function annotationTextVerticalAlignLabel(alignment: string): string {
  return alignment === "top"
    ? "Superior"
    : alignment === "middle"
      ? "Centralizado"
      : "Inferior";
}
