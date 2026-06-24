import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../../')))

import pytest
from base_validator import BaseValidator

class ConcreteValidator(BaseValidator):
    """Concrete class for testing BaseValidator mixin."""
    pass

@pytest.fixture
def validator():
    return ConcreteValidator()

class TestBaseValidator:
    
    def test_require_keys_success(self, validator):
        """Test missing keys check passes when keys exist."""
        data = {"a": 1, "b": 2}
        validator._require_keys(data, ["a", "b"])

    def test_require_keys_failure(self, validator):
        """Test missing keys check raises Error."""
        data = {"a": 1}
        with pytest.raises(ValueError, match="Missing parameter"):
            validator._require_keys(data, ["a", "b"])

    def test_validate_numeric_success(self, validator):
        """Test numeric check passes."""
        data = {"a": 1, "b": 2.5}
        validator._validate_numeric(data, ["a", "b"])

    def test_validate_numeric_failure(self, validator):
        """Test numeric check raises Error for strings."""
        data = {"a": "1", "b": 2}
        with pytest.raises(TypeError, match="numeric"):
            validator._validate_numeric(data, ["a"])


class TestBaseValidatorEdgeCases:

    def test_validate_numeric_accepts_negative_and_zero(self, validator):
        """Negative and zero values are valid numeric inputs."""
        data = {"a": -1.5, "b": 0, "c": 0.0}
        validator._validate_numeric(data, ["a", "b", "c"])

    def test_require_keys_empty_list(self, validator):
        """Empty key list always passes."""
        validator._require_keys({"a": 1}, [])

    def test_require_keys_multiple_missing(self, validator):
        """Multiple missing keys are reported together."""
        with pytest.raises(ValueError, match="Missing parameter"):
            validator._require_keys({"a": 1}, ["a", "b", "c"])

    def test_validate_numeric_rejects_none(self, validator):
        with pytest.raises(TypeError, match="numeric"):
            validator._validate_numeric({"a": None}, ["a"])

    def test_validate_numeric_rejects_list(self, validator):
        with pytest.raises(TypeError, match="numeric"):
            validator._validate_numeric({"a": [1]}, ["a"])

if __name__ == "__main__":
    pytest.main([__file__])
