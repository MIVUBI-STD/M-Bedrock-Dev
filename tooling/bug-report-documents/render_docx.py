#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import shutil
import subprocess
from pathlib import Path
from typing import Any

from docx import Document
from docx.enum.table import WD_CELL_VERTICAL_ALIGNMENT, WD_TABLE_ALIGNMENT
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Inches, Pt, RGBColor

NAVY = "173C56"
BLUE = "35789A"
AMBER = "C68232"
INK = "26343D"
MUTED = "6C7880"
LINE = "D8DEE1"
SOFT = "F4F6F6"
WHITE = "FFFFFF"
GREEN = "336F5D"
FONT = "Aptos"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Render a compact client Bug Report to DOCX and optional PDF."
    )
    parser.add_argument("--input", required=True)
    parser.add_argument("--out", required=True)
    parser.add_argument("--name", required=True)
    parser.add_argument("--pdf", action="store_true")
    return parser.parse_args()


def set_run_font(run, name: str = FONT) -> None:
    run.font.name = name
    r_pr = run._element.get_or_add_rPr()
    r_fonts = r_pr.rFonts
    if r_fonts is None:
        r_fonts = OxmlElement("w:rFonts")
        r_pr.insert(0, r_fonts)
    for key in ("ascii", "hAnsi", "eastAsia"):
        r_fonts.set(qn(f"w:{key}"), name)


def add_run(
    paragraph,
    text: str,
    *,
    bold: bool = False,
    size: float = 9.5,
    color: str = INK,
) -> Any:
    run = paragraph.add_run(text)
    set_run_font(run)
    run.bold = bold
    run.font.size = Pt(size)
    run.font.color.rgb = RGBColor.from_string(color)
    return run


def set_cell_shading(cell, fill: str) -> None:
    tc_pr = cell._tc.get_or_add_tcPr()
    shd = tc_pr.find(qn("w:shd"))
    if shd is None:
        shd = OxmlElement("w:shd")
        tc_pr.append(shd)
    shd.set(qn("w:fill"), fill)


def set_cell_margins(cell, top=70, start=90, bottom=70, end=90) -> None:
    tc_pr = cell._tc.get_or_add_tcPr()
    tc_mar = tc_pr.first_child_found_in("w:tcMar")
    if tc_mar is None:
        tc_mar = OxmlElement("w:tcMar")
        tc_pr.append(tc_mar)
    for tag, value in (("top", top), ("start", start), ("bottom", bottom), ("end", end)):
        node = tc_mar.find(qn(f"w:{tag}"))
        if node is None:
            node = OxmlElement(f"w:{tag}")
            tc_mar.append(node)
        node.set(qn("w:w"), str(value))
        node.set(qn("w:type"), "dxa")


def set_repeat_header(row) -> None:
    tr_pr = row._tr.get_or_add_trPr()
    node = OxmlElement("w:tblHeader")
    node.set(qn("w:val"), "true")
    tr_pr.append(node)


def set_row_no_split(row) -> None:
    tr_pr = row._tr.get_or_add_trPr()
    node = OxmlElement("w:cantSplit")
    tr_pr.append(node)


def set_keep_with_next(paragraph) -> None:
    p_pr = paragraph._p.get_or_add_pPr()
    node = OxmlElement("w:keepNext")
    node.set(qn("w:val"), "1")
    p_pr.append(node)


def configure_document(doc: Document) -> None:
    section = doc.sections[0]
    section.top_margin = Inches(0.55)
    section.bottom_margin = Inches(0.55)
    section.left_margin = Inches(0.62)
    section.right_margin = Inches(0.62)

    normal = doc.styles["Normal"]
    normal.font.name = FONT
    normal.font.size = Pt(9.5)
    normal.font.color.rgb = RGBColor.from_string(INK)
    normal.paragraph_format.space_after = Pt(2)
    normal.paragraph_format.line_spacing = 1.15

    footer = section.footer.paragraphs[0]
    footer.alignment = WD_ALIGN_PARAGRAPH.RIGHT
    add_run(footer, "MIVUBI · Bug Report", size=7.5, color=MUTED)


