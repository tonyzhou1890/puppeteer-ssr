const config = {
  hosts: { // 域名配置
    'poemssr.tony93-dev.top': {
      proxyHost: '127.0.0.1:8081', // 本地地址
      expire: 10, // 全局页面有效期，单位为秒
      waitForNetworkIdleTime: 300, // 网络空闲等待时间，单位毫秒
      rules: [
        {
          path: '/',
          expire: 0
        },
        {
          path: /^\/collection$/,
          expire: 0,
          waitForNetworkIdleTime: 0
        },
        {
          path: (url) => {
            return /^\/poemList/.test(url)
          },
          expire: 3600
        }
      ]
    },
  },
  pages: 2, // 可同时渲染的页面
}

module.exports = config