import Sound from 'react-native-sound';


Sound.setCategory('Playback');

let engineSound = null;
let isLoaded = false;
let playRequested = false;

const loadEngineSound = () => {
  if (engineSound) return;

  engineSound = new Sound('engine.mp3', Sound.MAIN_BUNDLE, (error) => {
    if (error) {
      console.log('❌ Failed to load engine sound', error);
      engineSound = null;
      return;
    }

    isLoaded = true;
    engineSound.setNumberOfLoops(-1); // infinite loop

    console.log('✅ Engine sound loaded');

    // If play was requested before load finished
    if (playRequested) {
      engineSound.play();
      playRequested = false;
    }
  });
};

export const playSpindle = () => {
  loadEngineSound();

  if (!isLoaded) {
    playRequested = true;
    return;
  }

  engineSound.play((success) => {
    if (!success) {
      console.log('❌ Engine playback failed');
    }
  });
};

export const stopSpindle = () => {
  playRequested = false;

  if (engineSound && isLoaded) {
    engineSound.stop(() => {
      console.log('⏹ Engine stopped');
    });
  }
};

export const releaseSpindle = () => {
  if (engineSound) {
    engineSound.release();
    engineSound = null;
    isLoaded = false;
    playRequested = false;
    console.log('🧹 Engine sound released');
  }
};
