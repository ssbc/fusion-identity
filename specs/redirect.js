module.exports = {
  type: 'fusion/redirect',
  tangle: 'redirect',

  staticProps: {
    old: {
      type: 'string', // FIXME: regex
    },
    new: {
      type: 'string', // FIXME: regex
    }
  },
}
