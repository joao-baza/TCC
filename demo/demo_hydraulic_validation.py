import sys
import os
import numpy as np
from pint import UnitRegistry

# Add parent directory to path to allow imports
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from models.hydraulic import Hydraulic, Piping

ureg = UnitRegistry()
hyd = Hydraulic()

def print_header(title):
    print("\n" + "="*80)
    print(f" {title.center(78)} ")
    print("="*80)

def check_result(test_name, manual_val, code_val, unit=""):
    # Extract magnitude if it's a Quantity
    m_val = manual_val.magnitude if hasattr(manual_val, 'magnitude') else manual_val
    c_val = code_val.magnitude if hasattr(code_val, 'magnitude') else code_val

    diff = abs(m_val - c_val)
    # Avoid division by zero
    rel_diff = (diff / abs(m_val)) * 100 if m_val != 0 else 0.0

    status = "MATCH" if rel_diff < 1e-4 else "FAIL" # 0.0001% tolerance

    print(f"[{status}] {test_name}")
    print(f"  Manual: {m_val:.6g} {unit}")
    print(f"  Code:   {c_val:.6g} {unit}")
    print(f"  Diff:   {rel_diff:.4g}%")
    return status == "MATCH"

def validate_reynolds():
    print_header("VALIDAÇÃO DO NÚMERO DE REYNOLDS")

    # 1. Dynamic Viscosity Method
    D = 50 # mm
    V = 2.0 # m/s
    rho = 998 # kg/m3
    mu = 1.002e-3 # Pa.s

    # Manual: Re = (rho * V * D) / mu  (Note: D in meters)
    D_m = D / 1000.0
    re_manual = (rho * V * D_m) / mu

    params = {
        "characteristic_diameter": D,
        "velocity": V,
        "density": rho,
        "dynamic_viscosity": mu
    }
    re_code = hyd.reynolds(params)
    check_result("Reynolds (viscosidade dinâmica)", re_manual, re_code)

    # 2. Kinematic Viscosity Method
    nu = 1.004e-6 # m2/s

    # Manual: Re = (V * D) / nu
    re_manual_k = (V * D_m) / nu

    params_k = {
        "characteristic_diameter": D,
        "velocity": V,
        "kinematic_viscosity": nu
    }
    re_code_k = hyd.reynolds(params_k)
    check_result("Reynolds (viscosidade cinemática)", re_manual_k, re_code_k)

def validate_friction_factor():
    print_header("VALIDAÇÃO DO FATOR DE ATRITO DO ESCOAMENTO")

    eps = 0.045 # mm
    D = 50 # mm
    Re = 100000.0

    eps_over_D = eps / D

    # 1. Colebrook-White (Impossible to solve explicit manually easily, but we can verify the equation holds)
    # 1/sqrt(f) = -2 log10( (eps/D)/3.7 + 2.51/(Re * sqrt(f)) )
    params = {"method": "ColebrookWhite", "roughness": eps, "diameter": D, "reynolds": Re}
    f_code = hyd.friction_factor(parameters=params)
    f_val = f_code.magnitude

    lhs = 1 / np.sqrt(f_val)
    rhs = -2 * np.log10((eps_over_D / 3.71) + (2.51 / (Re * np.sqrt(f_val)))) # Note: Code uses 3.71

    print(f"[CHECK] Consistência de Colebrook-White")
    print(f"  LHS (1/sqrt(f)): {lhs:.6f}")
    print(f"  RHS (Colebrook): {rhs:.6f}")
    if abs(lhs - rhs) < 1e-4:
        print("  -> Equation Satisfied")
    else:
        print("  -> Equation NOT Satisfied")

    # 2. Swamee-Jain
    # f = 0.25 / [log10( (eps/D)/3.7 + 5.74/Re^0.9 )]^2
    term = (eps_over_D / 3.7) + (5.74 / (Re**0.9))
    f_manual_sj = 0.25 / (np.log10(term))**2

    params["method"] = "SwameeJain"
    f_code_sj = hyd.friction_factor(params)
    check_result("Fator de atrito do escoamento (Swamee-Jain)", f_manual_sj, f_code_sj)

    # 3. Haaland
    # 1/sqrt(f) = -1.8 log10( (eps/D)/3.7)^1.11 + 6.9/Re )
    term_h = ((eps_over_D / 3.7)**1.11) + (6.9 / Re)
    inv_sqrt_f = -1.8 * np.log10(term_h)
    f_manual_h = 1 / (inv_sqrt_f**2)

    params["method"] = "Haaland"
    f_code_h = hyd.friction_factor(params)
    check_result("Fator de atrito do escoamento (Haaland)", f_manual_h, f_code_h)

