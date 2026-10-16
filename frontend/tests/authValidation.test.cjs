const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const Module = require("node:module");
const ts = require("typescript");

function loadValidationModule() {
  const filename = path.resolve(__dirname, "../src/authValidation.ts");
  const code = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
    },
  }).outputText;
  const mod = new Module(filename, module);
  mod.filename = filename;
  mod.paths = module.paths;
  mod._compile(code, filename);
  return mod.exports;
}

const {
  USERNAME_MIN,
  USERNAME_MAX,
  USERNAME_PATTERN,
  PASSWORD_MIN,
  PASSWORD_MAX,
  validateUsername,
  validatePassword,
  validateRecoveryKey,
  generateRecoveryFileContent,
} = loadValidationModule();

// --- CONTRACT TESTS: Backend sync checks ---

test("username constants match backend AuthService.normalize_username", () => {
  const backend = fs.readFileSync(
    path.resolve(__dirname, "../../backend/src/adaptive_backend/auth.py"),
    "utf8",
  );
  const matchRange = backend.match(/(\d+)\s*<=\s*len\(value\)\s*<=\s*(\d+)/);
  assert.ok(matchRange, "backend username length range not found");
  assert.equal(USERNAME_MIN, Number(matchRange[1]));
  assert.equal(USERNAME_MAX, Number(matchRange[2]));

  // Allowed characters
  const matchChars = backend.match(/allowed\s*=\s*set\("([^"]+)"\)/);
  assert.ok(matchChars, "backend allowed characters set not found");
  const chars = matchChars[1];
  assert.ok(chars.includes("abcdefghijklmnopqrstuvwxyz"));
  assert.ok(chars.includes("ABCDEFGHIJKLMNOPQRSTUVWXYZ"));
  assert.ok(chars.includes("0123456789"));
  assert.ok(chars.includes("._-"));
});

test("password length limits match backend AuthService.validate_password", () => {
  const backend = fs.readFileSync(
    path.resolve(__dirname, "../../backend/src/adaptive_backend/auth.py"),
    "utf8",
  );
  const matchMin = backend.match(/len\(password\)\s*<\s*(\d+)/);
  assert.ok(matchMin, "backend password min length not found");
  assert.equal(PASSWORD_MIN, Number(matchMin[1]));

  const matchMax = backend.match(/len\(password\)\s*>\s*(\d+)/);
  assert.ok(matchMax, "backend password max length not found");
  assert.equal(PASSWORD_MAX, Number(matchMax[1]));
});

// --- UNIT TESTS: Username Validation ---

test("username boundary cases: 2, 3, 64, 65 characters", () => {
  assert.equal(validateUsername("ab", "register"), "Use 3 to 64 characters.");
  assert.equal(validateUsername("abc", "register"), null);
  assert.equal(validateUsername("a".repeat(64), "register"), null);
  assert.equal(validateUsername("a".repeat(65), "register"), "Use 3 to 64 characters.");
});

test("username whitespace handling: spaces vs trailing trim", () => {
  // Inner space
  assert.equal(
    validateUsername("learner 42", "register"),
    "Letters, numbers, . _ and - only. Remove the space.",
  );
  // Leading and trailing spaces are trimmed
  assert.equal(validateUsername("   learner42   ", "register"), null);
  // Empty or whitespace-only
  assert.equal(validateUsername("    ", "register"), "Please enter your learner ID.");
  assert.equal(validateUsername("", "register"), "Please enter your learner ID.");
});

test("username allowed punctuation and disallowed characters", () => {
  assert.equal(validateUsername("jane.doe_42-x", "register"), null);
  assert.equal(validateUsername("user@school.edu", "register"), "Letters, numbers, . _ and - only.");
  assert.equal(validateUsername("learner#1", "register"), "Letters, numbers, . _ and - only.");
  assert.equal(validateUsername("student🚀", "register"), "Letters, numbers, . _ and - only.");
});

test("username sign-in mode never applies character or length limits", () => {
  // Legacy / external usernames permitted on sign in
  assert.equal(validateUsername("a", "login"), null);
  assert.equal(validateUsername("user@legacy.org", "login"), null);
  assert.equal(validateUsername("   user   ", "login"), null);
  assert.equal(validateUsername("", "login"), "Please enter your learner ID.");
  assert.equal(validateUsername("   ", "login"), "Please enter your learner ID.");
});

