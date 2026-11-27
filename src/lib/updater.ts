// In-app updater for the GitHub (sideload) build of Selah.
//
// Android never lets an ordinary app uninstall or install packages silently. What it does allow:
// download the new APK, then hand it to the system installer. Because every release is signed
// with the same key and has a higher versionCode, the installer shows "Update" (not "Install"),
// replaces the old app in place and keeps the user's data. Nothing old is left behind, and the
// downloaded APK is deleted on the next check.
import { Platform } from 'react-native';
import * as Application from 'expo-application';
import Constants from 'expo-constants';
import * as FileSystem from 'expo-file-system/legacy';
import * as IntentLauncher from 'expo-intent-launcher';
import { LATEST_RELEASE_URL, isNewer, parseRelease, type Release } from './releases';

const FLAG_GRANT_READ_URI_PERMISSION = 1;
const APK_MIME = 'application/vnd.android.package-archive';

/** Off on iOS, web and the Google Play build (Play forbids self-updating). */
export const updaterEnabled =
  Platform.OS === 'android' && (Constants.expoConfig?.extra?.updateChannel ?? 'github') === 'github';

export function currentVersion(): string | null {
  return Application.nativeApplicationVersion ?? Constants.expoConfig?.version ?? null;
}

const updatesDir = () => (FileSystem.cacheDirectory ? `${FileSystem.cacheDirectory}updates/` : null);

/** Delete APKs from earlier updates. Safe to call any time. */
export async function cleanupDownloads(): Promise<void> {
  const dir = updatesDir();
  if (!dir) return;
  await FileSystem.deleteAsync(dir, { idempotent: true }).catch(() => {});
}

/** The latest release if it is newer than the installed app, otherwise null. */
export async function checkForUpdate(signal?: AbortSignal): Promise<Release | null> {
  if (!updaterEnabled) return null;
  const res = await fetch(LATEST_RELEASE_URL, {
    headers: { Accept: 'application/vnd.github+json' },
    signal,
  });
  if (!res.ok) throw new Error(`GitHub ${res.status}`);
  const release = parseRelease(await res.json());
  if (!release || !isNewer(release.version, currentVersion())) {
    // Up to date: whatever we downloaded before has been installed (or is stale).
    cleanupDownloads();
    return null;
  }
  return release;
}

export type Download = { promise: Promise<string>; cancel: () => void };

/** Start downloading the APK. `onProgress` gets 0..1. Resolves to the local file URI. */
export function downloadUpdate(release: Release, onProgress: (p: number) => void): Download {
  const dir = updatesDir();
  if (!dir) return { promise: Promise.reject(new Error('no cache dir')), cancel: () => {} };
  const target = `${dir}${release.apkName.replace(/[^\w.-]/g, '_')}`;
  let task: FileSystem.DownloadResumable | null = null;
  let cancelled = false;

  const promise = (async () => {
    const existing = await FileSystem.getInfoAsync(target);
    if (existing.exists && release.size && existing.size === release.size) {
      onProgress(1);
      return target;
    }
    await cleanupDownloads();
    await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
    task = FileSystem.createDownloadResumable(release.apkUrl, target, {}, (p) => {
      const total = p.totalBytesExpectedToWrite > 0 ? p.totalBytesExpectedToWrite : release.size;
      if (total > 0) onProgress(Math.min(1, p.totalBytesWritten / total));
    });
    const result = await task.downloadAsync();
    if (cancelled || !result) throw new Error('cancelled');
    if (result.status !== 200) throw new Error(`HTTP ${result.status}`);
    const info = await FileSystem.getInfoAsync(target);
    if (!info.exists || (release.size && info.size !== release.size)) {
      await FileSystem.deleteAsync(target, { idempotent: true });
      throw new Error('incomplete download');
    }
    onProgress(1);
    return target;
  })();

  return {
    promise,
    cancel: () => {
      cancelled = true;
      task?.cancelAsync().catch(() => {});
    },
  };
}

/**
 * Open the system installer for a downloaded APK. If "install unknown apps" isn't allowed for
 * Selah yet, Android first sends the user to that switch and then comes back to the installer.
 */
export async function installUpdate(fileUri: string): Promise<void> {
  const contentUri = await FileSystem.getContentUriAsync(fileUri);
  await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
    data: contentUri,
    type: APK_MIME,
    flags: FLAG_GRANT_READ_URI_PERMISSION,
  });
}
