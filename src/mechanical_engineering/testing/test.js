import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  Modal,
  FlatList,
  Dimensions,
} from 'react-native';
import { Canvas, useFrame, useThree } from '@react-three/fiber/native';
import Slider from './testing2'; // Your slider component

const SCREEN_HEIGHT = Dimensions.get('window').height;
const ZOOM_SLIDER_LENGTH = Math.min(450, SCREEN_HEIGHT * 0.7);
const PAN_SLIDER_LENGTH = ZOOM_SLIDER_LENGTH;

// Generic inline axis picker — sits at the start of a progress bar
const AxisPicker = ({ axes, selected, onSelect, labels }) => {
  const [modalVisible, setModalVisible] = useState(false);

  return (
    <View>
      <TouchableOpacity
        style={styles.axisPill}
        onPress={() => setModalVisible(true)}
        activeOpacity={0.75}
      >
        <View style={styles.axisPillDot} />
        <Text style={styles.axisPillText}>{labels ? labels[selected] : selected}</Text>
      </TouchableOpacity>

      <Modal
        transparent
        visible={modalVisible}
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setModalVisible(false)}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalHeader}>Select Axis</Text>
            <FlatList
              data={axes}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.modalItem, item === selected && styles.modalItemActive]}
                  onPress={() => {
                    onSelect(item);
                    setModalVisible(false);
                  }}
                >
                  <Text
                    style={[
                      styles.modalItemText,
                      item === selected && styles.modalItemTextActive,
                    ]}
                  >
                    {labels ? labels[item] : `${item} Axis`}
                  </Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

// Control panel component — Zoom (left, vertical) | Rotation (middle, horizontal) | Pan (right, vertical)
const ControlPanel = ({
  rotationX,
  setRotationX,
  rotationY,
  setRotationY,
  rotationZ,
  setRotationZ,
  zoom,
  setZoom,
  panH,
  setPanH,
  panV,
  setPanV,
  selectedRotationAxis,
  setSelectedRotationAxis,
  selectedPanAxis,
  setSelectedPanAxis,
}) => {
  const getRotationControls = () => {
    switch (selectedRotationAxis) {
      case 'X':
        return { value: rotationX, setValue: setRotationX };
      case 'Y':
        return { value: rotationY, setValue: setRotationY };
      case 'Z':
        return { value: rotationZ, setValue: setRotationZ };
      default:
        return { value: rotationX, setValue: setRotationX };
    }
  };

  const getPanControls = () => {
    switch (selectedPanAxis) {
      case 'H':
        return { value: panH, setValue: setPanH };
      case 'V':
        return { value: panV, setValue: setPanV };
      default:
        return { value: panH, setValue: setPanH };
    }
  };

  const rotation = getRotationControls();
  const pan = getPanControls();

  return (
    <View style={styles.controlsContainer} pointerEvents="box-none">
      {/* Left vertical zoom slider */}
      <View style={styles.verticalSliderContainer}>
        <Text style={styles.sliderLabel}>Zoom</Text>
        <Slider
          value={zoom}
          onValueChange={setZoom}
          minimumValue={-15}
          maximumValue={15}
          step={0.1}
          length={ZOOM_SLIDER_LENGTH}
          trackThickness={5}
          thumbSize={22}
          minimumTrackTintColor="#6366F1"
          maximumTrackTintColor="rgba(255,255,255,0.14)"
          thumbTintColor="#EEF0FF"
          showLabel
          labelPosition="left"
          formatLabel={(val) => `${val.toFixed(1)}x`}
        />
      </View>

      {/* Middle rotation slider */}
      <View style={styles.horizontalSliderContainer}>
        <View style={styles.sliderHeaderRow}>
          <AxisPicker
            axes={['X', 'Y', 'Z']}
            selected={selectedRotationAxis}
            onSelect={setSelectedRotationAxis}
          />
          <Text style={styles.sliderTitle}>Rotation</Text>
          <Text style={styles.sliderValuePill}>{Math.round(rotation.value)}°</Text>
        </View>
        <Slider
          horizontal
          value={rotation.value}
          onValueChange={rotation.setValue}
          minimumValue={-180}
          maximumValue={180}
          step={1}
          length={200}
          trackThickness={5}
          thumbSize={22}
          minimumTrackTintColor="#6366F1"
          maximumTrackTintColor="rgba(255,255,255,0.14)"
          thumbTintColor="#EEF0FF"
          showLabel={false}
        />
      </View>

      {/* Right vertical pan slider */}
      <View style={styles.verticalSliderContainer}>
        <View style={styles.panHeaderColumn}>
          <AxisPicker
            axes={['H', 'V']}
            labels={{ H: 'Horiz', V: 'Vert' }}
            selected={selectedPanAxis}
            onSelect={setSelectedPanAxis}
          />
          <Text style={styles.sliderLabel}>Pan</Text>
        </View>
        <Slider
          value={pan.value}
          onValueChange={pan.setValue}
          minimumValue={-5}
          maximumValue={5}
          step={0.05}
          length={PAN_SLIDER_LENGTH}
          trackThickness={5}
          thumbSize={22}
          minimumTrackTintColor="#6366F1"
          maximumTrackTintColor="rgba(255,255,255,0.14)"
          thumbTintColor="#EEF0FF"
          showLabel
          labelPosition="right"
          formatLabel={(val) => val.toFixed(1)}
        />
      </View>
    </View>
  );
};

