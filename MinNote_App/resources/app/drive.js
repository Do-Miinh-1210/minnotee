/*
 * =============================================================================
 * BẢN QUYỀN SỞ HỮU TRÍ TUỆ — ĐỖ MIINH MATH (MINNOTE PROPRIETARY)
 * Copyright (c) 2026 Đỗ Miinh Math. All Rights Reserved.
 * DM-COPYRIGHT-OWNER: DoMiinhMath
 * SPDX-License-Identifier: LicenseRef-Proprietary-DoMiinhMath
 * TDM-Reservation: 1
 * -----------------------------------------------------------------------------
 * Đây là bản quyền thuộc sở hữu độc quyền của Đỗ Miinh Math (MinNote).
 * Nghiêm cấm sao chép, phân phối lại, dịch ngược (reverse engineering),
 * giải biên dịch (decompilation), tách thuật toán hoặc sử dụng công cụ AI/LLM
 * tự động trích xuất, tái tạo, huấn luyện trên mã nguồn này khi chưa có sự
 * đồng ý bằng văn bản từ Đỗ Miinh Math.
 * Proprietary & Confidential. Reverse engineering, decompilation, and automated
 * AI/LLM extraction, reconstruction, or training are strictly prohibited.
 * =============================================================================
 */
// MinNote Google Drive Cloud Sync Engine
// OAuth 2.0 loopback flow + Google Drive v3 REST proxy with safeStorage encryption
const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const { shell, safeStorage } = require('electron');

const _d = (h) => [...Buffer.from(h, 'hex').toString('latin1')].map(c => String.fromCharCode(c.charCodeAt(0) ^ 42)).join('');
const CLIENT_ID = _d('1d1f1d121d1d1f1d1a121319071e455c5948124d194e495b4c444d595846191913194e464c5b5b465e5b5b191b044b5a5a59044d45454d464f5f594f584945445e4f445e04494547');
const CLIENT_SECRET = _d('6d6569797a72077a487e7f72727b1a75757c78616e6d726950186d4d73625307584761');
const SCOPE = 'https://www.googleapis.com/auth/drive.file';
const AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';

function getTokenPath(userDataDir) {
  return path.join(userDataDir, 'drive-token.bin');
}

function saveToken(userDataDir, tokenData) {
  const jsonStr = JSON.stringify(tokenData);
  const p = getTokenPath(userDataDir);
  if (safeStorage && safeStorage.isEncryptionAvailable()) {
    const enc = safeStorage.encryptString(jsonStr);
    fs.writeFileSync(p, enc);
  } else {
    fs.writeFileSync(p, Buffer.from(jsonStr).toString('base64'), 'utf8');
  }
}

function loadToken(userDataDir) {
  const p = getTokenPath(userDataDir);
  if (!fs.existsSync(p)) return null;
  try {
    const raw = fs.readFileSync(p);
    let str;
    if (safeStorage && safeStorage.isEncryptionAvailable()) {
      str = safeStorage.decryptString(raw);
    } else {
      str = Buffer.from(raw.toString('utf8'), 'base64').toString('utf8');
    }
    return JSON.parse(str);
  } catch (_) {
    return null;
  }
}

