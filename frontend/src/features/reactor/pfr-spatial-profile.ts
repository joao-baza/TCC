export type PfrSpatialQuantity = {
  value: number;
  units: string;
};

type RawSpatialQuantity =
  | number
  | null
  | undefined
  | {
      value?: unknown;
      units?: unknown;
    };

type RawSpatialStation = {
  relative_volume: number;
  conversion: RawSpatialQuantity;
  temperature: RawSpatialQuantity;
  concentrations: Record<string, RawSpatialQuantity>;
};

export type PfrSpatialProfileResponse = {
  stations: RawSpatialStation[];
};

export type PfrSpatialStation = {
  relativeVolume: number;
  conversion: number;
  temperature: number;
  concentrations: Record<string, PfrSpatialQuantity>;
};

type PfrSpatialProfileFormInput = {
  components: Array<{
    state: "liquid" | "gaseous";
    component_name: string;
    flow_rate_inlet: string;
    molar_concentration_inlet: string;
  }>;
  stoichiometricCoefficients: string[];
  reactionOrders: string[];
  rateConstant: string;
  initialTemperature: string;
  initialPressure: string;
  finalTemperature: string;
  finalPressure: string;
  recyclingRatio: string;
};

export const defaultPfrSpatialAxialPositions = [0, 0.1, 0.2, 0.25, 0.4, 0.5, 0.6, 0.75, 0.8, 1];

function isBlankComponentRow(component: PfrSpatialProfileFormInput["components"][number]) {
  return (
    component.component_name.trim() === "" &&
    component.flow_rate_inlet.trim() === "" &&
    component.molar_concentration_inlet.trim() === ""
  );
}

function activeComponentIndexes(form: PfrSpatialProfileFormInput) {
  return form.components.flatMap((component, index) => (isBlankComponentRow(component) ? [] : [index]));
}

function normalizeQuantity(
  value: RawSpatialQuantity,
  fallbackUnits: string,
): PfrSpatialQuantity | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return { value, units: fallbackUnits };
  }

  if (typeof value === "object" && value !== null && typeof value.value === "number") {
    return {
      value: value.value,
      units: typeof value.units === "string" && value.units.length > 0 ? value.units : fallbackUnits,
    };
  }

  return null;
}

export function buildPfrSpatialProfilePayload(
  form: PfrSpatialProfileFormInput,
  volume: number,
) {
  const indexes = activeComponentIndexes(form);

  return {
    components: indexes.map((index) => ({
      state: form.components[index].state,
      component_name: form.components[index].component_name,
      flow_rate_inlet: Number(form.components[index].flow_rate_inlet),
      molar_concentration_inlet: Number(form.components[index].molar_concentration_inlet),
    })),
    stoichiometric_coefficients: indexes.map((index) =>
      Number(form.stoichiometricCoefficients[index]),
    ),
    reaction_rate_params: {
      k: Number(form.rateConstant),
      reaction_orders: indexes.map((index) => Number(form.reactionOrders[index])),
    },
    operation_conditions: {
      initial_temperature: Number(form.initialTemperature),
      initial_pressure: Number(form.initialPressure),
      final_temperature: Number(form.finalTemperature),
      final_pressure: Number(form.finalPressure),
    },
    volume,
    recycling_ratio: Number(form.recyclingRatio) || 0,
    axial_positions: defaultPfrSpatialAxialPositions,
  };
}

export function normalizePfrSpatialProfileResponse(
  response: PfrSpatialProfileResponse,
): PfrSpatialStation[] {
  return response.stations
    .flatMap((station) => {
      if (!Number.isFinite(station.relative_volume)) {
        return [];
      }

      const conversion = normalizeQuantity(station.conversion, "adimensional");
      const temperature = normalizeQuantity(station.temperature, "K");
      if (!conversion || !temperature) {
        return [];
      }

      const concentrations = Object.fromEntries(
        Object.entries(station.concentrations ?? {}).flatMap(([label, rawValue]) => {
          const quantity = normalizeQuantity(rawValue, "mol/m³");
          return quantity ? [[label, quantity] as const] : [];
        }),
      );

      return [
        {
          relativeVolume: station.relative_volume,
          conversion: conversion.value,
          temperature: temperature.value,
          concentrations,
        },
      ];
    })
    .sort((left, right) => left.relativeVolume - right.relativeVolume);
}
