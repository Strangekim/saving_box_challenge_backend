// api/externalAPI/simpleRequest.js
export async function simpleShinhanRequest({ path, apiKey, userId, timeoutMs = 10_000 }) {
  const base = process.env.SHINHAN_URL;
  const url = `${base}${path}`;
  const body = {
    apiKey,
    userId
  };

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);

  console.log(`들어왔습니다.${JSON.stringify(body.apiKey)}`)
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json', 
        'Accept': 'application/json' 
      },
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