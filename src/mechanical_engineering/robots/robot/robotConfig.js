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
  // GRIPPER
  // ==========================================

  GRIPPER: {
    type: 'gripper',

    open: {
      left: {
        object: 'Grabber_hand_1',
        axis: 'x',
        value: 0,
      },

      right: {
        object: 'Grabber_hand_2',
        axis: 'x',
        value: 0,
      },
    },

    closed: {
      left: {
        object: 'Grabber_hand_1',
        axis: 'x',
        value: 30,
      },

      right: {
        object: 'Grabber_hand_2',
        axis: 'x',
        value: -30,
      }}}

};