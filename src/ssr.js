const puppeteer = require("puppeteer");
const util = require('./util')

// 存储browsweWSendpoint
let WS = null

/**
 * 渲染页面
 * @param {*} url 
 * @param {*} pageConfig
 */
async function ssr(url, pageConfig) {
  let renderError = false // 渲染是否出错
  let browser = null
  let html = '' // 渲染结果
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
  await page.setRequestInterception(true);

  page.on('request', req => {
    // 2. Ignore requests for resources that don't produce DOM
    // (images, stylesheets, media).
    const whitelist = ['document', 'script', 'xhr', 'fetch'];
    if (!whitelist.includes(req.resourceType())) {
      return req.abort();
    }

    // 3. Pass through all other requests.
    req.continue();
  });
  try {
    // util.waitForNetworkIdle 等待网络请求完成
    await Promise.all([
      page.goto(url, {
        timeout: 5000
      }),
      util.waitForNetworkIdle(page, pageConfig.waitForNetworkIdleTime, 0)
    ])
  } catch (err) {
    console.error(err);
    await page.close();
    await browser.close()
    
    ws = null
    renderError = true
    // throw new Error("page.goto/waitForSelector timed out.");
  }

  // 检查渲染是否出错
  if (renderError) {
    html = '<h1>发生了一些错误，请待会再试！</h1>'
  } else {
    html = await page.content(); // serialized HTML of page DOM.
    await page.close();
    await browser.disconnect()

    // 解决闪屏
    html = html.replace('id="app"', 'id="app" data-server-rendered="true"')
  }
  
  return { html, renderError }
}

module.exports = ssr;
