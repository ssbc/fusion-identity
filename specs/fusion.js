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

  isValidNextStep ({ tips, graph }, node, ssb) {
    // members are different from consented because the creator is
    // automatically a member

    const { author } = node
    const { invited, consented, members, proofOfKey } = node.data

    return tips.every(tipObj => {
      const tip = tipObj.T
      /* Validate INIT */

      if (Object.keys(tip.members).length === 0) {
        if (!members) return false // you must add an initial member

        // FIXME: should check if already exists

        return members[author] === 1 // initial member must be you
      }

      /* Validate UPDATE */

      const canUpdate = (
        tip.members[author] ||
          tip.consented[author] ||
          tip.invited[author]
      )
      if (!canUpdate) return false

      if (consented) {
        return Object.keys(consented).length === 1 &&
          consented[author] === 1 && 
          tip.invited[author] === 1
      }

      if (members) {
        // every member being added must already be in "consented"
        const ok = Object.keys(members).every(member => tip.consented[member])

        if (!ok) return false

        const fusionId = graph.nodes[0].data.id
        const secretKey = ssb.box2.getGroupKey(fusionId)

        const consentId = graph.nodes.find(x => x.author === author && x.data.consented).key

        const proofStr = consentId + 'fusion/proof-of-key'
        const privateKeyStr = secretKey.toString('base64') + ".ed25519"
        const reproduced = ssbKeys.sign(privateKeyStr, proofStr)

        const correctProof = proofOfKey.set === reproduced

        return correctProof
      }

      /* Validate TOMBSTONE */

      if (node.data.tombstone) {
        return tip.members[author]
      }
      
      return true
    })
  }
}