function postForm(urlStr, data) {
  return new Promise((resolve, reject) => {
    const body = new URLSearchParams(data).toString();
    const url = new URL(urlStr);
    const req = https.request(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(body)
      }
    }, res => {
      let chunks = '';
      res.on('data', d => chunks += d);
      res.on('end', () => {
        try {
          const json = JSON.parse(chunks);
          if (res.statusCode >= 200 && res.statusCode < 300) resolve(json);
          else reject(new Error(json.error_description || json.error || 'Request failed'));
        } catch (e) {
          reject(e);
        }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

async function getAccessToken(userDataDir) {
  const token = loadToken(userDataDir);
  if (!token) return null;
  if (token.expires_at && Date.now() < token.expires_at - 60000) {
    return token.access_token;
  }
  if (!token.refresh_token) return null;

  try {
    const refreshed = await postForm(TOKEN_URL, {
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      refresh_token: token.refresh_token,
      grant_type: 'refresh_token'
    });
    token.access_token = refreshed.access_token;
    token.expires_at = Date.now() + (refreshed.expires_in || 3600) * 1000;
    saveToken(userDataDir, token);
    return token.access_token;
  } catch (_) {
    return null;
  }
}

function startOAuth(userDataDir) {
  return new Promise((resolve, reject) => {
    let closed = false;
    const server = http.createServer(async (req, res) => {
      try {
        const u = new URL(req.url, 'http://127.0.0.1');
        const code = u.searchParams.get('code');
        if (code) {
          res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
          res.end('<!DOCTYPE html><html><body style="font-family:sans-serif;text-align:center;padding:50px;background:#18181b;color:#f4f4f5"><h2>Đăng nhập Google Drive thành công!</h2><p>Bạn có thể đóng cửa sổ này và quay lại MinNote.</p></body></html>');
          if (!closed) { closed = true; server.close(); }

          const tokenRes = await postForm(TOKEN_URL, {
            client_id: CLIENT_ID,
            client_secret: CLIENT_SECRET,
            code: code,
            redirect_uri: `http://127.0.0.1:${server.address().port}`,
            grant_type: 'authorization_code'
          });

          tokenRes.expires_at = Date.now() + (tokenRes.expires_in || 3600) * 1000;
          saveToken(userDataDir, tokenRes);
          resolve(true);
        } else {
          res.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' });
          res.end('<!DOCTYPE html><html><body><h2>Đăng nhập không thành công.</h2></body></html>');
          if (!closed) { closed = true; server.close(); }
          reject(new Error('noCode'));
        }
      } catch (err) {
        if (!closed) { closed = true; server.close(); }
        reject(err);
      }
    });

    server.listen(0, '127.0.0.1', () => {
      const port = server.address().port;
      const redirectUri = `http://127.0.0.1:${port}`;
      const authUrl = `${AUTH_URL}?client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent(SCOPE)}&access_type=offline&prompt=consent`;
      shell.openExternal(authUrl);
    });

    setTimeout(() => {
      if (!closed) {
        closed = true;
        try { server.close(); } catch (_) {}
        reject(new Error('timeout'));
      }
    }, 120000);
  });
}

function signOut(userDataDir) {
  const p = getTokenPath(userDataDir);
  if (fs.existsSync(p)) {
    try { fs.unlinkSync(p); } catch (_) {}
  }
  return true;
}

function state(userDataDir) {
  const token = loadToken(userDataDir);
  return token && (token.refresh_token || token.access_token) ? 'signedIn' : 'signedOut';
}

async function request(userDataDir, opts) {
  let token = await getAccessToken(userDataDir);
  if (!token) {
    return { status: 401, body: JSON.stringify({ error: { code: 401, message: 'signedOut' } }) };
  }

  const makeReq = (bearerToken) => new Promise((resolve) => {
    try {
      const url = new URL(opts.url);
      const headers = {
        'Authorization': `Bearer ${bearerToken}`,
        'User-Agent': 'MinNote/0.8.8'
      };
      if (opts.type) headers['Content-Type'] = opts.type;

      let bodyData = null;
      if (opts.body) {
        if (typeof opts.body === 'string') {
          bodyData = Buffer.from(opts.body, 'utf8');
        } else if (Buffer.isBuffer(opts.body)) {
          bodyData = opts.body;
        } else if (opts.body instanceof Uint8Array || Array.isArray(opts.body)) {
          bodyData = Buffer.from(opts.body);
        }
        if (bodyData) {
          headers['Content-Length'] = bodyData.length;
        }
      }

      const client = url.protocol === 'http:' ? http : https;
      const req = client.request(url, {
        method: opts.method || 'GET',
        headers: headers
      }, (res) => {
        const chunks = [];
        res.on('data', c => chunks.push(c));
        res.on('end', () => {
          const buf = Buffer.concat(chunks);
          if (opts.binary) {
            resolve({ status: res.statusCode, body: new Uint8Array(buf) });
          } else {
            resolve({ status: res.statusCode, body: buf.toString('utf8') });
          }
        });
      });

      req.on('error', (err) => {
        resolve({ status: 500, body: JSON.stringify({ error: { message: err.message } }) });
      });

      if (bodyData) {
        req.write(bodyData);
      }
      req.end();
    } catch (e) {
      resolve({ status: 500, body: JSON.stringify({ error: { message: e.message } }) });
    }
  });

  let res = await makeReq(token);
  if (res.status === 401) {
    // Retry once with refreshed token
    token = await getAccessToken(userDataDir);
    if (token) {
      res = await makeReq(token);
    }
  }
  return res;
}

module.exports = {
  state,
  signIn: startOAuth,
  signOut,
  request,
  getAccessToken
};
/* [DM-COPYRIGHT-CORE: DoMiinhMath] Copyright (c) 2026 Đỗ Miinh Math — MinNote Proprietary (TDM-Reservation: 1). */
