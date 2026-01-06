import sys
import os

# Add parent directory to path to allow imports
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from models.mass_balance import MassBalance
from demo.utils import print_header, print_result

def demo_mass_balance():
    print_header("MassBalance Class")
    mb = MassBalance(components=["A"])
    
    # add_stream
    mb.add_stream("S1", ["A"], 1, flow_rate=100, compositions={"A": 1.0})
    mb.add_stream("S2", ["A"], 1, flow_rate=50, compositions={"A": 1.0})
    mb.add_stream("S3", ["A"], -1, flow_rate=None, compositions={"A": 1.0})
    print_result("add_stream", "Added S1, S2, S3")

    # add_reaction
    mb.add_reaction({"A": -1}, "A", conversion=0.1) # Small conversion to keep things simple
    print_result("add_reaction", "Added reaction A -> ...")

    # add_split
    # (Not adding split here to keep the solve simple for this demo, or add a separate one)
    # Let's verify solve works for mixer
    
    # solve / get_results
    try:
        res = mb.get_results()
        print_result("get_results (Mixer)", res)
        
        # validate_results
        valid, msg = mb.validate_results(res)
        print_result("validate_results", f"Valid: {valid}, Msg: {msg}")
    except Exception as e:
        print_result("solve", f"Solver warning/error: {e}")

    # validate_stream_compositions
    # This static method expects an object with a 'compositions' attribute (dict)
    # The internal Stream class uses '.z', so we create a simple compatible object here
    class SimpleStream:
        def __init__(self, name, comps):
            self.name = name
            self.compositions = comps

    s_demo = SimpleStream("DemoStream", {"A": 0.5, "B": 0.5})
    valid, msg = mb.validate_stream_compositions(s_demo)
    print_result("validate_stream_compositions (DemoStream)", f"Valid: {valid}, Msg: {msg}")

if __name__ == "__main__":
    demo_mass_balance()
