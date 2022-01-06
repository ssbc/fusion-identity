const TestBot = require('scuttle-testbot')

module.exports = {
  createServer(name, keys, startUnclean = false) {
    const stack = TestBot
          .use(require('ssb-db2/compat/db'))
          .use(require('ssb-db2/compat/history-stream'))
          .use(require('ssb-db2/compat/feedstate'))
          .use(require('ssb-db2-box2'))

    const opts = {
      db2: true,
      box2: {
        alwaysbox2: true
      }
    }

    if (name && keys) {
      opts.name = name
      opts.keys = keys
      opts.startUnclean = startUnclean
    }

    const ssb = stack(opts)

    // this is usually handled in some other module, like tribes or using meta feeds
    const dm_hex = '4e2ce5ca70cd12cc0cee0a5285b61fbc3b5f4042287858e613f9a8bf98a70d39'
    ssb.box2.addOwnDMKey(Buffer.from(dm_hex, 'hex'))

    ssb.box2.setReady()

    return ssb
  }
}
