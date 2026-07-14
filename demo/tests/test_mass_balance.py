
import pytest
import sys
import os

# Ensure models can be imported
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))

import sympy as sp

from models.mass_balance import MassBalance, Stream
from schemas import StreamModel

def test_mass_balance_mixer():
    """Test a simple mixer: 2 streams in, 1 stream out."""
    mb = MassBalance(components=["Water", "Ethanol"])
    
    # S1: Pure Water, 100 kg/h
    mb.add_stream("S1", ["Water", "Ethanol"], 1, flow_rate=100.0, compositions={"Water": 1.0, "Ethanol": 0.0})
    
    # S2: Pure Ethanol, 100 kg/h
    mb.add_stream("S2", ["Water", "Ethanol"], 1, flow_rate=100.0, compositions={"Water": 0.0, "Ethanol": 1.0})
    
    # S3: Output (Unknown flow and comp)
    mb.add_stream("S3", ["Water", "Ethanol"], -1)
    
    results = mb.get_results()
    
    # Check Flow Rate
    # In = 100 + 100 = 200
    assert results["S3"]["flow_rate"] == 200.0
    
    # Check Compositions
    # Water in = 100 * 1.0 = 100
    # Water out = 200 * z_S3_Water => z = 0.5
    assert results["S3"]["compositions"]["Water"] == 0.5
    assert results["S3"]["compositions"]["Ethanol"] == 0.5

def test_mass_balance_reaction():
    """Test a simple reaction A -> B with 50% conversion."""
    mb = MassBalance(components=["A", "B"])
    
    # Feed: 100 mol/s of Pure A
    mb.add_stream("Feed", ["A", "B"], 1, flow_rate=100.0, compositions={"A": 1.0, "B": 0.0})
    # Product
    mb.add_stream("Product", ["A", "B"], -1)
    
    # Reaction: A -> B, 50% conversion of A
    mb.add_reaction({"A": -1, "B": 1}, key_component="A", conversion=0.5)
    
    results = mb.get_results()
    
    # Total Mass/Moles Balance (for A->B stoichiom 1:1, moles conserved)
    assert results["Product"]["flow_rate"] == 100.0
    
    # Composition validation
    # A initial = 100. Reacted = 50% of 100 = 50. Remaining = 50.
    # B generated = 50.
    # Product composition: A=0.5, B=0.5
    assert results["Product"]["compositions"]["A"] == 0.5
    assert results["Product"]["compositions"]["B"] == 0.5

def test_mass_balance_splitter():
    """Test a splitter: 1 stream in, 2 streams out (Recycle loop style logic but open loop for simplicity)."""
    mb = MassBalance(components=["Water"])
    
    # Feed: 100 kg/h
    mb.add_stream("Feed", ["Water"], 1, flow_rate=100.0, compositions={"Water": 1.0})
    
    # We need to simulate the "Split" class logic but via streams directly or using the split helper
    # The current MassBalance class has 'add_split', let's use it.
    # Note: add_split in mass_balance.py sets equations for Rec and Purge based on Parent.
    # But those streams need to be added first.
    
    mb.add_stream("Parent", ["Water"], -1) # Intermediate dummy output for the splitter source? 
    # Actually, looking at the code, 'add_split' takes strict stream names.
    # Assuming standard topology: Feed -> [Mixer] -> Parent -> [Splitter] -> Recycle & Purge
    # For this unit test, let's just make Feed the Parent.
    
    # Feed is Input (+1). For the split logic, 'Parent' usually feeds into the split.
    # Let's try: Feed (In) -> Split -> Top(Out) + Bottom(Out)
    # The code expects directionality. 
    # Let's manually define streams.
    
    mb.add_stream("S1", ["Water"], 1, flow_rate=100, compositions={"Water":1.0})
    mb.add_stream("Top", ["Water"], -1)
    mb.add_stream("Bottom", ["Water"], -1)
    
    # NOTE: The 'add_split' method assumes Parent is an existing stream.
    # It adds equations: Rec.F = f * Parent.F, etc.
    # But it does NOT automatically balance the node "S1 -> Top + Bottom".
    # The MassBalance.build_equations() simply sums ALL inputs and ALL outputs for the global balance.
    # IF we use 'add_split', we are explicitly defining the relation between S1, Top, and Bottom.
    # However, 'add_split' logic in mass_balance.py (lines 208-217) sets equality constraints.
    # It does NOT enforce "Parent = Recycle + Purge" in the global balance automatically if they are all outputs?
    # Wait, 'Parent' stream in the split logic is usually an internal stream or an output of a previous unit.
    # If S1 is Input, and Top/Bottom are Outputs.
    # If we say S1 is 'parent', and Top is 'recycle', Bottom is 'purge'.
    # Then Top.F = f * S1.F
    # Bottom.F = (1-f) * S1.F
    # These equations define Top and Bottom fully.
    # The Global Balance (Eq a) says: IN - OUT = 0 => S1 - (Top + Bottom) = 0.
    # S1 - (f*S1 + (1-f)*S1) = S1 - S1 = 0. So it is consistent.
    
    mb.add_split("S1", "Top", "Bottom", fraction=0.2)
    
    results = mb.get_results()
    
    assert results["Top"]["flow_rate"] == 20.0  # 0.2 * 100
    assert results["Bottom"]["flow_rate"] == 80.0 # 0.8 * 100

