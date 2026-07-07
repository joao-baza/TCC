import numpy as np
from pint import UnitRegistry
from typing import Dict, List
from scipy.optimize import root_scalar

from .piping import Piping
from base_validator import BaseValidator

# SI units conversion factor for Hazen-Williams (valid for SI units)
HAZEN_WILLIAMS_SI_FACTOR = 10.67
STANDARD_GRAVITY = 9.80665

class Hydraulic(BaseValidator):
    """Hydraulic utility class"""

    # ------------------------------------------------------------------ #
    #                               INIT                                 #
    # ------------------------------------------------------------------ #
    def __init__(self) -> None:
        self.ureg = UnitRegistry()
        self.g = STANDARD_GRAVITY * self.ureg.m / self.ureg.s ** 2  # gravity
        self.piping = Piping()


    # ------------------------------------------------------------------ #
    #                         PRIVATE HELPERS                            #
    # ------------------------------------------------------------------ #
    def _resolve_flow_velocity(
        self,
        parameters: Dict[str, object],
        diameter_mm: float,
        *,
        relative_tolerance: float = 1e-3,
    ) -> tuple[float, float]:
        """
        Resolve flow rate (m³/s) and velocity (m/s) from diameter (mm).

        At least one of ``flow_rate`` or ``velocity`` must be provided.
        When both are given, they must be consistent with Q = V·A for a circular pipe.
        """
        has_q = parameters.get("flow_rate") is not None
        has_v = parameters.get("velocity") is not None

        if not has_q and not has_v:
            raise ValueError(
                "Provide flow rate (m³/s) and/or velocity (m/s); "
                "at least one is required."
            )

        D_m = (diameter_mm * self.ureg.mm).to(self.ureg.m).magnitude
        if D_m <= 0:
            raise ValueError(f"Diameter must be positive, got {diameter_mm} mm.")

        area = np.pi * D_m**2 / 4

        if has_q and has_v:
            self._validate_numeric(parameters, ["flow_rate", "velocity"])
            Q = float(parameters["flow_rate"])
            V = float(parameters["velocity"])
            if Q <= 0 or V <= 0:
                raise ValueError("Flow rate and velocity must be positive.")
            Q_from_v = V * area
            if Q > 0:
                rel_err = abs(Q - Q_from_v) / Q
                if rel_err > relative_tolerance:
                    raise ValueError(
                        "Flow rate and velocity are inconsistent with the pipe diameter "
                        f"(relative error {rel_err:.2%})."
                    )
            return Q, V

        if has_v:
            self._validate_numeric(parameters, ["velocity"])
            V = float(parameters["velocity"])
            if V <= 0:
                raise ValueError("Velocity must be positive.")
            return V * area, V

        self._validate_numeric(parameters, ["flow_rate"])
        Q = float(parameters["flow_rate"])
        if Q <= 0:
            raise ValueError("Flow rate must be positive.")
        return Q, Q / area

    def _equivalent_length(
        self, fittings: List[Dict[str, object]] | None, diameter_m: "pint.Quantity"
    ) -> "pint.Quantity":
        """Return the total equivalent length of all fittings."""
        if not fittings:
            return 0 * self.ureg.m

        total = 0 * self.ureg.m
        for f in fittings:
            spec = self.piping.fitting_specifications(f["fitting"])
            total += spec["specifications"]["equivalentLength"].magnitude * diameter_m * f["quantity"]
        return total

    # ------------------------------------------------------------------ #
    #                              PUBLIC                                #
    # ------------------------------------------------------------------ #
    # region head_loss
    def head_loss(self, parameters: Dict[str, object]):
        """
        Head loss by Darcy-Weisbach or Hazen-Williams.

        Parameters
        ----------
        parameters : dict
            **Darcy-Weisbach**

            ``{"method": "Darcy-Weisbach",
              "friction_factor": <float>,
              "pipe_length": <m>,
              "diameter": <mm>,
              "velocity": <m/s>,          # or flow_rate (m³/s), or both (consistent)
              "flow_rate": <m³/s>,        # optional; derived from velocity if omitted
              "fittings": [{"fitting": <str>, "quantity": <int>}, ...]}``

            **Hazen-Williams**

            ``{"method": "Hazen-Williams",
              "flow_rate": <m³/s>,        # or velocity (m/s), or both (consistent)
              "velocity": <m/s>,          # optional; derived from flow_rate if omitted
              "roughness_coefficient": <float>,
              "pipe_length": <m>,
              "diameter": <mm>,
              "fittings": [...]} ``

        Returns
        -------
        pint.Quantity
            Head loss (m).
        """
        if "method" not in parameters:
            return ["Darcy-Weisbach", "Hazen-Williams"]

        method = parameters["method"]

        # ----------------------- Darcy-Weisbach ------------------------ #
        if method == "Darcy-Weisbach":
            req = ["friction_factor", "pipe_length", "diameter"]
            self._require_keys(parameters, req)
            self._validate_numeric(parameters, req)

            f = parameters["friction_factor"]
            L = parameters["pipe_length"] * self.ureg.m
            D = parameters["diameter"] * self.ureg.mm
            D_m = D.to(self.ureg.m)
            _, V = self._resolve_flow_velocity(parameters, parameters["diameter"])
            V = V * self.ureg.m / self.ureg.s

            Leq = self._equivalent_length(parameters.get("fittings"), D_m)

            hl = f * (L + Leq) * V**2 / (2 * D_m * self.g)
            if hl < 0:
                raise ValueError(f"Head loss cannot be negative, got {hl}.")
            return hl.to(self.ureg.m)

        # ----------------------- Hazen-Williams ------------------------ #
        if method == "Hazen-Williams":
            req = ["roughness_coefficient", "diameter", "pipe_length"]
            self._require_keys(parameters, req)
            self._validate_numeric(parameters, req)

            C = parameters["roughness_coefficient"]
            L = parameters["pipe_length"] * self.ureg.m
            D = parameters["diameter"] * self.ureg.mm

            if D.magnitude < 50:
                raise ValueError("For Hazen-Williams the diameter must exceed 50 mm.")

            D_m = D.to(self.ureg.m)
            Q, _ = self._resolve_flow_velocity(parameters, parameters["diameter"])
            Q = Q * self.ureg.m**3 / self.ureg.s
            Leq = self._equivalent_length(parameters.get("fittings"), D_m)

            hl = (
                HAZEN_WILLIAMS_SI_FACTOR * (L + Leq) * Q**1.852 / (C**1.852 * D_m**4.8704)
            ) * self.ureg.s**1.852 / self.ureg.m**0.68
            if hl <= 0:
                raise ValueError(f"Head loss must be positive, got {hl}.")
            return hl

        raise ValueError('Invalid method. Use "Darcy-Weisbach" or "Hazen-Williams".')

    # endregion head_loss

    # region reynolds
    def reynolds(self, parameters: Dict[str, object]):
        """
        Reynolds number.

        Two accepted parameter sets:

        1. Dynamic viscosity::

            {"characteristic_diameter": <mm>,
             "velocity": <m/s>,
             "density": <kg/m³>,
             "dynamic_viscosity": <Pa·s>}

        2. Kinematic viscosity::

            {"characteristic_diameter": <mm>,
             "velocity": <m/s>,
             "kinematic_viscosity": <m²/s>}
        """
        mode1 = ["characteristic_diameter", "velocity", "density", "dynamic_viscosity"]
        mode2 = ["characteristic_diameter", "velocity", "kinematic_viscosity"]

        # ------------- dynamic viscosity supplied ------------- #
        if all(k in parameters for k in mode1):
            self._validate_numeric(parameters, mode1)

            D = parameters["characteristic_diameter"] * self.ureg.mm
            V = parameters["velocity"] * self.ureg.m / self.ureg.s
            rho = parameters["density"] * self.ureg.kg / self.ureg.m**3
            mu = parameters["dynamic_viscosity"] * self.ureg.kg / (
                self.ureg.m * self.ureg.s
            )

            Re = (D * rho * V / mu).to_base_units()
            if Re <= 0:
                raise ValueError(f"Reynolds number must be positive, got {Re}.")
            return Re

        # ------------- kinematic viscosity supplied ------------ #
        if all(k in parameters for k in mode2):
            self._validate_numeric(parameters, mode2)

            D = parameters["characteristic_diameter"] * self.ureg.mm
            V = parameters["velocity"] * self.ureg.m / self.ureg.s
            nu = parameters["kinematic_viscosity"] * self.ureg.m**2 / self.ureg.s

            Re = (D * V / nu).to_base_units()
            if Re <= 0:
                raise ValueError(f"Reynolds number must be positive, got {Re}.")
            return Re

        raise ValueError(
            "Invalid parameters: provide either (D, V, ρ, μ) or (D, V, ν)."
        )

    # endregion reynolds

    # region friction_factor
    def friction_factor(self, parameters: Dict[str, object]):
        """
        Darcy friction factor.

        Parameters
        ----------
        parameters : dict
            ``{"method": "ColebrookWhite" | "SwameeJain" | "Haaland",
               "roughness": <mm>,
               "diameter": <mm>,
               "reynolds": <float>}``

        Returns
        -------
        pint.Quantity
            Darcy friction factor (dimensionless).
        """
        if "method" not in parameters:
            return ["ColebrookWhite", "SwameeJain", "Haaland"]

        req = ["roughness", "diameter", "reynolds", "method"]
        self._require_keys(parameters, req)
        self._validate_numeric(parameters, ["roughness", "diameter", "reynolds"])

        eps = parameters["roughness"]
        D = parameters["diameter"]
        Re = float(parameters["reynolds"])
        eps_over_D = eps / D  # dimensionless ratio

        method = parameters["method"]

        # ------------------------- Colebrook-White ---------------------- #
        if method == "ColebrookWhite":

            def objective_x(x):
                # x represents 1/sqrt(f)
                return x + 2 * np.log10(eps_over_D / 3.71 + 2.51 * x / Re)

            try:
                # f usually 0.008 to 0.1 -> x approx 3 to 12. Bracket covers 0.0001 to 1.0
                res = root_scalar(objective_x, bracket=[0.1, 100], method='brentq')
                x_sol = res.root
                f_solution = 1 / (x_sol ** 2)
                return float(f_solution) * self.ureg.dimensionless
            except ValueError:
                 # Fallback/Error handling
                raise ValueError("Colebrook equation solver failed to converge.")

        # --------------------------- Swamee-Jain ------------------------ #
        if method == "SwameeJain":
            f = 0.25 / (
                np.log10(eps_over_D / 3.7 + 5.74 / (Re**0.9))
            ) ** 2
            return float(f) * self.ureg.dimensionless

        # ----------------------------- Haaland -------------------------- #
        if method == "Haaland":
            inv_sqrt_f = -1.8 * np.log10(
                (eps_over_D / 3.7) ** 1.11 + 6.9 / Re
            )
            f = 1 / inv_sqrt_f**2
            return float(f) * self.ureg.dimensionless

        raise ValueError("Invalid friction factor method.")

    # endregion friction_factor

    # region get_real_diameter
    def get_real_diameter(self, parameters: Dict[str, object]):
        """
        Pick the next available nominal diameter above the calculated one.

        Parameters
        ----------
        parameters : dict
            ``{"calculated_diameter": <mm>, "schedule": <str>}``

        Returns
        -------
        pint.Quantity
            Nominal diameter (mm).
        """
        req = ["calculated_diameter", "schedule"]
        self._require_keys(parameters, req)
        self._validate_numeric(parameters, ["calculated_diameter"])

        d_calc = parameters["calculated_diameter"]
        schedule = parameters["schedule"]

        diameters = sorted(Piping().diameters(schedule))
        for dn in diameters:
            if dn > d_calc:
                return dn * self.ureg.mm

        raise ValueError(
            f"No diameter in schedule '{schedule}' exceeds {d_calc} mm."
        )

    # endregion get_real_diameter

    # region get_calculated_diameter
    def get_calculated_diameter(self, parameters: Dict[str, object]):
        """
        Hydraulic diameter from flow rate and velocity.

        Parameters
        ----------
        parameters : dict
            ``{"flow_rate": <m³/s>, "velocity": <m/s>}``

        Returns
        -------
        pint.Quantity
            Calculated diameter (mm).
        """
        req = ["flow_rate", "velocity"]
        self._require_keys(parameters, req)
        self._validate_numeric(parameters, req)

        Q = parameters["flow_rate"] * self.ureg.m**3 / self.ureg.s
        V = parameters["velocity"] * self.ureg.m / self.ureg.s

        # Use **0.5 instead of math.sqrt to keep units intact
        D = (4 * Q / (np.pi * V)) ** 0.5
        D_mm = D.to(self.ureg.mm)

        if D_mm <= 0 * self.ureg.mm:
            raise ValueError(f"Diameter must be positive, got {D_mm}.")

        return D_mm

    # endregion get_calculated_diameter

    # region npsh_available
    def npsh_available(self, parameters: Dict[str, object]):
        """
        Calculate available NPSH.

        Parameters
        ----------
        parameters : dict
            ``{"manometric_pressure": <kgf/cm²>,
               "atmospheric_pressure": <kgf/cm²>,
               "vapor_pressure": <kgf/cm²>,
            ``{"manometric_pressure": <kgf/cm²>,
               "atmospheric_pressure": <kgf/cm²>,
               "vapor_pressure": <kgf/cm²>,
               "density": <kg/m³>,
               "friction_factor": <m>,
               "pump_inlet_velocity": <m/s>,
               "gauge_elevation": <m>}``

        Returns
        -------
        pint.Quantity
            Available NPSH (m).
        """
        req = [
            "manometric_pressure", 
            "atmospheric_pressure", 
            "vapor_pressure", 
            "manometric_pressure", 
            "atmospheric_pressure", 
            "vapor_pressure", 
            "density",
            "head_loss",
            "pump_inlet_velocity"
        ]
        self._require_keys(parameters, req)
        self._validate_numeric(parameters, req)

        # Get parameters with proper units
        Ps = parameters["manometric_pressure"] * self.ureg.kgf / self.ureg.cm**2
        Patm = parameters["atmospheric_pressure"] * self.ureg.kgf / self.ureg.cm**2
        Pv = parameters["vapor_pressure"] * self.ureg.kgf / self.ureg.cm**2
        density = parameters["density"] * self.ureg.kg / self.ureg.m**3
        head_loss = parameters["head_loss"] * self.ureg.m
        pump_inlet_velocity = parameters["pump_inlet_velocity"] * self.ureg.m / self.ureg.s
        height_term = parameters["gauge_elevation"] * self.ureg.m
        
        # Convert pressures
        # Convert to N/m²
        Ps_Pa = Ps.to(self.ureg.kgf / self.ureg.cm**2).to(self.ureg.Pa)
        Patm_Pa = Patm.to(self.ureg.kgf / self.ureg.cm**2).to(self.ureg.Pa)
        Pv_Pa = Pv.to(self.ureg.kgf / self.ureg.cm**2).to(self.ureg.Pa)
        
        # Equation terms
        pressure_term = (Ps_Pa + Patm_Pa) / (density * self.g)
        vapor_pressure_term = Pv_Pa / (density * self.g)
        velocity_term = (pump_inlet_velocity**2) / (2 * self.g)
        
        
        # New equation: (Pmanometric+Patm)/gamma + V²/(2g) + h - head_loss - Pvap/gamma
        npsh = pressure_term + height_term + velocity_term - head_loss - vapor_pressure_term
        
        # Return in meters
        return npsh.to(self.ureg.m)
    
    # endregion npsh_available

    # region head
    def head(self, parameters: Dict[str, object]):
        """
        Calculate the manometric head between two points in a pipe system.
        
        Parameters
        ----------
        parameters : dict
            ``{"pressure1": <Pa>,
               "pressure2": <Pa>,
               "elevation1": <m>,
               "elevation2": <m>,
               "velocity1": <m/s>,
               "velocity2": <m/s>,
               "density": <kg/m³>,
               "head_loss": <m>}``
               
        Returns
        -------
        pint.Quantity
            Manometric head (m).
        """
        req = [
            "pressure1",
            "pressure2",
            "elevation1",
            "elevation2",
            "velocity1",
            "velocity2",
            "density",
            "head_loss"
        ]
        self._require_keys(parameters, req)
        self._validate_numeric(parameters, req)
        
        # Get parameters with proper units
        p1 = parameters["pressure1"] * self.ureg.Pa
        p2 = parameters["pressure2"] * self.ureg.Pa
        z1 = parameters["elevation1"] * self.ureg.m
        z2 = parameters["elevation2"] * self.ureg.m
        v1 = parameters["velocity1"] * self.ureg.m / self.ureg.s
        v2 = parameters["velocity2"] * self.ureg.m / self.ureg.s
        density = parameters["density"] * self.ureg.kg / self.ureg.m**3
        head_loss = parameters["head_loss"] * self.ureg.m
        
        # Equation terms
        pressure_term = (p2 - p1) / (density * self.g)
        elevation_term = (z2 - z1)
        velocity_term = (v2**2 - v1**2) / (2 * self.g)
        
        # Head calculation: (p2-p1)/specific_mass*g + (z2-z1) + (v2-v1)/(2g) + head_loss
        head = pressure_term + elevation_term + velocity_term + head_loss
        
        # Return in meters
        return head.to(self.ureg.m)
    
    # endregion head

    # region hydraulic_diameter
    def hydraulic_diameter(self, parameters: Dict[str, object]):
        """
        Calculate the hydraulic diameter for different geometric shapes.
        
        Parameters
        ----------
            parameters : dict
            ``{"shape": <str>,
               ...shape-specific parameters...}``
               
            **Circular**
            ``{"shape": "circular",
               "diameter": <m>}``
               
            **Rectangular**
            ``{"shape": "rectangular",
               "width": <m>,
               "height": <m>}``
               
            **Annular**
            ``{"shape": "annular",
               "outer_diameter": <m>,
               "inner_diameter": <m>}``
               
            **Triangular**
            ``{"shape": "triangular",
               "side_a": <m>,
               "side_b": <m>,
               "side_c": <m>}``

            **Circular Cap**
            ``{"shape": "circularCap",
               "diameter": <m>,
               "height": <m>}``
        
        Returns
        -------
        pint.Quantity
            Hydraulic diameter (m).
        """
        if "shape" not in parameters:
            return ["circular", "rectangular", "annular", "triangular", "circularCap"]
        
        shape = parameters["shape"]
        
        # ----------------------- Circular ------------------------ #
        if shape == "circular":
            self._require_keys(parameters, ["diameter"])
            self._validate_numeric(parameters, ["diameter"])
            
            D = parameters["diameter"] * self.ureg.m
            return D
        
        # ----------------------- Rectangular ------------------------ #
        elif shape == "rectangular":
            self._require_keys(parameters, ["width", "height"])
            self._validate_numeric(parameters, ["width", "height"])
            
            width = parameters["width"] * self.ureg.m
            height = parameters["height"] * self.ureg.m
            
            # Hydraulic diameter formula: 4*Area/Perimeter
            area = width * height
            perimeter = 2 * (width + height)
            
            D_h = 4 * area / perimeter
            return D_h
        
        # ----------------------- Annular ------------------------ #
        elif shape == "annular":
            self._require_keys(parameters, ["outer_diameter", "inner_diameter"])
            self._validate_numeric(parameters, ["outer_diameter", "inner_diameter"])
            
            D_o = parameters["outer_diameter"] * self.ureg.m
            D_i = parameters["inner_diameter"] * self.ureg.m
            
            if D_i >= D_o:
                raise ValueError("Inner diameter must be smaller than outer diameter")
            
            # Hydraulic diameter formula for annular: D_o - D_i
            D_h = D_o - D_i
            return D_h
        
        # ----------------------- Triangular ------------------------ #
        elif shape == "triangular":
            self._require_keys(parameters, ["side_a", "side_b", "side_c"])
            self._validate_numeric(parameters, ["side_a", "side_b", "side_c"])
            
            a = parameters["side_a"] * self.ureg.m
            b = parameters["side_b"] * self.ureg.m
            c = parameters["side_c"] * self.ureg.m
            
            # Check triangle inequality
            if a + b <= c or a + c <= b or b + c <= a:
                raise ValueError("Invalid triangle: sides do not satisfy triangle inequality")
            
            # Semi-perimeter
            s = (a + b + c) / 2
            
            # Area (Heron's formula)
            area = (s * (s - a) * (s - b) * (s - c)) ** 0.5
            
            # Perimeter
            perimeter = a + b + c
            
            # Hydraulic diameter formula: 4*Area/Perimeter
            D_h = 4 * area / perimeter
            return D_h
        
        # ----------------------- Circular Cap ------------------------ #
        elif shape == "circularCap":
            self._require_keys(parameters, ["diameter", "height"])
            self._validate_numeric(parameters, ["diameter", "height"])
            
            # Check if height is less than diameter
            if parameters["height"] > parameters["diameter"]:
                raise ValueError("Height cannot be greater than diameter")
            
            if parameters["height"] <= 0:
                raise ValueError("Height must be greater than 0")

            D = parameters["diameter"] * self.ureg.m
            H = parameters["height"] * self.ureg.m
            R = D / 2

            ratio = ((R - H) / R).to_base_units().magnitude
            if ratio < -1:
                raise ValueError("Invalid height/diameter ratio")

            chord_term = 2 * R * H - H**2
            if chord_term.magnitude < 0:
                raise ValueError("Invalid height/diameter combination")

            theta = np.arccos(ratio)
            chord = chord_term**0.5

            P = (2 * R * theta) + (2 * chord)
            A = (R**2 * theta) - ((R - H) * chord)

            D_h = (4 * A / P).to(self.ureg.m)

            return D_h

        else:
            raise ValueError("Invalid shape. Use 'circular', 'rectangular', 'annular', 'triangular', or 'circularCap'.")
    
    # endregion hydraulic_diameter
