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
