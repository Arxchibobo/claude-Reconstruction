const puppeteer = require('puppeteer');
const path = require('path');

(async () => {
  try {
    const browser = await puppeteer.launch({ headless: 'new' });
    const page = await browser.newPage();

    const htmlPath = path.join(__dirname, 'VIBE_MARKETING_PRESENTATION.html');
    const fileUrl = 'file:///' + htmlPath.replace(/\\/g, '/');

    console.log('Loading:', fileUrl);
    await page.goto(fileUrl, { waitUntil: 'networkidle0' });

    await page.pdf({
      path: path.join(__dirname, 'VIBE_MARKETING_PRESENTATION.pdf'),
      format: 'A4',
      printBackground: true,
      margin: { top: 0, bottom: 0, left: 0, right: 0 }
    });

    await browser.close();
    console.log('PDF created successfully!');
  } catch (err) {
    console.error('Error:', err.message);
  }
})();
