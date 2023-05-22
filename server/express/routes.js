const simple = require('./handlers/simple');
const configured = require('./handlers/configured');
const chatHandler = require('./handlers/chat')
module.exports = function (app, opts) {
  // Setup routes, middleware, and handlers
  app.get('/', simple);
  app.get('/configured', configured(opts));

  app.post('/query', chatHandler)
};
