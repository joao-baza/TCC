import { describe, expect, it } from "vitest";

import { mapPumpExampleToFormInputs } from "@/features/pump/example";

describe("mapPumpExampleToFormInputs", () => {
  it("maps the pump worked example into the form state", () => {
    const mapped = mapPumpExampleToFormInputs({
      headloss: {
        method: "Darcy-Weisbach",
        pipe_length: 100,
        diameter: 125,
        flow_rate: 0.04,
        velocity: 3.259493234522017,
        reynolds: 3186.1046722863807,
        friction_factor: 0.04495094389484752,
        friction_method: "SwameeJain",
        composition: "Aço galvanizado",
        fittings: [
          { fitting: "Cotovelo 45°", quantity: 5 },
          { fitting: "Saída de tanque", quantity: 1 },
        ],
      },
      npsh: {
        manometric_pressure: 1.033,
        atmospheric_pressure: 1.033,
        vapor_pressure: 0.023,
        density: 998,
        friction_factor: 2.55887,
        pump_inlet_velocity: 1.4,
        gauge_elevation: 3,
        required: 3,
      },
      head: {
        pressure1: 101325,
        pressure2: 180000,
        elevation1: 0,
        elevation2: 12,
        velocity1: 1.5,
        velocity2: 2.1,
        density: 998,
        friction_factor: 4.25,
      },
    });

    expect(mapped.headloss).toEqual({
      method: "Darcy-Weisbach",
      pipeLength: "100",
      diameter: "125",
      flowRate: "0.04",
      velocity: "3.259493234522017",
      reynolds: "3186.1046722863807",
      frictionFactor: "0.04495094389484752",
      frictionMethod: "SwameeJain",
      composition: "Aço galvanizado",
    });
    expect(mapped.fittings).toEqual([
      { fitting: "Cotovelo 45°", quantity: "5" },
      { fitting: "Saída de tanque", quantity: "1" },
    ]);
    expect(mapped.npsh).toEqual({
      manometricPressure: "1.033",
      atmosphericPressure: "1.033",
      vaporPressure: "0.023",
      density: "998",
      frictionFactor: "2.55887",
      pumpInletVelocity: "1.4",
      gaugeElevation: "3",
      required: "3",
    });
    expect(mapped.head).toEqual({
      pressure1: "101325",
      pressure2: "180000",
      elevation1: "0",
      elevation2: "12",
      velocity1: "1.5",
      velocity2: "2.1",
      density: "998",
      frictionFactor: "4.25",
    });
  });
});
