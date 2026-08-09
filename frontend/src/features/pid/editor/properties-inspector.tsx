import { useEffect, useId, useState, type ReactNode } from "react";

import { patchElement, type PidCommand } from "../domain/commands";
import type { PidDocument, PidJsonValue, PidProperties } from "../domain/model";

export interface PropertiesInspectorProps {
  readonly document: PidDocument;
  readonly selection: readonly string[];
  readonly editable: boolean;
  readonly onCommand: (command: PidCommand) => void | boolean;
  readonly commandError?: string | null;
}

type FieldValue = string | number | PidProperties;

export function PropertiesInspector({
  document,
  selection,
  editable,
  onCommand,
  commandError,
}: PropertiesInspectorProps) {
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [announcement, setAnnouncement] = useState("");
  const selectedId = selection.length === 1 ? selection[0] : undefined;
  const selected = selectedId ? resolveSelectedElement(document, selectedId) : undefined;
  useEffect(() => {
    setFieldErrors({});
    setAnnouncement("");
  }, [selectedId]);

  const commit = (field: string, value: FieldValue, previous: FieldValue) => {
    if (!selectedId || !editable || sameValue(value, previous)) return;
    try {
      const accepted = onCommand(patchElement(selectedId, { [field]: value }));
      if (accepted === false) return;
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
  const common = { editable, errors: fieldErrors, commit, reject };

  return <div className="pid-properties-inspector">
    <div className="pid-inspector-heading-row">
      <h2 id="pid-inspector-heading">Inspetor</h2>
      {!editable && <span>Somente leitura</span>}
    </div>
    {selection.length === 0 && <DocumentSummary document={document} />}
    {selection.length > 1 && <p>{selection.length} elementos selecionados. Selecione apenas um para editar propriedades.</p>}
    {selected?.kind === "node" && <FieldGroup title="Equipamento" id={selected.value.id}>
      <TextField label="Tag" field="tag" value={selected.value.tag} {...common} />
      <TextField label="Rótulo" field="label" value={selected.value.label} {...common} />
      <NumberField label="Posição X" field="x" value={selected.value.x} {...common} />
      <NumberField label="Posição Y" field="y" value={selected.value.y} {...common} />
      <NumberField label="Largura" field="width" value={selected.value.width} positive {...common} />
      <NumberField label="Altura" field="height" value={selected.value.height} positive {...common} />
      <NumberField label="Rotação" field="rotation" value={selected.value.rotation} rotation {...common} />
      <PropertiesField value={selected.value.properties} {...common} />
    </FieldGroup>}
    {selected?.kind === "port" && <FieldGroup title="Porta" id={selected.value.id}>
      <p><strong>Template:</strong> {selected.value.templateKey}</p>
      <SelectField label="Direção" field="direction" value={selected.value.direction} options={[
        ["input", "Entrada"], ["output", "Saída"], ["bidirectional", "Bidirecional"],
      ]} {...common} />
      <SelectField label="Classe de conexão" field="connectionClass" value={selected.value.connectionClass} options={[
        ["process", "Processo"], ["utility", "Utilidade"], ["signal", "Sinal"],
      ]} {...common} />
      <NumberField label="Capacidade" field="capacity" value={selected.value.capacity} positive integer {...common} />
    </FieldGroup>}
    {selected?.kind === "edge" && <FieldGroup title="Conexão" id={selected.value.id}>
      <TextField label="Tag" field="tag" value={selected.value.tag} {...common} />
      <TextField label="Rótulo" field="label" value={selected.value.label} {...common} />
      <p><strong>Classe:</strong> {connectionClassLabel(selected.value.connectionClass)}</p>
      <PropertiesField value={selected.value.properties} {...common} />
    </FieldGroup>}
    {selected?.kind === "group" && <FieldGroup title="Grupo" id={selected.value.id}>
      <TextField label="Rótulo" field="label" value={selected.value.label} {...common} />
      <p>{selected.value.memberIds.length} membro(s)</p>
      <PropertiesField value={selected.value.properties} {...common} />
    </FieldGroup>}
    {selected?.kind === "annotation" && <FieldGroup title="Anotação" id={selected.value.id}>
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
    {commandError && <p className="pid-inspector-field-error" role="alert">{commandError}</p>}
    <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
      {commandError ?? announcement}
    </div>
  </div>;
}

interface SharedFieldProps {
  readonly editable: boolean;
  readonly errors: Record<string, string>;
  readonly commit: (field: string, value: FieldValue, previous: FieldValue) => void;
  readonly reject: (field: string, message: string) => void;
}

function TextField({ label, field, value, multiline = false, editable, errors, commit }: SharedFieldProps & {
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
    onBlur: (event: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => commit(field, event.currentTarget.value, value),
  };
  return <label className="pid-inspector-field" htmlFor={id}>
    <span>{label}</span>
    {multiline
      ? <textarea key={`${field}:${value}`} {...props} rows={3} />
      : <input key={`${field}:${value}`} {...props} type="text" />}
    <FieldError id={`${id}-error`} message={error} />
  </label>;
}

function NumberField({ label, field, value, positive = false, integer = false, rotation = false, editable, errors, commit, reject }: SharedFieldProps & {
  label: string; field: string; value: number; positive?: boolean; integer?: boolean; rotation?: boolean;
}) {
  const id = useId();
  const error = errors[field];
  return <label className="pid-inspector-field" htmlFor={id}>
    <span>{label}</span>
    <input
      id={id}
      key={`${field}:${value}`}
      type="number"
      defaultValue={value}
      disabled={!editable}
      step={integer || rotation ? 1 : "any"}
      aria-invalid={Boolean(error)}
      aria-describedby={error ? `${id}-error` : undefined}
      onBlur={(event) => {
        const parsed = Number(event.currentTarget.value);
        const message = !Number.isFinite(parsed)
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

function SelectField({ label, field, value, options, editable, errors, commit }: SharedFieldProps & {
  label: string; field: string; value: string; options: readonly (readonly [string, string])[];
}) {
  const id = useId();
  const error = errors[field];
  return <label className="pid-inspector-field" htmlFor={id}>
    <span>{label}</span>
    <select id={id} key={`${field}:${value}`} defaultValue={value} disabled={!editable} onBlur={(event) => commit(field, event.currentTarget.value, value)}>
      {options.map(([option, text]) => <option key={option} value={option}>{text}</option>)}
    </select>
    <FieldError id={`${id}-error`} message={error} />
  </label>;
}

function PropertiesField({ value, editable, errors, commit, reject }: SharedFieldProps & { value: PidProperties }) {
  const id = useId();
  const field = "properties";
  const error = errors[field];
  return <label className="pid-inspector-field" htmlFor={id}>
    <span>Propriedades (JSON)</span>
    <textarea
      id={id}
      key={JSON.stringify(value)}
      defaultValue={JSON.stringify(value, null, 2)}
      disabled={!editable}
      rows={5}
      spellCheck={false}
      aria-invalid={Boolean(error)}
      aria-describedby={error ? `${id}-error` : undefined}
      onBlur={(event) => {
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

function sameValue(left: FieldValue, right: FieldValue): boolean {
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
