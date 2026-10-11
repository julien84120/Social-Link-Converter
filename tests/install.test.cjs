const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');

function runInstaller(overrides = {}, tty = false) {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'install test '));
  const app = path.join(temp, 'app with spaces');
  const bin = path.join(temp, 'bin');
  fs.mkdirSync(app); fs.mkdirSync(bin);
  const log = path.join(temp, 'commands');
  const mocks = {
    docker: 'printf "docker %s | %s\\n" "$*" "$PWD" >> "$MOCK_LOG"\ncase "$*" in\n "compose up -d --build --wait") exit "${UP_EXIT:-0}" ;;\n "compose port link-converter 80") printf "%s\\n" "$PUBLICATION"; exit "${PORT_EXIT:-0}" ;;\n *) exit 98 ;;\nesac',
    uname: 'printf "%s\\n" "$PLATFORM"',
    ip: 'printf "ip %s\\n" "$*" >> "$MOCK_LOG"\nprintf "%s\\n" "$IP_ROUTE"',
    route: 'printf "route %s\\n" "$*" >> "$MOCK_LOG"\nprintf "%s\\n" "$MAC_ROUTE"',
    ipconfig: 'printf "ipconfig %s\\n" "$*" >> "$MOCK_LOG"\nprintf "%s\\n" "$MAC_IP"',
  };
  for (const [name, body] of Object.entries(mocks)) {
    fs.writeFileSync(path.join(bin, name), `#!/bin/sh\n${body}\n`, { mode: 0o755 });
  }
  try {
    const source = path.join(root, 'install.sh');
    if (fs.existsSync(source)) fs.copyFileSync(source, path.join(app, 'install.sh'));
    // A hostile .env must never be sourced; publication is Docker's authority.
    fs.writeFileSync(path.join(app, '.env'), 'echo ENV_EXECUTED\nPORT=1234\n');
    const installer = path.join(app, 'install.sh');
    const args = !tty ? [installer] : ['-c', [
      'import os, pty, subprocess, sys',
      'master, slave = pty.openpty()',
      'child = subprocess.Popen(["/bin/sh", sys.argv[1]], stdin=slave, stdout=slave, stderr=slave)',
      'os.close(slave)',
      'while True:',
      ' try: data = os.read(master, 4096)',
      ' except OSError: break',
      ' if not data: break',
      ' sys.stdout.buffer.write(data)',
      'os.close(master)',
      'sys.exit(child.wait())',
    ].join('\n'), installer];
    const result = spawnSync(tty ? 'python3' : '/bin/sh', args, {
      cwd: temp, encoding: 'utf8',
      env: { ...process.env, PATH: `${bin}:${process.env.PATH}`, MOCK_LOG: log,
        PLATFORM: 'Linux', PUBLICATION: '0.0.0.0:9876',
        IP_ROUTE: '1.1.1.1 via 192.0.2.1 dev eth0 src 192.0.2.42 uid 501',
        MAC_ROUTE: '   interface: en7', MAC_IP: '192.0.2.43', ...overrides },
    });
    return { ...result, commands: fs.existsSync(log) ? fs.readFileSync(log, 'utf8') : '', app };
  } finally { fs.rmSync(temp, { recursive: true, force: true }); }
}

test('PowerShell source includes the installation and safe output contract (not runtime verification)', () => {
  assert.ok(fs.existsSync(path.join(root, 'install.ps1')));
  const source = fs.readFileSync(path.join(root, 'install.ps1'), 'utf8');
  assert.match(source, /Set-Location -LiteralPath \$PSScriptRoot/);
  assert.match(source, /docker compose up -d --build --wait/);
  assert.match(source, /docker compose port link-converter 80/);
  assert.match(source, /\$LASTEXITCODE/);
  assert.match(source, /Get-NetIPConfiguration/);
  assert.match(source, /IPv4DefaultGateway/);
  assert.match(source, /IsOutputRedirected/);
  assert.match(source, /PipelineLength/);
  assert.match(source, /if \(\$bind -eq '127\.0\.0\.1' -or \$bind -eq '::1'\)/);
  assert.match(source, /Write-Link 'Local' "http:\/\/\$\{bind\}:\$port"/);
  assert.doesNotMatch(source, /Invoke-Expression|Get-Content.*\.env/i);
});