def validate_head_loss():
    print_header("VALIDAÇÃO DA PERDA DE CARGA")

    g = 9.80665

    # 1. Darcy-Weisbach
    L = 100 # m
    D_mm = 50
    D_m = D_mm / 1000.0
    V = 2.0 # m/s
    f = 0.02 # friction factor

    # Fittings: 2 x Elbow 90 deg (dummy Leq logic check)
    # We need to see how code handles fittings. It adds equivalent length.
    # Let's assume 0 fittings for pure formula match first, then check fittings logic.

    # Case A: No fittings
    L_total = L
    hl_manual_dw = f * (L_total / D_m) * (V**2 / (2 * g))

    params_dw = {
        "method": "Darcy-Weisbach",
        "friction_factor": f,
        "pipe_length": L,
        "diameter": D_mm,
        "velocity": V,
        "fittings": []
    }

    hl_code_dw = hyd.head_loss(params_dw)
    check_result("Perda de carga (Darcy-Weisbach, 0 acessórios)", hl_manual_dw, hl_code_dw, "m")

    # Case B: With fittings
    # Need to know the equivalent length the code uses for "Elbow, 90 deg"
    # From Piping class (Checked models/piping.py: "Cotovelo 90° raio longo" -> Leq=16)
    fitting_name = "Cotovelo 90° raio longo"
    leq_factor = 16.0
    qty = 2
    leq_manual = leq_factor * D_m * qty

    L_total_fit = L + leq_manual
    hl_manual_dw_fit = f * (L_total_fit / D_m) * (V**2 / (2 * g))

    params_dw["fittings"] = [{"fitting": fitting_name, "quantity": qty}]
    hl_code_dw_fit = hyd.head_loss(params_dw)
    check_result(f"Perda de carga (Darcy-Weisbach, {qty} cotovelos)", hl_manual_dw_fit, hl_code_dw_fit, "m")

    # 2. Hazen-Williams
    # hl = 10.646 * L * Q^1.85 / (C^1.85 * D^4.87)  (SI units adjustment needed usually)
    # The code implementation uses:
    # hl = (10.646 * (L + Leq) * Q**1.85 / (C**1.85 * D_m**4.87))
    C = 140
    Q = 0.01 # m3/s
    # D must be > 50mm for H-W in code check
    D_hw_mm = 100
    D_hw_m = D_hw_mm / 1000.0

    hl_manual_hw = (10.646 * L * (Q**1.85)) / ((C**1.85) * (D_hw_m**4.87))

    params_hw = {
        "method": "Hazen-Williams",
        "flow_rate": Q,
        "roughness_coefficient": C,
        "pipe_length": L,
        "diameter": D_hw_mm,
        "fittings": []
    }
    hl_code_hw = hyd.head_loss(params_hw)
    check_result("Perda de carga (Hazen-Williams)", hl_manual_hw, hl_code_hw, "m")

def validate_hydraulic_diameter():
    print_header("VALIDAÇÃO DO DIÂMETRO HIDRÁULICO")

    # 1. Circular
    D = 50
    # Manual: D_h = D
    params = {"shape": "circular", "diameter": D}
    check_result("Diâmetro hidráulico (circular)", D, hyd.hydraulic_diameter(params), "mm")

    # 2. Rectangular
    W = 40
    H = 30
    # Manual: Dh = 4A/P = 4*(W*H) / (2*(W+H)) = 2*W*H / (W+H)
    dh_rect = (2 * W * H) / (W + H)
    params = {"shape": "rectangular", "width": W, "height": H}
    check_result("Diâmetro hidráulico (retangular)", dh_rect, hyd.hydraulic_diameter(params), "mm")

    # 3. Annular
    Do = 100
    Di = 50
    # Manual: Dh = Do - Di
    dh_ann = Do - Di
    params = {"shape": "annular", "outer_diameter": Do, "inner_diameter": Di}
    check_result("Diâmetro hidráulico (anelar)", dh_ann, hyd.hydraulic_diameter(params), "mm")

    # 4. Triangular
    sa, sb, sc = 3, 4, 5 # 3-4-5 triangle (Area=6, perim=12)
    # Area = 6, P = 12 -> Dh = 4*6/12 = 2
    dh_tri = 2.0
    params = {"shape": "triangular", "side_a": sa, "side_b": sb, "side_c": sc}
    check_result("Diâmetro hidráulico (triangular)", dh_tri, hyd.hydraulic_diameter(params), "mm")

    # 5. Circular Cap (Partially filled pipe)
    # The code uses complex formulas involving arccos. We will verify specific case: H = D/2 (Half full)
    # Half full (H=R) -> Area = pi*R^2 / 2, P = pi*R
    # Dh = 4*A/P = 4 * (pi R^2 / 2) / (pi R) = 2 R = D
    # Wait, if H=D/2 (Radius), let's check code logic.
    D_cap = 100
    H_cap = 50 # Half
    params = {"shape": "circularCap", "diameter": D_cap, "height": H_cap}
    # For a half-filled pipe, hydraulic diameter is equal to geometric diameter?
    # Wetted perimeter P = pi * D / 2
    # Area A = pi * D^2 / 8
    # Dh = 4 * (pi D^2 / 8) / (pi D / 2) = (pi D^2 / 2) / (pi D / 2) = D
    # So for H=D/2, result should be D (100)
    check_result("Diâmetro hidráulico (canal circular, meia seção)", D_cap, hyd.hydraulic_diameter(params), "mm")

