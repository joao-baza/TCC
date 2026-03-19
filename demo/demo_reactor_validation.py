
import sys
import os
import math
from pint import UnitRegistry
import numpy as np
from scipy.integrate import quad

# Add parent directory to path to allow imports
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from models.reactor import ReactorIsothermalHeterogeneous
from demo.utils import print_header

ureg = UnitRegistry()

def print_validation(case_name, manual_val, code_val, units, tolerance=1.0):
    """
    Helper to print validation results.
    tolerance is in %
    """
    print(f"\n   >> Validation: {case_name}")
    print(f"      Manual: {manual_val:.4f} {units}")
    print(f"      Code:   {code_val:.4f} {units}")
    
    # Handle potential zero division or small numbers
    if abs(manual_val) < 1e-9 and abs(code_val) < 1e-9:
        diff_pct = 0.0
    elif abs(manual_val) < 1e-9:
        diff_pct = 100.0 # Arbitrary large error if manual is 0 but code is not
    else:
        diff_pct = abs((code_val - manual_val) / manual_val) * 100.0
        
    match = diff_pct < tolerance
    status = "✅ PASS" if match else "❌ FAIL"
    print(f"      Diff:   {diff_pct:.4f}% -> {status}")

def run_validation():
    print_header(" REACTOR MODEL VALIDATION (4.4.5) ")
    reactor_engine = ReactorIsothermalHeterogeneous()

    # =========================================================================
    # GLOBAL PARAMETERS
    # =========================================================================
    # Reaction: A -> B (Liquid Phase, Isothermal)
    # Rate: -rA = k * C_A
    k_val = 0.05      # s^-1
    C_A0_val = 1000   # mol/m3
    Q_val = 0.01      # m3/s
    F_A0_val = C_A0_val * Q_val # 10 mol/s
    
    print(f"\nGlobal Parameters:")
    print(f"  Reaction A -> B (1st order, liquid)")
    print(f"  k = {k_val} s^-1")
    print(f"  C_A0 = {C_A0_val} mol/m3")
    print(f"  Q = {Q_val} m3/s")
    print(f"  F_A0 = {F_A0_val} mol/s")

    base_components = [
        { "component_name": "A", "state": "liquid", "molar_concentration_inlet": C_A0_val, "flow_rate_inlet": Q_val },
        { "component_name": "B", "state": "liquid", "molar_concentration_inlet": 0, "flow_rate_inlet": 0 }
    ]
    
    base_params = {
        "components": base_components,
        "stoichiometric_coefficients": [-1.0, 1.0],
        "reaction_rate_params": { "k": k_val, "reaction_orders": [1, 0] },
        "operation_conditions": {
            "initial_temperature": 300, "initial_pressure": 101325,
            "final_temperature": 300, "final_pressure": 101325
        }
    }

    # =========================================================================
    # 1. CSTR VALIDATION
    # =========================================================================
    print_header("1. CSTR VALIDATION")
    
    # --- 1.A Design: Given X -> Find V ---
    # Manual Formula: V = (F_A0 * X) / (-r_A_out)
    #                 -r_A_out = k * C_A_out = k * C_A0 * (1-X) 
    #                 V = (F_A0 * X) / (k * C_A0 * (1-X)) 
    #                   = (Q * C_A0 * X) / (k * C_A0 * (1-X))
    #                   = Q * X / (k * (1-X))
    target_X = 0.85
    print(f"\n[1.A] DESIGN (Target X = {target_X})")
    
    # Manual Calculation
    vol_manual_cstr = (Q_val * target_X) / (k_val * (1 - target_X))
    
    # Code Calculation
    params_1a = base_params.copy()
    params_1a.update({ "input_type": "conversion_and_kinetics", "conversion": target_X })
    res_1a = reactor_engine.cstr(params_1a)
    vol_code_cstr = res_1a["volume"].magnitude
    
    print_validation("Volume Calculation", vol_manual_cstr, vol_code_cstr, "m3")

    # --- 1.B Performance: Given V -> Find X ---
    # Manual Formula: From V = Q*X / (k*(1-X))
    #                 V*k*(1-X) = Q*X
    #                 Vk - VkX = QX
    #                 Vk = X(Q + Vk)
    #                 X = Vk / (Q + Vk)
    # Let's use the V we just found to verify we get 0.85 back
    print(f"\n[1.B] PERFORMANCE (Input V = {vol_manual_cstr:.4f} m3)")
    
    tau_cstr = vol_manual_cstr / Q_val # Da = tau * k
    da = tau_cstr * k_val
    x_manual_cstr_perf = da / (1 + da)
    
    # Code Calculation
    params_1b = base_params.copy()
    params_1b.update({ "input_type": "volume_and_kinetics", "volume": vol_manual_cstr })
    res_1b = reactor_engine.cstr(params_1b)
    x_code_cstr_perf = res_1b["conversion"].magnitude
    
    print_validation("Conversion Calculation", x_manual_cstr_perf, x_code_cstr_perf, "(fraction)")

    # --- 1.C Residence Time: Given Tau -> Find X ---
    # Same formula X = tau*k / (1 + tau*k)
    print(f"\n[1.C] RESIDENCE TIME (Input Tau = {tau_cstr:.4f} s)")
    
    # Code Calculation
    params_1c = base_params.copy()
    params_1c.update({ "input_type": "residence_time_and_kinetics", "residence_time": tau_cstr })
    res_1c = reactor_engine.cstr(params_1c)
    x_code_cstr_tau = res_1c["conversion"].magnitude
    
    print_validation("Conversion from Tau", x_manual_cstr_perf, x_code_cstr_tau, "(fraction)")


    # =========================================================================
    # 2. PFR VALIDATION (Standard, No Recycle)
    # =========================================================================
    print_header("2. PFR VALIDATION (Standard)")
    
    # --- 2.A Design: Given X -> Find V ---
    # Manual Formula: V = F_A0 * Integral(dX/-rA) from 0 to X
    #                 -rA = k * CA = k * CA0 * (1-X)
    #                 V = F_A0 * Integral( dX / (k*CA0*(1-X)) )
    #                 V = (F_A0 / (k*CA0)) * Integral( 1/(1-X) dX )
    #                 V = (Q / k) * [-ln(1-X)] from 0 to X
    #                 V = -(Q/k) * ln(1-X)
    target_X_pfr = 0.90
    print(f"\n[2.A] DESIGN (Target X = {target_X_pfr})")
    
    vol_manual_pfr = -(Q_val / k_val) * math.log(1 - target_X_pfr)
    
    params_2a = base_params.copy()
    params_2a.update({ "input_type": "conversion_and_kinetics", "conversion": target_X_pfr, "recycling_ratio": 0 })
    res_2a = reactor_engine.pfr(params_2a)
    vol_code_pfr = res_2a["volume"].magnitude
    
    print_validation("Volume Calculation", vol_manual_pfr, vol_code_pfr, "m3")

    # --- 2.B Performance: Given V -> Find X ---
    # Manual Formula: From V = -(Q/k)*ln(1-X)
    #                 -Vk/Q = ln(1-X)
    #                 exp(-Vk/Q) = 1-X
    #                 X = 1 - exp(-Vk/Q)
    #                 X = 1 - exp(-tau*k)
    print(f"\n[2.B] PERFORMANCE (Input V = {vol_manual_pfr:.4f} m3)")
    
    tau_pfr = vol_manual_pfr / Q_val
    x_manual_pfr_perf = 1 - math.exp(-tau_pfr * k_val)
    
    params_2b = base_params.copy()
    params_2b.update({ "input_type": "volume_and_kinetics", "volume": vol_manual_pfr, "recycling_ratio": 0 })
    res_2b = reactor_engine.pfr(params_2b)
    x_code_pfr_perf = res_2b["conversion"].magnitude
    
    print_validation("Conversion Calculation", x_manual_pfr_perf, x_code_pfr_perf, "(fraction)")

    # --- 2.C Residence Time: Given Tau -> Find X ---
    print(f"\n[2.C] RESIDENCE TIME (Input Tau = {tau_pfr:.4f} s)")
    
    params_2c = base_params.copy()
    params_2c.update({ "input_type": "residence_time_and_kinetics", "residence_time": tau_pfr, "recycling_ratio": 0 })
    res_2c = reactor_engine.pfr(params_2c)
    x_code_pfr_tau = res_2c["conversion"].magnitude
    
    print_validation("Conversion from Tau", x_manual_pfr_perf, x_code_pfr_tau, "(fraction)")


    # =========================================================================
    # 3. PFR VALIDATION (With Recycle)
    # =========================================================================
    print_header("3. PFR VALIDATION (Recycle R=2.0)")
    
    # --- 3.A Design: Given X -> Find V ---
    # Manual Formula with Recycle R:
    # V = (R+1) * F_A0 * Integral(dX/-rA) from X_in to X_out
    # where X_in = (R / (R+1)) * X_out
    # -rA = k * CA0 * (1-X)  (Liquid, constant density, 1st order)
    # V = (R+1) * (F_A0 / (k*CA0)) * Integral( 1/(1-X) dX )
    # V = (R+1) * (Q / k) * [-ln(1-X)] from X_in to X_out
    # V = (R+1) * (Q / k) * ( ln(1-X_in) - ln(1-X_out) )
    
    recycle_R = 2.0
    target_X_rec = 0.90
    print(f"\n[3.A] DESIGN (Target X = {target_X_rec}, R = {recycle_R})")
    
    x_in = (recycle_R / (recycle_R + 1)) * target_X_rec
    print(f"      X_in (calculated) = {x_in:.4f}")
    
    # Manual Integral
    # Integral of 1/(1-x) is -ln(1-x)
    val_at_upper = -math.log(1 - target_X_rec)
    val_at_lower = -math.log(1 - x_in)
    integral_val = val_at_upper - val_at_lower
    
    vol_manual_rec = (recycle_R + 1) * (Q_val / k_val) * integral_val
    
    # Code Calculation
    params_3a = base_params.copy()
    params_3a.update({ "input_type": "conversion_and_kinetics", "conversion": target_X_rec, "recycling_ratio": recycle_R })
    res_3a = reactor_engine.pfr(params_3a)
    vol_code_rec = res_3a["volume"].magnitude
    
    print_validation("Volume Calculation (Recycle)", vol_manual_rec, vol_code_rec, "m3")

    # --- 3.B Performance: Given V -> Find X ---
    # We solve the equation V = f(X) for X.
    # V_known = (R+1)*(Q/k) * (ln(1 - R/(R+1)*X) - ln(1 - X))
    # This is transcendental, so we can't analytically solve for X easily in a single line.
    # However, we can use the root finder logic or just plug the X we know (0.9) into the forward equation 
    # and see if it gives the volume, which effectively validates the physics.
    # Or, simpler: we take the V we just calculated manually, give it to the code, and see if it returns 0.90.
    print(f"\n[3.B] PERFORMANCE (Input V = {vol_manual_rec:.4f} m3)")
    
    params_3b = base_params.copy()
    params_3b.update({ "input_type": "volume_and_kinetics", "volume": vol_manual_rec, "recycling_ratio": recycle_R })
    res_3b = reactor_engine.pfr(params_3b)
    x_code_rec_perf = res_3b["conversion"].magnitude
    
    print_validation("Conversion Calculation (Recycle)", target_X_rec, x_code_rec_perf, "(fraction)")


    print_header(" VALIDATION COMPLETE ")

if __name__ == "__main__":
    run_validation()
