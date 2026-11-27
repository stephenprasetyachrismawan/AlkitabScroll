// Build-time tweaks on top of app.json.
//
// RELEASE_TAG (set by CI, e.g. "v1.0.13") becomes the Android versionName / versionCode,
// so the installed app knows its own version and every release installs over the last one.
//
// SELAH_CHANNEL picks the distribution flavour:
//   github (default) - APKs from GitHub Releases. Includes the in-app updater and the
//                      REQUEST_INSTALL_PACKAGES permission it needs.
//   play             - Google Play build. Play forbids self-updating, so the updater is
//                      switched off and the install permission is stripped.
module.exports = ({ config }) => {
  const channel = process.env.SELAH_CHANNEL === 'play' ? 'play' : 'github';
  const android = { ...config.android };
  const installPerm = 'android.permission.REQUEST_INSTALL_PACKAGES';

  if (channel === 'github') {
    android.permissions = [...new Set([...(android.permissions ?? []), installPerm])];
  } else {
    android.permissions = (android.permissions ?? []).filter((p) => p !== installPerm);
    android.blockedPermissions = [...new Set([...(android.blockedPermissions ?? []), installPerm])];
  }

  let version = config.version;
  const m = /^v?(\d+)\.(\d+)\.(\d+)$/.exec(process.env.RELEASE_TAG ?? '');
  if (m) {
    const [major, minor, patch] = m.slice(1).map(Number);
    version = `${major}.${minor}.${patch}`;
    // 1.0.13 -> 1000013. Always above the old fixed versionCode 1.
    android.versionCode = major * 1_000_000 + minor * 1_000 + patch;
  }

  return {
    ...config,
    version,
    android,
    extra: { ...config.extra, updateChannel: channel },
  };
};
