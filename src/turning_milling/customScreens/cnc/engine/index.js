import { interpretGCode } from './latheInterpreter';
import { buildPasses } from './toolpathToPasses';
import { buildProfilePath, pathToVector2, buildLatheGeometry } from './latheGeometryBuilder';

/**
 * simulateGCode - one call from raw G-code text to everything the renderer needs.
 *
 * @param {string} gcodeText
 * @param {object} stockConfig - { stockDiameter, stockLength, zFace?, resolution?, boreThreshold?, defaultDrillDiameter? }
 * @returns {{ moves, warnings, passes, rawProfile, rawInnerProfile, finalOuterProfile, finalInnerProfile, zMin, zMax, stockRadius }}
 */
export function simulateGCode(gcodeText, stockConfig) {
  const { moves, warnings } = interpretGCode(gcodeText, {
    defaultDrillDiameter: stockConfig.defaultDrillDiameter ?? 8,
  });
  const built = buildPasses(moves, stockConfig);
  return { moves, warnings, ...built };
}

export { interpretGCode, buildPasses, buildProfilePath, pathToVector2, buildLatheGeometry };
export default { simulateGCode, interpretGCode, buildPasses, buildProfilePath, pathToVector2, buildLatheGeometry };
