import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FlowFeature } from "@/features/flow/flow-feature";
import type { EngineeringApi } from "@/lib/api";

describe("FlowFeature", () => {
  it("calculates Reynolds and friction factor using the current backend contract", async () => {
    const user = userEvent.setup();
    const api: EngineeringApi = {
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
      getScheduleDiameterDetails: vi.fn(),
      getFittings: vi.fn(),
      getFittingDetails: vi.fn(),
      calculateDiameter: vi.fn(),
      getRealDiameter: vi.fn(),
      getFrictionFactorMethods: vi.fn().mockResolvedValue([
        "ColebrookWhite",
        "SwameeJain",
        "Haaland"
      ]),
      getHydraulicDiameterShapes: vi.fn().mockResolvedValue([
        "circular",
        "rectangular",
        "annular",
        "triangular",
        "circularCap"
      ]),
      calculateReynolds: vi.fn().mockResolvedValue({
        value: 99800,
        units: "dimensionless"
      }),
      calculateFrictionFactor: vi.fn().mockResolvedValue({
        value: 0.0223,
        units: "dimensionless"
      }),
      calculateHydraulicDiameter: vi.fn()
    };

    render(<FlowFeature api={api} />);

    await user.type(screen.getByLabelText("Diâmetro Característico (mm)"), "50");
    await user.type(screen.getByLabelText("Velocidade (m/s)"), "2");
    await user.type(screen.getByLabelText("Densidade (kg/m³)"), "998");
    await user.type(screen.getByLabelText("Viscosidade Dinâmica (Pa·s)"), "0.001");
    await user.click(screen.getByRole("button", { name: "Calcular Número de Reynolds" }));

    expect(await screen.findByDisplayValue("99800.00")).toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText("Composição do Material"), "Aço comercial");
    await user.selectOptions(screen.getByLabelText("Schedule do Tubo"), "SCH40");
    await user.selectOptions(await screen.findByLabelText("Diâmetro (mm)"), "50");
    await user.selectOptions(screen.getByLabelText("Método"), "SwameeJain");
    await user.click(screen.getByRole("button", { name: "Calcular Fator de Atrito" }));

    expect(await screen.findByText("0.0223")).toBeInTheDocument();
    expect(screen.getByText("0.0223")).toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText("Forma"), "rectangular");
    await user.type(screen.getByLabelText("Largura (mm)"), "100");
    await user.type(screen.getByLabelText("Altura (mm)"), "50");
    await user.click(screen.getByRole("button", { name: "Calcular Diâmetro Hidráulico" }));

    expect(api.calculateHydraulicDiameter).toHaveBeenCalledWith({
      shape: "rectangular",
      width: 100,
      height: 50
    });
  });
});
