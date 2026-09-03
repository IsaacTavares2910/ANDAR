import http from 'node:http';
import { env } from './config/env.js';
import { handleRoute } from './routes/index.js';

const server = http.createServer((request, response) => {
  response.setHeader('Access-Control-Allow-Origin', env.frontendUrl);
  response.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (request.method === 'OPTIONS') {
    response.writeHead(204);
    response.end();
    return;
  }

  if (handleRoute(request, response)) return;

  response.writeHead(404, { 'Content-Type': 'application/json' });
  response.end(JSON.stringify({ error: 'Rota não encontrada' }));
});

server.listen(env.port, () => {
  console.log(`ANDAR backend disponível na porta ${env.port}`);
});
