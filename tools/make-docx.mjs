// Builds the Word file from docs/ideas.md, so the ideas live in git as text
// and the .docx is only an output.
//
//   node tools/make-docx.mjs [docs/ideas.md] [docs/Zerks-X6-ideas.docx]
//
// Supported markdown: "# " title, the first plain line after it as the subtitle
// (its first " · " part names the file in the footer),
// "## " and "### " headings, "- " bullets, "1. " numbered steps, a line that is
// only _text_ as a grey note, **bold**, [label](url) and pipe tables. A comment
// right above a table sets its layout:
//   <!-- docx: widths=0.06,0.54,0.4 height=560 pad=10 fill=,,Нова -->
// widths are fractions of the page, height is the minimum body row height,
// pad adds empty rows up to that count, filled with the fill values.
import fs from "node:fs";
import {
  AlignmentType,
  BorderStyle,
  Document,
  ExternalHyperlink,
  Footer,
  HeadingLevel,
  LevelFormat,
  Packer,
  PageNumber,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from "docx";

const [SOURCE = "docs/ideas.md", OUT = "docs/Zerks-X6-ideas.docx"] = process.argv.slice(2);
const FONT = "Arial";
const CONTENT = 9638; // A4 width minus 2 cm margins, in DXA
const NAVY = "14213D";
const ORANGE = "C85A14";
const GREY = "5A6478";
const HEAD_FILL = "E8ECF5";
const LINE = "C9D0DE";

const border = { style: BorderStyle.SINGLE, size: 4, color: LINE };
const borders = { top: border, bottom: border, left: border, right: border };

/** Text with **bold** and [label](url) turned into runs. */
function runs(source, base = {}) {
  const out = [];
  const pattern = /\*\*(.+?)\*\*|\[(.+?)\]\((.+?)\)/g;
  let last = 0;
  for (let m = pattern.exec(source); m; m = pattern.exec(source)) {
    if (m.index > last) out.push(new TextRun({ text: source.slice(last, m.index), font: FONT, size: 22, ...base }));
    if (m[1] !== undefined) out.push(new TextRun({ text: m[1], font: FONT, size: 22, ...base, bold: true }));
    else out.push(new ExternalHyperlink({ link: m[3], children: [new TextRun({ text: m[2], font: FONT, size: 22, ...base, style: "Hyperlink" })] }));
    last = pattern.lastIndex;
  }
  if (last < source.length) out.push(new TextRun({ text: source.slice(last), font: FONT, size: 22, ...base }));
  return out;
}

function parseLayout(comment) {
  const layout = {};
  for (const pair of comment.trim().split(/\s+/)) {
    const [key, value = ""] = pair.split("=");
    layout[key] = value;
  }
  return layout;
}

function cells(line) {
  return line.trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map((cell) => cell.trim());
}

function table(rows, layout) {
  const columns = rows[0].length;
  const fractions = layout.widths ? layout.widths.split(",").map(Number) : Array(columns).fill(1 / columns);
  const widths = fractions.map((f) => Math.round(CONTENT * f));
  widths[widths.length - 1] = CONTENT - widths.slice(0, -1).reduce((a, b) => a + b, 0);
  const pad = Number(layout.pad ?? 0);
  const fill = layout.fill ? layout.fill.split(",") : [];
  while (rows.length - 1 < pad) rows.push(Array.from({ length: columns }, (_, c) => fill[c] ?? ""));
  const minHeight = Number(layout.height ?? 0);
  return new Table({
    width: { size: CONTENT, type: WidthType.DXA },
    columnWidths: widths,
    rows: rows.map(
      (row, r) =>
        new TableRow({
          tableHeader: r === 0,
          height: r > 0 && minHeight ? { value: minHeight, rule: "atLeast" } : undefined,
          children: widths.map(
            (width, c) =>
              new TableCell({
                borders,
                width: { size: width, type: WidthType.DXA },
                shading: r === 0 ? { fill: HEAD_FILL, type: ShadingType.CLEAR, color: "auto" } : undefined,
                margins: { top: 80, bottom: 80, left: 120, right: 120 },
                children: [new Paragraph({ spacing: { line: 276 }, children: runs(row[c] ?? "", r === 0 ? { bold: true, color: NAVY, size: 20 } : { size: 20 }) })],
              }),
          ),
        }),
    ),
  });
}

const lines = fs.readFileSync(SOURCE, "utf8").split(/\r?\n/);
const children = [];
let title = "";
let subtitle = "";
let layout = {};
let numberedList = 0;
let inNumberedList = false;

/** True when the next non-empty line starts a table, so the line before it stays on the table's page. */
const beforeTable = (i) => {
  for (let j = i + 1; j < lines.length; j++) {
    const next = lines[j].trim();
    if (next) return next.startsWith("|") || /^<!--\s*docx:/.test(next);
  }
  return false;
};

for (let i = 0; i < lines.length; i++) {
  const line = lines[i].trim();
  if (!/^\d+\.\s/.test(line)) inNumberedList = false;
  if (!line) continue;

  const comment = line.match(/^<!--\s*docx:(.*)-->$/);
  if (comment) {
    layout = parseLayout(comment[1]);
    continue;
  }
  if (/^<!--.*-->$/.test(line)) continue;
  if (line.startsWith("|")) {
    const rows = [];
    for (; i < lines.length && lines[i].trim().startsWith("|"); i++) {
      const row = cells(lines[i]);
      if (!row.every((cell) => /^:?-{3,}:?$/.test(cell))) rows.push(row);
    }
    i--;
    children.push(table(rows, layout));
    layout = {};
    continue;
  }
  if (line.startsWith("# ")) {
    title = line.slice(2);
    children.push(new Paragraph({ spacing: { after: 60 }, children: [new TextRun({ text: title, font: FONT, size: 56, bold: true, color: NAVY })] }));
    continue;
  }
  if (line.startsWith("## ") || line.startsWith("### ")) {
    const level = line.startsWith("## ") ? HeadingLevel.HEADING_1 : HeadingLevel.HEADING_2;
    children.push(new Paragraph({ heading: level, keepNext: true, children: [new TextRun({ text: line.replace(/^#+\s/, ""), font: FONT })] }));
    continue;
  }
  if (line.startsWith("- ")) {
    children.push(new Paragraph({ numbering: { reference: "bullets", level: 0 }, spacing: { after: 80, line: 290 }, children: runs(line.slice(2)) }));
    continue;
  }
  const step = line.match(/^\d+\.\s+(.*)$/);
  if (step) {
    if (!inNumberedList) numberedList++;
    inNumberedList = true;
    children.push(new Paragraph({ numbering: { reference: "steps", level: 0, instance: numberedList }, spacing: { after: 80, line: 290 }, children: runs(step[1]) }));
    continue;
  }
  const note = line.match(/^_(.+)_$/);
  if (note) {
    children.push(new Paragraph({ spacing: { after: 120, line: 300 }, children: runs(note[1], { color: GREY }) }));
    continue;
  }
  if (title && !subtitle) {
    subtitle = line;
    children.push(new Paragraph({ spacing: { after: 240 }, children: runs(line, { size: 24, color: GREY }) }));
    continue;
  }
  children.push(new Paragraph({ spacing: { after: 120, line: 300 }, keepNext: beforeTable(i), children: runs(line) }));
}

// The subtitle's first part names the file ("Файл за идеи", "Ход на играта") for the footer and metadata.
const label = subtitle.split(" · ")[0] || "файл";
const doc = new Document({
  creator: "Claude",
  title: `${title} — ${label}`,
  styles: {
    default: { document: { run: { font: FONT, size: 22 } } },
    paragraphStyles: [
      { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true, run: { size: 34, bold: true, color: NAVY, font: FONT }, paragraph: { spacing: { before: 360, after: 120 }, outlineLevel: 0 } },
      { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true, run: { size: 26, bold: true, color: ORANGE, font: FONT }, paragraph: { spacing: { before: 240, after: 80 }, outlineLevel: 1 } },
    ],
  },
  numbering: {
    config: [
      { reference: "bullets", levels: [{ level: 0, format: LevelFormat.BULLET, text: "•", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 540, hanging: 270 } } } }] },
      { reference: "steps", levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 540, hanging: 300 } } } }] },
    ],
  },
  sections: [
    {
      properties: { page: { margin: { top: 1134, bottom: 1134, left: 1134, right: 1134 } } },
      footers: {
        default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: `${title} · ${label} · стр. `, font: FONT, size: 18, color: GREY }), new TextRun({ children: [PageNumber.CURRENT], font: FONT, size: 18, color: GREY })] })] }),
      },
      children,
    },
  ],
});

fs.writeFileSync(OUT, await Packer.toBuffer(doc));
console.log(`${OUT} written from ${SOURCE}`);