// --- UNIT TESTS: Password Validation ---

test("password boundary cases: 9, 10, 256, 257 characters", () => {
  assert.equal(
    validatePassword("123456789", "register"),
    "Password must contain at least 10 characters.",
  );
  assert.equal(validatePassword("1234567890", "register"), null);
  assert.equal(validatePassword("p".repeat(256), "register"), null);
  assert.equal(
    validatePassword("p".repeat(257), "register"),
    "Password is too long (maximum 256 characters).",
  );
});

test("password has deliberately NO composition rules", () => {
  // Pure lowercase
  assert.equal(validatePassword("alllowercaseletters", "register"), null);
  // Pure digits
  assert.equal(validatePassword("123456789012", "register"), null);
  // Pure symbols
  assert.equal(validatePassword("!@#$%^&*()_+", "register"), null);
});

test("password in login mode only checks non-empty", () => {
  // 8-character demo password works in sign in
  assert.equal(validatePassword("demo2026", "login"), null);
  assert.equal(validatePassword("1234", "login"), null);
  assert.equal(validatePassword("", "login"), "Please enter your password.");
});

test("password in recover mode enforces same rules as register", () => {
  assert.equal(
    validatePassword("short", "recover"),
    "Password must contain at least 10 characters.",
  );
  assert.equal(validatePassword("validPassword123", "recover"), null);
});

// --- UNIT TESTS: Recovery Key & Download Generator ---

test("validateRecoveryKey checks non-empty", () => {
  assert.equal(validateRecoveryKey(""), "Please enter your recovery key.");
  assert.equal(validateRecoveryKey("   "), "Please enter your recovery key.");
  assert.equal(validateRecoveryKey("ovrec_abc123456789"), null);
});

test("generateRecoveryFileContent includes credentials and warnings without leaking passwords", () => {
  const secretPassword = "SuperSecretPassword123!";
  const content = generateRecoveryFileContent("learner_99", "ovrec_secret_key_123", "2026-10-16T12:00:00Z");
  assert.ok(content.includes("Learner ID : learner_99"));
  assert.ok(content.includes("ovrec_secret_key_123"));
  assert.ok(content.includes("2026-10-16T12:00:00Z"));
  assert.ok(content.includes("single-use"));
  assert.ok(!content.includes(secretPassword));
});

// --- CONTRACT TEST: client.recover() endpoint & payload ---

test("client contract: recover() posts to /auth/recover with the exact JSON keys username, recovery_key, new_password", async () => {
  const clientSrc = fs.readFileSync(path.resolve(__dirname, "../src/api/client.ts"), "utf8");
  assert.match(clientSrc, /recover:\s*\([^)]*\)\s*=>/);
  assert.match(clientSrc, /["']\/auth\/recover["']/);
  assert.match(clientSrc, /username/);
  assert.match(clientSrc, /recovery_key/);
  assert.match(clientSrc, /new_password/);

  require.extensions[".ts"] = function (m, f) {
    m._compile(
      ts.transpileModule(fs.readFileSync(f, "utf8"), {
        compilerOptions: {
          module: ts.ModuleKind.CommonJS,
          target: ts.ScriptTarget.ES2022,
        },
      }).outputText,
      f,
    );
  };
  global.document = { cookie: "ovael_csrf=test_csrf" };
  const previousFetch = global.fetch;
  let postedUrl = "";
  let postedMethod = "";
  let postedBody = null;
  global.fetch = async (url, init) => {
    postedUrl = url;
    postedMethod = init?.method;
    postedBody = JSON.parse(init?.body || "{}");
    return new Response(JSON.stringify({ user_id: "u-123", recovery_key: "rec-new-456" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  };

  try {
    delete require.cache[require.resolve("../src/api/client.ts")];
    delete require.cache[require.resolve("../src/api.ts")];
    const { ovaelApi } = require("../src/api/client.ts");
    const res = await ovaelApi.recover("learner_1", "rec-old-789", "newPass12345");
    assert.equal(postedUrl, "/v1/auth/recover");
    assert.equal(postedMethod, "POST");
    assert.deepEqual(postedBody, {
      username: "learner_1",
      recovery_key: "rec-old-789",
      new_password: "newPass12345",
    });
    assert.deepEqual(res, { user_id: "u-123", recovery_key: "rec-new-456" });
  } finally {
    global.fetch = previousFetch;
  }
});