def add_header(doc: Document, data: dict[str, Any]) -> None:
    p = doc.add_paragraph()
    p.paragraph_format.space_after = Pt(2)
    add_run(p, "MIVUBI", bold=True, size=8.5, color=BLUE)

    p = doc.add_paragraph()
    p.paragraph_format.space_after = Pt(2)
    add_run(p, data["map"]["name"], bold=True, size=20, color=NAVY)

    p = doc.add_paragraph()
    p.paragraph_format.space_after = Pt(8)
    add_run(p, "BUG REPORT", bold=True, size=10, color=AMBER)

    table = doc.add_table(rows=1, cols=4)
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    table.autofit = True
    metrics = [
        ("Map Version", data["map"]["mapVersion"]),
        ("Tested Version", "Minecraft Education " + data["map"]["testedVersion"]),
        ("Open Issues", str(data["summary"]["openIssues"])),
        (
            "Severity",
            f'{data["summary"]["blocker"]} Blocker · '
            f'{data["summary"]["major"]} Major · '
            f'{data["summary"]["minor"]} Minor',
        ),
    ]
    for idx, (label, value) in enumerate(metrics):
        cell = table.rows[0].cells[idx]
        set_cell_margins(cell, 80, 90, 80, 90)
        if idx % 2 == 1:
            set_cell_shading(cell, SOFT)
        p1 = cell.paragraphs[0]
        p1.paragraph_format.space_after = Pt(1)
        add_run(p1, label.upper(), bold=True, size=7.5, color=BLUE)
        p2 = cell.add_paragraph()
        p2.paragraph_format.space_after = Pt(0)
        add_run(p2, value, bold=True, size=8.5, color=NAVY)

    legend = doc.add_paragraph()
    legend.paragraph_format.space_before = Pt(5)
    legend.paragraph_format.space_after = Pt(7)
    add_run(
        legend,
        "Blocker = stops progression  ·  Major = materially affects gameplay  ·  Minor = limited impact",
        size=7.8,
        color=MUTED,
    )


def add_large_report_index(doc: Document, data: dict[str, Any]) -> None:
    if len(data["issues"]) < 7:
        return

    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(2)
    p.paragraph_format.space_after = Pt(4)
    add_run(p, "ISSUE INDEX", bold=True, size=9, color=NAVY)

    table = doc.add_table(rows=1, cols=3)
    table.style = "Table Grid"
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    header = table.rows[0]
    set_repeat_header(header)
    for idx, label in enumerate(("No.", "Severity", "Issue")):
        cell = header.cells[idx]
        set_cell_shading(cell, NAVY)
        set_cell_margins(cell)
        add_run(cell.paragraphs[0], label, bold=True, size=8.5, color=WHITE)

    for item in data["issueIndex"]:
        row = table.add_row()
        set_row_no_split(row)
        values = (
            f'{int(item["number"]):02d}',
            str(item["severity"]).upper(),
            item["title"],
        )
        for idx, value in enumerate(values):
            cell = row.cells[idx]
            set_cell_margins(cell)
            add_run(
                cell.paragraphs[0],
                value,
                bold=(idx == 1),
                size=8.7,
                color=NAVY if idx == 1 else INK,
            )

    spacer = doc.add_paragraph()
    spacer.paragraph_format.space_after = Pt(4)


def add_reproduction_cell(cell, steps: list[str], compact: bool) -> None:
    first = True
    for idx, step in enumerate(steps, start=1):
        p = cell.paragraphs[0] if first else cell.add_paragraph()
        first = False
        p.paragraph_format.space_after = Pt(1 if compact else 2)
        add_run(p, f"{idx}. ", bold=True, size=8.7, color=NAVY)
        add_run(p, step, size=8.9 if compact else 9.2, color=INK)


def keep_table_together(table) -> None:
    paragraphs = []
    for row in table.rows:
        set_row_no_split(row)
        for cell in row.cells:
            paragraphs.extend(cell.paragraphs)
    for paragraph in paragraphs[:-1]:
        set_keep_with_next(paragraph)


