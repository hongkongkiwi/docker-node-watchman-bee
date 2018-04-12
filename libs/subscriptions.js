const fs = require('fs'),
      path = require('path'),
      _ = require('lodash'),
      logger = require('./logger'),
      Queue = require('bee-queue')

const isSubscriptionValid = (subscription) => {
  if (!_.isObject(subscription))
    return logger.error('Invalid Subscripton Object. Ignoring subscription.', subscription)
  if (_.has(subscription, 'enabled') && _.isBoolean(subscription.enabled) && !subscription.enabled)
    return logger.info('Subscription is disabled. Ignoring subscription.', subscription.name)
  const fieldsToCheck = ["expression", "fields", "job_queue_redis", "name"]
  let missingFields = []
  const hasRequiredFields = _.every(fieldsToCheck, (field) => {
    if (!(field in subscription)) {
      missingFields.push(field)
      return false
    }
    return true
  })
  if (!hasRequiredFields) {
    logger.warn(`Subscription JSON is missing required fields. Ignoring subscription.`, subscription, missingFields)
    return false
  }
  const hasEmptyFields = _.every(fieldsToCheck, (field) => {
    if (_.isEmpty(subscription[field])) {
      missingFields.push(field)
      return false
    }
    return true
  })
  if (!hasEmptyFields) {
    logger.warn(`Subscription JSON is has some empty fields. Ignoring subscription.`, subscription, missingFields)
    return false
  }
  try {
      stats = fs.statSync(subscription.watch_dir)
  } catch (e) {
    logger.warn(`Subscription watch_dir does not exist. Ignoring subscription.`, subscription.watch_dir)
    return false
  }
  if (!('job_options' in subscription))
    subscription.job_options = {}
  return true
}

module.exports = (subscription_file) => {
  if (subscription_file.indexOf('.') === 0) {
    subscription_file = path.join(__dirname, '../', subscription_file)
  }
  if (!fs.existsSync(subscription_file)) {
    throw new Error(`Subscriptions file ${subscription_file} does not exist!`)
  }
  let subscriptions = require(subscription_file)

  // Loop through the subscriptions and remove any that are invalid
  subscriptions = _.filter(subscriptions, (subscription) => {
    return isSubscriptionValid(subscription)
  })
  // Add a bee queue to each
  subscriptions = _.map(subscriptions, (subscription) => {
    const options = {
      redis: subscription.job_queue_redis,
      isWorker: false,
      getEvents: false,
      sendEvents: false,
      storeJobs: false,
      removeOnSuccess: true,
      quitCommandClient: true
    }
    subscription.queue = new Queue(subscription.name, options)
    return subscription
  })
  // Filter out any items where we could not create a queue
  subscriptions = _.filter(subscriptions, (subscription) => {
    return !_.isEmpty(subscription.queue)
  })
  return subscriptions
}
