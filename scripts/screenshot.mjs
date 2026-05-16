import puppeteer from 'puppeteer';

const browser = await puppeteer.launch({ headless: true, defaultViewport: { width: 1440, height: 900, deviceScaleFactor: 2 } });
try {
  const targets = [
    { url: 'http://localhost:3000', file: 'docs/screenshots/01-paykit-home.png' },
    { url: 'http://localhost:3000/quickstart', file: 'docs/screenshots/02-paykit-quickstart.png' },
    { url: 'http://localhost:3000/examples', file: 'docs/screenshots/03-paykit-examples.png' },
    { url: 'http://localhost:3000/examples/kpop', file: 'docs/screenshots/04-fan-art-unlock.png' },
    { url: 'http://localhost:3001', file: 'docs/screenshots/05-demo-merchant.png' },
  ];
  for (const t of targets) {
    const page = await browser.newPage();
    try {
      await page.goto(t.url, { waitUntil: 'networkidle2', timeout: 30000 });
      await new Promise(r => setTimeout(r, 1500));
      await page.screenshot({ path: t.file, fullPage: true });
      console.log('saved', t.file);
    } catch (e) {
      console.log('skipped', t.url, '—', e.message.slice(0, 80));
    }
    await page.close();
  }
} finally {
  await browser.close();
}
