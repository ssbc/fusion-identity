const Crut = require('ssb-crut')
const spec = require('./spec')

const createServer = () => {
  const stack = require('scuttle-testbot')
    .use(require('ssb-backlinks'))

  return stack()
}

const alice = createServer()
const bob = createServer()
const crut = new Crut(alice, spec)

console.log('TRANSFORMATIONS:')
alice.post(m => console.log(JSON.stringify(m.value.content, null, 2)))


crut.create({ id: '@MIXabcasss23123123.fusion1', members: { add: [alice.id] } }, (err, rootId) => {

  crut.update(rootId, { members: { add: [bob.id] } }, (err) => {
    if (err) console.log('Err: blocked from adding bob as member')
    // console.log(err) // see full error

    crut.update(rootId, { invited: { add: [bob.id] } }, (err) => {
      if (err) throw err

      crut.read(rootId, (err, identity) => {

        console.log('\nFINAL STATE:')
        console.log(JSON.stringify(identity, null, 2))

        alice.close()
        bob.close()
      })
    })
  })
})
