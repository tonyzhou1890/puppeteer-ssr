var puppeteer = require("puppeteer");

// In-memory cache of rendered pages. Note: this will be cleared whenever the
// server process stops. If you need true persistence, use something like
// Google Cloud Storage (https://firebase.google.com/docs/storage/web/start).
const RENDER_CACHE = new Map();

async function ssr(url, instance) {
  console.log("url", url);
  if (RENDER_CACHE.has(url) && false) {
    if (Date.now() - RENDER_CACHE.get(url).time < 60 * 1000) {
      console.log('cached')
      return { html: RENDER_CACHE.get(url).html, ttRenderMs: 0 };
    }
  }

  const start = Date.now();
  instance.push(start); // 因为启动chrome需要时间，所以用开始时间占位

  const browser = await puppeteer.launch({headless: true, args:['--no-sandbox', '--disable-setuid-sandbox']});
  const page = await browser.newPage();
  try {
    // networkidle0 waits for the network to be idle (no requests for 500ms).
    // The page's JS has likely produced markup by this point, but wait longer
    // if your site lazy loads, etc.
    await page.goto(url, { waitUntil: "networkidle0" });
  } catch (err) {
    console.error(err);
    remove(instance, start);
    await browser.close();
    throw new Error("page.goto/waitForSelector timed out.");
  }

  let html = await page.content(); // serialized HTML of page DOM.
  // 解决闪屏
  html = html.replace('id="app"', 'id="app" data-server-rendered="true"')
  remove(instance, start);
  await browser.close();

  const ttRenderMs = Date.now() - start;
  console.info(`Headless rendered page in: ${ttRenderMs}ms`);

  RENDER_CACHE.set(url, {html, time: Date.now()}); // cache rendered page.

  return { html, ttRenderMs };
}

function remove(instance, ins) {
  instance.map((item, index) => {
    if (item === ins) {
      instance.splice(index, 1);
    }
  });
}

module.exports = ssr;
