import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(new URL("..", import.meta.url).pathname.replace(/\/$/, ""));
const read = (file) => fs.readFileSync(path.join(ROOT, file), "utf8");

 test("V13: protected role changes are blocked server-side", () => {
  const s = read("src/lib/nyxoshi/server.ts");
  assert.match(s, /currentTargetRole\s*=\s*await getRole\(sql, targetUserId\)/);
  assert.match(s, /Cargos protegidos não podem ser alterados/);
  assert.match(s, /getRole, requireFounder/);
});

test("V13: report-moderator removal uses permanent id", () => {
  const s = read("src/routes/founders.tsx");
  assert.match(s, /changeReportModerator\(u\.permanent_id,false\)/);
});

test("V13: mobile message tabs and profile actions use bounded layouts", () => {
  const m = read("src/routes/messages.tsx");
  const p = read("src/routes/u.$username.tsx");
  assert.match(m, /grid-cols-2[^"`]*sm:grid-cols-4/);
  assert.match(p, /profile-primary-actions grid min-w-0 grid-cols-2/);
  assert.match(p, /profile-icon-actions mt-2 grid grid-cols-5/);
  assert.match(p, /disabled=\{actionBusy !== null\}/);
});

test("V13: auth/profile boot has recovery timeouts", () => {
  const shell = read("src/components/signed-shell.tsx");
  const me = read("src/hooks/use-me.ts");
  assert.match(shell, /AUTH_BOOT_TIMEOUT_MS\s*=\s*8_000/);
  assert.match(shell, /Sua conta não foi alterada/);
  assert.match(me, /PROFILE_BOOT_TIMEOUT_MS\s*=\s*12_000/);
});

test("V15: public profile reads do not sync roles and own profile avoids inline media", () => {
  const s = read("src/lib/nyxoshi/server.ts");
  const hydrate = s.slice(s.indexOf("async function hydrateProfile"), s.indexOf("export const ensureMyProfile"));
  assert.match(hydrate, /const role = await getRole\(sql, row\.user_id\)/);
  assert.doesNotMatch(hydrate, /syncRoleForUser/);
  assert.match(s, /hydrateProfile\(sql, row, context\.userId, \{ inlineMedia: false \}\)/);
});

test("V15: profile media fields accept internal media endpoints without treating them as external URLs", () => {
  const s = read("src/routes/settings.tsx");
  assert.match(s, /\/api\/profile-media\//);
  assert.match(s, /arquivo atual não é reenviado/);
});

test("V16/V17: ambiguous OGG/WebM URLs require explicit media type", () => {
  const v = read("src/lib/nyxoshi/validations.ts");
  const c = read("src/components/compose.tsx");
  assert.match(v, /directUrlMediaTypes/);
  assert.match(v, /matches\.length > 1/);
  assert.match(c, /types\.length > 1/);
  assert.match(c, /Escolha se esta URL é áudio ou vídeo/);
});

test("V16/V17: media metadata probe cannot hang forever", () => {
  const c = read("src/components/compose.tsx");
  assert.match(c, /setTimeout\(\(\) => finish\(null\), 2500\)/);
});

test("V16/V17: local media and thumbnails use dedicated routes", () => {
  const s = read("src/lib/nyxoshi/server.ts");
  assert.match(s, /\/api\/media\//);
  assert.match(s, /part=thumbnail/);
  assert.match(s, /\/api\/profile-media\//);
});

test("AI-named source files are absent", () => {
  const bad = [];
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (["node_modules", ".git", "dist", ".next"].includes(entry.name)) continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (/(grok|gemini|openai|claude|llama|mistral)/i.test(entry.name)) bad.push(path.relative(ROOT, full));
    }
  };
  walk(ROOT);
  assert.deepEqual(bad, []);
});
