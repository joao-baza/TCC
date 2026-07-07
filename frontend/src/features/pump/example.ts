export type PumpExamplePayload = {
  headloss: {
    method: "Darcy-Weisbach";
    pipe_length: number;
    diameter: number;
    flow_rate: number;
    velocity: number;
    reynolds: number;
    friction_factor: number;
    friction_method: "ColebrookWhite" | "SwameeJain";
    composition: string;
    fittings: Array<{
      fitting: string;
      quantity: number;
    }>;
  };
  npsh: {
    manometric_pressure: number;
    atmospheric_pressure: number;
    vapor_pressure: number;
    density: number;
    friction_factor: number;
    pump_inlet_velocity: number;
    gauge_elevation: number;
    required: number;
  };
  head: {
    pressure1: number;
    pressure2: number;
    elevation1: number;
    elevation2: number;
    velocity1: number;
    velocity2: number;
    density: number;
    friction_factor: number;
  };
};

export type PumpExampleFormInputs = {
  headloss: {
    method: PumpExamplePayload["headloss"]["method"];
    pipeLength: string;
    diameter: string;
    flowRate: string;
    velocity: string;
    reynolds: string;
    frictionFactor: string;
    frictionMethod: PumpExamplePayload["headloss"]["friction_method"];
    composition: string;
  };
  fittings: Array<{
    fitting: string;
    quantity: string;
  }>;
  npsh: {
    manometricPressure: string;
    atmosphericPressure: string;
    vaporPressure: string;
    density: string;
    frictionFactor: string;
    pumpInletVelocity: string;
    gaugeElevation: string;
    required: string;
  };
  head: {
    pressure1: string;
    pressure2: string;
    elevation1: string;
    elevation2: string;
    velocity1: string;
    velocity2: string;
    density: string;
    frictionFactor: string;
  };
};

export function mapPumpExampleToFormInputs(
  example: PumpExamplePayload,
): PumpExampleFormInputs {
  return {
    headloss: {
      method: example.headloss.method,
      pipeLength: String(example.headloss.pipe_length),
      diameter: String(example.headloss.diameter),
      flowRate: String(example.headloss.flow_rate),
      velocity: String(example.headloss.velocity),
      reynolds: String(example.headloss.reynolds),
      frictionFactor: String(example.headloss.friction_factor),
      frictionMethod: example.headloss.friction_method,
      composition: example.headloss.composition,
    },
    fittings: example.headloss.fittings.map((fitting) => ({
      fitting: fitting.fitting,
      quantity: String(fitting.quantity),
    })),
    npsh: {
      manometricPressure: String(example.npsh.manometric_pressure),
      atmosphericPressure: String(example.npsh.atmospheric_pressure),
      vaporPressure: String(example.npsh.vapor_pressure),
      density: String(example.npsh.density),
      frictionFactor: String(example.npsh.friction_factor),
      pumpInletVelocity: String(example.npsh.pump_inlet_velocity),
      gaugeElevation: String(example.npsh.gauge_elevation),
      required: String(example.npsh.required),
    },
    head: {
      pressure1: String(example.head.pressure1),
      pressure2: String(example.head.pressure2),
      elevation1: String(example.head.elevation1),
      elevation2: String(example.head.elevation2),
      velocity1: String(example.head.velocity1),
      velocity2: String(example.head.velocity2),
      density: String(example.head.density),
      frictionFactor: String(example.head.friction_factor),
    },
  };
}
