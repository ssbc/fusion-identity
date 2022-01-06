const SimpleSet = require('@tangle/simple-set')

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
  },

  isValidNextStep ({ accT, graph }, msg) {
    // accT = accumulated Transformation so far
    // msg = message containing transformation about to be applied

    // members are different from consented because the creator is
    // automatically a member

    const { invited, consented, members } = msg.value.content
    
    /* Validate INIT */

    if (Object.keys(accT.members).length === 0) {
      if (!members) return false // you must add an initial member

      return members[msg.value.author] === 1 // initial member must be you
    }

    /* Validate UPDATE */

    const canUpdate = (
      accT.members[msg.value.author] ||
      accT.consented[msg.value.author] ||
      accT.invited[msg.value.author]
    )
    if (!canUpdate) return false

    if (consented) {
      const isOk = Object.keys(consented).length === 1 &&
            consented[msg.value.author] === 1 && 
            accT.invited[msg.value.author] === 1

      return isOk
    }

    // are you a member on consent or on proof-of-key and this should
    // be implicit?
    if (members) {
      const ok = Object.keys(members).every(member => accT.consented[member])
      // every member being added must already be in "consented"

      if (!ok) return false
    }
    
    return true
  }
}
