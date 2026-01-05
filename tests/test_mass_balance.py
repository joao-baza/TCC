import pytest
import sympy as sp
from models.mass_balance import MassBalance

@pytest.fixture
def mass_balance():
    return MassBalance(components=["A"])

class TestMassBalance:
    
    def test_symbolic_solution_check(self, mass_balance):
        """Test that solver rejects symbolic (underdetermined) solutions."""
        # S1: Inlet, Unknown Flow
        mass_balance.add_stream("S1", ["A"], 1, flow_rate=None, compositions={"A": 1.0})
        # S2: Outlet, Unknown Flow
        mass_balance.add_stream("S2", ["A"], -1, flow_rate=None, compositions={"A": 1.0})
        
        # System: F_S1 - F_S2 = 0
        with pytest.raises(ValueError, match="System is underdetermined"):
            mass_balance.solve()

    def test_simple_mixer_valid(self, mass_balance):
        """Test a simple valid mixer case."""
        # Stream 1 (100 kg/h, Input)
        mass_balance.add_stream("S1", ["A"], 1, flow_rate=100, compositions={"A": 1.0})
        # Stream 2 (50 kg/h, Input)
        mass_balance.add_stream("S2", ["A"], 1, flow_rate=50, compositions={"A": 1.0})
        # Stream 3 (Unknown, Output)
        mass_balance.add_stream("S3", ["A"], -1, flow_rate=None, compositions={"A": 1.0})
        
        res = mass_balance.get_results()
        assert res["S3"]["flow_rate"] == 150.0

    def test_add_reaction(self, mass_balance):
        """Test adding a reaction."""
        mass_balance.add_reaction({"A": -1}, "A", conversion=0.5)
        assert len(mass_balance.reactions) == 1

    def test_add_split(self, mass_balance):
        """Test adding a split."""
        mass_balance.add_stream("S1", ["A"], 1)
        mass_balance.add_stream("R", ["A"], 1) # recycle
        mass_balance.add_stream("P", ["A"], -1) # purge
        mass_balance.add_split("S1", "R", "P", fraction=0.1)
        assert len(mass_balance.splits) == 1

    def test_validate_results_valid(self, mass_balance):
        """Test validation with valid results."""
        results = {
            "S1": {"flow_rate": 100, "compositions": {"A": 1.0}},
        }
        valid, msg = mass_balance.validate_results(results)
        assert valid
        assert not msg

    def test_validate_results_invalid_flow(self, mass_balance):
        """Test validation with invalid negative flow."""
        results = {
            "S1": {"flow_rate": -10, "compositions": {"A": 1.0}},
        }
        valid, msg = mass_balance.validate_results(results)
        assert not valid
        assert "Negative flow" in msg

    def test_validate_stream_compositions(self, mass_balance):
        """Test composition validation."""
        class MockStream:
            def __init__(self, name, comps):
                self.name = name
                self.compositions = comps
        
        s_valid = MockStream("S1", {"A": 0.5, "B": 0.5})
        valid, _ = mass_balance.validate_stream_compositions(s_valid)
        assert valid
        
        s_invalid = MockStream("S2", {"A": 0.6, "B": 0.6})
        valid, msg = mass_balance.validate_stream_compositions(s_invalid)
        assert not valid
        assert "sum to" in msg
