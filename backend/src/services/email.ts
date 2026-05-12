type SendEmailOptions = {
  to: string;
  subject: string;
  text: string;
};

function smtpConfigured() {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_PORT && process.env.SMTP_USER && process.env.SMTP_PASS);
}

function encodeBase64(value: string) {
  return Buffer.from(value, 'utf8').toString('base64');
}

async function readSmtpResponse(socket: import('tls').TLSSocket | import('net').Socket) {
  return new Promise<string>((resolve, reject) => {
    let buffer = '';
    const onData = (chunk: Buffer) => {
      buffer += chunk.toString('utf8');
      const lines = buffer.split(/\r?\n/).filter(Boolean);
      const last = lines[lines.length - 1];
      if (last && /^\d{3} /.test(last)) {
        socket.off('data', onData);
        socket.off('error', onError);
        resolve(buffer);
      }
    };
    const onError = (err: Error) => {
      socket.off('data', onData);
      reject(err);
    };
    socket.on('data', onData);
    socket.on('error', onError);
  });
}

async function sendCommand(socket: import('tls').TLSSocket | import('net').Socket, command: string, expected: number[]) {
  socket.write(`${command}\r\n`);
  const response = await readSmtpResponse(socket);
  const status = Number(response.slice(0, 3));
  if (!expected.includes(status)) {
    throw new Error(`SMTP command failed: ${response.trim()}`);
  }
  return response;
}

async function connectSmtp() {
  const host = process.env.SMTP_HOST!;
  const port = Number(process.env.SMTP_PORT || 465);
  const secure = process.env.SMTP_SECURE !== 'false';

  if (secure) {
    const tls = await import('tls');
    const socket = tls.connect({ host, port, servername: host });
    await new Promise<void>((resolve, reject) => {
      socket.once('secureConnect', resolve);
      socket.once('error', reject);
    });
    await readSmtpResponse(socket);
    return socket;
  }

  const net = await import('net');
  const socket = net.connect({ host, port });
  await new Promise<void>((resolve, reject) => {
    socket.once('connect', resolve);
    socket.once('error', reject);
  });
  await readSmtpResponse(socket);
  return socket;
}

export async function sendEmail({ to, subject, text }: SendEmailOptions) {
  const from = process.env.SMTP_FROM || process.env.SMTP_USER;
  if (!smtpConfigured() || !from) {
    console.log(`[Email dev mode] To: ${to}; Subject: ${subject}; Body: ${text}`);
    return { delivered: false, devMode: true };
  }

  const socket = await connectSmtp();
  try {
    const host = process.env.SMTP_HOST!;
    const user = process.env.SMTP_USER!;
    const pass = process.env.SMTP_PASS!;
    const fromName = process.env.SMTP_FROM_NAME || 'AI外脑';
    const encodedSubject = `=?UTF-8?B?${encodeBase64(subject)}?=`;
    const encodedFromName = `=?UTF-8?B?${encodeBase64(fromName)}?=`;
    const message = [
      `From: ${encodedFromName} <${from}>`,
      `To: <${to}>`,
      `Subject: ${encodedSubject}`,
      'MIME-Version: 1.0',
      'Content-Type: text/plain; charset=UTF-8',
      'Content-Transfer-Encoding: base64',
      '',
      encodeBase64(text).replace(/(.{76})/g, '$1\r\n'),
      '.',
    ].join('\r\n');

    await sendCommand(socket, `EHLO ${host}`, [250]);
    await sendCommand(socket, 'AUTH LOGIN', [334]);
    await sendCommand(socket, encodeBase64(user), [334]);
    await sendCommand(socket, encodeBase64(pass), [235]);
    await sendCommand(socket, `MAIL FROM:<${from}>`, [250]);
    await sendCommand(socket, `RCPT TO:<${to}>`, [250, 251]);
    await sendCommand(socket, 'DATA', [354]);
    await sendCommand(socket, message, [250]);
    await sendCommand(socket, 'QUIT', [221]);
    return { delivered: true, devMode: false };
  } finally {
    socket.end();
  }
}
