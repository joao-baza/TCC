import { useEffect, useId, useRef, useState, type ReactNode } from "react";

import { patchElement, type PidCommand } from "../domain/commands";
import type { PidDocument, PidJsonValue, PidProperties } from "../domain/model";

export interface PropertiesInspectorProps {
  readonly document: PidDocument;
  readonly selection: readonly string[];
  readonly editable: boolean;
  readonly onCommand: (command: PidCommand) => void | InspectorCommandResult;
}

export type InspectorCommandResult =
  | { readonly ok: true }
  | { readonly ok: false; readonly field: string; readonly message: string };

type FieldValue = string | number | PidProperties;

export function PropertiesInspector({
  document,
  selection,
  editable,
  onCommand,
}: PropertiesInspectorProps) {
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [announcement, setAnnouncement] = useState("");
  const [fieldRevisions, setFieldRevisions] = useState<Record<string, number>>({});
  const activeFieldRef = useRef<string | null>(null);
  const dirtyFieldsRef = useRef(new Set<string>());
  const previousCanonicalRef = useRef<{ selectedId?: string; fields: Record<string, FieldValue> }>({ fields: {} });
  const selectedId = selection.length === 1 ? selection[0] : undefined;
  const selected = selectedId ? resolveSelectedElement(document, selectedId) : undefined;
  const selectedValue = selected?.value;
  const canonicalFields = selected ? selectedFieldValues(selected) : {};
  useEffect(() => {
    const previous = previousCanonicalRef.current;
    if (previous.selectedId !== selectedId) {
      activeFieldRef.current = null;
      dirtyFieldsRef.current.clear();
      setFieldErrors({});
      setFieldRevisions({});
      setAnnouncement("");
      previousCanonicalRef.current = { selectedId, fields: canonicalFields };
      return;
    }

    const activeField = activeFieldRef.current;
    const preserveActiveDraft = activeField !== null && dirtyFieldsRef.current.has(activeField);
    const allFields = new Set([...Object.keys(previous.fields), ...Object.keys(canonicalFields)]);
    const refreshFields = [...allFields].filter((field) => !(preserveActiveDraft && field === activeField));
    const activeCanonicalChanged = preserveActiveDraft
      && activeField !== null
      && !sameValue(canonicalFields[activeField], previous.fields[activeField]);
    const conflictMessage = activeCanonicalChanged
      ? "Este campo mudou remotamente enquanto você editava. Seu rascunho foi preservado; revise-o antes de confirmar."
      : null;

    setFieldRevisions((current) => {
      const next = { ...current };
      for (const field of refreshFields) next[field] = (next[field] ?? 0) + 1;
      return next;
    });
    setFieldErrors((current) => {
      let next = current;
      for (const field of refreshFields) next = omitField(next, field);
      return conflictMessage && activeField ? { ...next, [activeField]: conflictMessage } : next;
    });
    for (const field of refreshFields) dirtyFieldsRef.current.delete(field);
    setAnnouncement(conflictMessage ?? "");
    previousCanonicalRef.current = { selectedId, fields: canonicalFields };
  }, [selectedId, selectedValue]);

  const commit = (field: string, value: FieldValue, previous: FieldValue) => {
    if (!selectedId || !editable) return;
    if (sameValue(value, previous)) {
      dirtyFieldsRef.current.delete(field);
      setFieldErrors((current) => omitField(current, field));
      setAnnouncement("");
      return;
    }
    try {
      const result = onCommand(patchElement(selectedId, { [field]: value }));
      if (result?.ok === false) {
        setFieldErrors((current) => ({ ...current, [result.field]: result.message }));
        setAnnouncement(result.message);
        return;
      }
      dirtyFieldsRef.current.delete(field);
      setFieldErrors((current) => omitField(current, field));
      setAnnouncement(`${fieldLabel(field)} atualizado.`);
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : "Não foi possível atualizar o campo.";
      setFieldErrors((current) => ({ ...current, [field]: message }));
      setAnnouncement(message);
    }
  };
  const reject = (field: string, message: string) => {
    setFieldErrors((current) => ({ ...current, [field]: message }));
    setAnnouncement(message);
  };
  const beginDraft = (field: string) => { activeFieldRef.current = field; };
  const changeDraft = (field: string) => { dirtyFieldsRef.current.add(field); };
  const endDraft = (field: string) => {
    if (activeFieldRef.current === field) activeFieldRef.current = null;
  };
  const common = { editable, errors: fieldErrors, fieldRevisions, beginDraft, changeDraft, endDraft, commit, reject };

  return <div className="pid-properties-inspector">
    <div className="pid-inspector-heading-row">
      <h2 id="pid-inspector-heading">Inspetor</h2>
      {!editable && <span>Somente leitura</span>}
    </div>
    {selection.length === 0 && <DocumentSummary document={document} />}
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
      <p><strong>Classe:</strong> {connectionClassLabel(selected.value.connectionClass)}</p>
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
}

interface SharedFieldProps {
  readonly editable: boolean;
  readonly errors: Record<string, string>;
  readonly fieldRevisions: Record<string, number>;
  readonly beginDraft: (field: string) => void;
  readonly changeDraft: (field: string) => void;
  readonly endDraft: (field: string) => void;
  readonly commit: (field: string, value: FieldValue, previous: FieldValue) => void;
  readonly reject: (field: string, message: string) => void;
}

