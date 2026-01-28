import React from 'react';
import { View, Text } from 'react-native';

export const CanvaOnCreated = (state) => {
  state.gl.localClippingEnabled = true
  const gl = state.gl.getContext();
  const original = gl.pixelStorei.bind(gl);
  gl.pixelStorei = (...args) => {
    if (args[0] === gl.UNPACK_FLIP_Y_WEBGL) {
      return original(...args);
    }
  };
};

export const Fallback = () => (
  <View>
    <Text>Sorry, WebGL not supported</Text>
  </View>
);
