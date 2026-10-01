#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import shutil
import subprocess
from pathlib import Path
from typing import Any

from docx import Document
from docx.enum.section import WD_SECTION
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
        description="Render a client Bug Report document to DOCX and optional PDF."
    )
    parser.add_argument("--input", required=True, help="Client document JSON.")
    parser.add_argument("--out", required=True, help="Output directory.")
    parser.add_argument("--name", required=True, help="Output file stem.")
    parser.add_argument(
        "--pdf",
        action="store_true",
        help="Also export PDF from the generated DOCX using LibreOffice.",
    )
    return parser.parse_args()


def set_cell_shading(cell, fill: str) -> None:
    tc_pr = cell._tc.get_or_add_tcPr()
    shd = tc_pr.find(qn("w:shd"))
    if shd is None:
        shd = OxmlElement("w:shd")
        tc_pr.append(shd)
    shd.set(qn("w:fill"), fill)


def set_cell_margins(cell, top=90, start=100, bottom=90, end=100) -> None:
    tc = cell._tc
    tc_pr = tc.get_or_add_tcPr()
    tc_mar = tc_pr.first_child_found_in("w:tcMar")
    if tc_mar is None:
        tc_mar = OxmlElement("w:tcMar")
        tc_pr.append(tc_mar)

    for tag, value in (
        ("top", top),
        ("start", start),
        ("bottom", bottom),
        ("end", end),
    ):
        node = tc_mar.find(qn(f"w:{tag}"))
        if node is None:
            node = OxmlElement(f"w:{tag}")
            tc_mar.append(node)
        node.set(qn("w:w"), str(value))
        node.set(qn("w:type"), "dxa")


def set_repeat_table_header(row) -> None:
    tr_pr = row._tr.get_or_add_trPr()
    tbl_header = OxmlElement("w:tblHeader")
    tbl_header.set(qn("w:val"), "true")
    tr_pr.append(tbl_header)


def set_keep_with_next(paragraph, value: bool = True) -> None:
    p_pr = paragraph._p.get_or_add_pPr()
    keep = p_pr.find(qn("w:keepNext"))
    if keep is None:
        keep = OxmlElement("w:keepNext")
        p_pr.append(keep)
    keep.set(qn("w:val"), "1" if value else "0")


def set_keep_lines(paragraph, value: bool = True) -> None:
    p_pr = paragraph._p.get_or_add_pPr()
    keep = p_pr.find(qn("w:keepLines"))
    if keep is None:
        keep = OxmlElement("w:keepLines")
        p_pr.append(keep)
    keep.set(qn("w:val"), "1" if value else "0")


def set_page_break_before(paragraph, value: bool = True) -> None:
    p_pr = paragraph._p.get_or_add_pPr()
    node = p_pr.find(qn("w:pageBreakBefore"))
    if node is None:
        node = OxmlElement("w:pageBreakBefore")
        p_pr.append(node)
    node.set(qn("w:val"), "1" if value else "0")


def set_run_font(run, name: str = FONT) -> None:
    run.font.name = name
    r_pr = run._element.get_or_add_rPr()
    r_fonts = r_pr.rFonts
    if r_fonts is None:
        r_fonts = OxmlElement("w:rFonts")
        r_pr.insert(0, r_fonts)
    r_fonts.set(qn("w:ascii"), name)
    r_fonts.set(qn("w:hAnsi"), name)
    r_fonts.set(qn("w:eastAsia"), name)


def add_run(
    paragraph,
    text: str,
    *,
    bold: bool = False,
    size: float | None = None,
    color: str | None = None,
) -> Any:
    run = paragraph.add_run(text)
    set_run_font(run)
    run.bold = bold
    if size is not None:
        run.font.size = Pt(size)
    if color is not None:
        run.font.color.rgb = RGBColor.from_string(color)
    return run


def set_style_font(style, size: float, bold: bool = False, color: str = INK) -> None:
    style.font.name = FONT
    style.font.size = Pt(size)
    style.font.bold = bold
    style.font.color.rgb = RGBColor.from_string(color)
    r_pr = style.element.get_or_add_rPr()
    r_fonts = r_pr.rFonts
    if r_fonts is None:
        r_fonts = OxmlElement("w:rFonts")
        r_pr.insert(0, r_fonts)
    r_fonts.set(qn("w:ascii"), FONT)
    r_fonts.set(qn("w:hAnsi"), FONT)
    r_fonts.set(qn("w:eastAsia"), FONT)


