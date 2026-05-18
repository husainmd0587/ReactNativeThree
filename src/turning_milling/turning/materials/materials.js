// cncMaterials.js
export const CNC_MATERIALS = {
  copper: {
    color: '#b87333',
    metalness: 0.85,
    roughness: 0.35,
    textures: {
      map: require('../../../assets/textures/copper/albedo.jpg'),
      normalMap: require('../../../assets/textures/copper/normal.jpg'),
      roughnessMap: require('../../../assets/textures/copper/roughness.jpg'),
    },
  },

  aluminum: {
    color: '#cfd6dd',
    metalness: 0.9,
    roughness: 0.3,
    textures: {
      map: require('../../../assets/textures/aluminum/albedo.jpg'),
      normalMap: require('../../../assets/textures/aluminum/normal.jpg'),
    },
  },

  wood: {
    color: '#8b5a2b',
    metalness: 0.05,
    roughness: 0.85,
    textures: {
      map: require('../../../assets/textures/wood/albedo.jpg'),
      normalMap: require('../../../assets/textures/wood/normal.jpg'),
    },
  },
}
