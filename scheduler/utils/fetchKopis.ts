const BROWSER_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  Accept: 'application/xml, text/xml, */*;q=0.9',
};

export async function fetchKopis(url: string): Promise<string> {
  const res = await fetch(url, { headers: BROWSER_HEADERS });
  if (!res.ok) {
    const body = await res.text().catch(() => '(body read 실패)');
    throw new Error(`HTTP ${res.status} — ${url}\n응답 바디: ${body}`);
  }
  return res.text();
}
