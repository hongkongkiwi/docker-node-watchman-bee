const path = require('path')
require('dotenv').config({path: process.env.DOTENV_FILE || path.resolve(process.cwd(), '.env')})

module.exports = {
  subscription_file: process.env.SUBSCRIPTION_FILE || '/config/subscriptions.json'
}
