// 경량 로컬 웹서버 (PC 및 모바일 Wi-Fi 접속 지원)
const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');

const PORT = 3000;
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml'
};

const server = http.createServer((req, res) => {
  let reqUrl = req.url.split('?')[0];
  if (reqUrl === '/') reqUrl = '/index.html';

  const filePath = path.join(__dirname, reqUrl);
  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code === 'ENOENT') {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('404 Not Found');
      } else {
        res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end(`Server Error: ${err.code}`);
      }
    } else {
      res.writeHead(200, { 
        'Content-Type': contentType,
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      });
      res.end(content, 'utf-8');
    }
  });
});

// 로컬 IP 주소 탐색 (스마트폰 접속용)
function getLocalIp() {
  const interfaces = os.networkInterfaces();
  for (let ifaceName in interfaces) {
    for (let iface of interfaces[ifaceName]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}

const localIp = getLocalIp();

server.listen(PORT, '0.0.0.0', () => {
  console.log('================================================================');
  console.log('🌿 초록우산 어린이재단 기관장 승진 실전 AI 면접 시뮬레이터 서버 실행 중');
  console.log('================================================================');
  console.log(`💻 [PC 브라우저 접속] : http://localhost:${PORT}`);
  console.log(`📱 [스마트폰(아이폰/갤럭시) 접속] : http://${localIp}:${PORT}`);
  console.log('※ 스마트폰과 PC가 동일한 Wi-Fi 네트워크에 연결되어 있으면 접속 가능합니다.');
  console.log('================================================================');
});
