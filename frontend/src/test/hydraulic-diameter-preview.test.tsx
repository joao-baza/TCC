import { render, screen } from "@testing-library/react";

import {
  HydraulicDiameterPreview,
  type HydraulicDiameterPreviewModel,
} from "@/components/viz/hydraulic-diameter-preview";

const previewModel: HydraulicDiameterPreviewModel = {
  title: "Canal circular",
  description: "Representação proporcional do canal circular com fluido.",
  summary: "Segmento circular preenchido, com D, h e R destacados.",
  view_box: "0 0 320 220",
  elements: [
    {
      type: "path",
      attrs: {
        d: "M 106.86 128.4 A 76 76 0 0 0 213.14 128.4 L 106.86 128.4 Z",
        fill: "#0F5E9C",
        stroke: "#0F172A",
        strokeWidth: "2.5",
        "data-preview-id": "backend-cap-fill",
      },
    },
    {
      type: "line",
      attrs: {
        x1: 160,
        x2: 214.72,
        y1: 96,
        y2: 41.28,
        stroke: "#94A3B8",
        strokeWidth: "1.5",
      },
    },
    {
      type: "text",
      attrs: {
        x: 216.72,
        y: 39.28,
        fill: "#334155",
        fontSize: "12",
      },
      text: "R",
    },
  ],
  chips: [
    { label: "D", value: "0,1" },
    { label: "h", value: "0,03" },
    { label: "R", value: "0,05" },
  ],
};

describe("HydraulicDiameterPreview", () => {
  it("renders the backend-provided preview primitives and chips", () => {
    render(<HydraulicDiameterPreview preview={previewModel} />);

    const previewSvg = screen.getByRole("img", { name: /Canal circular/i });
    expect(previewSvg.querySelector('path[data-preview-id="backend-cap-fill"]')).not.toBeNull();
    expect(previewSvg.querySelector("path")?.getAttribute("d")).toBe(
      "M 106.86 128.4 A 76 76 0 0 0 213.14 128.4 L 106.86 128.4 Z",
    );
    expect(screen.getByText(/Segmento circular preenchido/i)).toBeInTheDocument();
    expect(screen.getByText(/D = 0,1/i)).toBeInTheDocument();
    expect(screen.getByText(/h = 0,03/i)).toBeInTheDocument();
    expect(screen.getByText(/R = 0,05/i)).toBeInTheDocument();
  });

  it("renders a placeholder while backend preview data is unavailable", () => {
    render(<HydraulicDiameterPreview preview={null} placeholderText="Informe parâmetros válidos." />);

    expect(screen.getByText(/Pré-visualização geométrica/i)).toBeInTheDocument();
    expect(screen.getByText(/Informe parâmetros válidos/i)).toBeInTheDocument();
  });
});