// Camera rig that updates based on slider values
function SliderCameraRig({
  rotationX,
  rotationY,
  rotationZ,
  zoom,
  panH,
  panV,
  baseDistance = 9,
  targetX = 0,
  targetY = 0,
  targetZ = 0,
}) {
  const { camera } = useThree();

  useFrame(() => {
    const zoomFactor = 1 + zoom / 15;
    const distance = baseDistance / Math.max(0.1, zoomFactor);

    const theta = (rotationY * Math.PI) / 180;
    const phi = (rotationX * Math.PI) / 180;

    const finalTargetX = targetX + panH;
    const finalTargetY = targetY + panV;

    camera.position.x = finalTargetX + distance * Math.sin(theta) * Math.cos(phi);
    camera.position.y = finalTargetY + distance * Math.sin(phi);
    camera.position.z = targetZ + distance * Math.cos(theta) * Math.cos(phi);

    camera.lookAt(finalTargetX, finalTargetY, targetZ);

    // Roll: lookAt() fully overwrites orientation from position→target,
    // so Z has to be applied *after* it, as a rotation around the
    // camera's own forward axis — not folded into theta/phi like X/Y.
    camera.rotateZ((rotationZ * Math.PI) / 180);
  });

  return null;
}

// Main CanvasProvider component
export default function CanvasProvider({
  children,
  title,
  onClose,
  cameraFov = 45,
  background = '#15161A',
  style,
  defaultZoom = 0,
  baseDistance = 9,
  targetX = 0,
  targetY = 0,
  targetZ = 0,
}) {
  // Rotation state (in degrees)
  const [rotationX, setRotationX] = useState(0);
  const [rotationY, setRotationY] = useState(0);
  const [rotationZ, setRotationZ] = useState(0);
  const [zoom, setZoom] = useState(defaultZoom);
  const [panH, setPanH] = useState(0);
  const [panV, setPanV] = useState(0);
  const [selectedRotationAxis, setSelectedRotationAxis] = useState('X');
  const [selectedPanAxis, setSelectedPanAxis] = useState('H');
  const [controlsVisible, setControlsVisible] = useState(true);
  const [brightness, setBrightness] = useState(0);

  const whiteLevel = Math.round(brightness * 255);
  const backgroundColor = `rgb(${whiteLevel}, ${whiteLevel}, ${whiteLevel})`;

const handleCanvasCreated = (state) => {
  const gl = state.gl.getContext();
  const original = gl.pixelStorei.bind(gl);

  // EXGL doesn't implement these unpack flags — swallow them silently
  // instead of letting them fall through to the real (warning-logging) impl.
  const UNSUPPORTED_PNAMES = new Set([
    gl.UNPACK_FLIP_Y_WEBGL,
    gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL,
    gl.UNPACK_COLORSPACE_CONVERSION_WEBGL,
    gl.UNPACK_ALIGNMENT, // fires once per texture upload
  ]);

  gl.pixelStorei = (...args) => {
    if (UNSUPPORTED_PNAMES.has(args[0])) return;
    return original(...args);
  };
};

  return (
    <View style={[styles.container, { backgroundColor }, style]}>
      <View style={styles.canvasContainer}>
        <Canvas
          camera={{
            position: [0, 0, baseDistance],
            fov: cameraFov,
          }}
          onCreated={handleCanvasCreated}
        >
          {/* Default lights */}
          <ambientLight intensity={0.8} />
          <directionalLight position={[5, 5, 5]} intensity={1.5} />
          <directionalLight position={[-5, 2, -5]} intensity={0.4} />

          <SliderCameraRig
            rotationX={rotationX}
            rotationY={rotationY}
            rotationZ={rotationZ}
            zoom={zoom}
            panH={panH}
            panV={panV}
            baseDistance={baseDistance}
            targetX={targetX}
            targetY={targetY}
            targetZ={targetZ}
          />

          {children}
        </Canvas>
      </View>

      {/* Top title bar */}
      <View style={styles.topBar}>
        {(title || onClose) && (
          <View style={styles.topBarContent}>
            <Text style={styles.topBarTitle} numberOfLines={1}>
              {title}
            </Text>

            {/* Toggle button — shows/hides all controls */}
            <TouchableOpacity
              style={[styles.toggleButton, !controlsVisible && styles.toggleButtonOff]}
              onPress={() => setControlsVisible((v) => !v)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Text style={styles.toggleButtonText}>{controlsVisible ? '◉' : '◎'}</Text>
            </TouchableOpacity>

            {onClose && (
              <TouchableOpacity
                style={styles.closeButton}
                onPress={onClose}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        <View style={styles.lightControlRow}>
          <Text style={styles.lightControlLabel}>Light</Text>
          <Slider
            horizontal
            value={brightness}
            onValueChange={setBrightness}
            minimumValue={0}
            maximumValue={1}
            step={0.01}
            length={240}
            trackThickness={4}
            thumbSize={18}
            minimumTrackTintColor="#FFFFFF"
            maximumTrackTintColor="rgba(255,255,255,0.18)"
            thumbTintColor="#FFFFFF"
            showLabel
            labelPosition="bottom"
            formatLabel={(val) => `${Math.round(val * 100)}%`}
          />
        </View>
      </View>

      {/* Controls overlay */}
      {controlsVisible && (
        <ControlPanel
          rotationX={rotationX}
          setRotationX={setRotationX}
          rotationY={rotationY}
          setRotationY={setRotationY}
          rotationZ={rotationZ}
          setRotationZ={setRotationZ}
          zoom={zoom}
          setZoom={setZoom}
          panH={panH}
          setPanH={setPanH}
          panV={panV}
          setPanV={setPanV}
          selectedRotationAxis={selectedRotationAxis}
          setSelectedRotationAxis={setSelectedRotationAxis}
          selectedPanAxis={selectedPanAxis}
          setSelectedPanAxis={setSelectedPanAxis}
        />
      )}
    </View>
  );
}

const BORDER_COLOR = 'rgba(255, 255, 255, 0.08)';

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  canvasContainer: {
    flex: 1,
  },

  // Top bar
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingTop: 54,
    paddingHorizontal: 16,
    paddingBottom: 14,
    backgroundColor: 'rgba(10, 10, 12, 0.55)',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: BORDER_COLOR,
  },
  topBarContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  lightControlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  lightControlLabel: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 12,
    fontWeight: '600',
    marginRight: 12,
    width: 50,
    textAlign: 'right',
  },
  topBarTitle: {
    flex: 1,
    color: '#F5F5F7',
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: 0.1,
    marginRight: 12,
  },
  toggleButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(99, 102, 241, 0.20)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  toggleButtonOff: {
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  toggleButtonText: {
    color: '#C7C9FF',
    fontSize: 14,
    fontWeight: '600',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.10)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.14)',
  },
  closeButtonText: {
    color: '#EDEDF0',
    fontSize: 15,
    fontWeight: '600',
  },

  // Inline axis picker (sits at the start of each progress bar)
  axisPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(99, 102, 241, 0.16)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(99, 102, 241, 0.35)',
  },
  axisPillDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#A5A8FF',
    marginRight: 6,
  },
  axisPillText: {
    color: '#C7C9FF',
    fontSize: 12.5,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#1C1D22',
    borderRadius: 16,
    paddingVertical: 8,
    width: 220,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: BORDER_COLOR,
  },
  modalHeader: {
    color: 'rgba(255,255,255,0.45)',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 4,
  },
  modalItem: {
    paddingVertical: 13,
    paddingHorizontal: 16,
    marginHorizontal: 6,
    borderRadius: 10,
  },
  modalItemActive: {
    backgroundColor: 'rgba(99, 102, 241, 0.16)',
  },
  modalItemText: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.82)',
    fontWeight: '500',
  },
  modalItemTextActive: {
    color: '#A5A8FF',
    fontWeight: '700',
  },

  // Bottom controls
  controlsContainer: {
    position: 'absolute',
    bottom: 34,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  horizontalSliderContainer: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 8,
    marginHorizontal: 12,
  },
  sliderHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sliderTitle: {
    color: 'rgba(255,255,255,0.65)',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.2,
    flex: 1,
    marginLeft: 10,
  },
  sliderValuePill: {
    color: '#A5A8FF',
    fontSize: 12,
    fontWeight: '700',
    backgroundColor: 'rgba(99, 102, 241, 0.16)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    overflow: 'hidden',
  },
  verticalSliderContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 4,
  },
  panHeaderColumn: {
    alignItems: 'center',
    marginBottom: 4,
  },
  sliderLabel: {
    color: 'rgba(255,255,255,0.65)',
    fontSize: 12,
    marginBottom: 6,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
});