function TextField({ label, field, value, multiline = false, editable, errors, fieldRevisions, beginDraft, changeDraft, endDraft, commit }: SharedFieldProps & {
  label: string; field: string; value: string; multiline?: boolean;
}) {
  const id = useId();
  const error = errors[field];
  const props = {
    id,
    defaultValue: value,
    disabled: !editable,
    "aria-invalid": Boolean(error),
    "aria-describedby": error ? `${id}-error` : undefined,
    onFocus: () => beginDraft(field),
    onChange: () => changeDraft(field),
    onBlur: (event: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      endDraft(field);
      commit(field, event.currentTarget.value, value);
    },
  };
  return <label className="pid-inspector-field" htmlFor={id}>
    <span>{label}</span>
    {multiline
      ? <textarea key={`${field}:${fieldRevisions[field] ?? 0}`} {...props} rows={3} />
      : <input key={`${field}:${fieldRevisions[field] ?? 0}`} {...props} type="text" />}
    <FieldError id={`${id}-error`} message={error} />
  </label>;
}

function NumberField({ label, field, value, positive = false, integer = false, rotation = false, editable, errors, fieldRevisions, beginDraft, changeDraft, endDraft, commit, reject }: SharedFieldProps & {
  label: string; field: string; value: number; positive?: boolean; integer?: boolean; rotation?: boolean;
}) {
  const id = useId();
  const error = errors[field];
  return <label className="pid-inspector-field" htmlFor={id}>
    <span>{label}</span>
    <input
      id={id}
      key={`${field}:${fieldRevisions[field] ?? 0}`}
      type="number"
      defaultValue={value}
      disabled={!editable}
      step={integer || rotation ? 1 : "any"}
      aria-invalid={Boolean(error)}
      aria-describedby={error ? `${id}-error` : undefined}
      onFocus={() => beginDraft(field)}
      onChange={() => changeDraft(field)}
      onBlur={(event) => {
        endDraft(field);
        const rawValue = event.currentTarget.value.trim();
        const parsed = rawValue === "" ? Number.NaN : Number(rawValue);
        const message = rawValue === ""
          ? "Informe um número."
          : !Number.isFinite(parsed)
          ? "Informe um número finito."
          : positive && parsed <= 0
            ? integer ? "Informe um inteiro positivo." : "Informe um número positivo."
            : integer && !Number.isInteger(parsed)
              ? "Informe um inteiro positivo."
              : rotation && parsed % 90 !== 0
                ? "A rotação deve ser múltipla de 90 graus."
                : null;
        if (message) reject(field, message); else commit(field, parsed, value);
      }}
    />
    <FieldError id={`${id}-error`} message={error} />
  </label>;
}

function SelectField({ label, field, value, options, editable, errors, fieldRevisions, beginDraft, changeDraft, endDraft, commit }: SharedFieldProps & {
  label: string; field: string; value: string; options: readonly (readonly [string, string])[];
}) {
  const id = useId();
  const error = errors[field];
  return <label className="pid-inspector-field" htmlFor={id}>
    <span>{label}</span>
    <select
      id={id}
      key={`${field}:${fieldRevisions[field] ?? 0}`}
      defaultValue={value}
      disabled={!editable}
      aria-invalid={Boolean(error)}
      aria-describedby={error ? `${id}-error` : undefined}
      onFocus={() => beginDraft(field)}
      onChange={() => changeDraft(field)}
      onBlur={(event) => {
        endDraft(field);
        commit(field, event.currentTarget.value, value);
      }}
    >
      {options.map(([option, text]) => <option key={option} value={option}>{text}</option>)}
    </select>
    <FieldError id={`${id}-error`} message={error} />
  </label>;
}

function PropertiesField({ value, editable, errors, fieldRevisions, beginDraft, changeDraft, endDraft, commit, reject }: SharedFieldProps & { value: PidProperties }) {
  const id = useId();
  const field = "properties";
  const error = errors[field];
  return <label className="pid-inspector-field" htmlFor={id}>
    <span>Propriedades (JSON)</span>
    <textarea
      id={id}
      key={`${field}:${fieldRevisions[field] ?? 0}`}
      defaultValue={JSON.stringify(value, null, 2)}
      disabled={!editable}
      rows={5}
      spellCheck={false}
      aria-invalid={Boolean(error)}
      aria-describedby={error ? `${id}-error` : undefined}
      onFocus={() => beginDraft(field)}
      onChange={() => changeDraft(field)}
      onBlur={(event) => {
        endDraft(field);
        try {
          const parsed: unknown = JSON.parse(event.currentTarget.value);
          if (!isProperties(parsed)) throw new Error();
          commit(field, parsed, value);
        } catch {
          reject(field, "Informe um objeto JSON válido.");
        }
      }}
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

function DocumentSummary({ document }: { document: PidDocument }) {
  const standard = document.metadata.standard === "free" ? "Livre" : document.metadata.standard.toUpperCase();
  const nodeCount = Object.keys(document.nodes).length;
  return <dl className="pid-document-summary">
    <div><dt>Título</dt><dd>{document.metadata.title}</dd></div>
    <div><dt>Standard</dt><dd>{standard} no documento</dd></div>
    <div><dt>Conteúdo</dt><dd>{nodeCount} {nodeCount === 1 ? "equipamento" : "equipamentos"}, {Object.keys(document.edges).length} conexão(ões)</dd></div>
  </dl>;
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
      return { tag: selected.value.tag, label: selected.value.label, properties: selected.value.properties };
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

function connectionClassLabel(value: string): string {
  return value === "process" ? "Processo" : value === "utility" ? "Utilidade" : "Sinal";
}
