import { useRef, useCallback, useEffect } from 'react';
import * as THREE from 'three';
import { generateWorkpieceSDF, applyCut } from '../utils/sdfUtils';

export const useSDFTexture = (dimensions) => {
  const sdfRef = useRef(null);
  const textureRef = useRef(null);
  
  const initializeSDF = useCallback(() => {
    const sdf = generateWorkpieceSDF(dimensions, [64, 64, 64]);
    sdfRef.current = sdf;
    
    const texture = new THREE.Data3DTexture(
      sdf.data, sdf.resolution[0], sdf.resolution[1], sdf.resolution[2]
    );
    texture.format = THREE.RedFormat;
    texture.type = THREE.FloatType;
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.wrapS = THREE.ClampToEdgeWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    texture.wrapR = THREE.ClampToEdgeWrapping;
    texture.needsUpdate = true;
    
    textureRef.current = texture;
    return { sdf, texture };
  }, [dimensions]);
  
  const applyCutting = useCallback((toolPos, toolRadius, toolLength) => {
    if (!sdfRef.current || !textureRef.current) return;
    const updatedSDF = applyCut(sdfRef.current, toolPos, toolRadius, toolLength);
    sdfRef.current = updatedSDF;
    textureRef.current.image.data = updatedSDF.data;
    textureRef.current.needsUpdate = true;
  }, []);
  
  const getTexture = useCallback(() => textureRef.current, []);
  const getSDF = useCallback(() => sdfRef.current, []);
  
  useEffect(() => {
    initializeSDF();
    return () => { textureRef.current?.dispose(); };
  }, [initializeSDF]);
  
  return { initializeSDF, applyCutting, getTexture, getSDF };
};