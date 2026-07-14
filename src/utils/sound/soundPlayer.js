// utils/sound/soundPlayer.js
import Sound from 'react-native-sound'

Sound.setCategory('Playback')

class SoundPlayer {
  sound = null
  isLoaded = false
  loadId = 0 // Track load attempts to prevent stale callbacks
  currentUrl = null

  load = (url) => {
    return new Promise((resolve, reject) => {
      // Increment load ID to track this specific load attempt
      const currentLoadId = ++this.loadId
      const loadUrl = url

      // Cleanup old sound
      if (this.sound) {
        this.sound.release()
        this.sound = null
        this.isLoaded = false
        this.currentUrl = null
      }

      const sound = new Sound(url, null, (error) => {
        // Check if this is still the current load request
        if (currentLoadId !== this.loadId) {
          // Stale callback - ignore
          if (sound) {
            sound.release()
          }
          return
        }

        if (error) {
          console.error('Failed to load sound:', error)
          this.isLoaded = false
          this.currentUrl = null
          reject(error)
          return
        }

        this.sound = sound
        this.isLoaded = true
        this.currentUrl = loadUrl
        resolve(sound)
      })
    })
  }

  play = () => {
    if (!this.sound || !this.isLoaded) {
      console.warn('Sound not loaded or null, cannot play')
      return false
    }

    try {
      this.sound.stop(() => {
        if (this.sound && this.isLoaded) {
          this.sound.play((success) => {
            if (!success) {
              console.warn('Sound playback failed')
            }
          })
        }
      })
      return true
    } catch (error) {
      console.error('Error playing sound:', error)
      return false
    }
  }

  stop = () => {
    if (this.sound && this.isLoaded) {
      try {
        this.sound.stop()
        return true
      } catch (error) {
        console.error('Error stopping sound:', error)
        return false
      }
    }
    return false
  }

  release = () => {
    if (this.sound) {
      try {
        this.sound.release()
        this.sound = null
        this.isLoaded = false
        this.currentUrl = null
        return true
      } catch (error) {
        console.error('Error releasing sound:', error)
        return false
      }
    }
    return false
  }

  setLoop = (loop) => {
    if (this.sound && this.isLoaded) {
      try {
        this.sound.setNumberOfLoops(loop ? -1 : 0)
        return true
      } catch (error) {
        console.error('Error setting loop:', error)
        return false
      }
    }
    return false
  }

  setCurrentTime = (time) => {
    if (this.sound && this.isLoaded) {
      try {
        this.sound.setCurrentTime(time)
        return true
      } catch (error) {
        console.error('Error setting current time:', error)
        return false
      }
    }
    return false
  }

  getCurrentTime = () => {
    if (this.sound && this.isLoaded) {
      try {
        return this.sound.getCurrentTime()
      } catch (error) {
        console.error('Error getting current time:', error)
        return 0
      }
    }
    return 0
  }

  getDuration = () => {
    if (this.sound && this.isLoaded) {
      try {
        return this.sound.getDuration()
      } catch (error) {
        console.error('Error getting duration:', error)
        return 0
      }
    }
    return 0
  }

  isPlaying = () => {
    if (this.sound && this.isLoaded) {
      try {
        return this.sound.isPlaying()
      } catch (error) {
        return false
      }
    }
    return false
  }

  getSound = () => {
    return this.sound
  }

  getLoadId = () => {
    return this.loadId
  }

  getCurrentUrl = () => {
    return this.currentUrl
  }
}

export default new SoundPlayer()