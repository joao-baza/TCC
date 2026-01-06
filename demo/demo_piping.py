import sys
import os

# Add parent directory to path to allow imports
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from models.piping import Piping
from demo.utils import print_header, print_result

def demo_piping():
    print_header("Piping Class")
    pip = Piping()

    # fittings
    res = pip.fittings()
    # Check if dict or list
    if isinstance(res, dict):
         print_result("fittings (First 5)", list(res.keys())[:5])
         first_fitting = list(res.keys())[0]
    else:
         print_result("fittings (First 5)", res[:5])
         first_fitting = res[0]

    # fitting_specifications
    res = pip.fitting_specifications(first_fitting)
    print_result(f"fitting_specifications ({first_fitting})", res)

    # compositions
    res = pip.compositions()
    print_result("compositions", res)

    # composition_specifications
    res = pip.composition_specifications("Commercial steel")
    print_result("composition_specifications (Commercial steel)", res)

    # schedules
    res = pip.schedules()
    print_result("schedules (First 2)", res[:2])

    # diameters
    res = pip.diameters("SCH40") # Assuming SCH40 exists
    print_result("diameters (SCH40 - First 5)", list(res.keys())[:5])

    # diameter_specifications
    if res:
        first_diam = list(res.keys())[0]
        res = pip.diameter_specifications("SCH40", first_diam)
        print_result(f"diameter_specifications (SCH40, {first_diam})", res)

if __name__ == "__main__":
    demo_piping()
