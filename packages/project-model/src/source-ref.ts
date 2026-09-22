export interface SourceRange {
  lineStart?: number;
  lineEnd?: number;
  columnStart?: number;
  columnEnd?: number;
}

export interface SourceRef {
  artifactId: string;
  relativePath: string;
  range?: SourceRange;
  jsonPointer?: string;
}