def test_stream_names_with_spaces():
    """Regression: sp.symbols() treated spaces as tuple separators for stream names."""
    stream = Stream("Feed Stream", ["Water"], 1)
    assert isinstance(stream.F, sp.Symbol)
    assert str(stream.F) == "F_Feed Stream"

    mb = MassBalance(components=["Water"])
    mb.add_stream("Feed Stream", ["Water"], 1, flow_rate=100.0, compositions={"Water": 1.0})
    mb.add_stream("Product Stream", ["Water"], -1)

    results = mb.get_results()
    assert results["Product Stream"]["flow_rate"] == 100.0
    assert results["Product Stream"]["compositions"]["Water"] == 1.0

def test_add_reaction_accepts_X_alias():
    """The API accepts 'X' as an alias for 'conversion'."""
    mb = MassBalance(components=["A", "B"])
    mb.add_stream("Feed", ["A", "B"], 1, flow_rate=100.0, compositions={"A": 1.0, "B": 0.0})
    mb.add_stream("Product", ["A", "B"], -1)
    mb.add_reaction({"A": -1, "B": 1}, key_component="A", X=0.25)

    results = mb.get_results()
    assert results["Product"]["compositions"]["A"] == 0.75
    assert results["Product"]["compositions"]["B"] == 0.25

def test_add_reaction_requires_conversion_or_X():
    mb = MassBalance(components=["A"])
    with pytest.raises(ValueError, match="Either 'conversion' or 'X' must be provided"):
        mb.add_reaction({"A": -1}, key_component="A")

def test_validate_results_accepts_balanced_solution():
    mb = MassBalance(components=["Water"])
    mb.add_stream("Feed", ["Water"], 1, flow_rate=50.0, compositions={"Water": 1.0})
    mb.add_stream("Out", ["Water"], -1)

    is_valid, error_message = mb.validate_results()
    assert is_valid
    assert error_message == ""

def test_validate_results_rejects_negative_flow():
    results = {
        "Out": {"flow_rate": -10.0, "compositions": {"Water": 1.0}},
    }
    mb = MassBalance(components=["Water"])
    is_valid, error_message = mb.validate_results(results)
    assert not is_valid
    assert "Vazão negativa" in error_message

def test_validate_results_rejects_invalid_composition_sum():
    results = {
        "Out": {"flow_rate": 100.0, "compositions": {"Water": 0.6, "Ethanol": 0.6}},
    }
    is_valid, error_message = MassBalance(["Water", "Ethanol"]).validate_results(results)
    assert not is_valid
    assert "não somam aproximadamente 1" in error_message

def test_validate_stream_compositions_valid():
    stream = StreamModel(name="S1", direction=1, flow_rate=100.0, compositions={"Water": 1.0})
    is_valid, error_message = MassBalance.validate_stream_compositions(stream)
    assert is_valid
    assert error_message == ""

def test_validate_stream_compositions_invalid_sum():
    stream = StreamModel(
        name="S1",
        direction=1,
        flow_rate=100.0,
        compositions={"Water": 0.6, "Ethanol": 0.6},
    )
    is_valid, error_message = MassBalance.validate_stream_compositions(stream)
    assert not is_valid
    assert "S1" in error_message


