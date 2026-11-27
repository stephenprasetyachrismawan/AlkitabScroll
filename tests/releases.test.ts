// Run: npm test
import assert from 'node:assert/strict';
import test from 'node:test';
import { formatSize, isNewer, parseRelease, pickNewest, parseVersion } from '../src/lib/releases.ts';

test('parseVersion', () => {
  assert.deepEqual(parseVersion('v1.0.13'), [1, 0, 13]);
  assert.deepEqual(parseVersion('2.10.0'), [2, 10, 0]);
  assert.equal(parseVersion('v1.0'), null);
  assert.equal(parseVersion('latest'), null);
  assert.equal(parseVersion(undefined), null);
});

test('isNewer compares numerically, not as text', () => {
  assert.equal(isNewer('v1.0.13', '1.0.12'), true);
  assert.equal(isNewer('v1.0.10', '1.0.9'), true);
  assert.equal(isNewer('v1.0.12', '1.0.12'), false);
  assert.equal(isNewer('v1.0.11', '1.0.12'), false);
  assert.equal(isNewer('v2.0.0', '1.99.99'), true);
  assert.equal(isNewer('garbage', '1.0.0'), false);
  assert.equal(isNewer('v1.0.1', null), false);
});

const base = {
  tag_name: 'v1.0.13',
  published_at: '2026-11-27T08:00:00Z',
  html_url: 'https://github.com/stephenprasetyachrismawan/AlkitabScroll/releases/tag/v1.0.13',
  assets: [
    {
      name: 'Selah-v1.0.13.apk',
      size: 54_000_000,
      browser_download_url:
        'https://github.com/stephenprasetyachrismawan/AlkitabScroll/releases/download/v1.0.13/Selah-v1.0.13.apk',
    },
  ],
};

test('parseRelease picks the APK', () => {
  const r = parseRelease(base);
  assert.ok(r);
  assert.equal(r.version, '1.0.13');
  assert.equal(r.apkName, 'Selah-v1.0.13.apk');
  assert.equal(r.size, 54_000_000);
});

test('parseRelease rejects drafts, prereleases, missing APKs and foreign hosts', () => {
  assert.equal(parseRelease({ ...base, draft: true }), null);
  assert.equal(parseRelease({ ...base, prerelease: true }), null);
  assert.equal(parseRelease({ ...base, assets: [] }), null);
  assert.equal(parseRelease({ ...base, tag_name: 'nightly' }), null);
  assert.equal(
    parseRelease({ ...base, assets: [{ ...base.assets[0], browser_download_url: 'https://evil.example/Selah.apk' }] }),
    null,
  );
  assert.equal(parseRelease(null), null);
});

test('formatSize', () => {
  assert.equal(formatSize(54_525_952), '52.0 MB');
  assert.equal(formatSize(0), '');
});

test('pickNewest takes the highest version, not the first listed', () => {
  const rel = (n: number) => ({
    ...base,
    tag_name: `v1.0.${n}`,
    assets: [{ ...base.assets[0], name: `Selah-v1.0.${n}.apk`, browser_download_url: `https://github.com/stephenprasetyachrismawan/AlkitabScroll/releases/download/v1.0.${n}/Selah-v1.0.${n}.apk` }],
  });
  assert.equal(pickNewest([rel(32), rel(37), rel(35), { ...rel(40), draft: true }])?.version, '1.0.37');
  assert.equal(pickNewest([]), null);
  assert.equal(pickNewest(rel(5))?.version, '1.0.5');
});
