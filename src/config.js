const config = {
  hosts: { // 域名配置
    'poemssr.tony93-dev.top': {
      proxyHost: '127.0.0.1:8081', // 本地地址
      expire: 10, // 全局页面有效期，单位为秒
    }
  },
  pages: 2, // 可同时渲染的页面
}

module.exports = config