import { google } from 'googleapis';

const SHEET_TITLE = 'Heures & Factures — Données';

// Create an authenticated Sheets + Drive client from an access token
function getAuth(accessToken: string) {
  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: accessToken });
  return auth;
}

// Create a new spreadsheet on the user's Drive
export async function createSpreadsheet(accessToken: string): Promise<string> {
  const auth = getAuth(accessToken);
  const sheets = google.sheets({ version: 'v4', auth });

  const res = await sheets.spreadsheets.create({
    requestBody: {
      properties: { title: SHEET_TITLE },
      sheets: [
        { properties: { title: 'Profil' } },
        { properties: { title: 'Clients' } },
        { properties: { title: 'Heures' } },
        { properties: { title: 'Factures' } },
        { properties: { title: 'Meta' } },
      ],
    },
  });

  const spreadsheetId = res.data.spreadsheetId!;

  // Write headers
  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId,
    requestBody: {
      valueInputOption: 'RAW',
      data: [
        {
          range: 'Profil!A1:G1',
          values: [['companyName', 'tps', 'tvq', 'fullName', 'address', 'city', 'phone']],
        },
        {
          range: 'Clients!A1:I1',
          values: [['id', 'name', 'company', 'address', 'city', 'hourlyRate', 'overtimeThreshold', 'overtimeMultiplier', 'email']],
        },
        {
          range: 'Heures!A1:H1',
          values: [['id', 'date', 'start', 'end', 'hours', 'clientId', 'isHoliday', 'notes']],
        },
        {
          range: 'Factures!A1:F1',
          values: [['invoiceNumber', 'weekKey', 'clientId', 'total', 'generatedAt', 'key']],
        },
        {
          range: 'Meta!A1:B1',
          values: [['key', 'value']],
        },
      ],
    },
  });

  return spreadsheetId;
}

// Write all data to existing spreadsheet (full overwrite per sheet)
export async function writeAllData(
  accessToken: string,
  spreadsheetId: string,
  data: {
    profile: Record<string, string> | null;
    clients: Record<string, any>[];
    entries: Record<string, any>[];
    invoices: Record<string, Record<string, any>>;
    invoiceNum: number;
  }
) {
  const auth = getAuth(accessToken);
  const sheets = google.sheets({ version: 'v4', auth });

  // Clear all data rows (keep headers)
  await sheets.spreadsheets.values.batchClear({
    spreadsheetId,
    requestBody: {
      ranges: ['Profil!A2:G1000', 'Clients!A2:I1000', 'Heures!A2:H50000', 'Factures!A2:F1000', 'Meta!A2:B100'],
    },
  });

  const batchData: any[] = [];

  // Profile
  if (data.profile) {
    const p = data.profile;
    batchData.push({
      range: 'Profil!A2:G2',
      values: [[p.companyName || '', p.tps || '', p.tvq || '', p.fullName || '', p.address || '', p.city || '', p.phone || '']],
    });
  }

  // Clients
  if (data.clients.length > 0) {
    batchData.push({
      range: `Clients!A2:I${data.clients.length + 1}`,
      values: data.clients.map(c => [
        c.id, c.name, c.company || '', c.address, c.city, c.hourlyRate, c.overtimeThreshold, c.overtimeMultiplier, c.email || '',
      ]),
    });
  }

  // Entries
  if (data.entries.length > 0) {
    batchData.push({
      range: `Heures!A2:H${data.entries.length + 1}`,
      values: data.entries.map(e => [
        e.id, e.date, e.start, e.end, e.hours, e.clientId, e.isHoliday ? 'oui' : 'non', e.notes || '',
      ]),
    });
  }

  // Invoices
  const invoiceEntries = Object.entries(data.invoices);
  if (invoiceEntries.length > 0) {
    batchData.push({
      range: `Factures!A2:F${invoiceEntries.length + 1}`,
      values: invoiceEntries.map(([key, inv]) => [
        String(inv.invoiceNumber), inv.weekKey, inv.clientId, inv.total, inv.generatedAt, key,
      ]),
    });
  }

  // Meta (invoice number counter)
  batchData.push({
    range: 'Meta!A2:B2',
    values: [['invoiceNum', String(data.invoiceNum)]],
  });

  if (batchData.length > 0) {
    await sheets.spreadsheets.values.batchUpdate({
      spreadsheetId,
      requestBody: {
        valueInputOption: 'RAW',
        data: batchData,
      },
    });
  }
}

// Read all data from spreadsheet
export async function readAllData(accessToken: string, spreadsheetId: string) {
  const auth = getAuth(accessToken);
  const sheets = google.sheets({ version: 'v4', auth });

  const res = await sheets.spreadsheets.values.batchGet({
    spreadsheetId,
    ranges: ['Profil!A2:G2', 'Clients!A2:I1000', 'Heures!A2:H50000', 'Factures!A2:F1000', 'Meta!A2:B100'],
  });

  const ranges = res.data.valueRanges || [];

  // Parse profile
  const profileRow = ranges[0]?.values?.[0];
  const profile = profileRow
    ? {
        companyName: profileRow[0] || '',
        tps: profileRow[1] || '',
        tvq: profileRow[2] || '',
        fullName: profileRow[3] || '',
        address: profileRow[4] || '',
        city: profileRow[5] || '',
        phone: profileRow[6] || '',
      }
    : null;

  // Parse clients
  const clients = (ranges[1]?.values || []).map(row => ({
    id: row[0],
    name: row[1],
    company: row[2] || '',
    address: row[3],
    city: row[4],
    hourlyRate: parseFloat(row[5]) || 0,
    overtimeThreshold: parseFloat(row[6]) || 60,
    overtimeMultiplier: parseFloat(row[7]) || 1.5,
    email: row[8] || '',
  }));

  // Parse entries
  const entries = (ranges[2]?.values || []).map(row => ({
    id: row[0],
    date: row[1],
    start: row[2],
    end: row[3],
    hours: parseFloat(row[4]) || 0,
    clientId: row[5],
    isHoliday: row[6] === 'oui',
    notes: row[7] || '',
  }));

  // Parse invoices
  const invoices: Record<string, any> = {};
  for (const row of ranges[3]?.values || []) {
    const key = row[5];
    invoices[key] = {
      invoiceNumber: isNaN(Number(row[0])) ? row[0] : Number(row[0]),
      weekKey: row[1],
      clientId: row[2],
      total: parseFloat(row[3]) || 0,
      generatedAt: row[4],
    };
  }

  // Parse meta
  let invoiceNum = 1001;
  for (const row of ranges[4]?.values || []) {
    if (row[0] === 'invoiceNum') invoiceNum = parseInt(row[1]) || 1001;
  }

  return { profile, clients, entries, invoices, invoiceNum };
}

// Find spreadsheet by title in user's Drive
export async function findSpreadsheet(accessToken: string): Promise<string | null> {
  const auth = getAuth(accessToken);
  const drive = google.drive({ version: 'v3', auth });

  const res = await drive.files.list({
    q: `name='${SHEET_TITLE}' and mimeType='application/vnd.google-apps.spreadsheet' and trashed=false`,
    fields: 'files(id, name)',
    spaces: 'drive',
  });

  return res.data.files?.[0]?.id || null;
}
