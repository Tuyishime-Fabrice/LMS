import test from 'node:test';
import assert from 'node:assert/strict';
import { safeDiscordUrl, pickCommunityUrl } from '../src/features/community/discord.ts';

test('safeDiscordUrl accepts Discord invite and channel links', () => {
  assert.equal(safeDiscordUrl('https://discord.gg/dataplus'), 'https://discord.gg/dataplus');
  assert.equal(safeDiscordUrl('  https://discord.com/invite/Ab12_cd  '), 'https://discord.com/invite/Ab12_cd');
  assert.equal(safeDiscordUrl('https://discord.com/channels/123/456?x=1#y'), 'https://discord.com/channels/123/456');
});

test('safeDiscordUrl rejects anything that is not a Discord https link', () => {
  for (const value of [
    null, '', 'discord.gg/abc', 'http://discord.gg/abc', 'javascript:alert(1)', 'https://discord.gg.evil.test/abc',
    'https://evil.test/discord.gg/abc', 'https://user:pw@discord.gg/abc', 'https://discord.gg:8443/abc',
    'https://discord.gg/', 'https://discord.gg/a%20b', 'https://chat.whatsapp.com/abc',
  ]) {
    assert.equal(safeDiscordUrl(value), null, String(value));
  }
});

test('pickCommunityUrl prefers the cohort channel over the course server', () => {
  assert.deepEqual(pickCommunityUrl('https://discord.gg/cohort', 'https://discord.gg/course'), { url: 'https://discord.gg/cohort', scope: 'cohort' });
  assert.deepEqual(pickCommunityUrl('not a url', 'https://discord.gg/course'), { url: 'https://discord.gg/course', scope: 'course' });
  assert.equal(pickCommunityUrl(null, null), null);
});
