const logger = require('./logger'),
      _ = require('lodash'),
      touch = require("touch"),
      path = require("path"),
      recursive = require("recursive-readdir")

const ignoreFunc = (file, stats) => {
  // `file` is the path to the file, and `stats` is an `fs.Stats`
  // object returned from `fs.lstat()`.
  return false
}

module.exports = (subscription) => {
  recursive(subscription.watch_dir, [ignoreFunc], (err, files) => {
    if (err) return logger.error(err)
    _.each(files, (filename) => {
      touch.sync(filename, {
        nocreate: true,
        atime: Date.now()
      })
    })
  })
}

// const subscriptions = require('../config/subscriptions')
// let subscription = subscriptions[0]
// subscription.watch_dir = path.join(__dirname, '../data/watch/')
//
// module.exports(subscription)
