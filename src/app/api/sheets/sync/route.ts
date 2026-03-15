import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { writeAllData, createSpreadsheet, findSpreadsheet } from '@/lib/sheets';

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !(session as any).accessToken) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const accessToken = (session as any).accessToken as string;
    const body = await req.json();

    // Find or create spreadsheet
    let spreadsheetId = body.spreadsheetId as string | null;

    if (!spreadsheetId) {
      // Try to find existing spreadsheet
      spreadsheetId = await findSpreadsheet(accessToken);
    }

    if (!spreadsheetId) {
      // Create new spreadsheet
      spreadsheetId = await createSpreadsheet(accessToken);
    }

    // Write all data
    await writeAllData(accessToken, spreadsheetId, {
      profile: body.profile || null,
      clients: body.clients || [],
      entries: body.entries || [],
      invoices: body.invoices || {},
      invoiceNum: body.invoiceNum || 1001,
    });

    return NextResponse.json({
      success: true,
      spreadsheetId,
      message: 'Données synchronisées avec Google Sheets ✅',
    });
  } catch (error: any) {
    console.error('Sync error:', error);
    return NextResponse.json(
      { error: error.message || 'Erreur de synchronisation' },
      { status: 500 }
    );
  }
}
