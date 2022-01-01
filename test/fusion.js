const test = require('tape')
const Fusion = require('../')
const { toCallback } = require('ssb-db2/operators')

const createServer = () => {
  const stack = require('scuttle-testbot')
        .use(require('ssb-db2/compat/db'))
        .use(require('ssb-db2/compat/history-stream'))
        .use(require('ssb-db2/compat/feedstate'))
        .use(require('ssb-db2-box2'))

  return stack({
    db2: true,
    box2: {
      alwaysbox2: true
    }
  })
}

test('create fusion identity', (t) => {
  const alice = createServer()

  alice.box2.setReady()
  alice.box2.registerIsGroup(recp => recp.startsWith('ssb:identity/fusion/'))

  const fusion = Fusion.init(alice)

  fusion.create((err, rootId) => {
    t.error(err, 'no err for create()')

    alice.db.query(
      toCallback((err, messages) => {
        t.equal(messages.length, 2, '2 messages created')
        t.equal(messages[0].value.content.type, 'fusion')
        t.equal(messages[1].value.content.recps.length, 2, '2 recipients')
        t.equal(messages[1].meta.private, true, 'secret is encrypted')
        alice.close(t.end)
      })
    )
  })
})
