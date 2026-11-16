# Source static analysis

This is the standard private-game source-analysis profile.
It supplements the Kart controls: Trivy filesystem/image vulnerability scans,
TypeScript checks, Go vet, tests, Unicode/workflow/dependency controls and
protected PR/CODEOWNER review. None of those controls is removed.

## Engine, rules and private source

`config/static-analysis/profile.json` pins Semgrep CE 1.185.0 and the multi-platform
OCI image digest. The engine is [LGPL 2.1](https://github.com/semgrep/semgrep/blob/v1.185.0/LICENSE).
The baseline rules in `config/static-analysis/rules.yml` are original MIT-licensed
natadeCOCO rules. Registry rules, Pro rules and hosted services are not used.
See the [upstream license distinctions](https://semgrep.dev/docs/licensing).

The default command pulls the exact engine before mounting source, then runs it
without network access, with read-only source, no capabilities, no token, metrics
off and version checks off. JSON/SARIF remain in the repository's CI artifacts.
No Semgrep account or Code Security activation is required for this profile.

```sh
python3 -B scripts/test_source_static_analysis.py
python3 -B scripts/source-static-analysis.py --test-rules
python3 -B scripts/source-static-analysis.py
```

Docker is required. For development, an independently installed exact-version
Semgrep can use `--local`; that mode is recorded and does not provide the
container's network isolation. Rule fixtures contain inert vulnerable examples;
they are parsed by the analyzer, never executed.

## Declared coverage

JS/TS taint sources are request query/body/params and URL search/hash. Go
sources are HTTP form/query/path values. Flows are local to a function.

All Git-tracked JavaScript/TypeScript (including JSX/TSX, MJS/CJS) and Go source,
including application tests and scripts, is selected. The profile explicitly
excludes generated `dist`, dependency `node_modules`/`vendor`, and the rule-test
fixtures. Other languages, HTML inline scripts, generated bundles and vendored
SDK implementation are outside this source profile. Vendored code retains its
owning repository's checks and existing checksum/dependency controls.

| Rules | Checks |
| --- | --- |
| JS/TS dynamic code | Direct `eval` and `Function` construction |
| JS/TS TLS | Explicit `rejectUnauthorized: false` |
| JS/TS request/URL taint | Input to HTML, shell calls and fetch destinations |
| Go TLS | Explicit `tls.Config.InsecureSkipVerify: true` |
| Go HTTP taint | Input to sh/bash, SQL text and `template.HTML` |

This is a bounded baseline, **not CodeQL-equivalent analysis**. It does not claim
general vulnerability detection or protection against all GlassWorm variants.
It does not provide cross-function/cross-file taint analysis, complete alias or
framework modeling, unknown source/sink discovery, arbitrary obfuscation or
malicious IDE-extension detection. Sanitizers and custom wrappers are not modeled;
false positives and false negatives remain possible. The
[CE dataflow trade-offs](https://semgrep.dev/docs/writing-rules/data-flow/data-flow-overview)
apply. Review covers these gaps; adding a language/framework requires reviewed
rules and positive/negative fixtures before claiming coverage.

## Gate and evidence

CI runs the positive/negative fixtures and full source scan within the existing
`source-security` job before validation/build/release dependencies proceed.
Findings, scanner errors, timeouts, engine drift, missing output, or a mismatch
between selected and scanned files fail closed. Inline `nosemgrep` suppression
is disabled. No baseline of existing findings is silently accepted.

`source-static-analysis/` contains JSON, SARIF, logs and `result.json`. The latter
binds the Git revision, dirty status, engine image/version, profile/rule/document
SHA-256, each selected file's SHA-256, explicit excluded files and pass/fail result.
Artifacts are retained for 30 days even after failure; preserve release evidence
with the immutable release handoff before retention expires. A dirty/local scan
does not establish acceptance of a clean release commit.

Changes to engine digest, rules, scope, exclusions or failure handling require
the same maintainer review as the supply-chain controls. Keep the complete
profile, wrapper and fixtures together when importing from one reviewed GDK SHA.

CodeQL may be added as an extra check only after the repository's private-code
analysis permission is confirmed. Upload settings do not establish permission
or billing status. That optional check must not replace this common baseline.
