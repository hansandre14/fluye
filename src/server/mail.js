import nodemailer from 'nodemailer';
import { loadEnvironment, publicOrigin } from './env.js';

export function mailConfig() {
  const env = loadEnvironment();
  const origin = publicOrigin();
  const host = env.FLUYE_SMTP_HOST;
  const from = env.FLUYE_SMTP_FROM;
  if (!origin || !host || !from) return null;
  const port = Number(env.FLUYE_SMTP_PORT || 587);
  if (!Number.isInteger(port) || port < 1 || port > 65535) return null;
  const local = env.FLUYE_SMTP_LOCAL === '1' && ['127.0.0.1', 'localhost'].includes(host)
    && ['127.0.0.1', 'localhost'].includes(origin.hostname);
  if (!local && (!env.FLUYE_SMTP_USER || !env.FLUYE_SMTP_PASSWORD)) return null;
  const transport = {
    host, port, secure: port === 465, requireTLS: port !== 465 && !local,
    connectionTimeout: 5000, greetingTimeout: 5000, socketTimeout: 10000,
    ...(local ? {} : { auth: { user: env.FLUYE_SMTP_USER, pass: env.FLUYE_SMTP_PASSWORD } }),
  };
  return { origin, from, transport };
}

export async function sendRecoveryMail(config, email, token) {
  const link = new URL('/restablecer', config.origin);
  link.hash = 'token=' + token;
  const transport = nodemailer.createTransport(config.transport);
  await transport.sendMail({
    from: config.from,
    to: email,
    subject: 'Restablece tu contraseña de Fluye',
    textEncoding: 'base64',
    text: `Abre este enlace para establecer una contraseña nueva:\n\n${link.href}\n\nEl enlace vence en 15 minutos y se puede usar una sola vez. Si no lo solicitaste, ignora este mensaje.`,
  });
}
