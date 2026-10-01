import type {
  BugReportPublicationProvider,
  PublishedGoogleDoc,
  PublishedPdf,
} from "../../apps/bug-report-ui/src/publication-provider.js";
import type {
  BugReportClientDocument,
} from "../../engine/packages/bug-report/src/index.js";

const DRIVE_API = "https://www.googleapis.com/drive/v3";
const DRIVE_UPLOAD_API =
  "https://www.googleapis.com/upload/drive/v3";
const DOCS_API = "https://docs.googleapis.com/v1";
const GOOGLE_DOC_MIME =
  "application/vnd.google-apps.document";
const FOLDER_MIME =
  "application/vnd.google-apps.folder";
const PDF_MIME = "application/pdf";

interface GoogleDriveFile {
  readonly id: string;
  readonly name?: string;
  readonly mimeType?: string;
  readonly parents?: readonly string[];
  readonly webViewLink?: string;
}

interface GoogleDriveFileList {
  readonly files?: readonly GoogleDriveFile[];
}

interface GoogleDocsStructuralElement {
  readonly startIndex?: number;
  readonly endIndex?: number;
  readonly table?: {
    readonly tableRows?: readonly {
      readonly tableCells?: readonly {
        readonly startIndex?: number;
        readonly endIndex?: number;
        readonly content?: readonly {
          readonly startIndex?: number;
          readonly endIndex?: number;
        }[];
      }[];
    }[];
  };
}

interface GoogleDocsDocument {
  readonly body?: {
    readonly content?: readonly GoogleDocsStructuralElement[];
  };
}

interface StyledRange {
  readonly kind:
    | "title"
    | "subtitle"
    | "heading1"
    | "heading2"
    | "label"
    | "metric";
  readonly start: number;
  readonly end: number;
}

interface NumberedRange {
  readonly start: number;
  readonly end: number;
}

interface TextPlan {
  readonly text: string;
  readonly styles: readonly StyledRange[];
  readonly numberedRanges: readonly NumberedRange[];
}

interface GooglePublicationProviderOptions {
  readonly accessToken: string;
  readonly fetchImpl?: typeof fetch;
}

function assertNonEmpty(
  value: string,
  label: string,
): void {
  if (!value.trim()) {
    throw new Error(label + " must be non-empty.");
  }
}

function rgb(hex: string): {
  red: number;
  green: number;
  blue: number;
} {
  const clean = hex.replace("#", "");
  const value = Number.parseInt(clean, 16);
  return {
    red: ((value >> 16) & 255) / 255,
    green: ((value >> 8) & 255) / 255,
    blue: (value & 255) / 255,
  };
}

const COLORS = {
  ink: rgb("#26343d"),
  navy: rgb("#173c56"),
  blue: rgb("#35789a"),
  amber: rgb("#c68232"),
  white: rgb("#ffffff"),
  line: rgb("#d8dee1"),
} as const;

function escapeDriveQuery(value: string): string {
  return value.replaceAll("\\", "\\\\").replaceAll("'", "\\'");
}

function extractGoogleDriveId(url: string): string {
  const patterns = [
    /\/folders\/([a-zA-Z0-9_-]+)/,
    /\/file\/d\/([a-zA-Z0-9_-]+)/,
    /\/document\/d\/([a-zA-Z0-9_-]+)/,
    /\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/,
    /[?&]id=([a-zA-Z0-9_-]+)/,
  ];

  for (const pattern of patterns) {
    const match = pattern.exec(url);
    if (match?.[1]) return match[1];
  }

  throw new Error(
    "Publication destination must contain a Google Drive file or folder ID.",
  );
}

class TextPlanBuilder {
  #text = "";
  readonly #styles: StyledRange[] = [];
  readonly #numberedRanges: NumberedRange[] = [];

  get length(): number {
    return this.#text.length;
  }

  line(
    value: string,
    kind?: StyledRange["kind"],
  ): void {
    const start = this.#text.length;
    this.#text += value + "\n";
    if (kind) {
      this.#styles.push({
        kind,
        start,
        end: start + value.length,
      });
    }
  }

  blank(): void {
    this.#text += "\n";
  }

  numbered(items: readonly string[]): void {
    if (items.length === 0) return;
    const start = this.#text.length;
    for (const item of items) {
      this.#text += item + "\n";
    }
    this.#numberedRanges.push({
      start,
      end: this.#text.length,
    });
  }

  build(): TextPlan {
    return {
      text: this.#text,
      styles: this.#styles,
      numberedRanges: this.#numberedRanges,
    };
  }
}

