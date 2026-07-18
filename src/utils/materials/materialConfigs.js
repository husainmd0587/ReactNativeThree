// materials/materialConfigs.js - COMPLETE VERSION
import { useTextureLoader } from './textures';
import * as THREE from 'three';

export function useMaterialConfigs() {
  // Load existing textures
  let steelTexture, woodTexture, copperTexture, marbleTexture, defaultTexture;
  let aluminiumTexture, brassTexture, plasticTexture, knurlTexture, wallTexture;
  
  try {
    steelTexture = useTextureLoader({ type: 'steel', repeat: [2, 2] });
    aluminiumTexture = useTextureLoader({ type: 'aluminium', repeat: [2, 2] });
    copperTexture = useTextureLoader({ type: 'copper', repeat: [2, 2] });
    brassTexture = useTextureLoader({ type: 'brass', repeat: [2, 2] });
    knurlTexture = useTextureLoader({ type: 'knurl', repeat: [4, 2] });
    woodTexture = useTextureLoader({ type: 'wood', repeat: [2, 2] });
    marbleTexture = useTextureLoader({ type: 'marble', repeat: [2, 2] });
    wallTexture = useTextureLoader({ type: 'wall', repeat: [2, 2] });
    plasticTexture = useTextureLoader({ type: 'plastic', repeat: [2, 2] });
    defaultTexture = useTextureLoader({ type: 'default', repeat: [2, 2] });
  } catch (e) {
    console.log('⚠️ Some textures not found, using color fallbacks');
  }

  return {
    // ============ METALS ============
    
    // Ferrous Metals
    steel: {
      color: '#888888',
      metalness: 0.8,
      roughness: 0.4,
      map: steelTexture || null,
      envMapIntensity: 1.0,
    },
    
    'carbon-steel': {
      color: '#777777',
      metalness: 0.7,
      roughness: 0.5,
      map: steelTexture || null,
      envMapIntensity: 0.9,
    },
    
    'alloy-steel': {
      color: '#888888',
      metalness: 0.85,
      roughness: 0.3,
      map: steelTexture || null,
      envMapIntensity: 1.2,
    },
    
    'stainless-steel': {
      color: '#cccccc',
      metalness: 0.9,
      roughness: 0.2,
      map: steelTexture || null,
      envMapIntensity: 1.5,
    },
    
    'tool-steel': {
      color: '#666666',
      metalness: 0.95,
      roughness: 0.15,
      map: steelTexture || null,
      envMapIntensity: 1.8,
    },
    
    'cast-iron': {
      color: '#555555',
      metalness: 0.6,
      roughness: 0.7,
      map: steelTexture || null,
      envMapIntensity: 0.5,
    },
    
    // Steel Heat Treatment Variants
    'steel-annealed': {
      color: '#888888',
      metalness: 0.5,
      roughness: 0.6,
      map: steelTexture || null,
      envMapIntensity: 0.7,
    },
    
    'steel-normalized': {
      color: '#999999',
      metalness: 0.6,
      roughness: 0.5,
      map: steelTexture || null,
      envMapIntensity: 0.8,
    },
    
    'steel-hardened': {
      color: '#aaaaaa',
      metalness: 0.9,
      roughness: 0.15,
      map: steelTexture || null,
      envMapIntensity: 1.5,
    },
    
    'steel-tempered': {
      color: '#999999',
      metalness: 0.8,
      roughness: 0.3,
      map: steelTexture || null,
      envMapIntensity: 1.2,
    },
    
    'steel-case-hardened': {
      color: '#888888',
      metalness: 0.75,
      roughness: 0.4,
      map: steelTexture || null,
      envMapIntensity: 1.0,
    },
    
    'steel-polished': {
      color: '#aaaaaa',
      metalness: 0.95,
      roughness: 0.1,
      map: steelTexture || null,
      envMapIntensity: 2.0,
    },
    
    'steel-brushed': {
      color: '#888888',
      metalness: 0.7,
      roughness: 0.6,
      map: steelTexture || null,
      envMapIntensity: 0.8,
    },
    
    // Non-Ferrous Metals
    aluminium: {
      color: '#cccccc',
      metalness: 0.5,
      roughness: 0.5,
      map: aluminiumTexture || null,
      envMapIntensity: 0.8,
    },
    
    copper: {
      color: '#d2691e',
      metalness: 0.9,
      roughness: 0.3,
      map: copperTexture || null,
      envMapIntensity: 1.2,
    },
    
    brass: {
      color: '#cd7f32',
      metalness: 0.8,
      roughness: 0.4,
      map: brassTexture || null,
      envMapIntensity: 1.0,
    },
    
    bronze: {
      color: '#cd7f32',
      metalness: 0.85,
      roughness: 0.35,
      map: null,
      envMapIntensity: 1.1,
    },
    
    titanium: {
      color: '#a0a0a0',
      metalness: 0.7,
      roughness: 0.3,
      map: null,
      envMapIntensity: 1.0,
    },
    
    magnesium: {
      color: '#b0b0b0',
      metalness: 0.4,
      roughness: 0.6,
      map: null,
      envMapIntensity: 0.5,
    },
    
    zinc: {
      color: '#b0b0b0',
      metalness: 0.3,
      roughness: 0.7,
      map: null,
      envMapIntensity: 0.4,
    },
    
    nickel: {
      color: '#c0c0c0',
      metalness: 0.85,
      roughness: 0.3,
      map: null,
      envMapIntensity: 1.2,
    },
    
    tin: {
      color: '#a0a0a0',
      metalness: 0.2,
      roughness: 0.8,
      map: null,
      envMapIntensity: 0.3,
    },
    
    lead: {
      color: '#808080',
      metalness: 0.1,
      roughness: 0.9,
      map: null,
      envMapIntensity: 0.2,
    },
    
    // ============ POLYMERS & PLASTICS ============
    
    plastic: {
      color: '#cccccc',
      metalness: 0.0,
      roughness: 0.5,
      map: plasticTexture || null,
      envMapIntensity: 0.3,
    },
    
    polyethylene: {
      color: '#eeeeee',
      metalness: 0.0,
      roughness: 0.6,
      map: null,
      envMapIntensity: 0.2,
    },
    
    polypropylene: {
      color: '#dddddd',
      metalness: 0.0,
      roughness: 0.5,
      map: null,
      envMapIntensity: 0.3,
    },
    
    pvc: {
      color: '#cccccc',
      metalness: 0.0,
      roughness: 0.7,
      map: null,
      envMapIntensity: 0.2,
    },
    
    nylon: {
      color: '#dddddd',
      metalness: 0.0,
      roughness: 0.4,
      map: null,
      envMapIntensity: 0.3,
    },
    
    ptfe: {
      color: '#eeeeee',
      metalness: 0.0,
      roughness: 0.3,
      map: null,
      envMapIntensity: 0.2,
    },
    
    abs: {
      color: '#cccccc',
      metalness: 0.0,
      roughness: 0.5,
      map: null,
      envMapIntensity: 0.3,
    },
    
    polycarbonate: {
      color: '#dddddd',
      metalness: 0.0,
      roughness: 0.3,
      map: null,
      envMapIntensity: 0.4,
      transparent: true,
      opacity: 0.85,
    },
    
    peek: {
      color: '#bbbbbb',
      metalness: 0.0,
      roughness: 0.4,
      map: null,
      envMapIntensity: 0.4,
    },
    
    epoxy: {
      color: '#cccccc',
      metalness: 0.0,
      roughness: 0.5,
      map: null,
      envMapIntensity: 0.3,
    },
    
    silicone: {
      color: '#dddddd',
      metalness: 0.0,
      roughness: 0.8,
      map: null,
      envMapIntensity: 0.2,
    },
    
    // ============ CERAMICS ============
    
    marble: {
      color: '#cccccc',
      metalness: 0.1,
      roughness: 0.4,
      map: marbleTexture || null,
      envMapIntensity: 0.5,
    },
    
    alumina: {
      color: '#dddddd',
      metalness: 0.0,
      roughness: 0.2,
      map: null,
      envMapIntensity: 0.4,
    },
    
    'silicon-carbide': {
      color: '#aaaaaa',
      metalness: 0.0,
      roughness: 0.3,
      map: null,
      envMapIntensity: 0.5,
    },
    
    zirconia: {
      color: '#cccccc',
      metalness: 0.0,
      roughness: 0.3,
      map: null,
      envMapIntensity: 0.4,
    },
    
    'silicon-nitride': {
      color: '#bbbbbb',
      metalness: 0.0,
      roughness: 0.3,
      map: null,
      envMapIntensity: 0.4,
    },
    
    glass: {
      color: '#88ccff',
      metalness: 0.0,
      roughness: 0.05,
      map: null,
      transparent: true,
      opacity: 0.6,
      envMapIntensity: 1.5,
    },
    
    refractory: {
      color: '#999999',
      metalness: 0.0,
      roughness: 0.9,
      map: null,
      envMapIntensity: 0.2,
    },
    
    // ============ COMPOSITES ============
    
    'carbon-fiber': {
      color: '#333333',
      metalness: 0.1,
      roughness: 0.3,
      map: null,
      envMapIntensity: 0.8,
    },
    
    fiberglass: {
      color: '#dddddd',
      metalness: 0.0,
      roughness: 0.4,
      map: null,
      envMapIntensity: 0.3,
    },
    
    kevlar: {
      color: '#ccaa55',
      metalness: 0.0,
      roughness: 0.5,
      map: null,
      envMapIntensity: 0.3,
    },
    
    'metal-matrix-composite': {
      color: '#999999',
      metalness: 0.6,
      roughness: 0.4,
      map: null,
      envMapIntensity: 0.8,
    },
    
    'ceramic-matrix-composite': {
      color: '#aaaaaa',
      metalness: 0.1,
      roughness: 0.3,
      map: null,
      envMapIntensity: 0.5,
    },
    
    'natural-fiber-composite': {
      color: '#8B7355',
      metalness: 0.0,
      roughness: 0.9,
      map: woodTexture || null,
      envMapIntensity: 0.1,
    },
    
    // ============ SMART MATERIALS ============
    
    'shape-memory-alloy': {
      color: '#888888',
      metalness: 0.7,
      roughness: 0.3,
      map: null,
      envMapIntensity: 1.0,
    },
    
    piezoelectric: {
      color: '#cccccc',
      metalness: 0.0,
      roughness: 0.4,
      map: null,
      envMapIntensity: 0.5,
    },
    
    magnetostrictive: {
      color: '#888888',
      metalness: 0.5,
      roughness: 0.5,
      map: null,
      envMapIntensity: 0.7,
    },
    
    'electroactive-polymer': {
      color: '#bbbbbb',
      metalness: 0.0,
      roughness: 0.6,
      map: null,
      envMapIntensity: 0.3,
    },
    
    // ============ NANOMATERIALS ============
    
    graphene: {
      color: '#222222',
      metalness: 0.0,
      roughness: 0.1,
      map: null,
      envMapIntensity: 0.8,
    },
    
    'carbon-nanotube': {
      color: '#444444',
      metalness: 0.2,
      roughness: 0.2,
      map: null,
      envMapIntensity: 0.9,
    },
    
    nanocomposite: {
      color: '#666666',
      metalness: 0.3,
      roughness: 0.3,
      map: null,
      envMapIntensity: 0.6,
    },
    
    // ============ SPECIAL MATERIALS ============
    
    knurl: {
      color: '#888888',
      metalness: 0.2,
      roughness: 0.8,
      map: knurlTexture || null,
      envMapIntensity: 0.3,
    },
    
    wood: {
      color: '#d2691e',
      metalness: 0.0,
      roughness: 0.9,
      map: woodTexture || null,
      envMapIntensity: 0.1,
    },
    
    wall: {
      color: '#888888',
      metalness: 0.0,
      roughness: 0.8,
      map: wallTexture || null,
      envMapIntensity: 0.2,
    },
    
    // ============ SOLID COLORS ============
    
    'solid-black': {
      color: '#000000',
      metalness: 0.0,
      roughness: 0.5,
      map: null,
      envMapIntensity: 0,
    },
    
    'solid-white': {
      color: '#ffffff',
      metalness: 0.0,
      roughness: 0.5,
      map: null,
      envMapIntensity: 0,
    },
    
    'solid-red': {
      color: '#ff0000',
      metalness: 0.0,
      roughness: 0.5,
      map: null,
      envMapIntensity: 0,
    },
    
    'solid-blue': {
      color: '#0000ff',
      metalness: 0.0,
      roughness: 0.5,
      map: null,
      envMapIntensity: 0,
    },
    
    'solid-green': {
      color: '#00ff00',
      metalness: 0.0,
      roughness: 0.5,
      map: null,
      envMapIntensity: 0,
    },
    
    'solid-yellow': {
      color: '#ffff00',
      metalness: 0.0,
      roughness: 0.5,
      map: null,
      envMapIntensity: 0,
    },
    
    'solid-orange': {
      color: '#ff8c00',
      metalness: 0.0,
      roughness: 0.5,
      map: null,
      envMapIntensity: 0,
    },
    
    'solid-purple': {
      color: '#800080',
      metalness: 0.0,
      roughness: 0.5,
      map: null,
      envMapIntensity: 0,
    },
    
    // ============ DEFAULT ============
    
    default: {
      color: '#999999',
      metalness: 0.5,
      roughness: 0.5,
      map: defaultTexture || null,
      envMapIntensity: 0.5,
    },
  };
}

// Helper functions
export function createMaterial(baseMaterial, overrides = {}) {
  const materials = useMaterialConfigs();
  const base = materials[baseMaterial] || materials.default;
  return { ...base, ...overrides };
}

export function createColoredMaterial(baseMaterial, color) {
  const materials = useMaterialConfigs();
  const base = materials[baseMaterial] || materials.default;
  return { ...base, color };
}

export function getMaterialByName(materialConfigs, name) {
  return materialConfigs[name] || materialConfigs.default || {};
}

export function getMaterialNames(materialConfigs) {
  return Object.keys(materialConfigs);
}

export default {
  useMaterialConfigs,
  createMaterial,
  createColoredMaterial,
  getMaterialByName,
  getMaterialNames,
};