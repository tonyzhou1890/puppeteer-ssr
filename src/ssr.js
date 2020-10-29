var puppeteer = require("puppeteer");
var util = require('./util')

// 存储browsweWSendpoint
let WS = null

/**
 * 渲染页面
 * @param {*} url 
 * @param {*} pageConfig
 */
async function ssr(url, pageConfig) {
  console.log("url", url)

  let browser = null
  if (WS) {
    browser = await puppeteer.connect({ browserWSEndpoint: WS })
  } else {
    browser = await puppeteer.launch({headless: true,
      args: [
        '--no-sandbox',
        '--disable-gpu',
        '--disable-dev-shm-usage',
        '--disable-setuid-sandbox',
        '--no-zygote',
        '--single-process'
      ]});
    WS = browser.wsEndpoint()
  }
  
  const page = await browser.newPage();
  // 1. Intercept network requests.
  // await page.setRequestInterception(true);

  // page.on('request', req => {
  //   // 2. Ignore requests for resources that don't produce DOM
  //   // (images, stylesheets, media).
  //   const whitelist = ['document', 'script', 'xhr', 'fetch'];
  //   if (!whitelist.includes(req.resourceType())) {
  //     return req.abort();
  //   }

  //   // 3. Pass through all other requests.
  //   req.continue();
  // });
  try {
    // networkidle0 waits for the network to be idle (no requests for 500ms).
    // The page's JS has likely produced markup by this point, but wait longer
    // if your site lazy loads, etc.
    // await page.goto(url, { waitUntil: "networkidle0" });
    await Promise.all([
      page.goto(url, {
        timeout: 5000
      }),
      util.waitForNetworkIdle(page, 300, 0)
    ])
  } catch (err) {
    console.error(err);
    await page.close();
    throw new Error("page.goto/waitForSelector timed out.");
  }

  let html = await page.content(); // serialized HTML of page DOM.
  await page.close();
  await browser.disconnect()

  // 解决闪屏
  html = html.replace('id="app"', 'id="app" data-server-rendered="true"')
  
  return { html }
}

module.exports = ssr;
