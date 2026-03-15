const fs = require('fs');
const pdf = require('pdf-parse');

async function main() {
  const files = [
    'c:/Users/zairi/Desktop/mes projets/app heures provigo/zairi Facture Camion 7 au 13 septembre - Facture_10001.pdf',
    'c:/Users/zairi/Desktop/mes projets/app heures provigo/zairi Facture Camion 14 au 20 septembre - Facture10002.pdf',
  ];
  for (const f of files) {
    console.log('=== ' + f.split('/').pop() + ' ===');
    const data = await pdf(fs.readFileSync(f));
    console.log(data.text);
    console.log('\n');
  }
}
main();
