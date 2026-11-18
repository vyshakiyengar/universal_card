import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { makeCardPayload } from "../lib/cards";
import { createWalletPass, readWalletConfiguration, WalletUnavailableError } from "../lib/server/wallet";

test("Wallet configuration fails closed when credentials are missing or malformed", () => {
  assert.throws(() => readWalletConfiguration({}), WalletUnavailableError);
  assert.throws(() => readWalletConfiguration({
    APPLE_WALLET_PASS_TYPE_ID: "pass.com.example.universalcard",
    APPLE_WALLET_TEAM_ID: "TESTTEAM01",
    APPLE_WALLET_ORGANIZATION_NAME: "Universal Card Test",
    APPLE_WALLET_SIGNER_CERT_BASE64: "invalid!",
  }), WalletUnavailableError);
});

const signingToolsAvailable = spawnSync("openssl", ["version"]).status === 0 &&
  spawnSync("unzip", ["-v"]).status === 0;

test("Wallet bundle has a verified detached signature and the exact UTF-8 QR payload", {
  skip: !signingToolsAvailable && "OpenSSL and unzip are required to verify the signed test bundle",
}, (context) => {
  const dir = mkdtempSync(join(tmpdir(), "universal-card-signing-"));
  context.after(() => rmSync(dir, { recursive: true, force: true }));

  function openssl(...args: string[]) {
    return execFileSync("openssl", args, { cwd: dir, stdio: ["ignore", "pipe", "pipe"] });
  }

  writeFileSync(join(dir, "extensions.cnf"), [
    "[ca]",
    "basicConstraints=critical,CA:TRUE,pathlen:0",
    "keyUsage=critical,keyCertSign,cRLSign",
    "[signer]",
    "basicConstraints=critical,CA:FALSE",
    "keyUsage=critical,digitalSignature",
  ].join("\n"));

  const identity = "pass.com.example.universalcard";
  const team = "TESTTEAM01";
  const passphrase = "temporary-test-key-password";
  openssl("req", "-x509", "-newkey", "rsa:2048", "-nodes", "-days", "2",
    "-subj", "/CN=Universal Card Test Root", "-keyout", "root.key", "-out", "root.pem",
    "-addext", "basicConstraints=critical,CA:TRUE");
  openssl("req", "-new", "-newkey", "rsa:2048", "-nodes", "-subj", "/CN=Universal Card Test Intermediate",
    "-keyout", "intermediate.key", "-out", "intermediate.csr");
  openssl("x509", "-req", "-days", "2", "-in", "intermediate.csr", "-CA", "root.pem", "-CAkey", "root.key",
    "-CAcreateserial", "-extfile", "extensions.cnf", "-extensions", "ca", "-out", "intermediate.pem");
  openssl("req", "-new", "-newkey", "rsa:2048", "-passout", `pass:${passphrase}`,
    "-subj", `/CN=Universal Card Test Signer/UID=${identity}/OU=${team}`,
    "-keyout", "signer.key", "-out", "signer.csr");
  openssl("x509", "-req", "-days", "2", "-in", "signer.csr", "-CA", "intermediate.pem", "-CAkey", "intermediate.key",
    "-CAcreateserial", "-extfile", "extensions.cnf", "-extensions", "signer", "-out", "signer.der", "-outform", "DER");

  const config = {
    APPLE_WALLET_PASS_TYPE_ID: identity,
    APPLE_WALLET_TEAM_ID: team,
    APPLE_WALLET_ORGANIZATION_NAME: "Universal Card Test",
    APPLE_WALLET_SIGNER_CERT_BASE64: readFileSync(join(dir, "signer.der")).toString("base64"),
    APPLE_WALLET_SIGNER_KEY_BASE64: readFileSync(join(dir, "signer.key")).toString("base64"),
    APPLE_WALLET_WWDR_CERT_BASE64: readFileSync(join(dir, "intermediate.pem")).toString("base64"),
    APPLE_WALLET_SIGNER_KEY_PASSPHRASE: passphrase,
  };
  assert.throws(() => readWalletConfiguration({ ...config, APPLE_WALLET_TEAM_ID: "BADTEAM001" }), WalletUnavailableError);
  assert.throws(() => readWalletConfiguration({ ...config, APPLE_WALLET_SIGNER_KEY_PASSPHRASE: "wrong" }), WalletUnavailableError);
  assert.throws(() => readWalletConfiguration({
    ...config, APPLE_WALLET_SIGNER_KEY_BASE64: readFileSync(join(dir, "root.key")).toString("base64"),
  }), WalletUnavailableError);
  const signing = readWalletConfiguration(config);

  const draft = {
    type: "universal",
    title: "Conference",
    name: "Zoë 李",
    emails: [{ label: "work", value: "zoe@example.com" }],
  };
  const id = "12345678-1234-4234-8234-123456789abc";
  writeFileSync(join(dir, "card.pkpass"), createWalletPass({ id, draft }, signing));

  function readPassFile(file: string) {
    return execFileSync("unzip", ["-p", "card.pkpass", file], { cwd: dir });
  }

  const manifest = readPassFile("manifest.json");
  const hashes = JSON.parse(manifest.toString()) as Record<string, string>;
  const imageNames = ["icon.png", "icon@2x.png", "icon@3x.png"];
  const logoNames = ["logo.png", "logo@2x.png", "logo@3x.png"];
  assert.deepEqual(Object.keys(hashes).sort(), [...imageNames, ...logoNames, "pass.json"].sort());
  for (const [file, hash] of Object.entries(hashes)) {
    assert.equal(createHash("sha1").update(readPassFile(file)).digest("hex"), hash);
  }

  for (const [index, name] of imageNames.entries()) {
    const icon = readPassFile(name);
    const size = 38 * (index + 1);
    assert.equal(icon.readUInt32BE(16), size);
    assert.equal(icon.readUInt32BE(20), size);
  }
  for (const [index, name] of logoNames.entries()) {
    const logo = readPassFile(name);
    assert.equal(logo.readUInt32BE(16), 112 * (index + 1));
    assert.equal(logo.readUInt32BE(20), 50 * (index + 1));
  }

  writeFileSync(join(dir, "manifest.json"), manifest);
  writeFileSync(join(dir, "signature"), readPassFile("signature"));
  const verified = openssl("smime", "-verify", "-binary", "-inform", "DER", "-in", "signature",
    "-content", "manifest.json", "-CAfile", "root.pem", "-purpose", "any");
  assert.deepEqual(verified, manifest);
  writeFileSync(join(dir, "modified.json"), Buffer.concat([manifest, Buffer.from(" ")]));
  assert.throws(() => openssl("smime", "-verify", "-binary", "-inform", "DER", "-in", "signature",
    "-content", "modified.json", "-CAfile", "root.pem", "-purpose", "any"));

  const pass = JSON.parse(readPassFile("pass.json").toString());
  assert.equal(pass.serialNumber, id);
  assert.equal(pass.passTypeIdentifier, identity);
  assert.equal(pass.teamIdentifier, team);
  assert.equal(pass.formatVersion, 1);
  assert.equal(pass.generic.primaryFields[0].value, draft.name);
  assert.equal(JSON.stringify(pass).includes(draft.title), false);
  assert.deepEqual(pass.barcodes, [{
    format: "PKBarcodeFormatQR",
    message: makeCardPayload(draft).payload,
    messageEncoding: "utf-8",
    altText: "Scan to save contact",
  }]);
  assert.equal(pass.webServiceURL, undefined);

  const linkedIn = {
    type: "individual",
    title: "LinkedIn",
    name: "Zoë 李",
    kind: "linkedin",
    value: "https://www.linkedin.com/in/zoe-example/?tracking=ignored",
  };
  writeFileSync(join(dir, "card.pkpass"), createWalletPass({ id, draft: linkedIn }, signing));
  const linkedInPass = JSON.parse(readPassFile("pass.json").toString());
  assert.equal(linkedInPass.generic.primaryFields[0].value, linkedIn.name);
  assert.equal(linkedInPass.generic.secondaryFields?.length ?? 0, 0);
  assert.equal(linkedInPass.barcodes[0].message, "https://www.linkedin.com/in/zoe-example");
});
