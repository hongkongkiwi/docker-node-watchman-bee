// Our Custom Utils
const config = require('./config'),
  fs = require('fs'),
  path = require('path'),
  libs = (name) => ( path.join(__dirname, '/libs/', name) ),
  //appRoot = require('app-root-path').toString(),
  watchman = require('fb-watchman'),
  //bee = require('bee'),
  _ = require('lodash'),
  logger = require(libs('logger'))

if (!fs.existsSync(config.subscription_file)) {
  logger.error(`Subscriptions file ${config.subscription_file} does not exist!`)
  process.exit(1)
}
const subscriptions = require(config.subscription_file)

// Create a new watchman client
const client = new watchman.Client()
const { subscribe } = require(libs('watchman_helpers'))(client)

const capabilities = {
  optional: [],
  required: ['relative_root', 'cmd-clock', 'cmd-subscribe', 'cmd-watch-project']
}

// Check whether watchman is installed
client.capabilityCheck(capabilities, function(err, resp) {
  if (err) {
    // error will be an Error object if the watchman service is not
    // installed, or if any of the names listed in the `required`
    // array are not supported by the server
    logger.error(err)
    return client.end()
  }

  logger.debug('Watchman capabilities', resp)

  // Handle any found files
  client.on('subscription', function(resp) {
    if (_.has(subscriptions, resp.subscription)) {
      resp.files.forEach(function(file) {
        logger.debug('New File Found', file)
        //subscriptions[resp.subscription].queue.add(file)
      })
    } else {
      logger.warn('Unknown Plugin', resp.subscription)
    }
  })

  // Go through each subscription and subscribe as necessary
  _.each(subscriptions, subscribe)
})
