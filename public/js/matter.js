console.log("Loading MATTER.JS");

import Matter from 'matter-js';

var Engine = Matter.Engine,
  Render = Matter.Render,
  Runner = Matter.Runner,
  Composites = Matter.Composites,
  Common = Matter.Common,
  MouseConstraint = Matter.MouseConstraint,
  Mouse = Matter.Mouse,
  Composite = Matter.Composite,
  Bodies = Matter.Bodies;

const engine = Engine.create();
const runner = Runner.create();
const { world } = engine;

const width = window.innerWidth ?? 800;
const height = window.innerHeight ?? 400;

const render = Render.create({
  element: document.getElementById('matter-root') ?? document.body,
  engine,
  options: {
    width,
    height,
    wireframes: false,
    background: 'transparent',
    showInternalEdges: true,
  },
});
// add bodies
var offset = 10,
  options = {
    isStatic: true,
    render: {
      fillStyle: 'transparent',
    },
  };

world.bodies = [];

// these static walls will not be rendered in this sprites example, see options
Composite.add(world, [
  Bodies.rectangle(width / 2, -offset, width + 2 * offset, 50.5, options),
  Bodies.rectangle(width / 2, height + offset, width + 2 * offset, 50.5, options),
  Bodies.rectangle(width + offset, height / 2, 50.5, height + 2 * offset, options),
  Bodies.rectangle(-offset, height / 2, 50.5, height + 2 * offset, options)
]);

var stack = Composites.stack(width / 2, 20, 16, 2, 20, 20, function (x, y) {
  if (Common.random() > 0.5) {
    return Bodies.rectangle(x, y, 64, 89, {
      render: {
        strokeStyle: '#ffffff',
        sprite: {
          texture: '/milli.png'
        }
      }
    });
  } else {
    return Bodies.circle(x, y, 46, {
      density: 0.0005,
      frictionAir: 0.026,
      restitution: 0.1,
      friction: 0.1,
      render: {
        sprite: {
          texture: '/vanilli.png'
        }
      }
    });
  }
});

Composite.add(world, stack);


// add mouse control
var mouse = Mouse.create(render.canvas),
  mouseConstraint = MouseConstraint.create(engine, {
    mouse: mouse,
    constraint: {
      stiffness: 0.2,
      render: {
        visible: false
      }
    }
  });

Composite.add(world, mouseConstraint);

// keep the mouse in sync with rendering
render.mouse = mouse;

Render.run(render);
Runner.run(runner, engine);

// optional resize cleanup
window.addEventListener('beforeunload', () => {
  Render.stop(render);
  Runner.stop(runner);
});