function buildIntro(
  document: BugReportClientDocument,
): TextPlan {
  const b = new TextPlanBuilder();

  b.line(document.title, "title");
  b.line(document.subtitle, "subtitle");
  b.blank();

  b.line(
    "Map Version  " + document.map.mapVersion,
    "metric",
  );
  b.line(
    "Tested Version  Minecraft Education " +
      document.map.testedVersion,
    "metric",
  );
  b.blank();

  b.line(document.summary.statement);
  b.line(
    "Open Issues " +
      String(document.summary.openIssues) +
      "   ·   Blocker " +
      String(document.summary.blocker) +
      "   ·   Major " +
      String(document.summary.major) +
      "   ·   Minor " +
      String(document.summary.minor),
    "metric",
  );
  b.blank();
  b.line("Issue Summary", "heading1");

  return b.build();
}

function buildDetails(
  document: BugReportClientDocument,
): TextPlan {
  const b = new TextPlanBuilder();

  b.blank();
  b.line("Severity Guide", "heading1");
  for (const item of document.severityLegend) {
    b.line(
      item.label.toUpperCase() +
        " — " +
        item.meaning,
    );
  }

  b.blank();
  b.line("Issue Details", "heading1");

  if (document.issues.length === 0) {
    b.line("No open issues are recorded for this report.");
    return b.build();
  }

  for (const issue of document.issues) {
    b.blank();
    b.line(
      String(issue.number).padStart(2, "0") +
        " · " +
        issue.severity.toUpperCase(),
      "metric",
    );
    b.line(issue.title, "heading2");

    b.line("Issue", "label");
    b.line(issue.issue);

    b.line("How to Reproduce", "label");
    b.numbered(issue.reproduction);

    b.line("Observed", "label");
    b.line(issue.observed);

    b.line("Expected", "label");
    b.line(issue.expected);

    if (issue.recommendedResolution) {
      b.line("Recommended Resolution", "label");
      b.line(issue.recommendedResolution);
    }
  }

  return b.build();
}

function textStyleFor(
  kind: StyledRange["kind"],
): Record<string, unknown> {
  if (kind === "title") {
    return {
      bold: true,
      fontSize: { magnitude: 28, unit: "PT" },
      foregroundColor: {
        color: { rgbColor: COLORS.navy },
      },
    };
  }
  if (kind === "subtitle") {
    return {
      bold: true,
      fontSize: { magnitude: 13, unit: "PT" },
      foregroundColor: {
        color: { rgbColor: COLORS.blue },
      },
    };
  }
  if (kind === "heading1") {
    return {
      bold: true,
      fontSize: { magnitude: 18, unit: "PT" },
      foregroundColor: {
        color: { rgbColor: COLORS.navy },
      },
    };
  }
  if (kind === "heading2") {
    return {
      bold: true,
      fontSize: { magnitude: 14, unit: "PT" },
      foregroundColor: {
        color: { rgbColor: COLORS.navy },
      },
    };
  }
  if (kind === "label") {
    return {
      bold: true,
      fontSize: { magnitude: 10.5, unit: "PT" },
      foregroundColor: {
        color: { rgbColor: COLORS.blue },
      },
    };
  }
  return {
    bold: true,
    fontSize: { magnitude: 10, unit: "PT" },
    foregroundColor: {
      color: { rgbColor: COLORS.blue },
    },
  };
}

