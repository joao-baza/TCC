import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SizingFeature } from "@/features/sizing/sizing-feature";
import type { EngineeringApi } from "@/lib/api";

describe("SizingFeature", () => {
  it("calculates the theoretical and real diameters", async () => {
    const user = userEvent.setup();
    const api: EngineeringApi = {
      getCompositions: vi.fn(),
      getCompositionDetails: vi.fn(),
      getSchedules: vi.fn().mockResolvedValue([
        { name: "SCH40", diameters: [50], description: "Schedule padrão" }
      ]),
      getScheduleDiameters: vi.fn(),
      getScheduleDiameterDetails: vi.fn(),
      getFittings: vi.fn(),
      getFittingDetails: vi.fn(),
      calculateDiameter: vi.fn().mockResolvedValue({
        value: 79.78845608028654,
        units: "millimeter"
      }),
      getRealDiameter: vi.fn().mockResolvedValue({
        value: 80,
        units: "millimeter"
      })
    };

    render(<SizingFeature api={api} />);

    await user.type(screen.getByLabelText("Vazão (m³/s)"), "0.01");
    await user.type(screen.getByLabelText("Velocidade (m/s)"), "2");
    await user.click(screen.getByRole("button", { name: "Calcular Diâmetro" }));

    expect(await screen.findByText("Diâmetro Calculado")).toBeInTheDocument();
    expect(screen.getByDisplayValue("79.79")).toBeInTheDocument();

    await user.selectOptions(await screen.findByLabelText("Schedule"), "SCH40");
    await user.click(screen.getByRole("button", { name: "Encontrar Diâmetro Real" }));

    expect(await screen.findByText("Diâmetro Real")).toBeInTheDocument();
    expect(screen.getByText("80.0000")).toBeInTheDocument();
  });
});
