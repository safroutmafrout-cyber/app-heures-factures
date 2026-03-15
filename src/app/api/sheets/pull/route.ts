import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { readAllData, findSpreadsheet } from '@/lib/sheets';

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !(session as any).accessToken) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const accessToken = (session as any).accessToken as string;

    // Get spreadsheetId from query or find it
    const url = new URL(req.url);
    let spreadsheetId = url.searchParams.get('spreadsheetId');

    if (!spreadsheetId) {
      spreadsheetId = await findSpreadsheet(accessToken);
    }

    if (!spreadsheetId) {
      return NextResponse.json(
        { error: 'Aucun fichier Google Sheets trouvé. Synchronisez d\'abord vos données.' },
        { status: 404 }
      );
    }

    const data = await readAllData(accessToken, spreadsheetId);

    return NextResponse.json({
      success: true,
      spreadsheetId,
      data,
    });
  } catch (error: any) {
    console.error('Pull error:', error);
    return NextResponse.json(
      { error: error.message || 'Erreur de récupération' },
      { status: 500 }
    );
  }
}