def configure_styles(doc: Document) -> None:
    styles = doc.styles

    normal = styles["Normal"]
    set_style_font(normal, 10.5, False, INK)
    normal.paragraph_format.space_after = Pt(5)
    normal.paragraph_format.line_spacing = 1.35

    title = styles["Title"]
    set_style_font(title, 28, True, NAVY)
    title.paragraph_format.space_after = Pt(6)

    h1 = styles["Heading 1"]
    set_style_font(h1, 18, True, NAVY)
    h1.paragraph_format.space_before = Pt(16)
    h1.paragraph_format.space_after = Pt(8)

    h2 = styles["Heading 2"]
    set_style_font(h2, 14, True, NAVY)
    h2.paragraph_format.space_before = Pt(12)
    h2.paragraph_format.space_after = Pt(6)


def configure_page(doc: Document) -> None:
    section = doc.sections[0]
    section.top_margin = Inches(0.67)
    section.bottom_margin = Inches(0.67)
    section.left_margin = Inches(0.75)
    section.right_margin = Inches(0.75)

    footer = section.footer
    paragraph = footer.paragraphs[0]
    paragraph.alignment = WD_ALIGN_PARAGRAPH.RIGHT
    add_run(
        paragraph,
        "MIVUBI · Bug Report",
        size=8,
        color=MUTED,
    )


def add_subtitle(doc: Document, text: str) -> None:
    p = doc.add_paragraph()
    p.paragraph_format.space_after = Pt(14)
    add_run(p, text, bold=True, size=13, color=BLUE)


def add_metric_strip(doc: Document, document: dict[str, Any]) -> None:
    table = doc.add_table(rows=1, cols=4)
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    table.autofit = True
    row = table.rows[0]

    metrics = [
        ("MAP VERSION", document["map"]["mapVersion"]),
        ("TESTED VERSION", "Minecraft Education " + document["map"]["testedVersion"]),
        ("VISIBLE ISSUES", str(document["summary"]["visibleIssues"])),
        (
            "SEVERITY",
            f'{document["summary"]["blocker"]} Blocker · '
            f'{document["summary"]["major"]} Major · '
            f'{document["summary"]["minor"]} Minor',
        ),
    ]

    for index, (label, value) in enumerate(metrics):
        cell = row.cells[index]
        cell.vertical_alignment = WD_CELL_VERTICAL_ALIGNMENT.CENTER
        set_cell_margins(cell, 110, 110, 110, 110)
        if index % 2 == 1:
            set_cell_shading(cell, SOFT)
        p = cell.paragraphs[0]
        p.paragraph_format.space_after = Pt(2)
        add_run(p, label, bold=True, size=8, color=BLUE)
        p2 = cell.add_paragraph()
        p2.paragraph_format.space_after = Pt(0)
        add_run(p2, value, bold=True, size=9.5, color=NAVY)


def add_issue_summary(doc: Document, document: dict[str, Any]) -> None:
    if len(document["issues"]) < 2:
        return

    heading = doc.add_paragraph("Issue Summary", style="Heading 1")
    set_keep_with_next(heading)

    include_status = document["source"]["issueScope"] == "all"
    cols = 4 if include_status else 3
    table = doc.add_table(rows=1, cols=cols)
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    table.style = "Table Grid"
    header = table.rows[0]
    set_repeat_table_header(header)

    labels = ["No.", "Severity", "Issue"] + (["Status"] if include_status else [])
    for index, label in enumerate(labels):
        cell = header.cells[index]
        set_cell_shading(cell, NAVY)
        set_cell_margins(cell)
        cell.vertical_alignment = WD_CELL_VERTICAL_ALIGNMENT.CENTER
        p = cell.paragraphs[0]
        add_run(p, label, bold=True, size=9, color=WHITE)

    for item in document["issueIndex"]:
        cells = table.add_row().cells
        values = [
            f'{int(item["number"]):02d}',
            str(item["severity"]).upper(),
            item["title"],
        ]
        if include_status:
            values.append("Fixed" if item["status"] == "fixed" else "Open")
        for index, value in enumerate(values):
            cell = cells[index]
            set_cell_margins(cell)
            p = cell.paragraphs[0]
            color = INK
            bold = False
            if index == 1:
                bold = True
                color = NAVY
            add_run(p, value, bold=bold, size=9.5, color=color)


def add_severity_guide(doc: Document, document: dict[str, Any]) -> None:
    if not document["issues"]:
        return

    heading = doc.add_paragraph("Severity Guide", style="Heading 1")
    set_keep_with_next(heading)

    table = doc.add_table(rows=1, cols=3)
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    table.style = "Table Grid"

    for index, item in enumerate(document["severityLegend"]):
        cell = table.rows[0].cells[index]
        set_cell_margins(cell, 100, 110, 100, 110)
        set_cell_shading(cell, SOFT)
        p = cell.paragraphs[0]
        add_run(
            p,
            str(item["label"]).upper(),
            bold=True,
            size=9,
            color=BLUE,
        )
        p2 = cell.add_paragraph()
        p2.paragraph_format.space_after = Pt(0)
        add_run(
            p2,
            item["meaning"],
            size=9,
            color=INK,
        )


