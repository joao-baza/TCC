from pydantic import BaseModel, Field, field_validator, model_validator
from typing import List, Optional, Dict, Any


# ---------------------------------------------------------------------------
# Mass Balance Models
# ---------------------------------------------------------------------------

class StreamModel(BaseModel):
    name: str = Field(..., description="Name of the stream")
    direction: int = Field(..., description="Direction of the stream: +1 for input, -1 for output")
    flow_rate: Optional[float] = Field(None, description="Flow rate of the stream (can be in any mass units like kg/h, g/min or molar units like mol/s)")
    compositions: Dict[str, Optional[float]] = Field(..., description="Dictionary of component compositions (mass fractions when using mass flow units, molar fractions when using molar flow units)")


class ReactionModel(BaseModel):
    stoichiometry: Dict[str, float] = Field(..., description="Stoichiometric coefficients for each component")
    key_component: str = Field(..., description="Key component for the reaction")
    conversion: float = Field(..., ge=0, le=1, description="Conversion of the key component (0-1)")


class SplitModel(BaseModel):
    parent_stream: str = Field(..., description="Name of the parent stream")
    recycle_stream: str = Field(..., description="Name of the recycle stream")
    purge_stream: str = Field(..., description="Name of the purge stream")
    fraction: float = Field(..., ge=0, le=1, description="Recycle fraction (0-1)")


class MassBalanceRequest(BaseModel):
    components: List[str] = Field(..., description="List of component names")
    streams: List[StreamModel] = Field(..., description="List of streams in the process")
    reactions: Optional[List[ReactionModel]] = Field(None, description="List of reactions")
    splits: Optional[List[SplitModel]] = Field(None, description="List of splits (recycles)")


# ---------------------------------------------------------------------------
# Sizing Models
# ---------------------------------------------------------------------------

class CalculatedDiameterRequest(BaseModel):
    flow_rate: float = Field(..., description="Flow rate in m³/s")
    velocity: float = Field(..., description="Velocity in m/s")


class RealDiameterRequest(BaseModel):
    calculated_diameter: float = Field(..., description="Calculated diameter in mm")
    schedule: str = Field(..., description="Pipe schedule")


# ---------------------------------------------------------------------------
# Flow Models
# ---------------------------------------------------------------------------

class ReynoldsRequest(BaseModel):
    characteristic_diameter: float = Field(..., description="Characteristic diameter in m")
    velocity: float = Field(..., description="Velocity in m/s")
    density: Optional[float] = Field(None, description="Density in kg/m³")
    dynamic_viscosity: Optional[float] = Field(None, description="Dynamic viscosity in kg/(m·s) or Pa·s")
    kinematic_viscosity: Optional[float] = Field(None, description="Kinematic viscosity in m²/s")

    @model_validator(mode='after')
    def check_viscosity(self):
        if self.dynamic_viscosity is None and self.kinematic_viscosity is None:
            raise ValueError("Either dynamic viscosity or kinematic viscosity must be provided")
        return self


class FrictionFactorRequest(BaseModel):
    roughness: float = Field(..., description="Roughness in mm")
    diameter: float = Field(..., description="Diameter in mm")
    reynolds: float = Field(..., description="Reynolds number (dimensionless)")
    method: str = Field(..., description="Method for calculating friction factor")


