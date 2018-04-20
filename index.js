// Our Custom Utils
const config = require('./config'),
  fs = require('fs'),
  path = require('path'),
  _ = require('lodash'),
  libs = (name) => ( path.join(__dirname, '/libs/', name) ),
  //appRoot = require('app-root-path').toString(),
  watchman = require('fb-watchman'),
  //bee = require('bee'),
  touchSubscriptionFile = require(libs('touch_existing_files')),
  queue = require(libs('queue')),
  logger = require(libs('logger')),
  fileHash = require(libs('hash_file'))

const subscriptions = require(libs('subscriptions'))(config.subscription_file)

// Create a new watchman client
const client = new watchman.Client()
const { subscribe } = require(libs('watchman_helpers'))(client)

const capabilities = require('./capabilities.json')

// Some reasonable period of time for all your concurrent jobs to finish
// processing. If a job does not finish processing in this time, it will stall
// and be retried. As such, do attempt to make your jobs idempotent, as you
// generally should with any queue that provides at-least-once delivery.
const TIMEOUT = 30 * 1000

process.on('uncaughtException', async (err) => {
  // Queue#close is idempotent - no need to guard against duplicate calls.
  try {
    let allQueueClosingPromises = []
    subscriptions.forEach((subscription) => {
      if (_.isObject(subscription) &&
          _.has(subscription, 'queue') &&
          _.isObject(subscription.queue) &&
          _.isFunction(subscription.queue.close))
      allQueueClosingPromises.push(subscription.queue.close(TIMEOUT))
    })
    await Promise.all(allQueueClosingPromises)
  } catch (err) {
    logger.error('bee-queue failed to shut down gracefully', err)
  }
  logger.error(err)
  process.exit(1)
})

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
  client.on('subscription', async function(resp) {
    const subscription = _.find(subscriptions, {name: resp.subscription})
    if (!subscription) {
      logger.warn('Unknown Plugin', resp.subscription)
    }
    resp.files.forEach(async (file_info) => {
      const queue = subscription.queue
      file_info.path = subscription.watch_dir
      const filename = path.join(file_info.path, file_info.name)
      if (!fs.existsSync(filename)) {
        logger.error('Got a new file notification but the file does not exist. Ignoring...', subscription.name, file_info)
        return
      }
      if (_.has(subscription.extra_job_data)) {
        file_info = _.extend(file_info, subscription.extra_job_data)
      }
      const job = queue.createJob(file_info)
      // If for some reason we don't have sha1hex
      if (!('content.sha1hex' in file_info) && 'exists' in file_info && file_info.exists)
        file_info['content.sha1hex'] = await fileHash(filename, 'sha1')

      if ('content.sha1hex' in file_info && file_info['content.sha1hex'])
        job.setId(file_info['content.sha1hex'])

      try {
        await job.save()
      } catch (e) {
        logger.error('Error adding file to job queue', subscription.name, file_info)
      }
      logger.debug('New File Added to Job Queue', subscription.name, file_info)
    })
  })

  // Go through each subscription and subscribe as necessary
  _.each(subscriptions, subscribe)

  // Loop through all directories and touch all files in the watch directories, this will send them to the queue
  if (_.has(process.env, 'SEND_EXISTING_FILES_ON_BOOT') && process.env.SEND_EXISTING_FILES_ON_BOOT === 'true') {
    logger.debug('SEND_EXISTING_FILES_ON_BOOT is true, sending every existing file to the queue')
    _.each(subscriptions, touchSubscriptionFile)
  }
})