class TestMassBalanceEdgeCases:

    def test_validate_results_rejects_negative_composition(self):
        mb = MassBalance(["Water"])
        results = {"Out": {"flow_rate": 100.0, "compositions": {"Water": -0.1}}}
        is_valid, error_message = mb.validate_results(results)
        assert not is_valid
        assert "Composição negativa" in error_message

    def test_validate_results_accepts_sum_at_lower_boundary(self):
        mb = MassBalance(["Water", "Ethanol"])
        results = {"Out": {"flow_rate": 100.0, "compositions": {"Water": 0.495, "Ethanol": 0.495}}}
        is_valid, _ = mb.validate_results(results)
        assert is_valid

    def test_validate_results_rejects_sum_below_boundary(self):
        mb = MassBalance(["Water", "Ethanol"])
        results = {"Out": {"flow_rate": 100.0, "compositions": {"Water": 0.49, "Ethanol": 0.49}}}
        is_valid, error_message = mb.validate_results(results)
        assert not is_valid
        assert "não somam aproximadamente 1" in error_message

    def test_validate_stream_compositions_skips_all_none(self):
        stream = StreamModel(name="S1", direction=1, flow_rate=100.0, compositions={"Water": None})
        is_valid, error_message = MassBalance.validate_stream_compositions(stream)
        assert is_valid
        assert error_message == ""

    def test_zero_flow_rate_balances(self):
        mb = MassBalance(["Water"])
        mb.add_stream("In", ["Water"], 1, flow_rate=0.0, compositions={"Water": 1.0})
        mb.add_stream("Out", ["Water"], -1)
        results = mb.get_results()
        assert results["In"]["flow_rate"] == 0.0
        assert results["Out"]["flow_rate"] == 0.0
        is_valid, _ = mb.validate_results(results)
        assert is_valid

    def test_reaction_zero_conversion(self):
        mb = MassBalance(components=["A", "B"])
        mb.add_stream("Feed", ["A", "B"], 1, flow_rate=100.0, compositions={"A": 1.0, "B": 0.0})
        mb.add_stream("Product", ["A", "B"], -1)
        mb.add_reaction({"A": -1, "B": 1}, key_component="A", conversion=0.0)
        results = mb.get_results()
        assert results["Product"]["compositions"]["A"] == 1.0
        assert results["Product"]["compositions"]["B"] == 0.0

    def test_reaction_full_conversion(self):
        mb = MassBalance(components=["A", "B"])
        mb.add_stream("Feed", ["A", "B"], 1, flow_rate=100.0, compositions={"A": 1.0, "B": 0.0})
        mb.add_stream("Product", ["A", "B"], -1)
        mb.add_reaction({"A": -1, "B": 1}, key_component="A", conversion=1.0)
        results = mb.get_results()
        assert results["Product"]["compositions"]["A"] == 0.0
        assert results["Product"]["compositions"]["B"] == 1.0

    def test_splitter_fraction_zero(self):
        mb = MassBalance(components=["Water"])
        mb.add_stream("S1", ["Water"], 1, flow_rate=100, compositions={"Water": 1.0})
        mb.add_stream("Top", ["Water"], -1)
        mb.add_stream("Bottom", ["Water"], -1)
        mb.add_split("S1", "Top", "Bottom", fraction=0.0)
        results = mb.get_results()
        assert results["Top"]["flow_rate"] == 0.0
        assert results["Bottom"]["flow_rate"] == 100.0

    def test_splitter_fraction_one(self):
        mb = MassBalance(components=["Water"])
        mb.add_stream("S1", ["Water"], 1, flow_rate=100, compositions={"Water": 1.0})
        mb.add_stream("Top", ["Water"], -1)
        mb.add_stream("Bottom", ["Water"], -1)
        mb.add_split("S1", "Top", "Bottom", fraction=1.0)
        results = mb.get_results()
        assert results["Top"]["flow_rate"] == 100.0
        assert results["Bottom"]["flow_rate"] == 0.0

    def test_underdetermined_system_raises(self):
        mb = MassBalance(components=["A"])
        mb.add_stream("In", ["A"], 1)
        mb.add_stream("Out", ["A"], -1)
        with pytest.raises(ValueError, match="underdetermined"):
            mb.solve()

    def test_stream_negative_flow_rate_stored(self):
        stream = Stream("S_neg", ["Water"], 1, flow_rate=-50.0, compositions={"Water": 1.0})
        assert stream.F == -50.0

    def test_reaction_negative_conversion_still_solves(self):
        """Negative conversion is accepted by the model; validation should catch unphysical results."""
        mb = MassBalance(components=["A", "B"])
        mb.add_stream("Feed", ["A", "B"], 1, flow_rate=100.0, compositions={"A": 1.0, "B": 0.0})
        mb.add_stream("Product", ["A", "B"], -1)
        mb.add_reaction({"A": -1, "B": 1}, key_component="A", conversion=-0.1)
        results = mb.get_results()
        assert results["Product"]["compositions"]["A"] > 1.0
        is_valid, _ = mb.validate_results(results)
        assert not is_valid


if __name__ == "__main__":
    pytest.main([__file__])