def add_bug_table(doc: Document, issue: dict[str, Any], compact: bool) -> None:
    table = doc.add_table(rows=1, cols=2)
    table.style = "Table Grid"
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    table.autofit = False

    header = table.rows[0]
    left = header.cells[0]
    right = header.cells[1]
    left.width = Inches(1.28)
    right.width = Inches(5.8)
    set_cell_shading(left, NAVY)
    set_cell_shading(right, NAVY)
    set_cell_margins(left, 85, 95, 85, 95)
    set_cell_margins(right, 85, 100, 85, 100)

    status_color = GREEN if issue["status"] == "fixed" else WHITE
    add_run(
        left.paragraphs[0],
        f'{int(issue["number"]):02d} · {str(issue["severity"]).upper()}',
        bold=True,
        size=8.8,
        color=status_color,
    )
    add_run(
        right.paragraphs[0],
        issue["title"],
        bold=True,
        size=9.7 if compact else 10.2,
        color=WHITE,
    )

    rows: list[tuple[str, str | None]] = [
        ("Issue", issue["issue"]),
        ("How to Reproduce", None),
        ("Observed", issue["observed"]),
        ("Expected", issue["expected"]),
    ]
    if issue.get("recommendedResolution"):
        rows.append(("Resolution", issue["recommendedResolution"]))

    for label, value in rows:
        row = table.add_row()
        set_row_no_split(row)
        label_cell = row.cells[0]
        value_cell = row.cells[1]
        label_cell.width = Inches(1.28)
        value_cell.width = Inches(5.8)
        set_cell_shading(label_cell, SOFT)
        set_cell_margins(label_cell, 65, 85, 65, 85)
        set_cell_margins(value_cell, 65, 95, 65, 95)
        label_cell.vertical_alignment = WD_CELL_VERTICAL_ALIGNMENT.TOP
        value_cell.vertical_alignment = WD_CELL_VERTICAL_ALIGNMENT.TOP

        add_run(
            label_cell.paragraphs[0],
            label,
            bold=True,
            size=8.2,
            color=BLUE,
        )

        if label == "How to Reproduce":
            add_reproduction_cell(
                value_cell,
                list(issue["reproduction"]),
                compact,
            )
        else:
            add_run(
                value_cell.paragraphs[0],
                str(value),
                size=8.9 if compact else 9.2,
                color=INK,
            )

    keep_table_together(table)

    spacer = doc.add_paragraph()
    spacer.paragraph_format.space_after = Pt(3 if compact else 6)


def render_docx(data: dict[str, Any], output: Path) -> None:
    doc = Document()
    configure_document(doc)
    add_header(doc, data)
    add_large_report_index(doc, data)

    if not data["issues"]:
        p = doc.add_paragraph()
        add_run(p, "No open issues are recorded for this report.", size=10, color=MUTED)
    else:
        compact = len(data["issues"]) >= 4
        for issue in data["issues"]:
            add_bug_table(doc, issue, compact)

    output.parent.mkdir(parents=True, exist_ok=True)
    doc.save(output)


def export_pdf(docx_path: Path, out_dir: Path) -> Path:
    executable = shutil.which("libreoffice") or shutil.which("soffice")
    if executable is None:
        raise RuntimeError(
            "LibreOffice is required for PDF export. Install LibreOffice or run DOCX only."
        )

    out_dir.mkdir(parents=True, exist_ok=True)
    result = subprocess.run(
        [
            executable,
            "--headless",
            "--convert-to",
            "pdf",
            "--outdir",
            str(out_dir),
            str(docx_path),
        ],
        capture_output=True,
        text=True,
        check=False,
    )
    if result.returncode != 0:
        raise RuntimeError(
            "LibreOffice PDF export failed: "
            + (result.stderr.strip() or result.stdout.strip())
        )

    pdf_path = out_dir / (docx_path.stem + ".pdf")
    if not pdf_path.exists() or pdf_path.stat().st_size == 0:
        raise RuntimeError("LibreOffice did not produce a valid PDF.")
    return pdf_path


def main() -> None:
    args = parse_args()
    data = json.loads(Path(args.input).read_text(encoding="utf-8"))
    out_dir = Path(args.out)
    docx_path = out_dir / f"{args.name}.docx"

    render_docx(data, docx_path)
    print(f"DOCX: {docx_path}")

    if args.pdf:
        pdf_path = export_pdf(docx_path, out_dir)
        print(f"PDF: {pdf_path}")


if __name__ == "__main__":
    main()