function paragraphStyleFor(
  kind: StyledRange["kind"],
): {
  style: Record<string, unknown>;
  fields: string;
} | undefined {
  if (kind === "title") {
    return {
      style: {
        namedStyleType: "TITLE",
        spaceBelow: { magnitude: 6, unit: "PT" },
      },
      fields: "namedStyleType,spaceBelow",
    };
  }
  if (kind === "heading1") {
    return {
      style: {
        namedStyleType: "HEADING_1",
        spaceAbove: { magnitude: 16, unit: "PT" },
        spaceBelow: { magnitude: 8, unit: "PT" },
        keepWithNext: true,
      },
      fields:
        "namedStyleType,spaceAbove,spaceBelow,keepWithNext",
    };
  }
  if (kind === "heading2") {
    return {
      style: {
        namedStyleType: "HEADING_2",
        spaceAbove: { magnitude: 12, unit: "PT" },
        spaceBelow: { magnitude: 6, unit: "PT" },
        keepWithNext: true,
      },
      fields:
        "namedStyleType,spaceAbove,spaceBelow,keepWithNext",
    };
  }
  if (kind === "label") {
    return {
      style: {
        keepWithNext: true,
        spaceAbove: { magnitude: 7, unit: "PT" },
        spaceBelow: { magnitude: 2, unit: "PT" },
      },
      fields:
        "spaceAbove,spaceBelow,keepWithNext",
    };
  }
  return undefined;
}

function requestsForTextPlan(
  plan: TextPlan,
  baseIndex: number,
): Record<string, unknown>[] {
  if (!plan.text) return [];
  const requests: Record<string, unknown>[] = [
    {
      insertText: {
        location: { index: baseIndex },
        text: plan.text,
      },
    },
    {
      updateTextStyle: {
        range: {
          startIndex: baseIndex,
          endIndex: baseIndex + plan.text.length,
        },
        textStyle: {
          weightedFontFamily: {
            fontFamily: "Aptos",
          },
          fontSize: {
            magnitude: 10.5,
            unit: "PT",
          },
          foregroundColor: {
            color: { rgbColor: COLORS.ink },
          },
        },
        fields:
          "weightedFontFamily,fontSize,foregroundColor",
      },
    },
    {
      updateParagraphStyle: {
        range: {
          startIndex: baseIndex,
          endIndex: baseIndex + plan.text.length,
        },
        paragraphStyle: {
          lineSpacing: 140,
          spaceBelow: {
            magnitude: 5,
            unit: "PT",
          },
        },
        fields: "lineSpacing,spaceBelow",
      },
    },
  ];

  for (const style of plan.styles) {
    const range = {
      startIndex: baseIndex + style.start,
      endIndex: baseIndex + style.end,
    };
    requests.push({
      updateTextStyle: {
        range,
        textStyle: textStyleFor(style.kind),
        fields:
          "bold,fontSize,foregroundColor",
      },
    });
    const paragraphStyle =
      paragraphStyleFor(style.kind);
    if (paragraphStyle) {
      requests.push({
        updateParagraphStyle: {
          range,
          paragraphStyle:
          paragraphStyle.style,
        fields:
          paragraphStyle.fields,
        },
      });
    }
  }

  for (const range of plan.numberedRanges) {
    requests.push({
      createParagraphBullets: {
        range: {
          startIndex: baseIndex + range.start,
          endIndex: baseIndex + range.end,
        },
        bulletPreset:
          "NUMBERED_DECIMAL_ALPHA_ROMAN",
      },
    });
  }

  return requests;
}

function issueTableRows(
  document: BugReportClientDocument,
): readonly (readonly string[])[] {
  const includeStatus =
    document.source.issueScope === "all";
  const rows: string[][] = [
    includeStatus
      ? ["No.", "Severity", "Issue", "Status"]
      : ["No.", "Severity", "Issue"],
  ];

  for (const item of document.issueIndex) {
    const row = [
      String(item.number).padStart(2, "0"),
      item.severity.toUpperCase(),
      item.title,
    ];
    if (includeStatus) {
      row.push(
        item.status === "fixed" ? "Fixed" : "Open",
      );
    }
    rows.push(row);
  }
  return rows;
}

function documentEndIndex(
  document: GoogleDocsDocument,
): number {
  const content = document.body?.content ?? [];
  const last = content.at(-1);
  const end = last?.endIndex;
  if (typeof end !== "number") {
    throw new Error(
      "Google Docs document has no writable body end index.",
    );
  }
  return Math.max(1, end - 1);
}

function firstTable(
  document: GoogleDocsDocument,
): GoogleDocsStructuralElement {
  const table = (document.body?.content ?? [])
    .find((element) => element.table);
  if (!table?.table) {
    throw new Error(
      "Google Docs renderer could not resolve the issue summary table.",
    );
  }
  return table;
}

