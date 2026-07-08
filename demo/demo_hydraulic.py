
import sys
import os
from pint import UnitRegistry

# Add parent directory to path to allow imports
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from models.hydraulic import Hydraulic
from demo.utils import print_header, print_result

ureg = UnitRegistry()

def run_demo():
    print_header(" FLUID DYNAMICS CALCULATION SUITE ")
    hyd_engine = Hydraulic()

    # =========================================================================
    # PART 1: REYNOLDS NUMBER
    # =========================================================================
    print("\n" + "="*60)
    print(" 1. REYNOLDS NUMBER (Regime Determination) ")
    print("="*60)

    # 1.A Dynamic Viscosity Method (D, V, rho, mu)
    print("\n[Reynolds] Method A: Using Dynamic Viscosity (mu)")
    # Water at 20°C: rho=998 kg/m3, mu=1.002e-3 Pa.s
    # Pipe: 50mm, Vel: 2 m/s
    params_re_dyn = {
        "characteristic_diameter": 50, # mm
        "velocity": 2.0, # m/s
        "density": 998, # kg/m3
        "dynamic_viscosity": 1.002e-3 # Pa.s
    }
    try:
        re_dyn = hyd_engine.reynolds(params_re_dyn)
        print(f"   -> Inputs: D=50mm, V=2m/s, rho=998kg/m3, mu=1.002e-3Pa.s")
        print(f"   -> Result: {re_dyn:.2e} (Dimensionless)")
        regime = "Turbulent" if re_dyn > 4000 else "Laminar" if re_dyn < 2000 else "Transitional"
        print(f"   -> Regime: {regime}")
    except Exception as e:
        print(f"!! FAILED Re (Dynamic): {e}")

    # 1.B Kinematic Viscosity Method (D, V, nu)
    print("\n[Reynolds] Method B: Using Kinematic Viscosity (nu)")
    # nu = mu / rho ~= 1.004e-6 m2/s
    params_re_kin = {
        "characteristic_diameter": 50, # mm
        "velocity": 2.0, # m/s
        "kinematic_viscosity": 1.004e-6 # m2/s
    }
    try:
        re_kin = hyd_engine.reynolds(params_re_kin)
        print(f"   -> Inputs: D=50mm, V=2m/s, nu=1.004e-6m2/s")
        print(f"   -> Result: {re_kin:.2e}")
    except Exception as e:
        print(f"!! FAILED Re (Kinematic): {e}")


    # =========================================================================
    # PART 2: FRICTION FACTOR
    # =========================================================================
    print("\n" + "="*60)
    print(" 2. FRICTION FACTOR (Darcy-Weisbach f) ")
    print("="*60)
    
    # Using the Re we just calculated (~1e5)
    # Roughness (steel): 0.045 mm
    params_ff = {
        "diameter": 50, # mm
        "roughness": 0.045, # mm
        "reynolds": 100000,
        "method": "ColebrookWhite"
    }
    try:
        ff = hyd_engine.friction_factor(params_ff)
        print(f"   -> Method: Colebrook-White (Implicit Solver)")
        print(f"   -> Inputs: eps=0.045mm, D=50mm, Re=1e5")
        print(f"   -> f: {ff:.6f}")
    except Exception as e:
        print(f"!! FAILED Friction Factor: {e}")

    # Also show Swamee-Jain (Explicit approx)
    params_ff["method"] = "SwameeJain"
    try:
        ff_sj = hyd_engine.friction_factor(params_ff)
        print(f"   -> Method: Swamee-Jain (Explicit)")
        print(f"   -> f: {ff_sj:.6f}")
    except Exception as e:
        print(f"!! FAILED Swamee-Jain: {e}")


    # =========================================================================
    # PART 3: HEAD LOSS
    # =========================================================================
    print("\n" + "="*60)
    print(" 3. HEAD LOSS CALCULATION ")
    print("="*60)

    # Calculate losses for 100m pipe
    params_hl = {
        "method": "Darcy-Weisbach",
        "friction_factor": ff.magnitude,
        "pipe_length": 100, # m
        "diameter": 50, # mm
        "velocity": 2.0, # m/s
        "fittings": [
            {"fitting": "Elbow, 90 deg", "quantity": 2}, # Example fitting, logic depends on piping class
            {"fitting": "Tee, Flow through run", "quantity": 1}
        ]
    }
    
    # Note: fittings calculation depends on Piping class internals which we assume are working or stubbed.
    # The models/hydraulic.py calls self.piping.fitting_specifications(f["fitting"])
    # We need to make sure those fittings exist in the loaded Piping logic or we might get an error.
    # Seeing as this is a demo, we should try-catch carefully. 
    
    try:
        hl = hyd_engine.head_loss(params_hl)
        print(f"   -> Method: Darcy-Weisbach")
        print(f"   -> Length: 100m + Fittings")
        print(f"   -> Head Loss: {hl:.4f}")
    except Exception as e:
        print(f"!! FAILED Head Loss (Likely missing fitting data or invalid key): {e}")

    # =========================================================================
    # PART 4: NPSH AVAILABLE
    # =========================================================================
    print("\n" + "="*60)
    print(" 4. NPSH AVAILABLE ")
    print("="*60)

    npsh_cases = [
        (
            "Example Router Case (Risk Margin)",
            {
                "manometric_pressure": 0.0,
                "atmospheric_pressure": 1.033,
                "vapor_pressure": 0.023,
                "density": 1000.0,
                "head_loss": 10.0,
                "pump_inlet_velocity": 1.5,
                "gauge_elevation": 3.0,
            },
            3.0,
        ),
        (
            "Positive Suction Head Case (Safe Margin)",
            {
                "manometric_pressure": 1.2,
                "atmospheric_pressure": 1.0,
                "vapor_pressure": 0.03,
                "density": 998.0,
                "head_loss": 2.1,
                "pump_inlet_velocity": 1.4,
                "gauge_elevation": 3.0,
            },
            3.0,
        ),
    ]

    for label, params_npsh, npshr in npsh_cases:
        try:
            npsha = hyd_engine.npsh_available(params_npsh)
            margin = npsha.to("meter").magnitude - npshr
            print(f"\n[NPSH] {label}")
            print(f"   -> NPSHa: {npsha:.4f}")
            print(f"   -> NPSHr: {npshr:.4f} meter")
            print(f"   -> Margin (NPSHa - NPSHr): {margin:.4f} m")
        except Exception as e:
            print(f"!! FAILED NPSH ({label}): {e}")

    print("\n" + "="*60)
    print(" DEMO COMPLETE ")
    print("="*60)

if __name__ == "__main__":
    run_demo()
