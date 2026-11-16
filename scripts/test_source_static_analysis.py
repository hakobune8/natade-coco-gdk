"""Negative checks for scan coverage and fail-closed evidence handling."""
import importlib.util
import unittest
from pathlib import Path
from tempfile import TemporaryDirectory
from unittest.mock import patch

spec = importlib.util.spec_from_file_location("source_static_analysis", Path(__file__).with_name("source-static-analysis.py"))
scanner = importlib.util.module_from_spec(spec)
spec.loader.exec_module(scanner)


class StaticAnalysisTest(unittest.TestCase):
    def report(self, **changes):
        return dict(version="1.185.0", errors=[], results=[], paths={"scanned": ["src/main.ts"]}, **changes)

    def test_complete_clean_scan_passes(self):
        self.assertIsNone(scanner.report_failure(self.report(), ["src/main.ts"], "1.185.0"))

    def test_findings_parse_errors_engine_drift_and_skipped_targets_fail(self):
        for field, value in [("results", [{"check_id": "finding"}]), ("errors", [{"type": "PartialParsing"}]),
                             ("version", "1.184.0"), ("paths", {"scanned": []})]:
            report = self.report()
            report[field] = value
            with self.subTest(field=field):
                self.assertIsNotNone(scanner.report_failure(report, ["src/main.ts"], "1.185.0"))

    def test_incomplete_reports_fail(self):
        for field in ["results", "errors", "paths", "version"]:
            report = self.report()
            del report[field]
            with self.subTest(field=field):
                self.assertIsNotNone(scanner.report_failure(report, ["src/main.ts"], "1.185.0"))

    def test_own_sources_including_tests_are_selected_but_vendor_is_explicit(self):
        profile = {"extensions": [".ts"], "excludedDirectoryNames": ["vendor"], "excludedPaths": ["config/static-analysis/fixtures/"]}
        with TemporaryDirectory() as directory:
            root = Path(directory)
            for path in ["src/main.ts", "src/main.test.ts", "vendor/third-party.ts", "config/static-analysis/fixtures/rules.ts"]:
                (root / path).parent.mkdir(parents=True, exist_ok=True)
                (root / path).write_text("const safe = 1;")
            tracked = b"src/main.ts\0src/main.test.ts\0vendor/third-party.ts\0config/static-analysis/fixtures/rules.ts\0"
            with patch.object(scanner, "git", return_value=tracked):
                selected, excluded = scanner.targets(root, profile)
            self.assertEqual(selected, ["src/main.test.ts", "src/main.ts"])
            self.assertEqual(len(excluded), 2)

    def test_missing_source_is_not_silently_skipped(self):
        profile = {"extensions": [".ts"], "excludedDirectoryNames": [], "excludedPaths": []}
        with TemporaryDirectory() as directory, patch.object(scanner, "git", return_value=b"missing.ts\0"):
            with self.assertRaises(ValueError):
                scanner.targets(Path(directory), profile)


if __name__ == "__main__":
    unittest.main()
