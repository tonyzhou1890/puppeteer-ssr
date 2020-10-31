/**
 * 
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
  console.log(timeout, Date.now())
  return promise;

  function onTimeoutDone() {
    page.removeListener('request', onRequestStarted);
    page.removeListener('requestfinished', onRequestFinished);
    page.removeListener('requestfailed', onRequestFinished);
    
    console.log(Date.now())
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

module.exports = {
  waitForNetworkIdle
}