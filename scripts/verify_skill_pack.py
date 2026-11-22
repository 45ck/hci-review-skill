#!/usr/bin/env python3
"""Verify portable skill contents and install/remove behavior without touching HOME."""

from pathlib import Path
import os
import re
import shutil
import subprocess
import tempfile


ROOT = Path(__file__).resolve().parents[1]
PLATFORMS = (".claude", ".agents")


def require(condition, message):
    if not condition:
        raise SystemExit(message)


def check_local_links(path):
    """Check file targets only; external source availability is not a CI dependency."""
    content = path.read_text(encoding="utf-8")
    for target in re.findall(r"\[[^\]]*\]\(([^\s)]+)(?:\s+[^)]*)?\)", content):
        if target.startswith("#") or re.match(r"[a-zA-Z][a-zA-Z0-9+.-]*:", target):
            continue
        target = target.split("#", 1)[0]
        require((path.parent / target).exists(), f"Missing local link in {path}: {target}")


def check_package():
    skills = [
        line
        for line in (ROOT / "skills.txt").read_text(encoding="utf-8").splitlines()
        if line and not line.startswith("#")
    ]
    require(skills and len(skills) == len(set(skills)), "Inventory is empty or contains duplicates")
    require(
        all(re.fullmatch(r"[a-z0-9]+(?:-[a-z0-9]+)*", name) for name in skills),
        "Inventory contains an invalid skill name",
    )

    for platform in PLATFORMS:
        root = ROOT / platform / "skills"
        packaged = {path.parent.name for path in root.glob("*/SKILL.md")}
        require(
            packaged == set(skills),
            f"{platform} inventory mismatch: missing={sorted(set(skills) - packaged)}, "
            f"unlisted={sorted(packaged - set(skills))}",
        )
        for skill in skills:
            path = root / skill / "SKILL.md"
            content = path.read_text(encoding="utf-8")
            frontmatter = re.match(r"\A---\n(.*?)\n---\n", content, re.S)
            require(frontmatter is not None, f"Missing frontmatter: {path}")
            name = re.search(r"(?m)^name:[ \t]*(.+)$", frontmatter.group(1))
            summary = re.search(r"(?m)^(?:description|purpose):[ \t]*(\S.*)$", frontmatter.group(1))
            require(
                name is not None and name.group(1).strip().strip("\"'") == skill,
                f"Skill name does not match its directory: {path}",
            )
            require(
                summary is not None and summary.group(1).strip().strip("\"'"),
                f"Missing skill description or purpose: {path}",
            )
            check_local_links(path)

    # Beads variants intentionally differ by platform. Core methods stay mirrored.
    for skill in skills:
        if not skill.endswith("-beads"):
            require(
                (ROOT / ".claude/skills" / skill / "SKILL.md").read_bytes()
                == (ROOT / ".agents/skills" / skill / "SKILL.md").read_bytes(),
                f"Core skill differs between platforms: {skill}",
            )

    templates = sorted((ROOT / "docs/hci/templates").glob("*.md"))
    require(templates, "No supporting HCI templates are packaged")
    for path in templates:
        require(path.read_text(encoding="utf-8").strip(), f"Empty supporting template: {path}")
        check_local_links(path)

    descriptors = sorted((ROOT / ".agents/skills").glob("*/agents/openai.yaml"))
    for path in descriptors:
        content = path.read_text(encoding="utf-8")
        require(content.strip(), f"Empty Codex descriptor: {path}")
        for field in ("display_name", "short_description", "default_prompt"):
            value = re.search(rf"(?m)^  {field}:[ \t]*(\S.*)$", content)
            require(
                value is not None and value.group(1).strip().strip("\"'"),
                f"Missing Codex descriptor field {field}: {path}",
            )

    for name in ("LICENSE", "README.md", "logo.svg", "banner.svg", "assets/social-preview.png"):
        require((ROOT / name).read_bytes(), f"Empty required package asset: {name}")

    for path in [ROOT / "README.md", *(ROOT / "docs/hci").rglob("*.md")]:
        check_local_links(path)

    print(
        f"Verified {len(skills)} skills on each platform, "
        f"{len(templates)} templates and {len(descriptors)} Codex descriptors"
    )
    return skills


def run_script(script, target, cwd, expect_success=True):
    environment = os.environ.copy()
    environment["HCI_SKILLS_HOME"] = str(target)
    result = subprocess.run(
        ["bash", str(script)], cwd=cwd, env=environment,
        capture_output=True, text=True, check=False,
    )
    require(
        (result.returncode == 0) == expect_success,
        f"Unexpected result from {script.name}: {result.returncode}\n{result.stdout}\n{result.stderr}",
    )


def check_installation(skills):
    with tempfile.TemporaryDirectory(prefix="hci-skill-pack-") as temporary:
        workspace = Path(temporary)
        target = workspace / "isolated skills home"
        sentinels = []
        for platform in PLATFORMS:
            sentinel = target / platform / "skills/unrelated-skill/SKILL.md"
            sentinel.parent.mkdir(parents=True)
            sentinel.write_text("Preserve this unrelated skill.\n", encoding="utf-8")
            sentinels.append(sentinel)

        # Repeating installation must retain exact platform contents and descriptors.
        for _ in range(2):
            run_script(ROOT / "install.sh", target, workspace)
            for platform in PLATFORMS:
                for skill in skills:
                    source = ROOT / platform / "skills" / skill
                    for source_file in source.rglob("*"):
                        if source_file.is_file():
                            installed = target / platform / "skills" / skill / source_file.relative_to(source)
                            require(
                                installed.is_file() and installed.read_bytes() == source_file.read_bytes(),
                                f"Installed file differs or is missing: {installed}",
                            )

        # Removal is repeatable and touches only inventory members.
        for _ in range(2):
            run_script(ROOT / "uninstall.sh", target, workspace)
            for platform in PLATFORMS:
                for skill in skills:
                    require(
                        not (target / platform / "skills" / skill).exists(),
                        f"Uninstall left {platform}/skills/{skill}",
                    )
            for sentinel in sentinels:
                require(
                    sentinel.read_text(encoding="utf-8") == "Preserve this unrelated skill.\n",
                    "Uninstall changed an unrelated skill",
                )

        # An incomplete bundle must fail before leaving a partial installation.
        fixture = workspace / "incomplete pack"
        (fixture / "scripts").mkdir(parents=True)
        for name in ("install.sh", "uninstall.sh", "scripts/skill_inventory.sh"):
            shutil.copyfile(ROOT / name, fixture / name)
        (fixture / "skills.txt").write_text("sample-review\n", encoding="utf-8")
        source = fixture / ".claude/skills/sample-review"
        source.mkdir(parents=True)
        (source / "SKILL.md").write_text("Fixture skill.\n", encoding="utf-8")
        run_script(fixture / "install.sh", target, workspace, expect_success=False)
        require(
            not (target / ".claude/skills/sample-review").exists(),
            "Incomplete bundle left a partial installation",
        )

        # Reject path traversal and duplicate inventory before removal starts.
        for inventory in ("../unrelated-skill\n", "unrelated-skill\nunrelated-skill\n"):
            (fixture / "skills.txt").write_text(inventory, encoding="utf-8")
            run_script(fixture / "uninstall.sh", target, workspace, expect_success=False)
            require(all(path.exists() for path in sentinels), "Invalid inventory removed another skill")

    print("Passed isolated install/remove roundtrip, repeat runs, preservation, and invalid-bundle checks")


if __name__ == "__main__":
    check_installation(check_package())