class HydraulicDiameterRequest(BaseModel):
    shape: str = Field(..., description="Shape type: circular, rectangular, annular, triangular, or circularCap")
    
    # Circular parameters
    diameter: Optional[float] = Field(None, gt=0, description="Diameter for circular shape (mm)")
    
    # Rectangular parameters
    width: Optional[float] = Field(None, gt=0, description="Width for rectangular shape (mm)")
    height: Optional[float] = Field(None, gt=0, description="Height for rectangular shape (mm)")
    
    # Annular parameters
    outer_diameter: Optional[float] = Field(None, gt=0, description="Outer diameter for annular shape (mm)")
    inner_diameter: Optional[float] = Field(None, gt=0, description="Inner diameter for annular shape (mm)")
    
    # Triangular parameters
    side_a: Optional[float] = Field(None, gt=0, description="Side A for triangular shape (mm)")
    side_b: Optional[float] = Field(None, gt=0, description="Side B for triangular shape (mm)")
    side_c: Optional[float] = Field(None, gt=0, description="Side C for triangular shape (mm)")
    
    @field_validator("shape")
    @classmethod
    def validate_shape(cls, v):
        if v not in ["circular", "rectangular", "annular", "triangular", "circularCap"]:
            raise ValueError("Shape must be 'circular', 'rectangular', 'annular', 'triangular', or 'circularCap'")
        return v
    
    @field_validator("diameter")
    @classmethod
    def validate_circular(cls, v, info):
        field_values = info.data
        if field_values.get("shape") == "circular" and v is None:
            raise ValueError("Diameter is required for circular shape")
        return v
    
    @field_validator("width", "height")
    @classmethod
    def validate_rectangular(cls, v, info):
        field_name = info.field_name
        field_values = info.data
        
        if field_values.get("shape") == "rectangular":
            if field_name == "width" and v is None:
                raise ValueError("Width is required for rectangular shape")
            if field_name == "height" and v is None:
                raise ValueError("Height is required for rectangular shape")
        return v
    
    @field_validator("outer_diameter", "inner_diameter")
    @classmethod
    def validate_annular(cls, v, info):
        field_name = info.field_name
        field_values = info.data
        
        if field_values.get("shape") == "annular":
            if field_name == "outer_diameter" and v is None:
                raise ValueError("Outer diameter is required for annular shape")
            if field_name == "inner_diameter" and v is None:
                raise ValueError("Inner diameter is required for annular shape")
        return v
    
    @field_validator("side_a", "side_b", "side_c")
    @classmethod
    def validate_triangular(cls, v, info):
        field_name = info.field_name
        field_values = info.data
        
        if field_values.get("shape") == "triangular":
            if field_name == "side_a" and v is None:
                raise ValueError("Side A is required for triangular shape")
            if field_name == "side_b" and v is None:
                raise ValueError("Side B is required for triangular shape")
            if field_name == "side_c" and v is None:
                raise ValueError("Side C is required for triangular shape")
        return v
    
    @field_validator("diameter", "height")
    @classmethod
    def validate_circularCap(cls, v, info):
        field_name = info.field_name
        field_values = info.data
        
        if field_values.get("shape") == "circularCap":
            if field_name == "diameter" and v is None:
                raise ValueError("Diameter is required for circular cap")
            if field_name == "height" and v is None:
                raise ValueError("Height is required for circular cap")
        return v


# ---------------------------------------------------------------------------
# Pump Models
# ---------------------------------------------------------------------------

class FittingItem(BaseModel):
    quantity: int = Field(..., gt=0, description="Quantity")
    fitting: str = Field(..., description="Fitting type")


class HeadLossRequest(BaseModel):
    # Darcy‑Weisbach parameters
    friction_factor: Optional[float] = Field(None, ge=0, description="Friction factor (dimensionless)")
    velocity: Optional[float] = Field(None, ge=0, description="Fluid velocity (m/s)")

    # Hazen‑Williams parameters
    flow_rate: Optional[float] = Field(None, ge=0, description="Flow rate (m³/s)")
    roughness_coefficient: Optional[float] = Field(None, ge=0, description="Roughness coefficient (dimensionless)")

    # Common parameters
    pipe_length: float = Field(..., ge=0, description="Pipe length (m)")
    diameter: float = Field(..., ge=0, description="Internal diameter (mm)")
    fittings: Optional[List[FittingItem]] = Field(None, description="List of fittings")
    method: str = Field(..., description="Method: Darcy‑Weisbach | Hazen‑Williams")


class NPSHAvailableRequest(BaseModel):
    manometric_pressure: float = Field(..., description="Manometric pressure in kgf/cm²")
    atmospheric_pressure: float = Field(..., description="Atmospheric pressure in kgf/cm²")
    vapor_pressure: float = Field(..., description="Vapor pressure in kgf/cm²")
    specific_mass: float = Field(..., description="Specific mass in kg/m³")
    friction_factor: float = Field(..., description="Friction factor in m")
    pump_inlet_velocity: float = Field(..., description="Pump inlet velocity in m/s")
    gauge_elevation: float = Field(..., description="Gauge elevation in m")


class HeadRequest(BaseModel):
    pressure1: float = Field(..., description="Pressure at point 1 in Pa")
    pressure2: float = Field(..., description="Pressure at point 2 in Pa")
    elevation1: float = Field(..., description="Elevation at point 1 in m")
    elevation2: float = Field(..., description="Elevation at point 2 in m")
    velocity1: float = Field(..., description="Velocity at point 1 in m/s")
    velocity2: float = Field(..., description="Velocity at point 2 in m/s")
    specific_mass: float = Field(..., description="Specific mass of fluid in kg/m³")
    friction_factor: float = Field(..., description="Friction factor in m")


# ---------------------------------------------------------------------------
# Reactor Models
# ---------------------------------------------------------------------------

class ComponentRequest(BaseModel):
    state: str = Field(..., description="State of the component (liquid or gaseous)")
    component_name: str = Field(..., description="Component name")
    flow_rate_inlet: float = Field(..., description="Flow rate inlet in m³/s")
    molar_concentration_inlet: float = Field(..., description="Molar concentration inlet in mol/L")


