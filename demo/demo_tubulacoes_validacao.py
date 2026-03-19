import sys
import os

# Add parent directory to path to allow imports
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from models.piping import Piping
from demo.utils import print_header, print_result

def demo_tubulacoes_validacao():
    print_header("4.4.4 Validação - Tubulações")
    pip = Piping()

    # --- 4.4.4.1 Acessórios (Fittings) ---
    print("\n--- 4.4.4.1 Acessórios: Comparação Manual vs Código ---")
    fitting_name = "90 degrees Elbow long radius"
    print(f"Item testado: {fitting_name}")
    
    # Manual value from standard reference (assumed to be the source of truth for this 'manual' check)
    manual_le_over_d = 16 
    print(f"Valor Manual (Le/D): {manual_le_over_d}")

    # Code value
    try:
        spec = pip.fitting_specifications(fitting_name)
        code_le_over_d = spec["specifications"]["equivalentLength"] # It returns dimensionless magnitude in code logic
        print(f"Valor Código (Le/D): {code_le_over_d}")
        
        diff = abs(manual_le_over_d - code_le_over_d)
        print(f"Diferença Absoluta: {diff}")
        if diff < 1e-9:
            print("Status: VALIDADO")
        else:
            print("Status: DIVERGENTE")
    except Exception as e:
        print(f"Erro no código: {e}")

    # --- 4.4.4.3 Composição (Material) ---
    print("\n--- 4.4.4.3 Composição: Comparação Manual vs Código ---")
    comp_name = "Commercial steel"
    print(f"Item testado: {comp_name}")
    
    # Manual value
    manual_roughness = 0.06 # mm
    print(f"Valor Manual (Rugosidade [mm]): {manual_roughness}")

    # Code value
    try:
        spec = pip.composition_specifications(comp_name)
        # In the model, roughness is a pint quantity, we need magnitude
        code_roughness = spec["specifications"]["roughness"].magnitude
        print(f"Valor Código (Rugosidade [mm]): {code_roughness}")
        
        diff = abs(manual_roughness - code_roughness)
        print(f"Diferença Absoluta: {diff}")
        if diff < 1e-9:
            print("Status: VALIDADO")
        else:
            print("Status: DIVERGENTE")
    except Exception as e:
        print(f"Erro no código: {e}")

    # --- 4.4.4.5 Diâmetros (Dimensions) ---
    print("\n--- 4.4.4.5 Diâmetros: Comparação Manual vs Código ---")
    schedule = "SCH40"
    nominal_dia = 50 # mm
    print(f"Item testado: {schedule}, DN {nominal_dia}")
    
    # Manual values (standard pipe table for SCH40 2")
    manual_od = 60.30 # mm
    manual_thk = 3.91 # mm
    print(f"Valor Manual (Diâmetro Externo [mm]): {manual_od}")
    print(f"Valor Manual (Espessura [mm]): {manual_thk}")

    # Code value
    try:
        spec = pip.diameter_specifications(schedule, nominal_dia)
        # These are pint quantities in the dict returned by diameter_specifications?
        # Let's check model implementation: 
        # diameter_specifications returns self.data["dimensions"][schedule_key][diameter_nominal]
        # In __init__, these are converted to pint quantities.
        code_od = spec["external_diameter"].magnitude
        code_thk = spec["thickness"].magnitude
        
        print(f"Valor Código (Diâmetro Externo [mm]): {code_od}")
        print(f"Valor Código (Espessura [mm]): {code_thk}")
        
        diff_od = abs(manual_od - code_od)
        diff_thk = abs(manual_thk - code_thk)
        
        print(f"Diferença OD: {diff_od}")
        print(f"Diferença Espessura: {diff_thk}")
        
        if diff_od < 1e-9 and diff_thk < 1e-9:
            print("Status: VALIDADO")
        else:
            print("Status: DIVERGENTE")

    except Exception as e:
        print(f"Erro no código: {e}")

if __name__ == "__main__":
    demo_tubulacoes_validacao()
