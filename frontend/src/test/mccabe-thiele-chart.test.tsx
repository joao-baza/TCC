import { fireEvent, render, screen } from "@testing-library/react";

import { McCabeThieleChart } from "@/components/viz/mccabe-thiele-chart";

describe("McCabeThieleChart", () => {
  it("keeps axis ticks visible and moves composition labels into safe callouts", () => {
    const { container } = render(
      <McCabeThieleChart
        fluid1="Ethanol"
        fluid2="Water"
        equilibriumPoints={[
          { liquid_fraction: 0, vapor_fraction: 0, temperature: 351 },
          { liquid_fraction: 0.5, vapor_fraction: 0.72, temperature: 360 },
          { liquid_fraction: 1, vapor_fraction: 1, temperature: 373 },
        ]}
        distillateComposition={0.92}
        bottomsComposition={0.08}
        feedComposition={0.45}
        refluxRatio={1.5}
        qValue={1.0}
      />,
    );

    expect(screen.getByRole("heading", { name: /^McCabe-Thiele$/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Como funciona - McCabe-Thiele/i })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Como funciona - McCabe-Thiele/i }));
    const howItWorks = screen.getByRole("region", { name: /Como funciona - McCabe-Thiele/i });
    expect(howItWorks).toHaveTextContent(/xD\s*é a composição do destilado/i);
    expect(howItWorks).toHaveTextContent(/xB\s*é a composição do fundo/i);
    expect(howItWorks).toHaveTextContent(/zF\s*é a composição da alimentação/i);
    expect(howItWorks).toHaveTextContent(/q\s*descreve o estado térmico/i);
    expect(screen.getByText(/O que você pode extrair daqui/i)).toBeInTheDocument();
    expect(screen.getByText(/Número de estágios teóricos necessários/i)).toBeInTheDocument();
    expect(container.querySelector('[data-chart-label="x"]')?.textContent).toMatch(/x\s*\(líquido, fração molar\)/i);
    expect(container.querySelector('[data-chart-label="y"]')?.textContent).toMatch(/y\s*\(vapor, fração molar\)/i);
    expect(container.querySelectorAll('[data-chart-label="callout"]')).toHaveLength(3);
    expect(container.querySelectorAll("[data-axis-tick='x']")).toHaveLength(5);
    expect(container.querySelectorAll("[data-axis-tick='y']")).toHaveLength(5);
    expect(screen.getByText(/Diagonal y = x/i)).toBeInTheDocument();
    expect(screen.getByText(/Curva de equilíbrio/i)).toBeInTheDocument();
  });
});
