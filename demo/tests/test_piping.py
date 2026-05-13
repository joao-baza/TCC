import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../../')))

import pytest
from pint import UnitRegistry
from models.piping import Piping

ureg = UnitRegistry()

@pytest.fixture
def piping():
    return Piping()

class TestPiping:
    
    def test_schedules_list(self, piping):
        """Verify schedules are returned."""
        schedules = piping.schedules()
        assert len(schedules) > 0
        names = [s["name"] for s in schedules]
        assert "SCH40" in names

    def test_fittings_list(self, piping):
        """Verify fittings are returned."""
        fittings = piping.fittings()
        assert len(fittings) > 0
        assert "90 degrees Elbow long radius" in fittings

    def test_diameter_specifications(self, piping):
        """Verify diameter properties."""
        spec = piping.diameter_specifications("SCH40", 50)
        assert spec["external_diameter"].magnitude == 60.30
        assert spec["thickness"].magnitude > 0

    def test_invalid_schedule_raises(self, piping):
        """Ensure invalid schedule raises error."""
        with pytest.raises(TypeError):
            piping.diameters("INVALID_SCHEDULE")

    def test_fitting_specs(self, piping):
        """Verify fitting specific data."""
        spec = piping.fitting_specifications("90 degrees Elbow long radius")
        assert spec["specifications"]["equivalentLength"].magnitude > 0
        
    def test_invalid_fitting_raises(self, piping):
        with pytest.raises(TypeError):
            piping.fitting_specifications("NonExistentFitting")

    def test_compositions(self, piping):
        """Test listing compositions."""
        comps = piping.compositions()
        assert len(comps) > 0
        assert "Commercial steel" in comps

    def test_composition_specifications(self, piping):
        """Test retrieving composition specs."""
        spec = piping.composition_specifications("Commercial steel")
        assert "roughness" in spec["specifications"]

    def test_diameters(self, piping):
        """Test retrieving diameters for schedule."""
        diams = piping.diameters("SCH40")
        assert len(diams) > 0
        assert 50 in diams  # nominal 50 usually exists

if __name__ == "__main__":
    pytest.main([__file__])
