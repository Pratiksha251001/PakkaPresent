"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

const shell = fs.readFileSync(
  "frontend/src/components/platform/PlatformShell.tsx",
  "utf8",
);
const theme = fs.readFileSync("frontend/src/context/ThemeContext.tsx", "utf8");

test("platform shell reuses the shared persistent theme context", () => {
  assert.match(shell, /useTheme/);
  assert.match(shell, /const \{ theme, toggleTheme \} = useTheme\(\)/);
  assert.match(theme, /localStorage\.setItem\(['"]edutrack_theme['"], theme\)/);
  assert.match(theme, /root\.classList\.add\(theme\)/);
});

test("platform shell exposes accessible desktop and mobile theme controls", () => {
  assert.equal((shell.match(/onClick=\{toggleTheme\}/g) || []).length, 2);
  assert.equal((shell.match(/aria-label=\{nextThemeLabel\}/g) || []).length, 2);
  assert.equal((shell.match(/title=\{nextThemeLabel\}/g) || []).length, 2);
  assert.match(shell, /Moon className="h-5 w-5"/);
  assert.match(shell, /Sun className="h-5 w-5"/);
});

test("platform sidebar follows the active light and dark theme", () => {
  assert.match(shell, /bg-\[hsl\(var\(--sidebar\)\)\]/);
  assert.match(shell, /text-\[hsl\(var\(--sidebar-foreground\)\)\]/);
  assert.match(shell, /colorMode=\{theme === "dark" \? "onDark" : undefined\}/);
  assert.doesNotMatch(shell, /bg-\[#191a23\] p-4 text-white/);
});

test("platform header keeps the theme control without a redundant shield", () => {
  assert.doesNotMatch(shell, /ShieldCheck/);
  assert.doesNotMatch(shell, /Platform security status/);
});

test("platform dashboard summary rows retain contrast in dark mode", () => {
  const dashboard = fs.readFileSync(
    "frontend/src/pages/platform/PlatformDashboard.tsx",
    "utf8",
  );
  assert.equal((dashboard.match(/dark:bg-muted\/70/g) || []).length, 2);
  assert.equal((dashboard.match(/dark:border-border\/70/g) || []).length, 2);
});
