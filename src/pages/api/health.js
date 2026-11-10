// Ruta ejecutada por Node.js en cada petición; no devuelve datos financieros.
import { one } from '../../server/database.js';

export async function GET() {
  try {
    await one('SELECT 1 AS ready');
  } catch {
    return Response.json({ status: 'unavailable', service: 'fluye', database: 'mysql' },
      { status: 503, headers: { 'Cache-Control': 'no-store' } });
  }
  return Response.json(
    {
      status: 'ok',
      service: 'fluye',
      database: 'mysql',
      timestamp: new Date().toISOString(),
    },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