test('advertised URLs carry no reachability guarantee', () => {
  const r = runInstaller();
  assert.match(r.stdout, /non garanti/i);
});

test('TTY output includes OSC8 labels as well as raw URLs', t => {
  if (spawnSync('python3', ['-c', 'import pty']).status !== 0) {
    t.skip('Optional PTY test needs Python 3 standard library; no packages are installed.');
    return;
  }
  const r = runInstaller({}, true);
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /\x1b\]8;;http:\/\/localhost:9876\x1b\\Local/);
  assert.match(r.stdout, /http:\/\/localhost:9876\r?\n/);
  assert.match(r.stdout, /http:\/\/192\.0\.2\.42:9876\r?\n/);
});

test('publication failures do not print success links', () => {
  for (const config of [{ UP_EXIT: '7' }, { PORT_EXIT: '8' }, { PUBLICATION: '' },
    { PUBLICATION: 'garbage' }, { PUBLICATION: '0.0.0.0:99999' }]) {
    const r = runInstaller(config);
    assert.notEqual(r.status, 0);
    assert.doesNotMatch(r.stdout, /http:\/\//);
    if (config.UP_EXIT) assert.doesNotMatch(r.commands, /compose port/);
  }
});

test('dual-stack publication prefers IPv4; IPv6-only publication warns safely', () => {
  const dual = runInstaller({ PUBLICATION: '[::]:9876\n0.0.0.0:9876' });
  assert.equal(dual.status, 0, dual.stderr);
  assert.match(dual.stdout, /http:\/\/192\.0\.2\.42:9876/);
  for (const PUBLICATION of ['[::]:9876', '[2001:db8::2]:9876']) {
    const r = runInstaller({ PUBLICATION });
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stdout, /IPv6/);
    assert.doesNotMatch(r.stdout, /http:\/\/192\.|http:\/\/\[/);
  }
});

test('missing or invalid detected IP produces a warning, never an invented URL', () => {
  for (const IP_ROUTE of ['', 'default src 999.2.3.4', 'default src 127.0.0.1']) {
    const r = runInstaller({ IP_ROUTE });
    assert.equal(r.status, 0, r.stderr);
    assert.deepEqual(r.stdout.match(/http:\/\/\S+/g), ['http://localhost:9876']);
    assert.match(r.stdout, /IPv4.*détect/i);
  }
});

test('explicit IPv4 bind is used instead of detected IP and localhost is qualified', () => {
  const r = runInstaller({ PUBLICATION: '192.0.2.99:4321' });
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /http:\/\/192\.0\.2\.99:4321/);
  assert.match(r.stdout, /localhost:4321.*indisponible/i);
  assert.doesNotMatch(r.commands, /ip -4/);
});

test('loopback publication uses the bound endpoint and never advertises a remote URL', () => {
  for (const [PUBLICATION, url] of [
    ['127.0.0.1:8888', 'http://localhost:8888'],
    ['[::1]:8888', 'http://localhost:8888'],
    ['::1:8888', 'http://localhost:8888'],
    ['127.0.0.2:9876', 'http://127.0.0.2:9876'],
  ]) {
    const r = runInstaller({ PUBLICATION });
    assert.equal(r.status, 0, r.stderr);
    assert.deepEqual(r.stdout.match(/http:\/\/\S+/g), [url], PUBLICATION);
    assert.doesNotMatch(r.stdout, /Réseau :/);
    assert.match(r.stdout, /loopback/i);
    assert.doesNotMatch(r.commands, /ip -4/);
  }
});

test('macOS uses the default route interface', () => {
  const r = runInstaller({ PLATFORM: 'Darwin' });
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /http:\/\/192\.0\.2\.43:9876/);
  assert.match(r.commands, /route -n get default/);
  assert.match(r.commands, /ipconfig getifaddr en7/);
});

test('Linux installer uses actual publication and runs in its own spaced directory', () => {
  const r = runInstaller();
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /http:\/\/localhost:9876/);
  assert.match(r.stdout, /http:\/\/192\.0\.2\.42:9876/);
  assert.match(r.commands, /ip -4 route get 1\.1\.1\.1/);
  assert.ok(r.commands.startsWith(`docker compose up -d --build --wait | ${r.app}\n`));
  assert.match(r.commands, /docker compose port link-converter 80/);
  assert.doesNotMatch(r.stdout, /ENV_EXECUTED|1234|\x1b/);
});
