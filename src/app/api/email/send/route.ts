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
    const { to, subject, message, pdfBase64, filename } = await req.json();

    if (!to || !subject) {
      return NextResponse.json({ error: 'Destinataire et sujet requis' }, { status: 400 });
    }

    // Build MIME email with PDF attachment
    const boundary = 'boundary_' + Date.now();
    
    const mimeLines = [
      `To: ${to}`,
      `Subject: =?UTF-8?B?${Buffer.from(subject).toString('base64')}?=`,
      'MIME-Version: 1.0',
      `Content-Type: multipart/mixed; boundary="${boundary}"`,
      '',
      // --- Text body ---
      `--${boundary}`,
      'Content-Type: text/html; charset=UTF-8',
      'Content-Transfer-Encoding: base64',
      '',
      Buffer.from(
        `<div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
          <p style="line-height: 1.8; font-size: 14px; white-space: pre-wrap;">${(message || subject).replace(/\n/g, '<br>')}</p>
          <p style="color: #6b7280; font-size: 12px; margin-top: 16px;">📎 Facture en pièce jointe (PDF)</p>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 28px 0 20px;" />
          <table cellpadding="0" cellspacing="0" style="font-family: 'Segoe UI', Arial, sans-serif;">
            <tr>
              <td style="padding-right: 16px; border-right: 3px solid #6366f1;">
                <div style="font-size: 22px; font-weight: 800; color: #6366f1; letter-spacing: -0.5px;">Z</div>
              </td>
              <td style="padding-left: 16px;">
                <div style="font-size: 13px; font-weight: 700; color: #1f2937;">Zairi ERP</div>
                <div style="font-size: 10px; color: #6366f1; font-weight: 600; letter-spacing: 1.5px; text-transform: uppercase; margin-top: 1px;">Software Solutions</div>
                <div style="font-size: 10px; color: #9ca3af; margin-top: 4px;">Gestion d'heures & facturation intelligente</div>
              </td>
            </tr>
          </table>
        </div>`
      ).toString('base64'),
      '',
    ];

    // --- PDF attachment ---
    if (pdfBase64) {
      mimeLines.push(
        `--${boundary}`,
        `Content-Type: application/pdf; name="${filename || 'facture.pdf'}"`,
        'Content-Transfer-Encoding: base64',
        `Content-Disposition: attachment; filename="${filename || 'facture.pdf'}"`,
        '',
        pdfBase64,
        '',
      );
    }

    mimeLines.push(`--${boundary}--`);

    const mimeEmail = mimeLines.join('\r\n');

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
        { error: errorData.error?.message || "Erreur d'envoi Gmail" },
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
