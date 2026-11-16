import child_process from 'node:child_process';

export function dangerous(req, element) {
  // ruleid: natadecoco.js-dynamic-code
  eval(req.body.code);
  // ruleid: natadecoco.js-dynamic-code
  const fn = new Function('return 1');
  // ruleid: natadecoco.js-tls-verification-disabled
  const insecure = { rejectUnauthorized: false };
  const html = req.query.html;
  // ruleid: natadecoco.js-input-to-html
  element.innerHTML = html;
  const cmd = req.body.command;
  // ruleid: natadecoco.js-input-to-shell
  child_process.exec(cmd);
  const url = req.params.url;
  // ruleid: natadecoco.js-input-to-fetch
  fetch(url);
  return [fn, insecure];
}

export function safe(req, element) {
  // ok: natadecoco.js-dynamic-code
  const data = JSON.parse(req.body.code);
  // ok: natadecoco.js-tls-verification-disabled
  const secure = { rejectUnauthorized: true };
  // ok: natadecoco.js-input-to-html
  element.textContent = req.query.html;
  // ok: natadecoco.js-input-to-shell
  child_process.execFile('/usr/bin/printf', ['%s', req.body.command]);
  // ok: natadecoco.js-input-to-fetch
  fetch('/api/health');
  return [data, secure];
}
