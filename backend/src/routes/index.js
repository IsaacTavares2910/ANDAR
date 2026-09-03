import { healthController } from '../controllers/healthController.js';

export function handleRoute(request, response) {
  if (request.method === 'GET' && request.url === '/health') {
    healthController(request, response);
    return true;
  }

  return false;
}
