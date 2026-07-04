import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AppExperience } from "@/features/shell/app-experience";
import type { EngineeringApi } from "@/lib/api";

function createApiStub(): EngineeringApi {
  return {
    getCompositions: vi.fn().mockResolvedValue(["Aço comercial"]),
    getCompositionDetails: vi.fn().mockResolvedValue({
      name: "Aço comercial",
      specifications: {
        roughness: { value: 0.06, units: "millimeter" }
      }
    }),
    getSchedules: vi.fn().mockResolvedValue([
      { name: "SCH40", diameters: [50], description: "Schedule padrão" }
    ]),
    getScheduleDiameters: vi.fn().mockResolvedValue({
      50: { nominal_diameter: 50, external_diameter: 60.3, units: "mm" }
    }),
    getScheduleDiameterDetails: vi.fn().mockResolvedValue({
      external_diameter: { value: 60.3, units: "millimeter" }
    }),
    getFittings: vi.fn().mockResolvedValue(["Cotovelo 90° raio longo"]),
    getFittingDetails: vi.fn().mockResolvedValue({
      name: "Cotovelo 90° raio longo",
      specifications: {
        equivalentLength: { value: 16, units: "dimensionless" }
      }
    }),
    calculateDiameter: vi.fn().mockResolvedValue({
      value: 79.78845608028654,
      units: "millimeter"
    }),
    getRealDiameter: vi.fn().mockResolvedValue({
      value: 80,
      units: "millimeter"
    })
  };
}

describe("AppExperience", () => {
  it("starts from home and reaches the simulations hub through the new primary CTA", async () => {
    const user = userEvent.setup();
    render(<AppExperience api={createApiStub()} />);

    await user.click(screen.getByRole("button", { name: "Iniciar uma simulação" }));

    expect(
      await screen.findByRole("heading", { name: "Simulações em Destaque" })
    ).toBeInTheDocument();
  });

  it("opens the flow module from the highlighted simulations hub", async () => {
    const user = userEvent.setup();
    const api = createApiStub() as EngineeringApi;
    api.getFrictionFactorMethods = vi.fn().mockResolvedValue(["ColebrookWhite", "SwameeJain"]);
    api.getHydraulicDiameterShapes = vi.fn().mockResolvedValue(["circular", "rectangular"]);
    api.calculateReynolds = vi.fn();
    api.calculateFrictionFactor = vi.fn();
    api.calculateHydraulicDiameter = vi.fn().mockResolvedValue({
      value: 66.66666666666667,
      units: "millimeter"
    });

    render(<AppExperience api={api} />);

    await user.click(screen.getByRole("button", { name: "Iniciar uma simulação" }));
    await user.click(screen.getByRole("button", { name: "Abrir módulo de Escoamento" }));

    expect(await screen.findByRole("heading", { name: "Cálculos de Escoamento" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Calcular Número de Reynolds" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Calcular Diâmetro Hidráulico" })).toBeInTheDocument();
  });
});
