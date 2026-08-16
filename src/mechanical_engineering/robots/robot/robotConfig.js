// robot/robotConfig.js - Linear gripper values

export const industrialRobotConfig = {
  J1: {
    object: 'J1',
    type: 'rotation',
    axes: {
      x: false,
      y: true,
      z: false,
    },
    limit: {
      x: [-180, 180],
      y: [-180, 180],
      z: [-180, 180],
    },
    default: {
      x: 0,
      y: 0,
      z: 0,
    },
  },
  J2: {
    object: 'J2',
    type: 'rotation',
    axes: {
      x: true,
      y: false,
      z: false,
    },
    limit: {
      x: [-90, 90],
      y: [-90, 90],
      z: [-180, 180],
    },
    default: {
      x: 0,
      y: 0,
      z: 0,
    },
  },
  J3: {
    object: 'J3',
    type: 'rotation',
    axes: {
      x: true,
      y: false,
      z: false,
    },
    limit: {
      x: [-120, 180],
      y: [-120, 120],
      z: [-180, 180],
    },
    default: {
      x: 180,
      y: 0,
      z: 0,
    },
  },
  J4: {
    object: 'J4',
    type: 'rotation',
    axes: {
      x: true,
      y: false,
      z: false,
    },
    limit: {
      x: [-30, 180],
      y: [-180, 180],
      z: [-180, 180],
    },
    default: {
      x: 90,
      y: 0,
      z: 0,
    },
  },
  J5: {
    object: 'J5',
    type: 'rotation',
    axes: {
      x: true,
      y: false,
      z: false,
    },
    limit: {
      x: [-180, 180],
      y: [-120, 120],
      z: [-180, 180],
    },
    default: {
      x: 120,
      y: 0,
      z: 90,
    },
  },

  // ==========================================
  // GRIPPER - Linear (Position-based)
  // ==========================================
  GRIPPER: {
    type: 'gripper',
    movementType: 'linear', // 👈 Specify linear movement
    
    open: {
      left: {
        object: 'Grabber_hand_1',
        axis: 'x',        // Move on X axis
        value: -.05,        // Open position (spread apart)
      },
      right: {
        object: 'Grabber_hand_2',
        axis: 'x',        // Move on X axis
        value: .05,         // Open position (spread apart)
      },
    },

    closed: {
      left: {
        object: 'Grabber_hand_1',
        axis: 'x',
        value: -0.015,         // Closed position (together)
      },
      right: {
        object: 'Grabber_hand_2',
        axis: 'x',
        value: 0.015,         // Closed position (together)
      },
    },
  },
};