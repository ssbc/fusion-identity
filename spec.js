const SimpleSet = require('@tangle/simple-set')

module.exports = {
  type: 'fusion',

  staticProps: {
    id: {
      type: 'string',
    }
  },

  props: {
    invited: SimpleSet(),    // can add regex validation for type FeedId
    consented: SimpleSet(),
    members: SimpleSet(),
  },

  isValidNextStep ({ accT, graph }, msg) {
    // accT = accumulated Transformation so far
    // msg = message containing transformation about to be applied

    const { invited, consented, members } = msg.value.content
    
    /* Validate INIT */

    if (Object.keys(accT.members).length === 0) {
      if (!members) return false // you must add an initial member

      return members[msg.value.author] === 1 // initial member must be you
      
      // ENCODING
      //    members: { FeedId: 1 }
      //
      // this is the raw Transformation which allows for
      // easy collision-free concatenation:
      //
      //   - multiple additions just mean a bigger positive number
      //   - negative numbers remove (if it reduces the count to <= 0)
    }

    /* Validate UPDATE */

    const canUpdate = (
      accT.members[msg.value.author] ||
      accT.consented[msg.value.author] ||
      accT.invited[msg.value.author]
    )
    if (!canUpdate) return false

    if (members) {
      const ok = Object.keys(members).every(member => accT.consented[member])
      // every member being added must already be in "consented"

      if (!ok) return false
    }
    
    return true
  }
}