def validate_npsh_head():
    print_header("NPSH & HEAD VALIDATION")
    g = 9.80665

    # 1. Head
    # h = (p2-p1)/(rho*g) + (z2-z1) + (v2^2 - v1^2)/(2g) + hf
    p1, p2 = 101325, 202650 # Pa
    z1, z2 = 0, 10 # m
    v1, v2 = 1, 2 # m/s
    rho = 1000 # kg/m3
    hf = 5 # m

    term_p = (p2 - p1) / (rho * g)
    term_z = (z2 - z1)
    term_v = (v2**2 - v1**2) / (2 * g)
    head_manual = term_p + term_z + term_v + hf

    params_head = {
        "pressure1": p1, "pressure2": p2,
        "elevation1": z1, "elevation2": z2,
        "velocity1": v1, "velocity2": v2,
        "density": rho,
        "friction_factor": hf
    }

    check_result("Manometric Head", head_manual, hyd.head(params_head), "m")

    # 2. NPSH Available
    # NPSHa = (Ps + Patm)/gamma + V^2/2g + h - hf - Pvap/gamma
    # Inputs code expects: manometric_pressure, atmospheric_pressure, vapor_pressure (kgf/cm2 usually in old specs but code converts)
    # Let's use SI inputs consistent with code conversion logic
    # The code takes inputs in kgf/cm2 for pressures?
    # "manometric_pressure": <kgf/cm²>
    # Let's use 1 kgf/cm2 approx 98066.5 Pa.

    Ps = 0.5 # kgf/cm2
    Patm = 1.033 # kgf/cm2 (1 atm)
    Pv = 0.02 # kgf/cm2
    rho_kg = 1000 # kg/m3
    V_pump = 1.5 # m/s (pump inlet)
    hf_suction = 1.0 # m
    h_gauge = 2.0 # m (elevation)

    # Conversions for manual calc
    # 1 kgf/cm2 = 98066.5 Pa
    # specific weight gamma = rho * g = 1000 * 9.80665 = 9806.65 N/m3
    conv = 98066.5
    gamma = rho_kg * g

    term_press = ((Ps + Patm) * conv) / gamma
    term_vap = (Pv * conv) / gamma
    term_vel = (V_pump**2) / (2 * g)

    # Code equation trace:
    # pressure_term = (Ps_Pa + Patm_Pa) / (density * self.g)
    # vapor_pressure_term = Pv_Pa / (density * self.g)
    # velocity_term = (pump_inlet_velocity**2) / (2 * self.g)
    # npsh = pressure_term + height_term + velocity_term - friction_factor - vapor_pressure_term

    npsh_manual = term_press + h_gauge + term_vel - hf_suction - term_vap

    params_npsh = {
        "manometric_pressure": Ps,
        "atmospheric_pressure": Patm,
        "vapor_pressure": Pv,
        "density": rho_kg,
        "friction_factor": hf_suction,
        "pump_inlet_velocity": V_pump,
        "gauge_elevation": h_gauge
    }

    check_result("NPSH Available", npsh_manual, hyd.npsh_available(params_npsh), "m")

def validate_diameters():
    print_header("DIAMETER SIZING VALIDATION")

    # 1. Calculated Diameter
    # D = sqrt( 4Q / pi V )
    Q = 0.005 # m3/s
    V = 1.5 # m/s
    D_manual_mm = np.sqrt(4 * Q / (np.pi * V)) * 1000

    params_calc = {"flow_rate": Q, "velocity": V}
    check_result("Calculated Diameter", D_manual_mm, hyd.get_calculated_diameter(params_calc), "mm")

    # 2. Real Diameter (Schedule)
    # Input calculated diameter, return next standard size
    # Check Piping() internal logic for '40' schedule
    # Standard sizes often: 15, 20, 25, 32, 40, 50, 65, 80...

    # Test A: Calculated 45mm -> Should be 50mm (DN50)
    d_calc = 45.0
    # verify available diameters in code
    piping = Piping()
    diams = sorted(piping.diameters("SCH40"))
    # Find next > 45
    expected = next(d for d in diams if d > d_calc)

    params_real = {"calculated_diameter": d_calc, "schedule": "SCH40"}
    check_result(f"Real Diameter (Calc={d_calc}, Sch=SCH40)", expected, hyd.get_real_diameter(params_real), "mm")

if __name__ == "__main__":
    validate_reynolds()
    validate_friction_factor()
    validate_head_loss()
    validate_hydraulic_diameter()
    validate_npsh_head()
    validate_diameters()
