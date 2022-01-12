const ssbKeys = require('ssb-keys')
const SimpleSet = require('@tangle/simple-set')
const Overwrite = require('@tangle/overwrite')

module.exports = {
  type: 'fusion',

  staticProps: {
    id: {
      type: 'string',
    }
  },

  props: {
    invited: SimpleSet(),
    consented: SimpleSet(),
    members: SimpleSet(),
    // FIXME: https://gitlab.com/ahau/lib/ssb-crut/-/issues/3
    proofOfKey: Overwrite()
  },

  isValidNextStep ({ accT, graph, server }, msg) {
    // accT = accumulated Transformation so far
    // msg = message containing transformation about to be applied

    // members are different from consented because the creator is
    // automatically a member

    const { author } = msg.value
    const { invited, consented, members, proofOfKey } = msg.value.content
    
    /* Validate INIT */

    if (Object.keys(accT.members).length === 0) {
      if (!members) return false // you must add an initial member

      return members[author] === 1 // initial member must be you
    }

    /* Validate UPDATE */

    const canUpdate = (
      accT.members[author] ||
      accT.consented[author] ||
      accT.invited[author]
    )
    if (!canUpdate) return false

    if (consented) {
      return Object.keys(consented).length === 1 &&
             consented[author] === 1 && 
             accT.invited[author] === 1
    }

    if (members) {
      // every member being added must already be in "consented"
      const ok = Object.keys(members).every(member => accT.consented[member])

      if (!ok) return false

      // FIXME: https://gitlab.com/ahau/lib/ssb-crut/-/issues/4

      return true

      const fusionId = graph.nodes[0].value.content.id
      const secretKey = server.box2.getGroupKey(fusionId)

      const consentId = graph.nodes.find(x => x.value.author === author && x.value.content.consented).key

      const proofStr = consentId + 'fusion/proof-of-key'
      const privateKeyStr = secretKey.toString('base64') + ".ed25519"
      const reproduced = ssbKeys.sign(privateKeyStr, proofStr)

      const correctProof = proofOfKey.set === reproduced

      return correctProof
    }

    /* Validate TOMBSTONE */

    if (msg.value.content.tombstone) {
      return accT.members[author]
    }
    
    return true
  }
}
