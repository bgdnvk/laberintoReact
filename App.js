import React, { Component } from 'react';
import { View, Alert, Dimensions } from 'react-native';
import { GameEngine } from 'react-native-game-engine';
import RNRestart from 'react-native-restart';
//https://www.npmjs.com/package/react-native-restart
//se usa para resetear la app al finalizar

import {
  accelerometer,
  setUpdateIntervalForType,
  SensorTypes
} from "react-native-sensors";
//siempre incluir npx react-native link react-native-sensors

//https://brm.io/matter-js/docs/
import Matter from 'matter-js';

import Circle from './src/components/Circle';
import Rectangle from './src/components/Rectangle';

import CreateMaze from './src/helpers/CreateMaze';
import GetRandomPoint from './src/helpers/GetRandomPoint';


const { height, width } = Dimensions.get('window');
//creación del laberinto
//mayor numero = más complejidad
const GRID_X = 8; 
const GRID_Y = 8;
const maze = CreateMaze(GRID_X, GRID_Y);

//https://brm.io/matter-js/docs/classes/Bodies.html
//se crea bola que vamos a mover
const BALL_SIZE = Math.floor(width * .02);
const ballStartPoint = GetRandomPoint(GRID_X, GRID_Y);
const theBall = Matter.Bodies.circle(
  ballStartPoint.x,
  ballStartPoint.y,
  BALL_SIZE,
  {
    label: "ball"
  }
);
//se crea el objetivo a donde hay que llegar
const GOAL_SIZE = Math.floor(width * .04); 
const goalPoint = GetRandomPoint(GRID_X, GRID_Y);
const goal = Matter.Bodies.rectangle(goalPoint.x, goalPoint.y, GOAL_SIZE, GOAL_SIZE, {
  isStatic: true,
  isSensor: true,
  label: 'goal'
});
//sensibilidad del sensor
setUpdateIntervalForType(SensorTypes.accelerometer, 100);

//componente principal para index.js
export default class App extends Component {
  
  state = {
    ballX: theBall.position.x,
    ballY: theBall.position.y,
  }
  
  //detección de colisiones
  _setupCollisionHandler = (engine) => {
    Matter.Events.on(engine, "collisionStart", event => { 
      var pairs = event.pairs;

      //cogemos las características de los objetos para comprararlos
      var objA = pairs[0].bodyA.label;
      var objB = pairs[0].bodyB.label;
      
      //se llega a la meta
      if (objA === 'ball' && objB === 'goal') {
        Alert.alert(
          // 'Goal Reached!',
          // 'Do you want to start over?',
          'Has ganado!',
          'Quieres volver a jugar?',
          [
            {
              //TODO: arreglar el bug del reset
              text: 'Si!', 
              onPress: () => {
                //devuelve null y no funciona correctamente
                RNRestart.Restart();
              }
            }
          ],
          { cancelable: true },
        ); 
      } 
      //se produce un choque
      else if (objA === 'wall' && objB === 'ball') {
        Matter.Body.setPosition(theBall, {
          x: ballStartPoint.x,
          y: ballStartPoint.y
        });
        this.setState({
          ballX: ballStartPoint.x,
          ballY: ballStartPoint.y
        });
       
      }
    });
  }


  componentDidMount() {
    const { engine, world } = this._addObjectsToWorld(maze, theBall, goal);
    this.entities = this._getEntities(engine, world, maze, theBall, goal);

    this._setupCollisionHandler(engine);

    //https://stackoverflow.com/a/55051360
    //al moverse el teléfono se nos dan los datos actualizados
    accelerometer.subscribe(({ x, y }) => {
      //TODO: arreglar der/izq
      //ponemos la posicion con Matter.js
      //https://brm.io/matter-js/docs/classes/Body.html#method_setPosition
      Matter.Body.setPosition(theBall, {
        x: this.state.ballX + x,
        y: this.state.ballY + y
      });
      this.setState({
        ballX: x + this.state.ballX,
        ballY: y + this.state.ballY,
      });
    });
  }


 
  physics = (entities, { time }) => {
    let engine = entities["physics"].engine;
    engine.world.gravity = {
      x: 0,
      y: 0
    };
    Matter.Engine.update(engine, time.delta);
    return entities;
  }

  //https://pep8.org/#descriptive-naming-styles
  //no sé si es un buen uso la verdad pero lo he visto en un tutorial

  //se crea el mundo y se agragan los componentes
  _addObjectsToWorld = (maze, ball, goal) => {
    //https://brm.io/matter-js/docs/classes/Engine.html#method_create
    const engine = Matter.Engine.create({ enableSleeping: false });
    const world = engine.world;

    Matter.World.add(world, [
      maze, 
      ball, 
      goal
    ]);

    return {
      engine,
      world
    }
  }

  //se crean los objetos con sus características
  //https://brm.io/matter-js/docs/classes/Render.html
  _getEntities = (engine, world, maze, ball, goal) => {
    const entities = {
      physics: {
        engine,
        world
      },
      playerBall: {
        body: ball,
        bgColor: '#3B2394',
        borderColor: '#8297CD',
        renderer: Circle
      },
     
      goalBox: {
        body: goal,
        size: [GOAL_SIZE, GOAL_SIZE],
        color: '#05a300',
        renderer: Rectangle
      }
     
    }
    
    //al usar allBodies agregamos todas las características a los muros
    const walls = Matter.Composite.allBodies(maze);
    walls.forEach((body, index) => {

      const { min, max } = body.bounds;
      const width = max.x - min.x;
      const height = max.y - min.y;
      
      Object.assign(entities, {
        ['wall_' + index]: {
          body: body,
          size: [width, height],
          color: '#56d6d6',
          renderer: Rectangle
        }
      });
    });
   

    return entities; 
  }


  render() {
    if (this.entities) {
      return (
        <View style={styles.container}>
          <GameEngine
            systems={[this.physics]}
            entities={this.entities}
          >
          </GameEngine>
        </View>
      );
    }
    return null;
  }
}

const styles = {
  container: {
    flex: 1
  }
};