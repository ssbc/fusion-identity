module.exports = {
  type: 'fusion/redirect',
  tangle: 'rediret',

  staticProps: {
    old: {
      type: 'string', // FIXME: regex
    },
    new: {
      type: 'string', // FIXME: regex
    }
  },
}
