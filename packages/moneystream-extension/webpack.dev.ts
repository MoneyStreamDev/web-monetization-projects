import * as webpack from 'webpack'
import merge from 'webpack-merge'

import { config } from './webpack.common'

module.exports = merge(config, {
  plugins: [
    new webpack.DefinePlugin({
      WEBPACK_DEFINE_MONEYSTREAM_DOMAIN: JSON.stringify('http://localhost:3000')
    })
  ]
})
