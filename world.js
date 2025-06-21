class World {
  getInput() {
    return [Math.random(), Math.random()]
  }

  getExpected(input) {
    return [input[0] > 0.5 ? 1 : 0]
  }
}

module.exports = World
