/**
 * 网络等待
 * @param {*} page 页面引用
 * @param {*} timeout 网络空闲时间
 * @param {*} maxInflightRequests 忽略请求数量
 */
async function waitForNetworkIdle(page, timeout, maxInflightRequests = 0) {
  page.on('request', onRequestStarted);
  page.on('requestfinished', onRequestFinished);
  page.on('requestfailed', onRequestFinished);

  let inflight = 0;
  let fulfill;
  let promise = new Promise(x => fulfill = x);
  let timeoutId = setTimeout(onTimeoutDone, timeout);
  return promise;

  function onTimeoutDone() {
    page.removeListener('request', onRequestStarted);
    page.removeListener('requestfinished', onRequestFinished);
    page.removeListener('requestfailed', onRequestFinished);
    
    fulfill();
  }

  function onRequestStarted() {
    ++inflight;
    if (inflight > maxInflightRequests)
      clearTimeout(timeoutId);
  }

  function onRequestFinished() {
    if (inflight === 0)
      return;
    --inflight;
    if (inflight === maxInflightRequests)
      timeoutId = setTimeout(onTimeoutDone, timeout);
  }
}

/**
 * 获取页面配置
 * @param {*} req 
 */
function getPageConfig(req, config) {
  const host = config.hosts[req.get('host')]
  if (host && host.proxyHost) {
    // 当前域名全局规则
    const pageConfig = {
      url: `${req.protocol}://${req.get('host')}${req.originalUrl}`,
      version: host.version || '',
      expire: host.expire || 0,
      proxyHost: host.proxyHost,
      waitForNetworkIdleTime: host.waitForNetworkIdleTime === undefined ? 300 : host.waitForNetworkIdleTime, // 默认等待 300 毫秒
    }
    // 当前页面规则
    if (Array.isArray(host.rules)) {
      const rule = host.rules.find(item => {
        // 字符串
        if (typeof item.path === 'string' && item.path === req.originalUrl) {
          return true
        }
        // 正则
        if (typeof item.path === 'object' && item.path instanceof RegExp && item.path.test(req.originalUrl)) {
          return true
        }
        // 函数
        if (typeof item.path === 'function' && item.path(req.originalUrl)) {
          return true
        }
        return false
      })
      if (rule) {
        pageConfig.expire = rule.expire !== undefined ? rule.expire : pageConfig.expire
        pageConfig.waitForNetworkIdleTime = rule.waitForNetworkIdleTime !== undefined ? rule.waitForNetworkIdleTime : pageConfig.waitForNetworkIdleTime
      }
    }
    return pageConfig
  } else {
    return false
  }
}

module.exports = {
  waitForNetworkIdle,
  getPageConfig
}