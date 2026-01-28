import { configureStore } from '@reduxjs/toolkit'
import gestureReducer from './slices/gestureSlice'

export const store = configureStore({
  reducer: {
    gesture: gestureReducer,
  },
})
