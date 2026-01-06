
import sys
import os
import json
from pint import UnitRegistry

# Add parent directory to path to allow imports
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from models.reactor import ReactorIsothermalHeterogeneous
from demo.utils import print_header, print_result

ureg = UnitRegistry()

def run_demo():
    print_header(" REACTOR SIMULATION SUITE ")
    reactor_engine = ReactorIsothermalHeterogeneous()

    # =========================================================================
    # SCENARIO DEFINITION
    # =========================================================================
    # Reaction: A -> B (Liquid Phase)
    # Rate: -rA = k * [A]^1
    base_components = [
        {
            "component_name": "A",
            "state": "liquid",
            "molar_concentration_inlet": 1000, # mol/m3 (1 M)
            "flow_rate_inlet": 0.01 # m3/s (10 L/s)
        },
        {
            "component_name": "B", 
            "state": "liquid",
            "molar_concentration_inlet": 0,
            "flow_rate_inlet": 0
        }
    ]
    
    base_params = {
        "components": base_components,
        "stoichiometric_coefficients": [-1.0, 1.0], # -1 A, +1 B
        "reaction_rate_params": {
            "k": 0.05, # s^-1 for 1st order
            "reaction_orders": [1, 0] # Order 1 wrt A, 0 wrt B
        },
        "operation_conditions": {
            "initial_temperature": 300, 
            "initial_pressure": 101325,
            "final_temperature": 300,
            "final_pressure": 101325
        }
    }

    # =========================================================================
    # PART 1: CSTR SIMULATIONS
    # =========================================================================
    print("\n" + "="*60)
    print(" 1. CSTR CALCULATIONS ")
    print("="*60)

    # 1.A Design: Given Conversion -> Find Volume
    print("\n[CSTR] Case A: Design (Available Conversion -> Required Volume)")
    target_conversion = 0.85
    params_cstr_design = base_params.copy()
    params_cstr_design.update({
        "input_type": "conversion_and_kinetics",
        "conversion": target_conversion
    })
    
    try:
        res_cstr_design = reactor_engine.cstr(params_cstr_design)
        vol_required = res_cstr_design["volume"]
        print(f"   -> Target X: {target_conversion*100}%")
        print(f"   -> Calculated Volume: {vol_required:.4f}")
        print(f"   -> Residence Time: {res_cstr_design['residence_time']:.4f}")
    except Exception as e:
        print(f"!! FAILED CSTR Design: {e}")
        return

    # 1.B Analysis: Given Volume -> Find Conversion
    print("\n[CSTR] Case B: Performance (Available Volume -> Achieved Conversion)")
    params_cstr_perf = base_params.copy()
    params_cstr_perf.update({
        "input_type": "volume_and_kinetics",
        "volume": vol_required.magnitude # Inputting the exact volume we just found
    })
    
    try:
        res_cstr_perf = reactor_engine.cstr(params_cstr_perf)
        x_calc = res_cstr_perf["conversion"]
        print(f"   -> Input Volume: {vol_required:.4f}")
        print(f"   -> Calculated X: {x_calc.magnitude*100:.4f}%")
        print(f"   -> Verification: {abs(x_calc.magnitude - target_conversion) < 1e-4}")
    except Exception as e:
        print(f"!! FAILED CSTR Performance: {e}")

    # 1.C Residence Time: Given Tau -> Find Conversion
    print("\n[CSTR] Case C: Residence Time (Given Tau -> Achieved Conversion)")
    tau = res_cstr_design["residence_time"].magnitude
    params_cstr_tau = base_params.copy()
    params_cstr_tau.update({
        "input_type": "residence_time_and_kinetics",
        "residence_time": tau
    })
    
    try:
        res_cstr_tau = reactor_engine.cstr(params_cstr_tau)
        print(f"   -> Input Tau: {tau:.4f} s")
        print(f"   -> Calculated X: {res_cstr_tau['conversion'].magnitude*100:.4f}%")
    except Exception as e:
        print(f"!! FAILED CSTR Tau: {e}")


    # =========================================================================
    # PART 2: PFR SIMULATIONS
    # =========================================================================
    print("\n" + "="*60)
    print(" 2. PFR CALCULATIONS ")
    print("="*60)

    # 2.A Standard PFR (No Recycle)
    print("\n[PFR] Case A: Standard Plug Flow (No Recycle)")
    target_conversion_pfr = 0.95
    params_pfr_std = base_params.copy()
    params_pfr_std.update({
        "input_type": "conversion_and_kinetics",
        "conversion": target_conversion_pfr,
        "recycling_ratio": 0
    })

    try:
        res_pfr_std = reactor_engine.pfr(params_pfr_std)
        vol_pfr = res_pfr_std["volume"]
        print(f"   -> Target X: {target_conversion_pfr*100}%")
        print(f"   -> Calculated Volume: {vol_pfr:.4f}")
    except Exception as e:
        print(f"!! FAILED PFR Standard: {e}")

    # 2.B PFR with Recycle
    print("\n[PFR] Case B: PFR with Recycle Ratio R=2.0")
    # Recycle R=2 means mixed feed has some product. 
    # Usually requires LARGER volume for same conversion as PFR approaches CSTR behavior.
    params_pfr_recycle = base_params.copy()
    params_pfr_recycle.update({
        "input_type": "conversion_and_kinetics",
        "conversion": target_conversion_pfr,
        "recycling_ratio": 2.0
    })

    try:
        res_pfr_recycle = reactor_engine.pfr(params_pfr_recycle)
        vol_pfr_rec = res_pfr_recycle["volume"]
        print(f"   -> Target X: {target_conversion_pfr*100}%")
        print(f"   -> Recycle Ratio: 2.0")
        print(f"   -> Calculated Volume: {vol_pfr_rec:.4f}")
        
        diff = vol_pfr_rec - vol_pfr
        print(f"   -> Volume Increase vs Standard: {diff:.4f} (+{(diff/vol_pfr).magnitude*100:.1f}%)")
    except Exception as e:
        print(f"!! FAILED PFR Recycle: {e}")

    # 2.C Inverse PFR (Volume -> Conversion)
    print("\n[PFR] Case C: Verification (Volume -> X)")
    params_pfr_check = base_params.copy()
    params_pfr_check.update({
        "input_type": "volume_and_kinetics",
        "volume": vol_pfr_rec.magnitude,
        "recycling_ratio": 2.0
    })

    try:
        res_check = reactor_engine.pfr(params_pfr_check)
        x_calc_pfr = res_check["conversion"]
        print(f"   -> Input Volume: {vol_pfr_rec:.4f}")
        print(f"   -> Calculated X: {x_calc_pfr.magnitude*100:.4f}%")
    except Exception as e:
        print(f"!! FAILED PFR Check: {e}")

    print("\n" + "="*60)
    print(" DEMO COMPLETE ")
    print("="*60)

if __name__ == "__main__":
    run_demo()