function tableCellInsertions(
  table: GoogleDocsStructuralElement,
  rows: readonly (readonly string[])[],
): readonly {
  index: number;
  text: string;
}[] {
  const tableRows =
    table.table?.tableRows ?? [];
  const insertions: {
    index: number;
    text: string;
  }[] = [];

  rows.forEach((row, rowIndex) => {
    const cells =
      tableRows[rowIndex]?.tableCells ?? [];
    row.forEach((text, columnIndex) => {
      const cell = cells[columnIndex];
      const index =
        cell?.content?.[0]?.startIndex ??
        (cell?.startIndex === undefined
          ? undefined
          : cell.startIndex + 1);
      if (typeof index !== "number") {
        throw new Error(
          "Google Docs renderer could not resolve a table cell insertion index.",
        );
      }
      insertions.push({ index, text });
    });
  });

  return insertions.sort(
    (left, right) => right.index - left.index,
  );
}

export class GoogleBugReportPublicationProvider
  implements BugReportPublicationProvider {
  readonly #token: string;
  readonly #fetch: typeof fetch;

  constructor(
    options: GooglePublicationProviderOptions,
  ) {
    assertNonEmpty(
      options.accessToken,
      "Google access token",
    );
    this.#token = options.accessToken;
    this.#fetch = options.fetchImpl ?? fetch;
  }

  async #request(
    url: string,
    init: RequestInit = {},
  ): Promise<Response> {
    const response = await this.#fetch(url, {
      ...init,
      headers: {
        Authorization: "Bearer " + this.#token,
        ...init.headers,
      },
    });
    if (!response.ok) {
      const body = await response.text();
      throw new Error(
        "Google publication request failed (" +
          String(response.status) +
          "): " +
          body,
      );
    }
    return response;
  }

  async #driveMetadata(
    id: string,
  ): Promise<GoogleDriveFile> {
    const response = await this.#request(
      DRIVE_API +
        "/files/" +
        encodeURIComponent(id) +
        "?fields=id,name,mimeType,parents,webViewLink&supportsAllDrives=true",
    );
    return await response.json() as GoogleDriveFile;
  }

  async #resolveParentFolder(
    driveUrl: string,
  ): Promise<string> {
    const id = extractGoogleDriveId(driveUrl);
    const item = await this.#driveMetadata(id);
    if (item.mimeType === FOLDER_MIME) {
      return item.id;
    }
    const parent = item.parents?.[0];
    if (!parent) {
      throw new Error(
        "Audited map Drive item has no parent folder for publication.",
      );
    }
    return parent;
  }

  async #findExactFile(
    parentFolderId: string,
    name: string,
    mimeType: string,
  ): Promise<GoogleDriveFile | undefined> {
    const q = [
      "'" +
        escapeDriveQuery(parentFolderId) +
        "' in parents",
      "name = '" +
        escapeDriveQuery(name) +
        "'",
      "mimeType = '" +
        escapeDriveQuery(mimeType) +
        "'",
      "trashed = false",
    ].join(" and ");
    const response = await this.#request(
      DRIVE_API +
        "/files?q=" +
        encodeURIComponent(q) +
        "&fields=files(id,name,mimeType,parents,webViewLink)" +
        "&includeItemsFromAllDrives=true",
    );
    const list =
      await response.json() as GoogleDriveFileList;
    return list.files?.[0];
  }

  async #createGoogleDocFile(
    title: string,
    parentFolderId: string,
  ): Promise<GoogleDriveFile> {
    const response = await this.#request(
      DRIVE_API +
        "/files?fields=id,name,mimeType,parents,webViewLink&supportsAllDrives=true",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: title,
          mimeType: GOOGLE_DOC_MIME,
          parents: [parentFolderId],
        }),
      },
    );
    return await response.json() as GoogleDriveFile;
  }

  async #getDoc(
    documentId: string,
  ): Promise<GoogleDocsDocument> {
    const response = await this.#request(
      DOCS_API +
        "/documents/" +
        encodeURIComponent(documentId),
    );
    return await response.json() as GoogleDocsDocument;
  }

  async #batchUpdate(
    documentId: string,
    requests: readonly Record<string, unknown>[],
  ): Promise<void> {
    if (requests.length === 0) return;
    await this.#request(
      DOCS_API +
        "/documents/" +
        encodeURIComponent(documentId) +
        ":batchUpdate",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ requests }),
      },
    );
  }

  async #clearDocument(
    documentId: string,
  ): Promise<void> {
    const current =
      await this.#getDoc(documentId);
    const endIndex =
      documentEndIndex(current);
    if (endIndex <= 1) return;
    await this.#batchUpdate(
      documentId,
      [{
        deleteContentRange: {
          range: {
            startIndex: 1,
            endIndex,
          },
        },
      }],
    );
  }

  async #renderDocument(
    documentId: string,
    document: BugReportClientDocument,
  ): Promise<void> {
    await this.#clearDocument(documentId);

    const intro = buildIntro(document);
    const tableRows = issueTableRows(document);
    const introEnd = 1 + intro.text.length;

    await this.#batchUpdate(
      documentId,
      [
        {
          updateDocumentStyle: {
            documentStyle: {
              marginTop: {
                magnitude: 48,
                unit: "PT",
              },
              marginBottom: {
                magnitude: 48,
                unit: "PT",
              },
              marginLeft: {
                magnitude: 54,
                unit: "PT",
              },
              marginRight: {
                magnitude: 54,
                unit: "PT",
              },
            },
            fields:
              "marginTop,marginBottom,marginLeft,marginRight",
          },
        },
        ...requestsForTextPlan(intro, 1),
        {
          insertTable: {
            rows: tableRows.length,
            columns: tableRows[0]?.length ?? 3,
            location: {
              index: introEnd,
            },
          },
        },
      ],
    );

    let current =
      await this.#getDoc(documentId);
    const table = firstTable(current);

    await this.#batchUpdate(
      documentId,
      tableCellInsertions(
        table,
        tableRows,
      ).map((entry) => ({
        insertText: {
          location: { index: entry.index },
          text: entry.text,
        },
      })),
    );

    current = await this.#getDoc(documentId);
    const styledTable = firstTable(current);
    const tableStartIndex =
      styledTable.startIndex;
    const headerCells =
      styledTable.table
        ?.tableRows?.[0]
        ?.tableCells ?? [];

    const tableStyleRequests:
      Record<string, unknown>[] = [];

    if (typeof tableStartIndex === "number") {
      tableStyleRequests.push({
        updateTableCellStyle: {
          tableRange: {
            tableCellLocation: {
              tableStartLocation: {
                index: tableStartIndex,
              },
              rowIndex: 0,
              columnIndex: 0,
            },
            rowSpan: 1,
            columnSpan:
              tableRows[0]?.length ?? 3,
          },
          tableCellStyle: {
            backgroundColor: {
              color: {
                rgbColor: COLORS.navy,
              },
            },
            paddingTop: {
              magnitude: 6,
              unit: "PT",
            },
            paddingBottom: {
              magnitude: 6,
              unit: "PT",
            },
            paddingLeft: {
              magnitude: 6,
              unit: "PT",
            },
            paddingRight: {
              magnitude: 6,
              unit: "PT",
            },
          },
          fields:
            "backgroundColor,paddingTop,paddingBottom,paddingLeft,paddingRight",
        },
      });
    }

    for (const cell of headerCells) {
      const start =
        cell.content?.[0]?.startIndex;
      const end =
        cell.content?.at(-1)?.endIndex;
      if (
        typeof start === "number" &&
        typeof end === "number" &&
        end > start
      ) {
        tableStyleRequests.push({
          updateTextStyle: {
            range: {
              startIndex: start,
              endIndex: end - 1,
            },
            textStyle: {
              bold: true,
              foregroundColor: {
                color: {
                  rgbColor: COLORS.white,
                },
              },
              weightedFontFamily: {
                fontFamily: "Aptos",
              },
              fontSize: {
                magnitude: 9.5,
                unit: "PT",
              },
            },
            fields:
              "bold,foregroundColor,weightedFontFamily,fontSize",
          },
        });
      }
    }

    await this.#batchUpdate(
      documentId,
      tableStyleRequests,
    );

    current = await this.#getDoc(documentId);
    const details = buildDetails(document);
    const detailsIndex =
      documentEndIndex(current);
    await this.#batchUpdate(
      documentId,
      requestsForTextPlan(
        details,
        detailsIndex,
      ),
    );
  }

  async createGoogleDoc(input: {
    readonly title: string;
    readonly destinationDriveUrl: string;
    readonly document: BugReportClientDocument;
  }): Promise<PublishedGoogleDoc> {
    const parentFolderId =
      await this.#resolveParentFolder(
        input.destinationDriveUrl,
      );

    const existing =
      await this.#findExactFile(
        parentFolderId,
        input.title,
        GOOGLE_DOC_MIME,
      );
    const file =
      existing ??
      await this.#createGoogleDocFile(
        input.title,
        parentFolderId,
      );

    await this.#renderDocument(
      file.id,
      input.document,
    );

    const refreshed =
      await this.#driveMetadata(file.id);

    return {
      documentId: file.id,
      title:
        refreshed.name ?? input.title,
      url:
        refreshed.webViewLink ??
        "https://docs.google.com/document/d/" +
          encodeURIComponent(file.id) +
          "/edit",
      parentFolderId,
    };
  }

  async #exportPdfBytes(
    documentId: string,
  ): Promise<Uint8Array> {
    const response = await this.#request(
      DRIVE_API +
        "/files/" +
        encodeURIComponent(documentId) +
        "/export?mimeType=" +
        encodeURIComponent(PDF_MIME),
    );
    return new Uint8Array(
      await response.arrayBuffer(),
    );
  }

  async #createPdfFile(
    parentFolderId: string,
    fileName: string,
    bytes: Uint8Array,
  ): Promise<GoogleDriveFile> {
    const boundary =
      "m-bedrock-" +
      Date.now().toString(36);
    const metadata = JSON.stringify({
      name: fileName,
      mimeType: PDF_MIME,
      parents: [parentFolderId],
    });
    const body = new Blob([
      "--" + boundary +
        "\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n" +
        metadata +
        "\r\n",
      "--" + boundary +
        "\r\nContent-Type: application/pdf\r\n\r\n",
      bytes,
      "\r\n--" + boundary + "--",
    ]);

    const response = await this.#request(
      DRIVE_UPLOAD_API +
        "/files?uploadType=multipart" +
        "&fields=id,name,mimeType,parents,webViewLink" +
        "&supportsAllDrives=true",
      {
        method: "POST",
        headers: {
          "Content-Type":
            "multipart/related; boundary=" +
            boundary,
        },
        body,
      },
    );
    return await response.json() as GoogleDriveFile;
  }

  async #replacePdfFile(
    fileId: string,
    bytes: Uint8Array,
  ): Promise<GoogleDriveFile> {
    const response = await this.#request(
      DRIVE_UPLOAD_API +
        "/files/" +
        encodeURIComponent(fileId) +
        "?uploadType=media" +
        "&fields=id,name,mimeType,parents,webViewLink" +
        "&supportsAllDrives=true",
      {
        method: "PATCH",
        headers: {
          "Content-Type": PDF_MIME,
        },
        body: bytes,
      },
    );
    return await response.json() as GoogleDriveFile;
  }

  async exportGoogleDocAsPdf(input: {
    readonly documentId: string;
    readonly fileName: string;
    readonly destinationFolderId?: string;
  }): Promise<PublishedPdf> {
    const source =
      await this.#driveMetadata(
        input.documentId,
      );
    const parentFolderId =
      input.destinationFolderId ??
      source.parents?.[0];
    if (!parentFolderId) {
      throw new Error(
        "Google Doc has no destination folder for PDF publication.",
      );
    }

    const bytes =
      await this.#exportPdfBytes(
        input.documentId,
      );
    const existing =
      await this.#findExactFile(
        parentFolderId,
        input.fileName,
        PDF_MIME,
      );
    const file = existing
      ? await this.#replacePdfFile(
          existing.id,
          bytes,
        )
      : await this.#createPdfFile(
          parentFolderId,
          input.fileName,
          bytes,
        );

    const refreshed =
      await this.#driveMetadata(file.id);
    return {
      fileName:
        refreshed.name ?? input.fileName,
      ...(refreshed.webViewLink === undefined
        ? {}
        : { url: refreshed.webViewLink }),
    };
  }
}
