import airports
import download  # noqa: F401
import filter  # noqa: F401
import process  # noqa: F401
import resample  # noqa: F401


def test_airports():
    assert "MUC" in airports.AIRPORTS
