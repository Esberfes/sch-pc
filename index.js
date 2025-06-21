const Creature = require('./creature')
const World = require('./world')

const world = new World()
const creatures = [new Creature("Alpha"), new Creature("Beta")]

for (let step = 0; step < 10; step++) {
  console.log(`\\n🌀 Ciclo ${step}`)
  for (const c of creatures) {
    const input = world.getInput()
    const output = c.sense(input)
    console.log(`${c.name} ve ${input.map(n => n.toFixed(2))} → ${output[0].toFixed(2)}`)
    const expected = world.getExpected(input)
    c.learn(input, expected)
  }
}
