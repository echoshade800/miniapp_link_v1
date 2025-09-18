/**
 * Sound Utils - Audio management system
 * Purpose: Handle sound effects and background music
 */

import { Audio } from 'expo-av';

class SoundManager {
  constructor() {
    this.sounds = {};
    this.backgroundMusic = null;
    this.isInitialized = false;
    this.init();
  }

  async init() {
    try {
      // Set audio mode for better sound quality
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        staysActiveInBackground: false,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });
      this.isInitialized = true;
    } catch (error) {
      console.warn('Failed to initialize audio:', error);
    }
  }

  async loadSound(key, uri) {
    try {
      if (!this.isInitialized) {
        await this.init();
      }

      // If sound already loaded, unload it first
      if (this.sounds[key]) {
        await this.sounds[key].unloadAsync();
      }

      const { sound } = await Audio.Sound.createAsync(
        { uri },
        { shouldPlay: false, volume: 1.0 }
      );

      this.sounds[key] = sound;
      return true;
    } catch (error) {
      console.warn(`Failed to load sound ${key}:`, error);
      return false;
    }
  }

  async playSound(key, volume = 1.0) {
    try {
      if (!this.sounds[key]) {
        console.warn(`Sound ${key} not loaded`);
        return false;
      }

      // Stop any currently playing instance of this sound
      await this.sounds[key].stopAsync();
      await this.sounds[key].setPositionAsync(0);
      await this.sounds[key].setVolumeAsync(volume);
      await this.sounds[key].playAsync();
      
      return true;
    } catch (error) {
      console.warn(`Failed to play sound ${key}:`, error);
      return false;
    }
  }

  async stopSound(key) {
    try {
      if (this.sounds[key]) {
        await this.sounds[key].stopAsync();
      }
    } catch (error) {
      console.warn(`Failed to stop sound ${key}:`, error);
    }
  }

  async unloadSound(key) {
    try {
      if (this.sounds[key]) {
        await this.sounds[key].unloadAsync();
        delete this.sounds[key];
      }
    } catch (error) {
      console.warn(`Failed to unload sound ${key}:`, error);
    }
  }

  async unloadAll() {
    for (const key in this.sounds) {
      await this.unloadSound(key);
    }
    await this.stopBackgroundMusic();
  }

  // Background music methods
  async loadBackgroundMusic(uri) {
    try {
      if (!this.isInitialized) {
        await this.init();
      }

      // If background music already loaded, unload it first
      if (this.backgroundMusic) {
        await this.backgroundMusic.unloadAsync();
      }

      const { sound } = await Audio.Sound.createAsync(
        { uri },
        { 
          shouldPlay: false, 
          volume: 0.6,
          isLooping: true
        }
      );

      this.backgroundMusic = sound;
      return true;
    } catch (error) {
      console.warn('Failed to load background music:', error);
      return false;
    }
  }

  async playBackgroundMusic(volume = 0.6) {
    try {
      if (!this.backgroundMusic) {
        console.warn('Background music not loaded');
        return false;
      }

      await this.backgroundMusic.setVolumeAsync(volume);
      await this.backgroundMusic.playAsync();
      return true;
    } catch (error) {
      console.warn('Failed to play background music:', error);
      return false;
    }
  }

  async pauseBackgroundMusic() {
    try {
      if (this.backgroundMusic) {
        await this.backgroundMusic.pauseAsync();
      }
    } catch (error) {
      console.warn('Failed to pause background music:', error);
    }
  }

  async stopBackgroundMusic() {
    try {
      if (this.backgroundMusic) {
        await this.backgroundMusic.stopAsync();
        await this.backgroundMusic.unloadAsync();
        this.backgroundMusic = null;
      }
    } catch (error) {
      console.warn('Failed to stop background music:', error);
    }
  }

  async setBackgroundMusicVolume(volume) {
    try {
      if (this.backgroundMusic) {
        await this.backgroundMusic.setVolumeAsync(volume);
      }
    } catch (error) {
      console.warn('Failed to set background music volume:', error);
    }
  }

  async isBackgroundMusicPlaying() {
    try {
      if (this.backgroundMusic) {
        const status = await this.backgroundMusic.getStatusAsync();
        return status.isLoaded && status.isPlaying;
      }
      return false;
    } catch (error) {
      console.warn('Failed to check background music status:', error);
      return false;
    }
  }
}

// Create singleton instance
const soundManager = new SoundManager();

// Preload common sounds
const initializeSounds = async () => {
  // Load success sound for tile matching
  await soundManager.loadSound(
    'success',
    'https://dzdbhsix5ppsc.cloudfront.net/monster/linker/coinmusic.mp3'
  );
  
  // Load background music
  await soundManager.loadBackgroundMusic(
    'https://dzdbhsix5ppsc.cloudfront.net/monster/linker/backgroundmusic.mp3'
  );
};

// Initialize sounds when module is imported
initializeSounds();

export default soundManager;
