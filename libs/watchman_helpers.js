const logger = require('./logger')

module.exports = (client) => {

  const make_time_constrained_subscription = (client, watch, relative_path, subscriptionKey, expression, fields) => {
    client.command(['clock', watch], (error, resp) => {
      if (error) {
        logger.error('Failed to query clock:', error)
        return
      }

      sub = {
        // Match files that are a .xls and not empty and exists (not deleted) and are type file
        expression: expression,
        // Which fields we're interested in
        fields: fields,
        // add our time constraint
        since: resp.clock
      }

      if (relative_path) {
        sub.relative_root = relative_path
      }

      client.command(['subscribe', watch, subscriptionKey, sub], (err, resp) => {
        // handle the result here
        if (err) {
          return logger.error(err)
        }
        logger.log('subscribe resopnse', resp)
      })
    })
  }

  const subscribe = (subscription) => {
    // Initiate the watch
    client.command(['watch-project', subscription.watch_dir], (err, resp) => {
      if (err) {
        return logger.error('Error initiating watch:', err)
      }

      // It is considered to be best practice to show any 'warning' or
      // 'error' information to the user, as it may suggest steps
      // for remediation
      if ('warning' in resp) {
        logger.log('warning: ', resp.warning)
      }

      var path_prefix = '';
      const root = resp.watch
      if ('relative_path' in resp) {
        path_prefix = resp.relative_path
        logger.log('(re)using project watch at ', root, ', our dir is relative: ', path_prefix)
      }

      // `watch-project` can consolidate the watch for your
      // dir_of_interest with another watch at a higher level in the
      // tree, so it is very important to record the `relative_path`
      // returned in resp

      logger.log('watch established on', resp.watch, 'relative_path', resp.relative_path)

      make_time_constrained_subscription(client, resp.watch, path_prefix, subscription.name, subscription.expression, subscription.fields)
    })
  }

  return {
    subscribe: subscribe
  }
}
