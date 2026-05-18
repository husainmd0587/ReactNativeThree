// Core SDF primitives - Inigo Quilez
export const sdBox = (p, b) => {
  const d = {
    x: Math.abs(p.x) - b.x,
    y: Math.abs(p.y) - b.y,
    z: Math.abs(p.z) - b.z
  };
  const insideDist = Math.min(Math.max(d.x, Math.max(d.y, d.z)), 0);
  const outsideDist = Math.sqrt(
    Math.max(d.x, 0) ** 2 + 
    Math.max(d.y, 0) ** 2 + 
    Math.max(d.z, 0) ** 2
  );
  return insideDist + outsideDist;
};

export const sdCylinder = (p, h, r) => {
  const d = Math.sqrt(p.x * p.x + p.z * p.z) - r;
  return Math.max(d, Math.abs(p.y) - h);
};

export const opSubtraction = (d1, d2) => Math.max(-d1, d2);

// Generate initial SDF for workpiece
export const generateWorkpieceSDF = (dimensions, resolution = [64, 64, 64]) => {
  const [rx, ry, rz] = resolution;
  const data = new Float32Array(rx * ry * rz);
  const halfW = dimensions.width / 2;
  const halfH = dimensions.height / 2;
  const halfD = dimensions.depth / 2;
  
  for (let z = 0; z < rz; z++) {
    for (let y = 0; y < ry; y++) {
      for (let x = 0; x < rx; x++) {
        const px = (x / (rx - 1)) * dimensions.width - halfW;
        const py = (y / (ry - 1)) * dimensions.height - halfH;
        const pz = (z / (rz - 1)) * dimensions.depth - halfD;
        const dist = sdBox({ x: px, y: py, z: pz }, { x: halfW, y: halfH, z: halfD });
        data[z * ry * rx + y * rx + x] = dist;
      }
    }
  }
  
  return {
    resolution,
    data,
    bounds: {
      min: { x: -halfW, y: -halfH, z: -halfD },
      max: { x: halfW, y: halfH, z: halfD }
    }
  };
};

// Apply cutting operation to SDF
export const applyCut = (sdf, toolPos, toolRadius, toolLength) => {
  const [rx, ry, rz] = sdf.resolution;
  const newData = new Float32Array(sdf.data);
  const { min, max } = sdf.bounds;
  const sizeX = max.x - min.x;
  const sizeY = max.y - min.y;
  const sizeZ = max.z - min.z;
  
  for (let z = 0; z < rz; z++) {
    for (let y = 0; y < ry; y++) {
      for (let x = 0; x < rx; x++) {
        const px = min.x + (x / (rx - 1)) * sizeX;
        const py = min.y + (y / (ry - 1)) * sizeY;
        const pz = min.z + (z / (rz - 1)) * sizeZ;
        
        const localP = { x: px - toolPos.x, y: py - toolPos.y, z: pz - toolPos.z };
        const toolDist = sdCylinder(localP, toolLength / 2, toolRadius);
        const idx = z * ry * rx + y * rx + x;
        
        if (toolDist < 0) {
          newData[idx] = opSubtraction(-toolDist, newData[idx]);
        }
      }
    }
  }
  
  return { ...sdf, data: newData };
};