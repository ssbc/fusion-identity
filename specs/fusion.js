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

  nextStepData: {
    subtype: {
      type: 'string',
    },
    consentId: {
      type: 'string',
    },
    proofOfKey: {
      type: 'string',
    }
  },

  props: {
    invited: SimpleSet(),
    consented: SimpleSet(),
    // members are different from consented because the creator is
    // automatically a member
    members: SimpleSet(),
  },

  isValidNextStep ({ tips, graph }, node, ssb) {
    const { author } = node
    const { invited, consented, members, subtype, consentId, proofOfKey } = node.data

    // tombstone
    if (node.data.tombstone) {
      return tips.some(tipObj => tipObj.T.members[author])
    }

    const tombstoned = tips.some(tipObj => {
      return Object.keys(tipObj.T.tombstone).length > 0
    })
    if (tombstoned) return false

    if (subtype === 'fusion/init') {
      // members must only contain author
      if (!members || Object.keys(members).length !== 1) return false
      if (members[author] !== 1) return false

      // no other types
      if (consented && Object.keys(consented).length !== 0) return false
      if (invited && Object.keys(invited).length !== 0) return false

      // this must be the first message
      return tips.every(tipObj => {
        const tip = tipObj.T

        return Object.keys(tip.members).length === 0
      })
    } else if (subtype === 'fusion/invite') {
      const isMember = tips.some(tipObj => tipObj.T.members[author])
      if (!isMember) return false

      // only invites
      if (consented && Object.keys(consented).length !== 0) return false
      if (members && Object.keys(members).length !== 0) return false

      if (!invited) return false
      if (invited[author]) return false

      return true
    } else if (subtype === 'fusion/consent') {
      const isMemberOrConsented = tips.some(tipObj => {
        return tipObj.T.members[author] || tipObj.T.consented[author]
      })
      if (isMemberOrConsented) return false

      const isInvited = tips.some(tipObj => tipObj.T.invited[author])
      if (!isInvited) return false

      if (consented) // only self consent
        return Object.keys(consented).length === 1 && consented[author]

      return false
    } else if (subtype === 'fusion/proof-of-key') {
      // members must only contain author
      if (!members || Object.keys(members).length !== 1) return false
      if (members[author] !== 1) return false

      const fusionId = graph.nodes[0].data.id
      const secretKey = ssb.box2.getGroupKey(fusionId)

      const consentMsgKey = graph.nodes.find(x => x.author === author && x.data.consented).key

      if (consentId !== consentMsgKey)
        return false

      const proofStr = consentId + 'fusion/proof-of-key'
      const privateKeyStr = secretKey.toString('base64') + ".ed25519"
      const reproduced = ssbKeys.sign(privateKeyStr, proofStr)

      const correctProof = proofOfKey === reproduced
      return correctProof
    }

    return false
  }
}
