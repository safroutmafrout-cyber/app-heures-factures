import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { readAllData, findSpreadsheet } from '@/lib/sheets';

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    console.log('[Pull API] Session:', session ? `user=${session.user?.email}` : 'null');
    console.log('[Pull API] AccessToken present:', !!(session as any)?.accessToken);

    if (!session || !(session as any).accessToken) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const accessToken = (session as any).accessToken as string;

    // Get spreadsheetId from query or find it
    const url = new URL(req.url);
    let spreadsheetId = url.searchParams.get('spreadsheetId');

    if (!spreadsheetId) {
      console.log('[Pull API] Searching for spreadsheet...');
      spreadsheetId = await findSpreadsheet(accessToken);
      console.log('[Pull API] Found spreadsheetId:', spreadsheetId || 'NOT FOUND');
    }

    if (!spreadsheetId) {
      return NextResponse.json(
        { error: 'Aucun fichier Google Sheets trouvé. Synchronisez d\'abord vos données.' },
        { status: 404 }
      );
    }

    const data = await readAllData(accessToken, spreadsheetId);
    console.log('[Pull API] Data read:', {
      hasProfile: !!data.profile?.companyName,
      clientsCount: data.clients.length,
      entriesCount: data.entries.length,
      invoiceNum: data.invoiceNum,
    });

    return NextResponse.json({
      success: true,
      spreadsheetId,
      data,
    });
  } catch (error: any) {
    console.error('[Pull API] Error:', error.message);
    return NextResponse.json(
      { error: error.message || 'Erreur de récupération' },
      { status: 500 }
    );
  }
}
