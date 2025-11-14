import CoolProp.CoolProp as CP
from CoolProp.CoolProp import FluidsList
import matplotlib.pyplot as plt

from models import mass_balance
from models.piping import Piping
from models.reactor import ReactorIsothermalHeterogeneous
from models.hydraulic import Hydraulic
from models.components import Components
from models.mass_balance import MassBalance

def test_simple_mixing():
    """Test simple mixing of two streams without reaction or recycle"""
    print("\n=== Test Simple Mixing ===")
    comps = ["A", "B"]
    mb = MassBalance(comps)

    mb.add_stream("FeedA", comps, direction=+1,
                 flow_rate=100, compositions={"A": 1, "B": 0})
    mb.add_stream("FeedB", comps, direction=+1,
                 flow_rate=200, compositions={"A": 0, "B": 1})
    mb.add_stream("Product", comps, direction=-1,
                 flow_rate=None, compositions={"A": None, "B": None})

    results = mb.get_results()
    
    print(f"Feed A: {results['FeedA']['flow_rate']} kg/h, A={results['FeedA']['compositions']['A']}, B={results['FeedA']['compositions']['B']}")
    print(f"Feed B: {results['FeedB']['flow_rate']} kg/h, A={results['FeedB']['compositions']['A']}, B={results['FeedB']['compositions']['B']}")
    print(f"Product: {results['Product']['flow_rate']} kg/h, A={results['Product']['compositions']['A']}, B={results['Product']['compositions']['B']}")
    
    # Expected: F_Product = 300 kg/h, A = 1/3, B = 2/3
    assert abs(results['Product']['flow_rate'] - 300) < 1e-6
    assert abs(results['Product']['compositions']['A'] - 1/3) < 1e-6
    assert abs(results['Product']['compositions']['B'] - 2/3) < 1e-6

def test_single_reaction():
    """Test a single reaction A → C with 50% conversion"""
    print("\n=== Test Single Reaction ===")
    comps = ["A", "C"]
    mb = MassBalance(comps)

    mb.add_stream("Feed", comps, direction=+1,
                 flow_rate=100, compositions={"A": 1, "C": 0})
    mb.add_stream("Product", comps, direction=-1,
                 flow_rate=None, compositions={"A": None, "C": None})

    mb.add_reaction(stoichiometry={"A": -1, "C": +1},
                   key_component="A", conversion=0.50)

    results = mb.get_results()
    
    print(f"Feed: {results['Feed']['flow_rate']} kg/h, A={results['Feed']['compositions']['A']}, C={results['Feed']['compositions']['C']}")
    print(f"Product: {results['Product']['flow_rate']} kg/h, A={results['Product']['compositions']['A']}, C={results['Product']['compositions']['C']}")
    
    # Expected: F_Product = 100 kg/h, A = 0.5, C = 0.5
    assert abs(results['Product']['flow_rate'] - 100) < 1e-6
    assert abs(results['Product']['compositions']['A'] - 0.5) < 1e-6
    assert abs(results['Product']['compositions']['C'] - 0.5) < 1e-6

def test_recycle():
    """Test a simple recycle system with fixed recycle fraction"""
    print("\n=== Test Recycle System ===")
    comps = ["A", "B", "C", "D"]
    mb = MassBalance(comps)

    # Add streams
    mb.add_stream("Feed1", comps, direction=+1,
                 flow_rate=1000, 
                 compositions={"A": 0.9, "B": 0.1, "C": 0, "D": 0})
    mb.add_stream("Feed2", comps, direction=+1,
                 flow_rate=2000,
                 compositions={"A": 0.1, "B": 0.7, "C": 0.2, "D": 0})
    
    # Stream leaving reactor before splitting
    mb.add_stream("R_out", comps, direction=-1,
                 flow_rate=None,
                 compositions={c: None for c in comps})
    
    # Streams after splitting
    mb.add_stream("Recycle", comps, direction=+1,
                 flow_rate=None,
                 compositions={c: None for c in comps})
    mb.add_stream("Product", comps, direction=-1,
                 flow_rate=None,
                 compositions={c: None for c in comps})
    
    # Add split with 70% recycle
    mb.add_split("R_out", "Recycle", "Product", fraction=0.70)
    
    # Add reaction: A + 2B → D (60% conversion of A)
    mb.add_reaction(stoichiometry={"A": -1, "B": -2, "D": +1},
                   key_component="A", conversion=0.60)
    
    results = mb.get_results()
    
    print("=== Results ===")
    for stream_name, stream_data in results.items():
        print(f"\n{stream_name}:")
        print(f"  Flow rate: {stream_data['flow_rate']:.2f} kg/h")
        print("  Compositions:")
        for comp, value in stream_data['compositions'].items():
            print(f"    {comp}: {value:.4f}")

