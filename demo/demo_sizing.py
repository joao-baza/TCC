import os
import sys

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from demo.utils import print_header, print_result
from models.hydraulic import Hydraulic


def demo_sizing():
    print_header("Sizing Worked Example")
    hydraulic = Hydraulic()

    calculated_payload = {
        "flow_rate": 0.0166667,
        "velocity": 1.5,
    }
    calculated = hydraulic.get_calculated_diameter(calculated_payload)
    print_result("calculated_diameter_input", calculated_payload)
    print_result("calculated_diameter_result", calculated)

    real_payload = {
        "calculated_diameter": calculated.to("millimeter").magnitude,
        "schedule": "SCH40",
    }
    real = hydraulic.get_real_diameter(real_payload)
    print_result("real_diameter_input", real_payload)
    print_result("real_diameter_result", real)


if __name__ == "__main__":
    demo_sizing()
