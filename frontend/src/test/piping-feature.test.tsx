import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PipingFeature } from "@/features/piping/piping-feature";
import type { EngineeringApi } from "@/lib/api";

describe("PipingFeature", () => {
  it("loads catalogs and renders details for the selected composition and fitting", async () => {
    const user = userEvent.setup();
    const api: EngineeringApi = {
      getCompositions: vi.fn().mockResolvedValue(["Aço comercial"]),
      getCompositionDetails: vi.fn().mockResolvedValue({
        name: "Aço comercial",
        description: "Tubulação de aço carbono padrão",
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
      calculateDiameter: vi.fn(),
      getRealDiameter: vi.fn()
    };

    render(<PipingFeature api={api} />);

    await user.selectOptions(await screen.findByLabelText("Selecionar composição"), "Aço comercial");
    await user.selectOptions(screen.getByLabelText("Selecionar schedule"), "SCH40");
    await user.selectOptions(await screen.findByLabelText("Selecionar diâmetro"), "50");
    await user.selectOptions(screen.getByLabelText("Selecionar conexão"), "Cotovelo 90° raio longo");

    expect(await screen.findByText("Detalhes da Composição")).toBeInTheDocument();
    expect(screen.getByText("Tubulação de aço carbono padrão")).toBeInTheDocument();
    expect(screen.getByText("Detalhes do Diâmetro")).toBeInTheDocument();
    expect(screen.getByText("Detalhes da Conexão")).toBeInTheDocument();
  });
});
