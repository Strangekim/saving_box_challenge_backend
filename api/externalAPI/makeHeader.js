// shinhanRequest.js
// transmissionDate: YYYYMMDD (8자리)
// institutionTransactionUniqueNo: HHMMSS + YYYYMMDD + rand6 → 20자리

export async function shinhanRequest({ path, json = {}, method = 'POST', timeoutMs = 10_000 }) {
  const base = envAny('SHINHAN_URL', 'shinhanUrl');
  const url = joinUrl(base, path);

  const endpointName = lastSeg(path);
  const { yyyymmdd, hhmmss } = nowKST8();                    // ← 8자리 날짜 사용
  const dynamicCode = `${hhmmss}${yyyymmdd}${rand6()}`;      // 6 + 8 + 6 = 20
    console.log(yyyymmdd)
  const body = {
    Header: {
      apiName: endpointName,
      transmissionDate: yyyymmdd,                            // YYYYMMDD
      transmissionTime: hhmmss,                              // HHMMSS
      institutionCode: envAny('INSTITUTION_CODE', 'institutionCode'),
      fintechAppNo: envAny('FINTECH_APP_NO', 'fintechAppNo'),
      apiServiceCode: endpointName,
      institutionTransactionUniqueNo: dynamicCode,           // 20자리
      apiKey: envAny('SHINHAN_API_KEY', 'API_KEY')
    },
    ...json
  };

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify(body),
      signal: ctrl.signal
    });

    const text = await res.text();
    if (!res.ok) {
      const err = new Error(`HTTP ${res.status} ${res.statusText} :: ${text.slice(0, 300)}`);
      err.status = res.status;
      err.body = text;
      throw err;
    }
    return text ? JSON.parse(text) : null;
  } finally {
    clearTimeout(timer);
  }
}

/* ---------------- helpers ---------------- */
function envAny(...keys) {
  for (const k of keys) {
    const v = process.env[k];
    if (v) return v;
  }
  throw new Error(`Missing env: one of ${keys.join(', ')}`);
}

function joinUrl(base, path) {
  const b = String(base).replace(/\/+$/, '');
  const p = '/' + String(path || '').replace(/^\/+/, '');
  return b + p;
}

function lastSeg(p) {
  return String(p).split('?')[0].split('#')[0].split('/').filter(Boolean).pop() || '';
}

// KST 기준 YYYYMMDD / HHMMSS
function nowKST8() {
  const d = new Date(Date.now() + 9 * 3600 * 1000); // KST=UTC+9
  const yyyymmdd = `${d.getUTCFullYear()}${pad2(d.getUTCMonth() + 1)}${pad2(d.getUTCDate())}`;
  const hhmmss = `${pad2(d.getUTCHours())}${pad2(d.getUTCMinutes())}${pad2(d.getUTCSeconds())}`;
  return { yyyymmdd, hhmmss };
}

const pad2 = n => String(n).padStart(2, '0');
const rand6 = () => String(Math.floor(Math.random() * 1_000_000)).padStart(6, '0');
