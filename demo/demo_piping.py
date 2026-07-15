import sys
import os

# Add parent directory to path to allow imports
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from models.piping import Piping
from demo.utils import print_header, print_result


def demo_piping():
    print_header("Catálogo de tubulações - exemplo")
    pip = Piping()

    composition = "Aço galvanizado"
    schedule = "SCH40"
    nominal_diameter = 125
    fitting = "Válvula esfera"

    print_result("example.selection", {
        "composition": composition,
        "schedule": schedule,
        "diameter": nominal_diameter,
        "fitting": fitting,
    })
    print_result("especificações da composição da tubulação", pip.composition_specifications(composition))
    print_result("opções de schedule da tubulação (primeiros 2)", pip.schedules()[:2])
    print_result("diâmetros da tubulação (SCH40)", pip.diameters(schedule))
    print_result(
        f"especificações do diâmetro da tubulação ({schedule}, {nominal_diameter})",
        pip.diameter_specifications(schedule, nominal_diameter),
    )
    print_result(f"especificações do acessório da tubulação ({fitting})", pip.fitting_specifications(fitting))


if __name__ == "__main__":
    demo_piping()