class ReactorRequest(BaseModel):
    input_type: str = Field(..., description="Type of calculation: conversion_and_kinetics, volume_and_kinetics, or residence_time_and_kinetics")
    components: List[ComponentRequest] = Field(..., description="List of all components in the reaction")
    stoichiometric_coefficients: List[float] = Field(..., description="Stoichiometric coefficients (negative for reactants, positive for products)")
    reaction_rate_params: Dict[str, Any] = Field(..., description="Parameters for reaction rate calculation (k, reaction_orders)")
    recycling_ratio: Optional[float] = Field(0, description="Recycling ratio for PFR (default: 0)")
    conversion: Optional[float] = Field(None, ge=0, lt=1, description="Conversion (dimensionless), required for conversion_and_kinetics")
    volume: Optional[float] = Field(None, gt=0, description="Reactor volume (m³), required for volume_and_kinetics")
    residence_time: Optional[float] = Field(None, gt=0, description="Residence time (s), required for residence_time_and_kinetics")
    operation_conditions: Dict[str, float] = Field(..., description="Operation conditions (initial_temperature, initial_pressure, final_temperature, final_pressure)")
    
    @field_validator("input_type")
    @classmethod
    def check_input_type(cls, v):
        if v not in ["conversion_and_kinetics", "volume_and_kinetics", "residence_time_and_kinetics"]:
            raise ValueError("Input type must be 'conversion_and_kinetics', 'volume_and_kinetics', or 'residence_time_and_kinetics'")
        return v
    
    @field_validator("reaction_rate_params")
    @classmethod
    def check_reaction_rate_params(cls, v):
        if "k" not in v:
            raise ValueError("Reaction rate parameters must include 'k'")
        if "reaction_orders" not in v:
            raise ValueError("Reaction rate parameters must include 'reaction_orders'")
        return v
    
    @field_validator("operation_conditions")
    @classmethod
    def check_operation_conditions(cls, v):
        required_keys = ["initial_temperature", "initial_pressure", "final_temperature", "final_pressure"]
        for key in required_keys:
            if key not in v:
                raise ValueError(f"Operation conditions must include '{key}'")
        return v
    
    @model_validator(mode='after')
    def check_required_parameters(self):
        if self.input_type == "conversion_and_kinetics" and self.conversion is None:
            raise ValueError("Conversion is required for conversion_and_kinetics input type")
        
        if self.input_type == "volume_and_kinetics" and self.volume is None:
            raise ValueError("Volume is required for volume_and_kinetics input type")
        
        if self.input_type == "residence_time_and_kinetics" and self.residence_time is None:
            raise ValueError("Residence time is required for residence_time_and_kinetics input type")
        
        return self


class ReactorPlotRequest(BaseModel):
    components: List[ComponentRequest] = Field(..., description="List of all components in the reaction")
    stoichiometric_coefficients: List[float] = Field(..., description="Stoichiometric coefficients (negative for reactants, positive for products)")
    reaction_rate_params: Dict[str, Any] = Field(..., description="Parameters for reaction rate calculation (k, reaction_orders)")
    recycling_ratio: Optional[float] = Field(0, description="Recycling ratio for PFR (default: 0)")
    operation_conditions: Dict[str, float] = Field(..., description="Operation conditions (initial_temperature, initial_pressure, final_temperature, final_pressure)")
    max_conversion: Optional[float] = Field(0.99999, ge=0, lt=1, description="Maximum conversion value for the plot (default: 0.99999)")
    
    @field_validator("reaction_rate_params")
    @classmethod
    def check_reaction_rate_params(cls, v):
        if "k" not in v:
            raise ValueError("Reaction rate parameters must include 'k'")
        if "reaction_orders" not in v:
            raise ValueError("Reaction rate parameters must include 'reaction_orders'")
        return v
    
    @field_validator("operation_conditions")
    @classmethod
    def check_operation_conditions(cls, v):
        required_keys = ["initial_temperature", "initial_pressure", "final_temperature", "final_pressure"]
        for key in required_keys:
            if key not in v:
                raise ValueError(f"Operation conditions must include '{key}'")
        return v


# ---------------------------------------------------------------------------
# Components Models
# ---------------------------------------------------------------------------

class PropertyRequest(BaseModel):
    fluid: str = Field(..., description="Name of the fluid")
    property_name: str = Field(..., description="Name of the property to retrieve (CoolProp format)")
    temperature: float = Field(..., gt=0, description="Temperature in K")
    pressure: float = Field(..., gt=0, description="Pressure in Pa")


class MixturePropertiesRequest(BaseModel):
    fluid_fractions: Dict[str, float] = Field(..., description="Dictionary with fluid names as keys and their mass fractions as values")
    temperature: float = Field(..., gt=0, description="Temperature in K")
    pressure: float = Field(..., gt=0, description="Pressure in Pa")
    properties: Optional[List[str]] = Field(None, description="List of property keys to retrieve. If None, returns all available properties")


class FluidRequest(BaseModel):
    fluid: str = Field(..., description="Name of the fluid")

