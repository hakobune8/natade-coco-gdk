#!/usr/bin/env python3
"""Run the reviewed local Semgrep CE profile, failing closed with SHA-bound evidence."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import re
import subprocess
import sys
import tempfile


def sha256(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def git(root, *args):
    return subprocess.check_output(["git", "-C", str(root), *args])


def targets(root, profile):
    selected, excluded = [], []
    for raw in git(root, "ls-files", "-z").split(b"\0"):
        if not raw:
            continue
        name = raw.decode("utf-8", errors="strict")
        path = Path(name)
        if path.suffix not in profile["extensions"]:
            continue
        if any(part in profile["excludedDirectoryNames"] for part in path.parts[:-1]) or any(
            name.startswith(prefix) for prefix in profile["excludedPaths"]
        ):
            excluded.append(name)
        else:
            if not (root / path).is_file() or (root / path).is_symlink():
                raise ValueError(f"missing or symlinked source target: {name}")
            selected.append(name)
    if not selected:
        raise ValueError("no tracked source files selected")
    return sorted(selected), sorted(excluded)


def report_failure(report, selected, expected_version):
    if not isinstance(report, dict) or not all(key in report for key in ("version", "errors", "results", "paths")):
        return "incomplete Semgrep report"
    if not isinstance(report["errors"], list) or not isinstance(report["results"], list):
        return "invalid Semgrep result lists"
    if not isinstance(report["paths"], dict) or not isinstance(report["paths"].get("scanned"), list):
        return "invalid Semgrep coverage report"
    if report.get("version") != expected_version:
        return "unexpected Semgrep engine version"
    if report.get("errors"):
        return "Semgrep reported analysis errors"
    if report.get("results"):
        return "security findings require resolution"
    scanned = {str(Path(p)) for p in report.get("paths", {}).get("scanned", [])}
    if scanned != set(selected):
        return "scan coverage does not match the selected source files"
    return None


def fixture_failure(root, selected, report):
    expected, negatives = set(), set()
    for name in selected:
        for line, text in enumerate((root / name).read_text().splitlines(), 1):
            match = re.search(r"// (ruleid|ok): (natadecoco\.[a-z-]+)$", text)
            if match:
                target = expected if match[1] == "ruleid" else negatives
                target.add((name, line + 1, match[2]))
    rules = set(re.findall(r"^  - id: (.+)$", (root / "config/static-analysis/rules.yml").read_text(), re.M))
    if {entry[2] for entry in expected} != rules or {entry[2] for entry in negatives} != rules:
        return "each rule needs a positive and negative fixture"
    actual = {(item["path"], item["start"]["line"], item["check_id"]) for item in report.get("results", [])}
    if actual != expected:
        return f"rule fixture mismatch; missing={sorted(expected - actual)}, unexpected={sorted(actual - expected)}"
    return None


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--local", action="store_true", help="use an installed, exact-version Semgrep instead of Docker")
    parser.add_argument("--test-rules", action="store_true", help="run positive/negative rule fixtures")
    options = parser.parse_args()
    root = Path(__file__).resolve().parent.parent
    profile_path = root / "config/static-analysis/profile.json"
    profile = json.loads(profile_path.read_text())
    if profile.get("schemaVersion") != 1:
        raise ValueError("unsupported static-analysis profile schema")
    if not re.fullmatch(r"semgrep/semgrep:[0-9.]+@sha256:[a-f0-9]{64}", profile["image"]):
        raise ValueError("Semgrep image must be digest-pinned")
    rules = root / profile["rules"]
    contract_path = root / "config/supply-chain-security-contract.json"
    if contract_path.exists():
        contract = json.loads(contract_path.read_text())
        if contract.get("contractVersion") == "2.0.0":
            expected = {"profileSha256": sha256(profile_path), "rulesSha256": sha256(rules),
                        "coverageDocumentSha256": sha256(root / profile["coverageDocument"])}
            if contract.get("sourceStaticAnalysis") != expected:
                raise ValueError("source-analysis files differ from the attested security contract")
    selected, excluded = targets(root, profile)
    if options.test_rules:
        selected = profile["excludedPaths"]
    output = root / "source-static-analysis" / ("rule-tests" if options.test_rules else "scan")
    output.mkdir(parents=True, exist_ok=True)
    # Do not reuse a previous successful report after a failed command.
    for name in ("semgrep.json", "semgrep.sarif", "result.json", "stdout.log", "stderr.log"):
        (output / name).unlink(missing_ok=True)
    evidence = {
        "schemaVersion": 1,
        "profileVersion": profile["profileVersion"],
        "sourceRevision": git(root, "rev-parse", "HEAD").decode().strip(),
        "dirty": bool(git(root, "status", "--porcelain", "--untracked-files=no").strip()),
        "image": profile["image"],
        "profileSha256": sha256(profile_path),
        "rulesSha256": sha256(rules),
        "coverageDocumentSha256": sha256(root / profile["coverageDocument"]),
        "targets": [{"path": name, "sha256": sha256(root / name)} for name in selected],
        "excluded": excluded,
        "mode": "rule-tests" if options.test_rules else "scan",
        "runtime": "local" if options.local else "network-isolated-container",
        "passed": False,
    }
    try:
        # ARC/DinD shares the workspace with Docker, but not the runner's /tmp.
        with tempfile.TemporaryDirectory(prefix=".semgrep-", dir=output) as temporary:
            temporary_path = Path(temporary)
            env = {key: value for key, value in os.environ.items() if not key.startswith("SEMGREP_")}
            env.update(SEMGREP_SEND_METRICS="off", SEMGREP_ENABLE_VERSION_CHECK="0")
            if options.local:
                command = ["semgrep"]
                report_dir = temporary_path
            else:
                # Pull only the digest-bound engine, before mounting private source.
                subprocess.run(["docker", "pull", profile["image"]], check=True)
                command = [
                    "docker", "run", "--rm", "--network", "none", "--read-only",
                    "--cap-drop", "ALL", "--security-opt", "no-new-privileges",
                    "--user", f"{os.getuid()}:{os.getgid()}",
                    "--tmpfs", "/tmp:rw,nosuid,nodev,size=512m,mode=1777",
                    "--env", "HOME=/tmp", "--env", "SEMGREP_SEND_METRICS=off",
                    "--env", "SEMGREP_ENABLE_VERSION_CHECK=0",
                    "--mount", f"type=bind,src={root},dst=/src,readonly",
                    "--mount", f"type=bind,src={temporary_path},dst=/out",
                    "--workdir", "/src", "--entrypoint", "semgrep", profile["image"],
                ]
                report_dir = Path("/out")
            command += ["scan", "--oss-only", "--config", profile["rules"],
                        "--metrics", "off", "--disable-version-check", "--disable-nosem",
                        "--no-git-ignore", "--no-rewrite-rule-ids", "--strict", "--error",
                        "--jobs", "2", "--timeout", "30", "--max-target-bytes", "0"]
            command += ["--json-output", str(report_dir / "semgrep.json"),
                        "--sarif-output", str(report_dir / "semgrep.sarif"), *selected]
            result = subprocess.run(command, cwd=root, env=env, capture_output=True, text=True, timeout=600)
            (output / "stdout.log").write_text(result.stdout)
            (output / "stderr.log").write_text(result.stderr)
            evidence["exitCode"] = result.returncode
            evidence["passed"] = result.returncode == 0
            if result.returncode not in (0, 1):
                raise ValueError(f"Semgrep command failed ({result.returncode}): {result.stderr.strip()}")
            for name in ("semgrep.json", "semgrep.sarif"):
                (output / name).write_bytes((temporary_path / name).read_bytes())
            report = json.loads((output / "semgrep.json").read_text())
            evidence["engineVersion"] = report.get("version")
            evidence["findingCount"] = len(report.get("results", []))
            failure = report_failure({**report, "results": []} if options.test_rules else report,
                                     selected, profile["engineVersion"])
            if options.test_rules:
                evidence["passed"] = result.returncode == 1
                failure = failure or fixture_failure(root, selected, report)
            if failure:
                evidence.update(passed=False, failure=failure)
            if not evidence["passed"]:
                print(result.stdout, end="", file=sys.stderr)
                print(result.stderr, end="", file=sys.stderr)
    except (OSError, ValueError, subprocess.SubprocessError) as error:
        evidence.update(passed=False, failure=str(error))
    finally:
        (output / "result.json").write_text(json.dumps(evidence, indent=2) + "\n")
    print(f"Source static analysis: {'PASS' if evidence['passed'] else 'FAIL'}; evidence: {output}")
    if not evidence["passed"]:
        print(evidence.get("failure", "scanner or rule tests failed"), file=sys.stderr)
    return 0 if evidence["passed"] else 1


if __name__ == "__main__":
    sys.exit(main())
