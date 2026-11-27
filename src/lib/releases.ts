// Pure helpers for the GitHub release updater. No React Native imports, so they run under `npm test`.

export const RELEASES_REPO = 'stephenprasetyachrismawan/AlkitabScroll';
export const LATEST_RELEASE_URL = `https://api.github.com/repos/${RELEASES_REPO}/releases/latest`;
/**
 * Recent releases. GitHub's "latest" flag follows publish time, and builds that run side by side
 * can publish out of order (v1.0.32 once landed after v1.0.37), so the app picks the highest
 * version from this list instead of trusting /releases/latest.
 */
export const RECENT_RELEASES_URL = `https://api.github.com/repos/${RELEASES_REPO}/releases?per_page=15`;

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

/** The installable release with the highest version in a GitHub releases list, or null. */
export function pickNewest(json: unknown): Release | null {
  if (!Array.isArray(json)) return parseRelease(json);
  let best: Release | null = null;
  for (const item of json) {
    const r = parseRelease(item);
    if (r && (!best || isNewer(r.version, best.version))) best = r;
  }
  return best;
}

export function formatSize(bytes: number): string {
  if (!bytes) return '';
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
