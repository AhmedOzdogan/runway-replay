from write_index import build_index


def test_groups_airports_by_day_oldest_first():
    names = [
        "MUC-2026-10-22.json.gz",
        "LHR-2026-10-22.json.gz",
        "MUC-2026-10-21.json.gz",
    ]
    assert build_index(names) == {
        "days": [
            {"date": "2026-10-21", "airports": ["MUC"]},
            {"date": "2026-10-22", "airports": ["LHR", "MUC"]},
        ]
    }


def test_ignores_anything_that_is_not_a_day_file():
    assert build_index(["latest.json", "index.json", "README.md", "\n"]) == {"days": []}