def add_label(doc: Document, text: str) -> None:
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(7)
    p.paragraph_format.space_after = Pt(2)
    set_keep_with_next(p)
    add_run(p, text, bold=True, size=9.5, color=BLUE)


def add_body(doc: Document, text: str, *, keep: bool = False) -> None:
    p = doc.add_paragraph()
    p.paragraph_format.space_after = Pt(5)
    if keep:
        set_keep_lines(p)
    add_run(p, text, size=10.5, color=INK)


def add_reproduction(doc: Document, steps: list[str]) -> None:
    for step in steps:
        p = doc.add_paragraph(style="List Number")
        p.paragraph_format.left_indent = Inches(0.22)
        p.paragraph_format.first_line_indent = Inches(-0.12)
        p.paragraph_format.space_after = Pt(3)
        add_run(p, step, size=10.5, color=INK)


def add_issue_details(doc: Document, document: dict[str, Any]) -> None:
    heading = doc.add_paragraph("Issue Details", style="Heading 1")
    set_keep_with_next(heading)

    if len(document["issues"]) >= 4:
        set_page_break_before(heading)

    if not document["issues"]:
        add_body(doc, "No open issues are recorded for this report.")
        return

    compact = len(document["issues"]) >= 8

    for index, issue in enumerate(document["issues"]):
        if index > 0 and not compact:
            spacer = doc.add_paragraph()
            spacer.paragraph_format.space_after = Pt(2)

        meta = doc.add_paragraph()
        meta.paragraph_format.space_before = Pt(8 if compact else 12)
        meta.paragraph_format.space_after = Pt(2)
        set_keep_with_next(meta)
        color = GREEN if issue["status"] == "fixed" else AMBER
        add_run(
            meta,
            f'{int(issue["number"]):02d} · {str(issue["severity"]).upper()}',
            bold=True,
            size=9,
            color=color,
        )

        title = doc.add_paragraph(issue["title"], style="Heading 2")
        set_keep_with_next(title)

        add_label(doc, "Issue")
        add_body(doc, issue["issue"], keep=True)

        add_label(doc, "How to Reproduce")
        add_reproduction(doc, issue["reproduction"])

        add_label(doc, "Observed")
        add_body(doc, issue["observed"], keep=True)

        add_label(doc, "Expected")
        add_body(doc, issue["expected"], keep=True)

        resolution = issue.get("recommendedResolution")
        if resolution:
            add_label(doc, "Recommended Resolution")
            p = doc.add_paragraph()
            p.paragraph_format.space_after = Pt(7)
            set_keep_lines(p)
            p_pr = p._p.get_or_add_pPr()
            borders = OxmlElement("w:pBdr")
            left = OxmlElement("w:left")
            left.set(qn("w:val"), "single")
            left.set(qn("w:sz"), "18")
            left.set(qn("w:space"), "6")
            left.set(qn("w:color"), BLUE)
            borders.append(left)
            p_pr.append(borders)
            add_run(p, resolution, size=10.5, color=INK)


def render_docx(data: dict[str, Any], output: Path) -> None:
    doc = Document()
    configure_styles(doc)
    configure_page(doc)

    title = doc.add_paragraph(data["title"], style="Title")
    set_keep_with_next(title)
    add_subtitle(doc, data["subtitle"])
    add_metric_strip(doc, data)

    intro = doc.add_paragraph()
    intro.paragraph_format.space_before = Pt(12)
    intro.paragraph_format.space_after = Pt(12)
    add_run(intro, data["summary"]["statement"], size=10.5, color=MUTED)

    add_issue_summary(doc, data)
    add_severity_guide(doc, data)
    add_issue_details(doc, data)

    output.parent.mkdir(parents=True, exist_ok=True)
    doc.save(output)


def export_pdf(docx_path: Path, out_dir: Path) -> Path:
    executable = shutil.which("libreoffice") or shutil.which("soffice")
    if executable is None:
        raise RuntimeError(
            "LibreOffice is required for PDF export. Install LibreOffice or run with --docx-only."
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
        check=False,
        capture_output=True,
        text=True,
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
    input_path = Path(args.input)
    out_dir = Path(args.out)
    data = json.loads(input_path.read_text(encoding="utf-8"))

    docx_path = out_dir / f"{args.name}.docx"
    render_docx(data, docx_path)

    print(f"DOCX: {docx_path}")
    if args.pdf:
        pdf_path = export_pdf(docx_path, out_dir)
        print(f"PDF: {pdf_path}")


if __name__ == "__main__":
    main()
