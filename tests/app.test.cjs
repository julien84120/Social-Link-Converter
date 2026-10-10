const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const html = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
function app(options = {}) {
    const nodes = {};
    const makeNode = () => ({ value: '', innerText: '', textContent: '', checked: true, style: {}, attributes: {},
        classList: { add() {}, remove() {} }, addEventListener() {}, focus() {}, select() {},
        setAttribute(key, value) { this.attributes[key] = value; }, removeAttribute(key) { delete this.attributes[key]; } });
    const document = { getElementById(id) { return nodes[id] ||= makeNode(); },
        createElement: makeNode, body: { appendChild() {}, removeChild() {} },
        execCommand: options.execCommand || (() => true) };
    const context = vm.createContext({ document, URL, navigator: options.navigator || {},
        window: { isSecureContext: options.secure ?? false }, alert() {}, setTimeout() {} });
    vm.runInContext(html.match(/<script>([\s\S]*?)<\/script>/)[1], context);
    return { context, nodes, convert(value, clean = true, translate = true) {
        document.getElementById('urlInput').value = value;
        document.getElementById('removeTrackers').checked = clean;
        document.getElementById('translateFr').checked = translate;
        context.convertUrl();
        return document.getElementById('newUrl').innerText;
    } };
}
test('exact supported hostnames cannot rewrite attacker suffixes or embedded URLs', () => {
    for (const value of ['https://x.com.evil.test/u/status/1', 'https://example.org/?url=https://x.com/u/status/1', 'https://evilinstagram.com/p/1']) {
        assert.equal(app().convert(value, false), value);
    }
});
test('translation belongs in status path only and is idempotent', () => {
    const a = app();
    assert.equal(a.convert('https://x.com/user/status/123?s=20#media', false), 'https://fixupx.com/user/status/123/fr?s=20#media');
    assert.equal(a.convert('https://fixupx.com/user/status/123/fr?s=20', false), 'https://fixupx.com/user/status/123/fr?s=20');
    assert.equal(a.convert('https://x.com/user'), 'https://fixupx.com/user');
    assert.equal(a.convert('https://x.com/user/status/not-a-number'), 'https://fixupx.com/user/status/not-a-number');
    assert.equal(a.convert('https://twitter.com/user/status/123/'), 'https://fixupx.com/user/status/123/fr');
    assert.equal(a.convert('https://fxtwitter.com/user/status/123'), 'https://fxtwitter.com/user/status/123/fr');
    assert.equal(a.convert('https://x.com/user/status/123?s=20#media'), 'https://fixupx.com/user/status/123/fr#media');
});
test('empty or malformed input clears a previous result without throwing', () => {
    for (const value of ['', '   ', 'https://', 'http://[oops', 'javascript:alert(1)', 'https://name:secret@x.com/u/status/1']) {
        const a = app();
        a.convert('https://x.com/u/status/1');
        assert.doesNotThrow(() => a.convert(value));
        assert.equal(a.nodes.newUrl.innerText, '');
        assert.equal(a.nodes.resultBox.style.display, 'none');
    }
    assert.equal(app().convert(' HTTPS://WWW.X.COM/u/status/1 '), 'https://fixupx.com/u/status/1/fr');
});
test('clipboard rejection falls back and false or thrown fallback reports failure', async () => {
    for (const outcome of [true, false, 'throw']) {
        let fallbackCalls = 0;
        const a = app({ secure: true, navigator: { clipboard: { async writeText() { throw new Error('denied'); } } },
            execCommand() { fallbackCalls++; if (outcome === 'throw') throw new Error('blocked'); return outcome; } });
        a.convert('https://reddit.com/r/test');
        assert.equal(await a.context.copyUrl(), outcome === true);
        assert.equal(fallbackCalls, 1);
        assert.match(a.nodes.copyStatus.innerText, outcome === true ? /copié/ : /impossible/i);
    }
});
test('accessible responsive page includes the local cropped logo and live feedback', () => {
    assert.match(html, /<label[^>]+for="urlInput"/);
    assert.match(html, /id="urlInput"[^>]+aria-describedby="errorMessage"/);
    assert.match(html, /id="errorMessage"[^>]+role="alert"/);
    assert.match(html, /id="newUrl"[^>]+aria-live="polite"/);
    assert.match(html, /box-sizing:\s*border-box/);
    assert.match(html, /overflow-wrap:\s*anywhere/);
    assert.match(html, /@media\s*\(max-width:\s*480px\)/);
    assert.match(html, /src="assets\/logo.png"[^>]+alt="Social Link Converter"/);
    assert.ok(fs.existsSync(path.join(__dirname, '../assets/logo.png')));
    assert.match(html, /&copy; 2026 Copyright Julien\. Tous droits réservés\./);
    assert.doesNotMatch(html, /<(?:script|link)[^>]+(?:src|href)="https?:/);
});
test('validation and reset clear accessible error and copy feedback', () => {
    const a = app();
    a.convert('invalid');
    assert.equal(a.nodes.urlInput.attributes['aria-invalid'], 'true');
    a.convert('https://reddit.com/r/test');
    assert.equal(a.nodes.urlInput.attributes['aria-invalid'], 'false');
    a.nodes.copyStatus.innerText = 'Lien copié';
    a.context.clearFields();
    assert.equal(a.nodes.newUrl.innerText, '');
    assert.equal(a.nodes.copyStatus.innerText, '');
});
test('modern clipboard success copies exactly the generated URL', async () => {
    let copied;
    const a = app({ secure: true, navigator: { clipboard: { async writeText(text) { copied = text; } } }, execCommand() { throw new Error('fallback must not run'); } });
    const expected = a.convert('https://instagram.com/p/123');
    assert.equal(await a.context.copyUrl(), true);
    assert.equal(copied, expected);
});
test('HTTP clipboard fallback works and empty result is not copied', async () => {
    let calls = 0;
    const a = app({ execCommand() { calls++; return true; } });
    assert.equal(await a.context.copyUrl(), false);
    assert.equal(calls, 0);
    a.convert('http://tiktok.com/@user/video/123');
    assert.equal(await a.context.copyUrl(), true);
    assert.equal(calls, 1);
});
test('query removal preserves fragments and disabling translation preserves status path', () => {
    assert.equal(app().convert('https://reddit.com/r/test?utm_source=x#comments'), 'https://vxreddit.com/r/test#comments');
    assert.equal(app().convert('https://x.com/user/status/123?s=20', false, false), 'https://fixupx.com/user/status/123?s=20');
});
test('preserves all four supplied network mappings', () => {
    for (const [source, target] of [['x.com', 'fixupx.com'], ['twitter.com', 'fixupx.com'], ['instagram.com', 'kirkstagram.com'], ['tiktok.com', 'vxtiktok.com'], ['reddit.com', 'vxreddit.com']]) {
        assert.equal(app().convert(`https://www.${source}/path`, false, false), `https://${target}/path`);
    }
});
