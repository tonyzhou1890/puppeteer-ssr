const express = require('express')
const Cacheman = require('cacheman')
const CachemanFile = require('cacheman-file')
const router = express.Router()
const ssr = require("./ssr.js")
const config = require('./config')

const factorytList = [] // 正在渲染的页面
let requestList = [] // 等待渲染的页面
const cache = new Cacheman('htmls', {
  engine: 'file'
}) // 缓存

router.get("/*", async (req, res, next) => {
  console.log(req.originalUrl)
  req._pageConfig = getPageConfig(req)
  // 如果没有相关配置返回错误
  if (!req._pageConfig) {
    endRequest(res, {
      status: 404
    })
    return
  }
  // 先检查缓存
  const html = await getCachePage(req, cache)
  // 缓存里有就直接返回
  if (html) {
    endRequest(res, {
      url: req._pageConfig.url,
      html
    })
  } else { // 否则放入渲染等待队列
    requestList.push({req, res, next})
    assignPage()
  }
})

module.exports = router

/**
 * 分配页面渲染
 */
function assignPage() {
  if (requestList.length && factorytList.length < config.pages) {
    renderPage(requestList.shift(), factorytList)
    console.info('render:' + requestList.length, 'factorytList:' + factorytList.length)
  }
}

/**
 * 检查缓存
 * @param {*} req 
 * @param {*} cache 
 */
async function getCachePage(req, cache) {
  const pageConfig = req._pageConfig
  let result = null
  try {
    result = await cache.get(pageConfig.url)
  } catch (e) {
    console.log(e)
  }
  // 过期或者版本不合，缓存失效
  if (result
    && (result.createTime + result.expire * 1000 < Date.now()
      || (result.version !== pageConfig.version)
    )) {
    result = null
    try {
      await cache.del(pageConfig.url)
    } catch (e) {
      console.log(e)
    }
  }
  return result ? result.html : null
}

/**
 * 存到缓存
 * @param {*} req 
 */
async function setCachePage(req, cache, html) {
  const pageConfig = req._pageConfig
  try {
    // 有期限才缓存
    if (pageConfig.expire) {
      await cache.set(pageConfig.url, {
        createTime: Date.now(),
        expire: pageConfig.expire,
        version: pageConfig.version,
        html
      })
    }
    return true
  } catch (e) {
    console.log(e)
    return false
  }
}

/**
 * 获取页面配置
 * @param {*} req 
 */
function getPageConfig(req) {
  const host = config.hosts[req.get('host')]
  if (host && host.proxyHost) {
    const pageConfig = {
      url: `${req.protocol}://${req.get('host')}${req.originalUrl}`,
      version: host.version || '',
      expire: host.expire,
      proxyHost: host.proxyHost,
      waitForNetworkIdleTime: host.waitForNetworkIdleTime === undefined ? 300 : host.waitForNetworkIdleTime, // 默认等待 300 毫秒
    }
    return pageConfig
  } else {
    return false
  }
}

/**
 * 渲染页面
 * @param {*} request 
 */
async function renderPage(request) {
  const pageConfig = request.req._pageConfig
  let html = ''
  let ttRenderMs = ''
  let start = Date.now()
  factorytList.push(start)

  const result = await ssr(
    `${request.req.protocol}://${pageConfig.proxyHost}${request.req.originalUrl}`,
    pageConfig
  )

  factorytList.map((item, index) => {
    if (item === start) {
      ttRenderMs = Date.now() - start
      factorytList.splice(index, 1)
    }
  })

  html = result.html
  // 结束本次请求
  endRequest(request.res, {
    url: pageConfig.url,
    html,
    ttRenderMs
  })
  // 渲染没有错误，尝试缓存
  if (result.renderError === false) {
    setCachePage(request.req, cache, html)
  }
  
  // 队列中相同请求一并返回
  requestList = requestList.filter(item => {
    if (item.req._pageConfig.url === pageConfig.url) {
      endRequest(item.res, {
        url: pageConfig.url,
        html,
        ttRenderMs
      })
      return false
    }
    return true
  })
  // 检查是否还有需要渲染的页面
  assignPage()
  return
}


/**
 * 结束请求
 * @param {*} res 
 * @param {object} options
 */
function endRequest(res, options = {}) {
  if (!options.status || options.status === 200) {
    console.info(`Headless rendered page ${options.url} in: ${options.ttRenderMs || 0}ms`);
  }
  
  const defaultHtml = '<h1>error</h1>'
  // Add Server-Timing! See https://w3c.github.io/server-timing/.
  res.set(
    "Server-Timing",
    `Prerender;dur=${options.ttRenderMs || 0};desc="Headless render time (ms)"`
  )
  return res.status(options.status || 200).send(options.html || defaultHtml) // Serve prerendered page as response.
}