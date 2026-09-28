import {
  copyFile,
  mkdir,
  readFile,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import {
  basename,
  extname,
  join,
  resolve,
} from "node:path";

export interface RecentArtifactRecord {
  id: string;
  label: string;
  targetLabel: string;
  attentionCount: number;
  updatedAt: string;
  extension: ".mcworld" | ".zip";
}

interface RecentArtifactIndex {
  schemaVersion: 1;
  items: RecentArtifactRecord[];
}

const EMPTY_INDEX: RecentArtifactIndex = {
  schemaVersion: 1,
  items: [],
};

function artifactFileName(
  record: Pick<RecentArtifactRecord, "id" | "extension">,
): string {
  const safeId = record.id.replace(/[^a-zA-Z0-9._-]/g, "_");
  return safeId + record.extension;
}

export class RecentArtifactStore {
  private readonly root: string;
  private readonly indexPath: string;

  constructor(
    root = resolve(".cache/review-ui/recent"),
    private readonly maxItems = 8,
  ) {
    this.root = root;
    this.indexPath = join(root, "index.json");
  }

  private async readIndex(): Promise<RecentArtifactIndex> {
    try {
      const parsed = JSON.parse(
        await readFile(this.indexPath, "utf8"),
      ) as Partial<RecentArtifactIndex>;
      if (
        parsed.schemaVersion !== 1 ||
        !Array.isArray(parsed.items)
      ) {
        return EMPTY_INDEX;
      }
      return {
        schemaVersion: 1,
        items: parsed.items,
      };
    } catch {
      return EMPTY_INDEX;
    }
  }

  private async writeIndex(
    index: RecentArtifactIndex,
  ): Promise<void> {
    await mkdir(this.root, { recursive: true });
    await writeFile(
      this.indexPath,
      JSON.stringify(index, null, 2) + "\n",
      "utf8",
    );
  }

  async list(): Promise<
    Array<RecentArtifactRecord & { available: boolean }>
  > {
    const index = await this.readIndex();
    const output = [];
    let changed = false;

    for (const item of index.items) {
      const artifactPath = join(
        this.root,
        artifactFileName(item),
      );
      let available = false;
      try {
        const info = await stat(artifactPath);
        available = info.isFile();
      } catch {
        available = false;
      }
      output.push({
        ...item,
        available,
      });
      if (!available) changed = true;
    }

    if (changed) {
      await this.writeIndex({
        schemaVersion: 1,
        items: output
          .filter((item) => item.available)
          .map(({ available: _available, ...item }) => item),
      });
    }

    return output;
  }

  async persist(
    sourcePath: string,
    record: Omit<
      RecentArtifactRecord,
      "extension" | "updatedAt"
    >,
  ): Promise<RecentArtifactRecord> {
    const extension = extname(sourcePath).toLowerCase();
    if (extension !== ".mcworld" && extension !== ".zip") {
      throw new Error(
        "Recent artifact must be a .mcworld or .zip file.",
      );
    }

    await mkdir(this.root, { recursive: true });

    const fullRecord: RecentArtifactRecord = {
      ...record,
      extension,
      updatedAt: new Date().toISOString(),
    };
    const destination = join(
      this.root,
      artifactFileName(fullRecord),
    );

    await copyFile(sourcePath, destination);

    const current = await this.readIndex();
    const items = [
      fullRecord,
      ...current.items.filter(
        (item) => item.id !== fullRecord.id,
      ),
    ].slice(0, this.maxItems);

    const kept = new Set(
      items.map((item) => artifactFileName(item)),
    );
    for (const item of current.items) {
      const name = artifactFileName(item);
      if (!kept.has(name)) {
        await rm(join(this.root, name), {
          force: true,
        });
      }
    }

    await this.writeIndex({
      schemaVersion: 1,
      items,
    });

    return fullRecord;
  }

  async resolveArtifact(
    id: string,
  ): Promise<{
    record: RecentArtifactRecord;
    artifactPath: string;
  }> {
    const index = await this.readIndex();
    const record = index.items.find(
      (item) => item.id === id,
    );
    if (!record) {
      throw new Error(
        "This recent map is no longer available.",
      );
    }

    const artifactPath = join(
      this.root,
      artifactFileName(record),
    );
    try {
      const info = await stat(artifactPath);
      if (!info.isFile()) throw new Error();
    } catch {
      throw new Error(
        "This recent map is no longer available. Open the original file again.",
      );
    }

    return {
      record: {
        ...record,
        label: basename(record.label),
      },
      artifactPath,
    };
  }
}
