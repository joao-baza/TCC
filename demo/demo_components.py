import sys
import os

# Add parent directory to path to allow imports
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from models.components import Components
from demo.utils import print_header, print_result

def demo_components():
    print_header("Components Class")
    comp = Components()
    
    # list_all_components
    res = comp.list_all_components()
    print_result("list_all_components (First 5)", res[:5])

    # get_all_properties
    res = comp.get_all_properties("Water", 300, 101325)
    print_result("get_all_properties (Keys)", list(res.keys())[:5])

    # get_property
    res = comp.get_property("Water", "D", 300, 101325)
    print_result("get_property ('D')", res)

    # get_property_names
    res = comp.get_property_names()
    print_result("get_property_names (First 5)", list(res.keys())[:5])

    # get_critical_properties
    res = comp.get_critical_properties("Water")
    print_result("get_critical_properties", res)

    # get_property_mixture_names
    res = comp.get_property_mixture_names()
    print_result("get_property_mixture_names", list(res.keys())[:5])

    # get_mixture_properties
    fractions = {"Water": 0.5, "Ethanol": 0.5}
    res = comp.get_mixture_properties(fractions, 300, 101325, ["D"])
    print_result("get_mixture_properties", res)

if __name__ == "__main__":
    demo_components()
