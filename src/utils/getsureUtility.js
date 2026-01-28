import Animated, { useSharedValue, runOnJS } from 'react-native-reanimated'
import { useDispatch } from 'react-redux'
import { updateGesture } from './store/slices/gestureSlice'
import React from 'react'
import { Dimensions } from 'react-native'
import { useFrame, useThree } from '@react-three/fiber/native'
import { Gesture, GestureDetector } from 'react-native-gesture-handler'

const { width, height } = Dimensions.get('window')
export function useGestureBridge() {
  const dispatch = useDispatch()

  const vx = useSharedValue(0)
  const vy = useSharedValue(0)

  // JS function (SAFE)
const sendToRedux = (vx, vy) => {
  dispatch(updateGesture({ x: vx, y: vy }))
}

 const lastSent = useSharedValue(0)

  // UI thread
  const onGestureChange = (e) => {
    'worklet'
   const nx = e.absoluteX / width
   const ny = e.absoluteY / height
  vx.value = vx.value * 0.85 + nx * 0.15
  vy.value = vy.value * 0.85 + ny * 0.15

    const now = Date.now()
   if (now - lastSent.value > 50) {
  lastSent.value = now
  runOnJS(sendToRedux)(vx.value, vy.value)
}
  }

  const onGestureEnd = () => {
    'worklet'
    vx.value *= 0.85
    vy.value *= 0.85
  }

  return { vx, vy, onGestureChange, onGestureEnd }
}


export default function OrbitGestureProvider({
  children,
  enabled = true,
  onGestureChange,
  onGestureEnd,
}) {
  const pan = Gesture.Pan()
    .enabled(enabled)
    .onChange(onGestureChange)
    .onEnd(onGestureEnd)

  return (
    <GestureDetector gesture={pan}>
      <Animated.View style={{ flex: 1 }}>
        {children}
      </Animated.View>
    </GestureDetector>
  )
}


// CameraOrbitController.js


export function CameraOrbitController({ vx, vy,enabled }) {
  
  // const { camera } = useThree()

  useFrame((_, delta) => {
    if (!enabled) return
    if (!vx || !vy) return

    // camera.rotation.y -= vx.value * delta * 0.001
    // camera.rotation.x -= vy.value * delta * 0.001

    vx.value *= 0.92
    vy.value *= 0.92
  })

  return null
}