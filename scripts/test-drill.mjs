import http from 'http';
function get(path) {
  return new Promise((res, rej) => {
    http.get(`http://127.0.0.1:3000${path}`, r => {
      let d = '';
      r.on('data', c => d += c);
      r.on('end', () => res({ status: r.statusCode, body: d }));
    }).on('error', rej);
  });
}
// Level 3 with date
const r = await get('/api/drill/throughput?level=3&month=2026-02&date=2026-02-16');
console.log('STATUS:', r.status);
const json = JSON.parse(r.body);
console.log('level:', json.level, 'day_detail date:', json.day_detail?.date);
console.log('closed count:', json.day_detail?.closed?.length);
console.log('updated count:', json.day_detail?.updated?.length);
if (json.day_detail?.closed?.length > 0) {
  console.log('sample closed:', JSON.stringify(json.day_detail.closed[0], null, 2));
}
