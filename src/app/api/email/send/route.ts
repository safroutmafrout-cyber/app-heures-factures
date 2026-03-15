import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !(session as any).accessToken) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const accessToken = (session as any).accessToken as string;
    const { to, subject, message, invoiceHtml } = await req.json();

    if (!to || !subject) {
      return NextResponse.json({ error: 'Destinataire et sujet requis' }, { status: 400 });
    }

    // Build MIME email
    const boundary = 'boundary_' + Date.now();
    const mimeEmail = [
      `To: ${to}`,
      `Subject: =?UTF-8?B?${Buffer.from(subject).toString('base64')}?=`,
      'MIME-Version: 1.0',
      `Content-Type: multipart/alternative; boundary="${boundary}"`,
      '',
      `--${boundary}`,
      'Content-Type: text/plain; charset=UTF-8',
      'Content-Transfer-Encoding: base64',
      '',
      Buffer.from(message || subject).toString('base64'),
      '',
      `--${boundary}`,
      'Content-Type: text/html; charset=UTF-8',
      'Content-Transfer-Encoding: base64',
      '',
      Buffer.from(
        invoiceHtml
          ? `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <p style="color: #333; line-height: 1.6;">${(message || '').replace(/\n/g, '<br>')}</p>
              <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
              ${invoiceHtml}
              <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
              <p style="color: #999; font-size: 12px;">Envoyé via Zairi — Heures & Factures</p>
            </div>`
          : `<div style="font-family: Arial, sans-serif;">
              <p style="color: #333; line-height: 1.6;">${(message || subject).replace(/\n/g, '<br>')}</p>
              <p style="color: #999; font-size: 12px; margin-top: 24px;">Envoyé via Zairi — Heures & Factures</p>
            </div>`
      ).toString('base64'),
      '',
      `--${boundary}--`,
    ].join('\r\n');

    // Base64url encode the email
    const encodedEmail = Buffer.from(mimeEmail)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    // Send via Gmail API
    const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ raw: encodedEmail }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Gmail API error:', errorData);
      return NextResponse.json(
        { error: errorData.error?.message || 'Erreur d\'envoi Gmail' },
        { status: response.status }
      );
    }

    const result = await response.json();
    return NextResponse.json({ success: true, messageId: result.id });
  } catch (error: any) {
    console.error('Email send error:', error);
    return NextResponse.json(
      { error: error.message || 'Erreur interne' },
      { status: 500 }
    );
  }
}
