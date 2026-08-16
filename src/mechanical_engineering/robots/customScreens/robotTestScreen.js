import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import Slider from '../../../utils/ThreeJs_Utils/slider.js';
import Model3DPreview from '../../../utils/components/glbPreview.js';
import { industrialRobotConfig } from '../robot/robotConfig.js';

const ROBOT_URL = 'https://pub-9a09ee6126034c0c9cbd772d75056b70.r2.dev/robotics/robotTeaching/industrialRobotArm2.glb';

export default function RobotTestScreen() {
  const robotRef = useRef(null);
  const jointEntries = Object.entries(industrialRobotConfig);
  const [activeIndex, setActiveIndex] = useState(0);

  const setJoint = (joint, rotation) => {
    robotRef.current?.setJointAngle(joint, rotation);
  };

  const handleRobotLoad = () => {
    const defaultAngles = Object.fromEntries(
      jointEntries.map(([joint, config]) => [
        joint,
        {
          x: config.default?.x ?? 0,
          y: config.default?.y ?? 0,
          z: config.default?.z ?? 0,
        },
      ])
    );
    console.log('[ROBOT] Default pose:', defaultAngles);
    robotRef.current?.setJointAngles(defaultAngles);
  };

  const goToJoint = (dir) => {
    setActiveIndex((prev) => {
      const next = prev + dir;
      if (next < 0) return jointEntries.length - 1;
      if (next >= jointEntries.length) return 0;
      return next;
    });
  };

  const [joint, config] = jointEntries[activeIndex];
  const axis = Object.keys(config.axes || {}).find((key) => config.axes[key]) || 'x';
  const limits = config.limit?.[axis] || [-180, 180];
  const [min, max] = limits;
  const initialValue = config.default?.[axis] ?? 0;

  return (
    <View style={styles.container}>
      <View style={styles.viewer}>
        <Model3DPreview
          ref={robotRef}
          modelUrl={ROBOT_URL}
          jointConfig={industrialRobotConfig}
          modelConfig={{
            cameraAngle: [-1.272, 1.948, 5.511],
            controller: 'industrialRobot',
          }}
          showTouchLabel={false}
        />
      </View>

      <View style={styles.controls}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>Robot Joint Control</Text>
          <Text style={styles.counter}>
            {activeIndex + 1}/{jointEntries.length}
          </Text>
        </View>

        <View style={styles.jointRow}>
          <JointControl
            key={joint}
            name={joint}
            axis={axis}
            initialValue={initialValue}
            min={min}
            max={max}
            onChange={(value) => {
              const rotation = {
                x: config.default?.x ?? 0,
                y: config.default?.y ?? 0,
                z: config.default?.z ?? 0,
              };
              rotation[axis] = value;
              setJoint(joint, rotation);
            }}
          />

          <TouchableOpacity style={styles.navBtn} onPress={() => goToJoint(-1)}>
            <Text style={styles.navBtnText}>{'<'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.navBtn} onPress={() => goToJoint(1)}>
            <Text style={styles.navBtnText}>{'>'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

/* =========================================================
   JOINT CONTROL
========================================================= */

function JointControl({ name, axis, initialValue = 0, min, max, onChange }) {
  const [value, setValue] = React.useState(initialValue);

  // reset displayed value when a different joint is selected
  React.useEffect(() => {
    setValue(initialValue);
  }, [name, initialValue]);

  const handleChange = (newValue) => {
    setValue(newValue);
    onChange(newValue);
  };

  return (
    <View style={styles.joint}>
      <View style={styles.row}>
        <View style={styles.nameContainer}>
          <Text style={styles.name}>{name}</Text>
          <Text style={styles.axis}>Axis: {axis.toUpperCase()}</Text>
        </View>
        <Text style={styles.value}>{Math.round(value)}°</Text>
      </View>

      <Slider
        minimumValue={min}
        maximumValue={max}
        value={value}
        step={1}
        trackThickness={5}
        minimumTrackTintColor="#4F46E5"
        maximumTrackTintColor="#555"
        thumbTintColor="#4F46E5"
        onValueChange={handleChange}
      />
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
    flex: 1,
    minHeight: 350,
  },
  controls: {
    paddingHorizontal: 15,
    paddingTop: 10,
    paddingBottom: 15,
    backgroundColor: '#222',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  title: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
  },
  counter: {
    color: '#888',
    fontSize: 12,
  },
  jointRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  joint: {
    flex: 1,
  },
  navBtn: {
    width: 32,
    height: 32,
    borderRadius: 6,
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
  },
  navBtnText: {
    color: '#4F46E5',
    fontSize: 16,
    fontWeight: '700',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  nameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  name: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  axis: {
    color: '#888',
    fontSize: 11,
  },
  value: {
    color: '#aaa',
    fontSize: 13,
  },
});