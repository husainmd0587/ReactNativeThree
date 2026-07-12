import { createSlice } from '@reduxjs/toolkit'

const gestureSlice = createSlice({
  name: 'gesture',
  initialState: {
    x: 0,
    y: 0,
    active: false,
  },
  reducers: {
    updateGesture(state, action) {
      state.x = action.payload.x
      state.y = action.payload.y
      state.active = true
    },
    endGesture(state) {
      state.active = false
    },
  },
})

export const { updateGesture, endGesture } = gestureSlice.actions
export default gestureSlice.reducer
