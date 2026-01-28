import { Extrude } from '@react-three/drei'
import {Shape} from 'three'
import React from 'react'

export function CustomExtrudedShape() {

 const shape = new Shape();
    shape.moveTo( 25, 25 );
    shape.bezierCurveTo( 25, 25, 20, 0, 0, 0 );
    shape.bezierCurveTo( - 30, 0, - 30, 35, - 30, 35 );
    shape.bezierCurveTo( - 30, 55, - 10, 77, 25, 95 );
    shape.bezierCurveTo( 60, 77, 80, 55, 80, 35 );
    shape.bezierCurveTo( 80, 35, 80, 0, 50, 0 );
    shape.bezierCurveTo( 35, 0, 25, 25, 25, 25 );


  return (
    <Extrude
    args={[shape, {
    steps: 1,
  depth: 15,
  bevelEnabled: true,
  bevelThickness: 0.1,
  bevelSize: 0.1,
  bevelSegments: 32 
      }]}
    >
      <meshStandardMaterial color="teal" />
    </Extrude>
  ) 
}