def test_compatibility():

    print("\n----- BALANCE -----\n")
    
    balance = MassBalance(["Water", "Ethanol"])
    
    # Simple mass balance example with two streams (one inlet, one outlet)
    print("Simple mass balance with one inlet and one outlet stream:")
    
    simple_balance = balance.mass_balance({
        "streams": [
            {
                "name": "Feed",
                "flow_type": "mass",
                "flow_rate": 10.0,  # kg/s
                "components": {
                    "Water": 0.7,
                    "Ethanol": 0.3
                },
                "temperature": 300,  # K
                "pressure": 101325,  # Pa
                "is_inlet": True
            },
            {
                "name": "Product",
                "flow_type": "mass",
                "flow_rate": 10.0,  # kg/s
                "components": {
                    "Water": 0.7,
                    "Ethanol": 0.3
                },
                "temperature": 320,  # K
                "pressure": 101325,  # Pa
                "is_inlet": False
            }
        ]
    })
    
    print(f"Total mass in: {simple_balance['total_mass_in']}")
    print(f"Total mass out: {simple_balance['total_mass_out']}")
    print(f"Total molar in: {simple_balance['total_molar_in']}")
    print(f"Total molar out: {simple_balance['total_molar_out']}")
    print(f"Is mass balanced? {simple_balance['is_mass_balanced']}")
    print(f"Is molar balanced? {simple_balance['is_molar_balanced']}")
    print(f"Mass percent error: {simple_balance['mass_percent_error']}%")
    print(f"Molar percent error: {simple_balance['molar_percent_error']}%\n")

    # Simple mass balance example with three streams (one inlet, two outlets)
    print("Simple mass balance with two inlet and one outlet streams:")
    
    simple_balance = balance.mass_balance({
        "streams": [
            {
                "name": "Feed 1",
                "flow_type": "molar",
                "flow_rate": 7.0,  # kg/s
                "components": {
                    "Water": 1,
                },
                "temperature": 300,  # K
                "pressure": 101325,  # Pa
                "is_inlet": True
            },
            {
                "name": "Feed 2",
                "flow_type": "molar",
                "flow_rate": 3.0,  # kg/s
                "components": {
                    "Ethanol": 1
                },
                "temperature": 300,  # K
                "pressure": 101325,  # Pa
                "is_inlet": True
            },
            {
                "name": "Product",
                "flow_type": "molar",
                "flow_rate": 10.0,  # kg/s
                "components": {
                    "Water": 0.7,
                    "Ethanol": 0.3
                },
                "temperature": 320,  # K
                "pressure": 101325,  # Pa
                "is_inlet": False
            }
        ]
    })
    
    print(f"Total mass in: {simple_balance['total_mass_in']}")
    print(f"Total mass out: {simple_balance['total_mass_out']}")
    print(f"Total molar in: {simple_balance['total_molar_in']}")
    print(f"Total molar out: {simple_balance['total_molar_out']}")
    print(f"Is mass balanced? {simple_balance['is_mass_balanced']}")
    print(f"Is molar balanced? {simple_balance['is_molar_balanced']}")
    print(f"Mass percent error: {simple_balance['mass_percent_error']}%")
    print(f"Molar percent error: {simple_balance['molar_percent_error']}%\n")
    
    # Example with molar flow rates
    print("Mass balance with molar flow rates:")
    
    molar_balance = balance.mass_balance({
        "streams": [
            {
                "name": "Feed",
                "flow_type": "molar",
                "flow_rate": 100.0,  # mol/s
                "components": {
                    "Nitrogen": 0.78,
                    "Oxygen": 0.21,
                    "Argon": 0.01
                },
                "temperature": 300,  # K
                "pressure": 101325,  # Pa
                "is_inlet": True
            },
            {
                "name": "Product",
                "flow_type": "molar",
                "flow_rate": 100.0,  # mol/s
                "components": {
                    "Nitrogen": 0.78,
                    "Oxygen": 0.21,
                    "Argon": 0.01
                },
                "temperature": 300,  # K
                "pressure": 101325,  # Pa
                "is_inlet": False
            }
        ]
    })
    
    print(f"Total mass in: {molar_balance['total_mass_in']}")
    print(f"Total mass out: {molar_balance['total_mass_out']}")
    print(f"Total molar in: {molar_balance['total_molar_in']}")
    print(f"Total molar out: {molar_balance['total_molar_out']}")
    print(f"Is mass balanced? {molar_balance['is_mass_balanced']}")
    print(f"Is molar balanced? {molar_balance['is_molar_balanced']}\n")
    
    # Mass balance with reaction example
    print("Mass balance with chemical reaction:")
    
    reaction_balance = balance.mass_balance({
        "streams": [
            {
                "name": "Feed",
                "flow_type": "molar",
                "flow_rate": 100.0,  # mol/s
                "components": {
                    "Methane": 0.9,
                    "Oxygen": 0.1,
                    "CarbonDioxide": 0.0,
                    "Water": 0.0
                },
                "temperature": 500,  # K
                "pressure": 101325,  # Pa
                "is_inlet": True
            },
            {
                "name": "Product",
                "flow_type": "molar",
                "flow_rate": 110.0,  # mol/s (slightly more due to reaction)
                "components": {
                    "Methane": 0.45,
                    "Oxygen": 0.0,
                    "CarbonDioxide": 0.05,
                    "Water": 0.5
                },
                "temperature": 600,  # K
                "pressure": 101325,  # Pa
                "is_inlet": False
            }
        ],
        "reactions": [
            {
                "components": ["Methane", "Oxygen", "CarbonDioxide", "Water"],
                "stoichiometric_coefficients": [-1, -2, 1, 2],  # CH4 + 2O2 -> CO2 + 2H2O
                "conversion": 0.5,  # 50% conversion of methane
                "limiting_reagent": 0  # Methane is the limiting reagent (index 0)
            }
        ]
    })
    
    print("Component mass balances:")
    for component, balance_value in reaction_balance['component_mass_balance'].items():
        print(f"{component}: {balance_value}")
    
    print("\nComponent molar balances:")
    for component, balance_value in reaction_balance['component_molar_balance'].items():
        print(f"{component}: {balance_value}")
    
    print(f"\nIs mass balanced? {reaction_balance['is_mass_balanced']}")
    print(f"Is molar balanced? {reaction_balance['is_molar_balanced']}")
    print(f"Mass percent error: {reaction_balance['mass_percent_error']}%")
    print(f"Molar percent error: {reaction_balance['molar_percent_error']}%\n")
    
    # Element balance example
    print("Element balance example:")
    
    element_balance = balance.element_balance({
        "streams": [
            {
                "name": "Feed",
                "flow_type": "molar",
                "flow_rate": 100.0,  # mol/s
                "components": {
                    "Methane": 1.0,
                    "Water": 0.0
                },
                "temperature": 300,  # K
                "pressure": 101325,  # Pa
                "is_inlet": True
            },
            {
                "name": "Product",
                "flow_type": "molar",
                "flow_rate": 100.0,  # mol/s
                "components": {
                    "Methane": 0.0,
                    "Water": 2.0
                },
                "temperature": 300,  # K
                "pressure": 101325,  # Pa
                "is_inlet": False
            }
        ],
        "element_compositions": {
            "Methane": {"C": 1, "H": 4},
            "Water": {"H": 2, "O": 1}
        }
    })
    
    print("Element balances:")
    for element, balance_value in element_balance['element_balance'].items():
        print(f"{element}: {balance_value}")
    
    print(f"Is element balanced? {element_balance['is_balanced']}\n")
    
    # Energy balance example
    print("Energy balance example:")
    
    energy_balance = balance.energy_balance({
        "streams": [
            {
                "name": "Cold Feed",
                "flow_type": "mass",
                "flow_rate": 1.0,  # kg/s
                "components": {
                    "Water": 1.0
                },
                "temperature": 293.15,  # K (20°C)
                "pressure": 101325,  # Pa
                "is_inlet": True
            },
            {
                "name": "Hot Product",
                "flow_type": "mass",
                "flow_rate": 1.0,  # kg/s
                "components": {
                    "Water": 1.0
                },
                "temperature": 353.15,  # K (80°C)
                "pressure": 101325,  # Pa
                "is_inlet": False
            }
        ],
        "heat_input": 250000  # W (250 kW)
    })
    
    print(f"Total energy in: {energy_balance['energy_in']}")
    print(f"Total energy out: {energy_balance['energy_out']}")
    print(f"Net energy: {energy_balance['net_energy']}")
    print(f"Stream energies:")
    for stream, energy in energy_balance['stream_energies'].items():
        print(f"  {stream}: {energy}")
    print(f"Is energy balanced? {energy_balance['is_balanced']}")


if __name__ == "__main__":
    piping = Piping()
    hydraulic = Hydraulic()
    reactor_isothermal_heterogeneous = ReactorIsothermalHeterogeneous()
    
    # Run mass balance tests
    #test_simple_mixing()
    #test_single_reaction()
    #test_recycle()
    test_compatibility()
    

