import sys, pathlib, subprocess, tempfile, json
sys.path.insert(0, str(pathlib.Path(__file__).parent.parent))

from audit_schema import normalize_output

FIXTURE_DIR = pathlib.Path(__file__).parent / "fixtures" / "schema_audit"
REPO_ROOT = pathlib.Path(__file__).resolve().parent.parent.parent.parent


def test_fast_tier_against_fixture_produces_expected_findings():
    """End-to-end: run audit against the fixture seed; assert key findings appear."""
    with tempfile.TemporaryDirectory() as tmp:
        result = subprocess.run([
            "seed/_build/.venv/bin/python3", "seed/_build/audit_schema.py",
            "--tier", "fast",
            "--seed-dir", str(FIXTURE_DIR),
            "--out-dir", tmp,
        ], capture_output=True, text=True, cwd=str(REPO_ROOT))
        assert result.returncode == 0, f"audit exited {result.returncode}: {result.stderr}"

        md_files = list(pathlib.Path(tmp).glob("SCHEMA_AUDIT_*.md"))
        assert len(md_files) == 1
        report = md_files[0].read_text()

        # Sanity checks per section
        assert "## Section A:" in report and "disagreements" in report
        assert "EXHIBITED_AT" in report
        assert "## Section C:" in report and "Producer findings" in report
        assert "id_collision" in report
        assert "self_loop" in report
        assert "## Section E:" in report and "Invitations honored" in report
        assert "invitation_violated" in report  # RESPONDS_TO fixture edge


def test_double_run_is_byte_identical_after_normalisation():
    with tempfile.TemporaryDirectory() as tmp1, tempfile.TemporaryDirectory() as tmp2:
        for out in (tmp1, tmp2):
            subprocess.run([
                "seed/_build/.venv/bin/python3", "seed/_build/audit_schema.py",
                "--tier", "fast",
                "--seed-dir", str(FIXTURE_DIR),
                "--out-dir", out,
            ], capture_output=True, text=True, cwd=str(REPO_ROOT)).check_returncode()

        r1 = next(pathlib.Path(tmp1).glob("SCHEMA_AUDIT_*.md")).read_text()
        r2 = next(pathlib.Path(tmp2).glob("SCHEMA_AUDIT_*.md")).read_text()
        assert normalize_output(r1) == normalize_output(r2)
