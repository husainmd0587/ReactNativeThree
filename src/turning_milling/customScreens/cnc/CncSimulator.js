import { useState } from 'react';
import { View } from 'react-native';
import CNCLatheSimulator from './components/CNCLatheSimulator';
import PlaybackControls from './components/PlaybackControls';
import { simulateGCode } from './engine';
import CanvaProvider from '../../../utils/ThreeJs_Utils/provider'

const stockConfig = { stockDiameter: 42, stockLength: 82, zFace: 2, resolution: 200, defaultDrillDiameter: 10 };
const gcode= `O0002 (TEST SHAFT)
G21 G90 G95
T0101
G97 S1500 M3
; FACING
G0 X32 Z2
G1 X-1 Z2 F0.2
G0 X32 Z2

; ROUGH + FINISH OD TURNING
G0 X32 Z0
N10 G1 X15 Z0 F0.2
N11 G1 X15 Z-15
N12 G1 X22 Z-15
N13 G1 X22 Z-35
N14 G1 X28 Z-40
G71 U1.5 R1.0
G71 P10 Q14 U0.4 W0.1 F0.2
G0 X32 Z2
G70 P10 Q14 F0.1

; GROOVE at Z-30, down to X10
G0 X32 Z-30
G75 X10 Z-30 I1.5 J0.5 F0.08

; DRILL: 8mm dia, 15mm deep from the face
G0 X0 Z2
G74 Z-15 D8 K4 R1 F0.12

; PART OFF at Z-55
G0 X32 Z-55
G1 X-1 Z-55 F0.06

M5
M30`
export default function CncTurningScreen() {

  const preview = simulateGCode(gcode, stockConfig); // for pass count / HUD only
  const [passIndex, setPassIndex] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [speed, setSpeed] = useState(1);

  return (
    <View style={{ flex: 1 }}>
      <CanvaProvider>
        <ambientLight intensity={0.5} />
        <directionalLight position={[50, 80, 50]} intensity={1} />
        <group rotation={[0, 0, -Math.PI / 2]}>
          <CNCLatheSimulator
            gcode={gcode}
            stockConfig={stockConfig}
            playing={playing}
            speed={speed}
            passIndex={passIndex}
            onPassIndexChange={setPassIndex}
          />
        </group>
      </CanvaProvider>

      <PlaybackControls
        playing={playing}
        onTogglePlay={() => setPlaying(p => !p)}
        onStepBack={() => setPassIndex(p => Math.max(0, p - 1))}
        onStepForward={() => setPassIndex(p => Math.min(preview.passes.length - 1, p + 1))}
        passIndex={passIndex}
        passCount={preview.passes.length}
        speed={speed}
        onChangeSpeed={setSpeed}
        currentMove={preview.passes[passIndex]?.moves.find(m => m.isCutting)}
      />
    </View>
  );
}