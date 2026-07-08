from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.platypus import (
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)


OUT_DIR = Path(__file__).resolve().parent
PDF_PATH = OUT_DIR / "MFD_Improvement_Plan_One_Page.pdf"


def para(text, style):
    return Paragraph(text, style)


def bullet(label, detail, label_color="#181F2A"):
    return Paragraph(
        f'<font color="{label_color}"><b>{label}:</b></font> {detail}',
        STYLES["Tiny"],
    )


def section_card(title, fill, accent, rows):
    content = [Paragraph(title.upper(), STYLES["CardTitle"])]
    for label, detail in rows:
        content.append(bullet(label, detail, accent))
    return content


styles = getSampleStyleSheet()
STYLES = {
    "Title": ParagraphStyle(
        "Title",
        parent=styles["Title"],
        fontName="Helvetica-Bold",
        fontSize=17,
        leading=20,
        alignment=TA_CENTER,
        textColor=colors.HexColor("#2E74B5"),
        spaceAfter=2,
    ),
    "Subtitle": ParagraphStyle(
        "Subtitle",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=8.5,
        leading=10,
        alignment=TA_CENTER,
        textColor=colors.HexColor("#555C69"),
        spaceAfter=6,
    ),
    "Body": ParagraphStyle(
        "Body",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=8.5,
        leading=10.3,
        textColor=colors.HexColor("#181F2A"),
        alignment=TA_LEFT,
    ),
    "Tiny": ParagraphStyle(
        "Tiny",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=7.35,
        leading=8.25,
        textColor=colors.HexColor("#181F2A"),
        spaceAfter=2.3,
    ),
    "CardTitle": ParagraphStyle(
        "CardTitle",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=8,
        leading=9.2,
        textColor=colors.HexColor("#181F2A"),
        spaceAfter=4,
    ),
    "Heading": ParagraphStyle(
        "Heading",
        parent=styles["Heading2"],
        fontName="Helvetica-Bold",
        fontSize=10,
        leading=12,
        textColor=colors.HexColor("#2E74B5"),
        spaceBefore=2,
        spaceAfter=3,
    ),
    "Step": ParagraphStyle(
        "Step",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=7.25,
        leading=8.1,
        textColor=colors.HexColor("#181F2A"),
    ),
    "Footer": ParagraphStyle(
        "Footer",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=7.15,
        leading=8.5,
        alignment=TA_CENTER,
        textColor=colors.HexColor("#555C69"),
    ),
}


def build_pdf():
    doc = SimpleDocTemplate(
        str(PDF_PATH),
        pagesize=letter,
        leftMargin=0.45 * inch,
        rightMargin=0.45 * inch,
        topMargin=0.42 * inch,
        bottomMargin=0.38 * inch,
    )

    story = [
        para("Mr. Football Dynasty Improvement Plan", STYLES["Title"]),
        para("Plain-English one-page status brief for the next Codex run", STYLES["Subtitle"]),
    ]

    bottom_line = Table(
        [[
            para(
                '<b>Bottom line:</b> MFD already has a deep, playable dynasty foundation. The next wins should be small, tested slices that make existing systems clearer, safer, and more exciting instead of a giant rewrite.',
                STYLES["Body"],
            )
        ]],
        colWidths=[7.42 * inch],
    )
    bottom_line.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#E8EEF5")),
        ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#B7C9DD")),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
        ("RIGHTPADDING", (0, 0), (-1, -1), 8),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
    ]))
    story.extend([bottom_line, Spacer(1, 7)])

    ready = [
        ("Core game", "deterministic sim, week advance, saves, setup, roster, draft, trades, cap, free agency."),
        ("World depth", "Chip, media, weather, awards, HOF, records, legacy, player profiles, rivalries."),
        ("Guardrails", "many tests protect routes, save version, RNG, content, CI, and shell behavior."),
        ("Best pattern", "forecast helpers already show how to explain choices before commits."),
    ]
    needs = [
        ("Clarity", "some screens know the data but do not explain what changed or what to do next."),
        ("Unwired helpers", "franchise tags, coach development, poaching, rivalry sidecar, and fast-lane setup need real call sites."),
        ("Mismatch bugs", "endorsements, scenario blockers, cap rule display, achievements, and waivers have source-truth gaps."),
        ("Living world", "player memory, offseason calendar, team flavor, and dynasty receipts can be stronger."),
    ]
    risks = [
        ("Saves", "new persistent fields need schema, migration, defaults, fixtures, and old-save tests."),
        ("Sim math", "formula changes need samples, deterministic checks, and sanity ranges."),
        ("Sidecars", "browser-local archives are not automatically in portable dynasty cartridges."),
        ("Claims", "do not say a feature is live unless source shows a production path."),
    ]

    cards = Table(
        [[
            section_card("Ready to build on", "#EAF4EE", "#246747", ready),
            section_card("Needs work", "#FFF4D8", "#7A5A00", needs),
            section_card("Watch the risks", "#FCE8E6", "#9B1C1C", risks),
        ]],
        colWidths=[2.44 * inch, 2.44 * inch, 2.44 * inch],
    )
    cards.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (0, 0), colors.HexColor("#EAF4EE")),
        ("BACKGROUND", (1, 0), (1, 0), colors.HexColor("#FFF4D8")),
        ("BACKGROUND", (2, 0), (2, 0), colors.HexColor("#FCE8E6")),
        ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#DADCE0")),
        ("INNERGRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#DADCE0")),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 7),
        ("RIGHTPADDING", (0, 0), (-1, -1), 7),
        ("TOPPADDING", (0, 0), (-1, -1), 7),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
    ]))
    story.extend([cards, Spacer(1, 8)])

    story.append(para("Future /goal plan", STYLES["Heading"]))
    steps = [
        ("1. Pick", "Score 3-5 slices by impact, risk, testability, and rollback."),
        ("2. Ship", "Finish one vertical slice with source, tests, docs, and verification."),
        ("3. Record", "Ledger: files, tests, docs, risks, rollback, next slice."),
        ("4. Continue", "Move on only when the current slice is clean and independent."),
    ]
    step_cells = [
        [para(f"<b>{label}</b>", STYLES["Step"]), para(detail, STYLES["Step"])]
        for label, detail in steps
    ]
    step_table = Table([step_cells], colWidths=[1.855 * inch] * 4)
    step_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#F4F6F9")),
        ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#DADCE0")),
        ("INNERGRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#DADCE0")),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
    ]))
    story.extend([step_table, Spacer(1, 7)])

    story.append(para("Best next slices", STYLES["Heading"]))
    candidates = (
        "Waiver/practice-squad clarity; achievement and player-memory clarity; endorsement source-of-truth fix; "
        "offseason calendar checklist; cap rule-awareness display; scenario constraint integrity; team-ops receipts; "
        "weather and game-day clarity."
    )
    story.append(para(
        f"Start with read-only clarity when possible. Strong candidates: <b>{candidates}</b>",
        STYLES["Body"],
    ))
    story.append(Spacer(1, 6))
    story.append(para(
        "Simple rule for the marathon: improve what players feel, preserve saves and deterministic sim, and update the guide after every verified slice.",
        STYLES["Footer"],
    ))

    doc.build(story)
    print(PDF_PATH)


if __name__ == "__main__":
    build_pdf()
