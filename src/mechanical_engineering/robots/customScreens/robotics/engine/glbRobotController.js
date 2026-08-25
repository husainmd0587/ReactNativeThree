/**
 * glbRobotController.js
 *
 * Relocated verbatim from mannualRobot/robot/robotController.js -
 * this is the generic controller factory that bridges SceneModel's
 * imperative API (api.register/api.call) to concrete joint/gripper
 * operations. No logic changed; only moved into engine/ so
 * GlbRobotArm.jsx can import it alongside the rest of the engine.
 */

// controllers/robotController.js - Linear Gripper Version

import * as THREE from 'three';

export function createRobotController(jointConfig) {
  let api = null;
  let jointRefs = null;
  let initialized = false;
  let gripperState = 'open';

  const controller = {
    init: (sceneApi) => {
      api = sceneApi;
      initialized = true;
      console.log('[RobotController] Initialized');
      
      setTimeout(() => {
        const allJoints = api.getJoints();
        console.log('[RobotController] All available objects:', Object.keys(allJoints));
        
        const gripperConfig = jointConfig?.GRIPPER;
        if (gripperConfig) {
          const testObjects = [
            ...Object.values(gripperConfig.open).map(f => f.object),
            ...Object.values(gripperConfig.closed).map(f => f.object)
          ];
          console.log('[RobotController] Looking for gripper objects:', testObjects);
          
          testObjects.forEach(objName => {
            const found = api.getJoint(objName);
            console.log(`[RobotController] Gripper object "${objName}": ${found ? '✅ FOUND' : '❌ NOT FOUND'}`);
          });
        }
      }, 500);
      
      controller.registerMethods();
    },

    onJointsReady: (joints) => {
      jointRefs = joints;
      console.log('[RobotController] Joints ready:', Object.keys(joints));
      
      const gripperConfig = jointConfig?.GRIPPER;
      if (gripperConfig) {
        const allGripperObjects = [
          ...Object.values(gripperConfig.open).map(f => f.object),
          ...Object.values(gripperConfig.closed).map(f => f.object)
        ];
        const foundGripperObjects = allGripperObjects.filter(name => joints[name]);
        const missingGripperObjects = allGripperObjects.filter(name => !joints[name]);
        
        console.log('[RobotController] Found gripper objects:', foundGripperObjects);
        if (missingGripperObjects.length > 0) {
          console.warn('[RobotController] Missing gripper objects:', missingGripperObjects);
        }
      }
      
      // Apply default pose when joints are loaded
      if (jointConfig && api) {
        Object.entries(jointConfig).forEach(([jointName, cfg]) => {
          if (jointName === 'GRIPPER') return;
          
          const joint = joints[jointName];
          if (joint && cfg?.default) {
            api.applyJointRotation(joint, cfg.default);
          }
        });
        
        // Initialize gripper to open state
        const gripperConfig = jointConfig?.GRIPPER;
        if (gripperConfig) {
          const hasGripperParts = Object.values(gripperConfig.open).some(
            f => joints[f.object]
          ) || Object.values(gripperConfig.closed).some(
            f => joints[f.object]
          );
          
          if (hasGripperParts) {
            controller.applyGripperState('open');
          } else {
            console.warn('[RobotController] Gripper parts not found in model.');
          }
        }
      }
    },

    // ==========================================
    // LINEAR GRIPPER METHODS
    // ==========================================

    applyGripperState: (state) => {
      const gripperConfig = jointConfig?.GRIPPER;
      
      if (!gripperConfig) {
        console.warn('[ROBOT] GRIPPER configuration not found');
        return;
      }
      
      const target = state === 'closed' ? gripperConfig.closed : gripperConfig.open;
      
      let appliedCount = 0;
      Object.entries(target).forEach(([fingerName, fingerConfig]) => {
        const object = api.getJoint(fingerConfig.object);
        if (!object) {
          console.warn(`[ROBOT] Gripper object "${fingerConfig.object}" not found`);
          return;
        }
        
        // Use position for linear movement instead of rotation
        const axis = fingerConfig.axis || 'x';
        const value = fingerConfig.value ?? 0;
        
        // Set position instead of rotation
        object.position[axis] = value;
        
        // Store the current value for reference
        object.userData.gripperValue = value;
        object.userData.gripperAxis = axis;
        object.userData.gripperTarget = value;
        appliedCount++;
      });
      
      if (appliedCount > 0) {
        gripperState = state;
        console.log(`[ROBOT] Gripper ${state} (applied to ${appliedCount} objects)`);
      } else {
        console.warn(`[ROBOT] Failed to apply gripper ${state} - no objects found`);
      }
    },

    // ==========================================
    // ANIMATED LINEAR GRIPPER
    // ==========================================

    animateGripper: (targetState, duration = 300) => {
      const gripperConfig = jointConfig?.GRIPPER;
      if (!gripperConfig) {
        console.warn('[ROBOT] GRIPPER configuration not found');
        return;
      }

      const target = targetState === 'closed' ? gripperConfig.closed : gripperConfig.open;
      const startValues = {};

      // Get current positions
      Object.entries(target).forEach(([fingerName, fingerConfig]) => {
        const object = api.getJoint(fingerConfig.object);
        if (object) {
          const axis = fingerConfig.axis || 'x';
          startValues[fingerName] = {
            object: object,
            axis: axis,
            start: object.position[axis],
            end: fingerConfig.value ?? 0,
          };
        }
      });

      if (Object.keys(startValues).length === 0) {
        console.warn('[ROBOT] No gripper objects found for animation');
        return;
      }

      // Animate using requestAnimationFrame
      const startTime = Date.now();
      
      const animate = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Ease in-out cubic
        const eased = progress < 0.5 
          ? 4 * progress * progress * progress 
          : 1 - Math.pow(-2 * progress + 2, 3) / 2;

        Object.values(startValues).forEach(({ object, axis, start, end }) => {
          const current = start + (end - start) * eased;
          object.position[axis] = current;
          
          // Update userData
          object.userData.gripperValue = current;
          object.userData.gripperTarget = end;
        });

        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          // Set final state
          Object.values(startValues).forEach(({ object, axis, end }) => {
            object.position[axis] = end;
            object.userData.gripperValue = end;
          });
          gripperState = targetState;
          console.log(`[ROBOT] Gripper animation complete: ${targetState}`);
        }
      };

      animate();
    },

    // ==========================================
    // REGISTER METHODS
    // ==========================================
    
    registerMethods: () => {
      if (!api) return;

      // ------------------------------------------
      // JOINT CONTROL (Rotation)
      // ------------------------------------------
      
      api.register('setJointAngle', (jointName, rotation) => {
        const joint = api.getJoint(jointName);
        if (!joint) {
          console.warn(`[ROBOT] Joint "${jointName}" not found`);
          return;
        }
        api.applyJointRotation(joint, rotation);
      });

      api.register('setJointAngles', (joints) => {
        Object.entries(joints).forEach(([jointName, rotation]) => {
          const joint = api.getJoint(jointName);
          if (joint) {
            api.applyJointRotation(joint, rotation);
          }
        });
      });

      api.register('applyDefaultPose', () => {
        Object.entries(jointConfig || {}).forEach(([jointName, cfg]) => {
          if (jointName === 'GRIPPER') return;
          
          const joint = api.getJoint(jointName);
          if (joint && cfg?.default) {
            api.applyJointRotation(joint, cfg.default);
          }
        });
        // Reset gripper to open
        controller.applyGripperState('open');
      });

      // ------------------------------------------
      // GRIPPER CONTROL (Linear)
      // ------------------------------------------

      api.register('setGripperState', (state) => {
        controller.applyGripperState(state);
      });

      api.register('gripOpen', () => {
        controller.applyGripperState('open');
      });

      api.register('gripClose', () => {
        controller.applyGripperState('closed');
      });

      api.register('toggleGripper', () => {
        const newState = gripperState === 'open' ? 'closed' : 'open';
        controller.applyGripperState(newState);
        return newState;
      });

      api.register('getGripperState', () => {
        return gripperState;
      });

      api.register('isGripperOpen', () => {
        return gripperState === 'open';
      });

      api.register('isGripperClosed', () => {
        return gripperState === 'closed';
      });

      // ------------------------------------------
      // ANIMATED GRIPPER (Linear)
      // ------------------------------------------

      api.register('animateGripper', (targetState, duration = 300) => {
        controller.animateGripper(targetState, duration);
      });

      api.register('gripOpenAnimated', (duration = 300) => {
        controller.animateGripper('open', duration);
      });

      api.register('gripCloseAnimated', (duration = 300) => {
        controller.animateGripper('closed', duration);
      });

      // ------------------------------------------
      // GRIPPER GETTERS
      // ------------------------------------------

      api.register('getGripperValues', () => {
        const gripperConfig = jointConfig?.GRIPPER;
        if (!gripperConfig) return null;

        const values = {};
        const target = gripperState === 'closed' ? gripperConfig.closed : gripperConfig.open;
        
        Object.entries(target).forEach(([fingerName, fingerConfig]) => {
          const object = api.getJoint(fingerConfig.object);
          if (object) {
            const axis = fingerConfig.axis || 'x';
            values[fingerName] = {
              object: fingerConfig.object,
              axis: axis,
              value: object.position[axis], // Get position instead of rotation
              target: fingerConfig.value ?? 0,
            };
          }
        });
        
        return values;
      });

      api.register('getGripperConfig', () => {
        return jointConfig?.GRIPPER || null;
      });

      // ------------------------------------------
      // GRIPPER POSITION CONTROL (Fine-tuning)
      // ------------------------------------------

      api.register('setGripperPosition', (fingerName, position) => {
        const gripperConfig = jointConfig?.GRIPPER;
        if (!gripperConfig) return;

        // Find the finger config
        let fingerConfig = null;
        Object.values(gripperConfig.open).forEach(f => {
          if (f.object === fingerName) fingerConfig = f;
        });
        if (!fingerConfig) {
          Object.values(gripperConfig.closed).forEach(f => {
            if (f.object === fingerName) fingerConfig = f;
          });
        }

        if (!fingerConfig) {
          console.warn(`[ROBOT] Finger "${fingerName}" not found in config`);
          return;
        }

        const object = api.getJoint(fingerName);
        if (!object) {
          console.warn(`[ROBOT] Gripper object "${fingerName}" not found`);
          return;
        }

        const axis = fingerConfig.axis || 'x';
        object.position[axis] = position;
        object.userData.gripperValue = position;
      });

      api.register('getGripperPosition', (fingerName) => {
        const object = api.getJoint(fingerName);
        if (!object) return null;
        return object.position.x; // Return X position
      });

      // ------------------------------------------
      // GETTERS
      // ------------------------------------------

      api.register('getJoint', (jointName) => {
        return api.getJoint(jointName);
      });

      api.register('getJoints', () => {
        return api.getJoints();
      });

      api.register('getJointValue', (jointName) => {
        const joint = api.getJoint(jointName);
        if (!joint) return null;
        return {
          x: THREE.MathUtils.radToDeg(joint.rotation.x),
          y: THREE.MathUtils.radToDeg(joint.rotation.y),
          z: THREE.MathUtils.radToDeg(joint.rotation.z),
        };
      });

      api.register('getAllJointValues', () => {
        const values = {};
        Object.keys(api.getJoints()).forEach(jointName => {
          const joint = api.getJoint(jointName);
          if (joint) {
            // Check if it's a gripper object (has position data)
            if (joint.userData.gripperValue !== undefined) {
              values[jointName] = {
                position: joint.position.x,
                type: 'gripper',
              };
            } else {
              values[jointName] = {
                x: THREE.MathUtils.radToDeg(joint.rotation.x),
                y: THREE.MathUtils.radToDeg(joint.rotation.y),
                z: THREE.MathUtils.radToDeg(joint.rotation.z),
                type: 'joint',
              };
            }
          }
        });
        return values;
      });

      // ------------------------------------------
      // RESET
      // ------------------------------------------

      api.register('resetJoints', () => {
        Object.values(api.getJoints()).forEach((joint) => {
          // Only reset rotation joints, not gripper
          if (!joint.userData.gripperValue) {
            joint.rotation.set(0, 0, 0);
          }
        });
      });

      api.register('resetAll', () => {
        api.call('resetJoints');
        controller.applyGripperState('open');
      });

      // ------------------------------------------
      // HOME POSITION
      // ------------------------------------------

      api.register('goHome', () => {
        const homePose = {};
        Object.entries(jointConfig || {}).forEach(([jointName, cfg]) => {
          if (jointName === 'GRIPPER') return;
          if (cfg?.default) {
            homePose[jointName] = cfg.default;
          }
        });
        api.call('setJointAngles', homePose);
        api.call('gripOpenAnimated', 500);
      });

      // ------------------------------------------
      // BATCH OPERATIONS
      // ------------------------------------------

      api.register('batchUpdate', (updates) => {
        updates.forEach(({ jointName, rotation }) => {
          api.call('setJointAngle', jointName, rotation);
        });
      });

      api.register('animateToPose', (targetPose, duration = 500) => {
        Object.entries(targetPose).forEach(([jointName, rotation]) => {
          api.call('setJointAngle', jointName, rotation);
        });
      });

      // ------------------------------------------
      // SAVE/RESTORE STATE
      // ------------------------------------------

      api.register('saveState', (stateName) => {
        const state = {
          joints: api.call('getAllJointValues'),
          gripper: gripperState,
          gripperPositions: api.call('getGripperValues'),
        };
        
        if (!controller.savedStates) {
          controller.savedStates = {};
        }
        controller.savedStates[stateName] = state;
        console.log(`[RobotController] Saved state: ${stateName}`);
        return state;
      });

      api.register('restoreState', (stateName) => {
        const state = controller.savedStates?.[stateName];
        if (!state) {
          console.warn(`[RobotController] State "${stateName}" not found`);
          return;
        }
        Object.entries(state.joints).forEach(([jointName, data]) => {
          if (data.type === 'gripper') {
            // Restore gripper position
            api.call('setGripperPosition', jointName, data.position);
          } else {
            api.call('setJointAngle', jointName, { x: data.x, y: data.y, z: data.z });
          }
        });
        if (state.gripper) {
          gripperState = state.gripper;
        }
        console.log(`[RobotController] Restored state: ${stateName}`);
      });

      api.register('getSavedStates', () => {
        return controller.savedStates ? Object.keys(controller.savedStates) : [];
      });

      // ------------------------------------------
      // VALIDATION
      // ------------------------------------------

      api.register('isJointInLimits', (jointName, rotation) => {
        const config = jointConfig?.[jointName];
        if (!config) return false;
        
        const axis = Object.keys(config.axes || {}).find(key => config.axes[key]) || 'x';
        const limits = config.limit?.[axis] || [-180, 180];
        const value = rotation[axis] ?? 0;
        
        return value >= limits[0] && value <= limits[1];
      });

      api.register('clampJointValue', (jointName, rotation) => {
        const config = jointConfig?.[jointName];
        if (!config) return rotation;
        
        const axis = Object.keys(config.axes || {}).find(key => config.axes[key]) || 'x';
        const limits = config.limit?.[axis] || [-180, 180];
        const clamped = { ...rotation };
        
        if (clamped[axis] !== undefined) {
          clamped[axis] = Math.max(limits[0], Math.min(limits[1], clamped[axis]));
        }
        
        return clamped;
      });
    },

    // ==========================================
    // DESTROY
    // ==========================================

    destroy: () => {
      console.log('[RobotController] Destroying...');
      
      if (api) {
        const methods = [
          'setJointAngle', 'setJointAngles', 'applyDefaultPose',
          'setGripperState', 'gripOpen', 'gripClose', 'toggleGripper',
          'getGripperState', 'isGripperOpen', 'isGripperClosed',
          'animateGripper', 'gripOpenAnimated', 'gripCloseAnimated',
          'getGripperValues', 'getGripperConfig',
          'setGripperPosition', 'getGripperPosition',
          'getJoint', 'getJoints', 'getJointValue', 'getAllJointValues',
          'resetJoints', 'resetAll', 'goHome',
          'batchUpdate', 'animateToPose',
          'saveState', 'restoreState', 'getSavedStates',
          'isJointInLimits', 'clampJointValue'
        ];
        
        methods.forEach(method => {
          try {
            api.unregister(method);
          } catch (e) {
            // Ignore
          }
        });
      }
      
      api = null;
      jointRefs = null;
      initialized = false;
      gripperState = 'open';
    }
  };

  return controller;
}