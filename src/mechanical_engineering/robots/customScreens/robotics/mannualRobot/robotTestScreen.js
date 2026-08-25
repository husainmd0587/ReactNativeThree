// RoboticSimulator.js - Cleaned UI Version

import React, { useRef, useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
} from 'react-native';
import Slider from '../../../../../utils/ThreeJs_Utils/slider.js';
import Model3DPreview from '../../../../../utils/components/glbPreview.js';
import { industrialRobotConfig } from './robot/robotConfig.js';
import { createRobotController } from './robot/robotController.js';

const ROBOT_URL = 'https://pub-9a09ee6126034c0c9cbd772d75056b70.r2.dev/robotics/robotTeaching/industrialRobotArm2.glb';
const { height } = Dimensions.get('window');


export default function RoboticSimulator() {
  const robotRef = useRef(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isGripperOpen, setIsGripperOpen] = useState(true);
  const [isGripperAnimating, setIsGripperAnimating] = useState(false);
  
  // Filter out GRIPPER from joint list
  const jointEntries = Object.entries(industrialRobotConfig).filter(
    ([key]) => key !== 'GRIPPER'
  );

  // ==========================================
  // CREATE CONTROLLER
  // ==========================================
  const robotController = useMemo(() => {
    return createRobotController(industrialRobotConfig);
  }, []);

  // ==========================================
  // CONTROLS
  // ==========================================

  const setJoint = (joint, rotation) => {
    const clamped = robotRef.current?.call('clampJointValue', joint, rotation);
    if (clamped) {
      robotRef.current?.call('setJointAngle', joint, clamped);
    }
  };

  // ==========================================
  // GRIPPER CONTROLS
  // ==========================================

  const toggleGripper = () => {
    if (isGripperAnimating) return;
    
    setIsGripperAnimating(true);
    const newState = isGripperOpen ? 'closed' : 'open';
    
    robotRef.current?.call('animateGripper', newState, 400);
    setIsGripperOpen(!isGripperOpen);
    
    setTimeout(() => {
      setIsGripperAnimating(false);
    }, 450);
  };

  const goHome = () => {
    robotRef.current?.call('goHome');
    setIsGripperOpen(true);
  };

  const goToJoint = (dir) => {
    setActiveIndex((prev) => {
      const next = prev + dir;
      if (next < 0) return jointEntries.length - 1;
      if (next >= jointEntries.length) return 0;
      return next;
    });
  };

  const [joint, config] = jointEntries[activeIndex] || [null, null];
  const axis = config ? Object.keys(config.axes || {}).find((key) => config.axes[key]) || 'x' : 'x';
  const limits = config?.limit?.[axis] || [-180, 180];
  const [min, max] = limits;
  const initialValue = config?.default?.[axis] ?? 0;

  return (
    <View style={styles.container}>
      {/* 3D Viewer - 70% of screen height */}
      <View style={styles.viewer}>
        <Model3DPreview
          ref={robotRef}
          modelUrl={ROBOT_URL}
          controller={robotController}
          jointConfig={industrialRobotConfig}
          modelConfig={{
            cameraAngle: [-1.272, 1.948, 5.511],
          }}
          showTouchLabel={false}
        />
      </View>

      {/* Controls */}
      <View style={styles.controlsWrapper}>
        <ScrollView 
          style={styles.controlsScroll}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.controlsContent}
        >
          <View style={styles.controls}>
            {/* Header */}
            <View style={styles.headerRow}>
              <Text style={styles.title}>🤖 Joint Control</Text>
              <Text style={styles.counter}>
                {activeIndex + 1}/{jointEntries.length}
              </Text>
            </View>

            {/* Gripper Control - Compact */}
            <View style={styles.gripperSection}>
              <TouchableOpacity 
                style={[
                  styles.gripperBtn,
                  isGripperOpen ? styles.gripOpen : styles.gripClosed,
                  isGripperAnimating && styles.gripperAnimating,
                ]} 
                onPress={toggleGripper}
                disabled={isGripperAnimating}
                activeOpacity={0.7}
              >
                <Text style={styles.gripperBtnText}>
                  {isGripperAnimating ? '⏳' : isGripperOpen ? '✋ Open' : '✊ Closed'}
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.homeBtn}
                onPress={goHome}
                activeOpacity={0.7}
              >
                <Text style={styles.homeBtnText}>🏠</Text>
              </TouchableOpacity>
            </View>

            {/* Joint Slider */}
            {joint && (
              <View style={styles.jointContainer}>
                <View style={styles.jointHeader}>
                  <View style={styles.jointNameContainer}>
                    <Text style={styles.jointName}>{joint}</Text>
                    <Text style={styles.jointAxis}>Axis: {axis.toUpperCase()}</Text>
                  </View>
                  <Text style={styles.jointValue}>{Math.round(initialValue)}°</Text>
                </View>

                <View style={styles.jointRow}>
                  <TouchableOpacity 
                    style={styles.navBtn} 
                    onPress={() => goToJoint(-1)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.navBtnText}>◀</Text>
                  </TouchableOpacity>
                  
                  <View style={styles.sliderContainer}>
                    <Slider
                      minimumValue={min}
                      maximumValue={max}
                      value={initialValue}
                      step={1}
                      trackThickness={4}
                      minimumTrackTintColor="#4F46E5"
                      maximumTrackTintColor="#444"
                      thumbTintColor="#4F46E5"
                      onValueChange={(value) => {
                        const rotation = {
                          x: config.default?.x ?? 0,
                          y: config.default?.y ?? 0,
                          z: config.default?.z ?? 0,
                        };
                        rotation[axis] = value;
                        setJoint(joint, rotation);
                      }}
                    />
                  </View>
                  
                  <TouchableOpacity 
                    style={styles.navBtn} 
                    onPress={() => goToJoint(1)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.navBtnText}>▶</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        </ScrollView>
      </View>
    </View>
  );
}

/* =========================================================
   STYLES
========================================================= */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111',
  },
  viewer: {
    height: height * 0.7,
    backgroundColor: '#1a1a1a',
  },
  controlsWrapper: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  controlsScroll: {
    flex: 1,
  },
  controlsContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 24,
  },
  controls: {
    flex: 1,
  },
  
  // Header
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  counter: {
    color: '#666',
    fontSize: 12,
  },

  // Gripper Section - Compact
  gripperSection: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  gripperBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  gripperBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  gripOpen: {
    borderColor: '#4CAF50',
    backgroundColor: 'rgba(76, 175, 80, 0.15)',
  },
  gripClosed: {
    borderColor: '#f44336',
    backgroundColor: 'rgba(244, 67, 54, 0.15)',
  },
  gripperAnimating: {
    opacity: 0.6,
    borderColor: '#FF9800',
  },
  homeBtn: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: '#2a2a2a',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#333',
  },
  homeBtnText: {
    fontSize: 20,
  },

  // Joint Container
  jointContainer: {
    backgroundColor: '#222',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  jointHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  jointNameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  jointName: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  jointAxis: {
    color: '#666',
    fontSize: 11,
  },
  jointValue: {
    color: '#4F46E5',
    fontSize: 14,
    fontWeight: '600',
  },
  jointRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  navBtn: {
    width: 32,
    height: 32,
    borderRadius: 6,
    backgroundColor: '#2a2a2a',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#333',
  },
  navBtnText: {
    color: '#4F46E5',
    fontSize: 14,
    fontWeight: '700',
  },
  sliderContainer: {
    flex: 1,
  },
});