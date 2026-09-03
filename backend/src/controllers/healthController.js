export function healthController(_request, response) {
  response.writeHead(200, { 'Content-Type': 'application/json' });
  response.end(JSON.stringify({ status: 'ok', service: 'andar-backend' }));
}
