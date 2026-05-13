// utils/sound/soundPlayer.js

import Sound from 'react-native-sound'

Sound.setCategory('Playback')

class SoundPlayer {
  sound = null

  load = (url) => {
    return new Promise((resolve, reject) => {
      // cleanup old
      if (this.sound) {
        this.sound.release()
        this.sound = null
      }

      const sound = new Sound(url, null, (error) => {
        if (error) {
          reject(error)
          return
        }

        this.sound = sound
        resolve(sound)
      })
    })
  }

  play = () => {
    if (!this.sound) return

    this.sound.stop(() => {
      this.sound.play()
    })
  }

  stop = () => {
    if (this.sound) {
      this.sound.stop()
    }
  }

  release = () => {
    if (this.sound) {
      this.sound.release()
      this.sound = null
    }
  }
}

export default new SoundPlayer()