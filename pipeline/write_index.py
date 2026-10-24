"""Build index.json for the data branch from the file names it holds.

The nightly job pipes `git ls-files '*.json.gz'` into this: the runner only has today's files on
disk, so the list of earlier days comes from git rather than from the directory.

    git ls-files '*.json.gz' | python3 write_index.py > index.json
"""

import json
import re
import sys

FILE_NAME = re.compile(r"^([A-Z]{3})-(\d{4}-\d{2}-\d{2})\.json\.gz$")


def build_index(file_names) -> dict:
    """{"days": [{"date": …, "airports": [...]}, …]}, oldest day first."""
    airports_by_date: dict[str, set[str]] = {}
    for name in file_names:
        match = FILE_NAME.match(name.strip())
        if match:
            airport, date = match.groups()
            airports_by_date.setdefault(date, set()).add(airport)
    return {
        "days": [
            {"date": date, "airports": sorted(airports)}
            for date, airports in sorted(airports_by_date.items())
        ]
    }


if __name__ == "__main__":
    json.dump(build_index(sys.stdin), sys.stdout)
