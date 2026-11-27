// Pure helpers for the GitHub release updater. No React Native imports, so they run under `npm test`.

export const RELEASES_REPO = 'stephenprasetyachrismawan/AlkitabScroll';
export const LATEST_RELEASE_URL = `https://api.github.com/repos/${RELEASES_REPO}/releases/latest`;

export type Release = {
  tag: string;
  version: string;
  apkUrl: string;
  apkName: string;
  size: number;
  publishedAt: string;
  pageUrl: string;
};

/** "v1.0.13" / "1.0.13" -> [1, 0, 13]; anything else -> null. */
export function parseVersion(v: string | null | undefined): number[] | null {
  const m = /^v?(\d+)\.(\d+)\.(\d+)$/.exec((v ?? '').trim());
  return m ? m.slice(1).map(Number) : null;
}

/** True only when `latest` is a strictly higher version than `current`. Unparseable -> false. */
export function isNewer(latest: string, current: string | null | undefined): boolean {
  const a = parseVersion(latest);
  const b = parseVersion(current);
  if (!a || !b) return false;
  for (let i = 0; i < 3; i++) {
    if (a[i] !== b[i]) return a[i] > b[i];
  }
  return false;
}

type GhAsset = { name?: string; browser_download_url?: string; size?: number; content_type?: string };
type GhRelease = {
  tag_name?: string;
  draft?: boolean;
  prerelease?: boolean;
  published_at?: string;
  html_url?: string;
  assets?: GhAsset[];
};

/** Turn the GitHub API payload into a Release we can install, or null if it has no usable APK. */
export function parseRelease(json: unknown): Release | null {
  const r = json as GhRelease;
  if (!r || typeof r !== 'object' || r.draft || r.prerelease) return null;
  const version = parseVersion(r.tag_name);
  if (!version) return null;
  const apk = (r.assets ?? []).find(
    (a) =>
      typeof a.name === 'string' &&
      a.name.toLowerCase().endsWith('.apk') &&
      typeof a.browser_download_url === 'string' &&
      // Only ever download from GitHub itself.
      a.browser_download_url.startsWith(`https://github.com/${RELEASES_REPO}/releases/download/`),
  );
  if (!apk) return null;
  return {
    tag: r.tag_name!,
    version: version.join('.'),
    apkUrl: apk.browser_download_url!,
    apkName: apk.name!,
    size: apk.size ?? 0,
    publishedAt: r.published_at ?? '',
    pageUrl: r.html_url ?? `https://github.com/${RELEASES_REPO}/releases`,
  };
}

export function formatSize(bytes: number): string {
  if (!bytes) return '';
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
