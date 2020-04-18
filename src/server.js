var express = require('express');
var router = express.Router();
var ssr = require("./ssr.js");

const instance = [];
const queue = [];
checkLoop(2, queue, instance);
console.log('start check')

router.get("/*", async (req, res, next) => {
  queue.push({req, res, next});
});

module.exports = router;

function checkLoop(n, queue, instance) {
  setTimeout(() => {
    if (queue.length && instance.length < n) {
      renderPage(queue.shift(), instance);
      console.info('render:' + queue.length, 'instance:' + instance.length)
    }
    checkLoop(n, queue, instance);
  }, 100);
}

async function renderPage(request, instance) {
  const { html, ttRenderMs } = await ssr(
    `${request.req.protocol}://${request.req.get('host')}:8081${request.req.originalUrl}`,
    instance
  );
  // Add Server-Timing! See https://w3c.github.io/server-timing/.
  request.res.set(
    "Server-Timing",
    `Prerender;dur=${ttRenderMs};desc="Headless render time (ms)"`
  );
  return request.res.status(200).send(html); // Serve prerendered page as response.
}
