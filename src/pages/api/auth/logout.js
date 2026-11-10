import { sameOrigin, json, endSession } from '../../../server/auth.js';
export async function POST(context) {
  const { request, url, redirect } = context;
  if (!sameOrigin(request, url)) return json({ message: 'Solicitud no permitida.' }, 403);
  await endSession(context);
  return redirect('/', 303);
}
