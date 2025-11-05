import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  SafeAreaView,
  ImageBackground,
  Image
} from 'react-native';
import { router } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import useGameStore from '../store/gameStore';

export default function HomeScreen() {
  const { bambooBalance, currentLevel, startLevel } = useGameStore();

  const handlePlayPress = () => {
    // 重新开始当前关卡
    startLevel(currentLevel);
    router.push('/game');
  };

  const handleShopPress = () => {
    router.push('/shop');
  };

  const handleSettingsPress = () => {
    router.push('/settings');
  };

  return (
    <SafeAreaView style={styles.container}>
      <ImageBackground
        source={{ uri: 'https://dzdbhsix5ppsc.cloudfront.net/monster/linker/background.png' }}
        style={styles.backgroundContainer}
        resizeMode="cover"
      >
        {/* Bamboo Balance - Top Right */}
        <View style={styles.bambooContainer}>
          <Text style={styles.bambooIcon}>🎋</Text>
          <Text style={styles.bambooText}>{bambooBalance}</Text>
        </View>

        {/* Main Content */}
        <View style={styles.mainContent}>
          <Text style={styles.title}>Linker</Text>
          <Text style={styles.subtitle}>Tap, match, and relax!</Text>

          {/* Play Button */}
          <TouchableOpacity style={styles.playButton} onPress={handlePlayPress}>
            <MaterialIcons name="play-arrow" size={32} color="white" />
            <Text style={styles.playButtonText}>PLAY</Text>
          </TouchableOpacity>

          {/* Menu Buttons */}
          <View style={styles.menuButtons}>
            <TouchableOpacity style={styles.menuButton} onPress={handleShopPress}>
              <MaterialIcons name="shopping-cart" size={28} color="#4ECDC4" />
              <Text style={styles.menuButtonText}>Shop</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.menuButton} onPress={handleSettingsPress}>
              <MaterialIcons name="settings" size={28} color="#4ECDC4" />
              <Text style={styles.menuButtonText}>Settings</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Panda Image */}
        <View style={styles.pandaContainer}>
          <Image
            source={{ uri: 'https://dzdbhsix5ppsc.cloudfront.net/monster/linker/panda.png' }}
            style={styles.pandaImage}
            resizeMode="contain"
          />
        </View>

        {/* Decorative Elements */}
        <View style={styles.decorativeElements}>
          <View style={[styles.flower, { top: '20%', left: '10%' }]} />
          <View style={[styles.flower, { top: '30%', right: '15%' }]} />
          <View style={[styles.flower, { bottom: '25%', left: '20%' }]} />
        </View>
      </ImageBackground>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backgroundContainer: {
    flex: 1,
    position: 'relative',
  },
  bambooContainer: {
    position: 'absolute',
    top: 50,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  bambooText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4CAF50',
    marginLeft: 6,
  },
  bambooIcon: {
    fontSize: 24,
  },
  mainContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#2E8B57',
    textAlign: 'center',
    marginBottom: 10,
    textShadowColor: 'rgba(255, 255, 255, 0.8)',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 4,
  },
  subtitle: {
    fontSize: 18,
    color: '#228B22',
    textAlign: 'center',
    marginBottom: 40,
    fontStyle: 'italic',
  },
  playButton: {
    backgroundColor: '#FF6B6B',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    paddingHorizontal: 40,
    borderRadius: 30,
    marginBottom: 30,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
    gap: 10,
  },
  playButtonText: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
  },
  menuButtons: {
    flexDirection: 'row',
    gap: 20,
  },
  menuButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
    gap: 5,
  },
  menuButtonText: {
    color: '#4ECDC4',
    fontSize: 14,
    fontWeight: '600',
  },
  decorativeElements: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    pointerEvents: 'none',
  },
  flower: {
    position: 'absolute',
    width: 30,
    height: 30,
    backgroundColor: '#FFB6C1',
    borderRadius: 15,
    opacity: 0.7,
  },
  pandaContainer: {
    position: 'absolute',
    bottom: 50,
    right: 60,
    width: '100%',
    alignItems: 'center',
  },
  pandaImage: {
    width: 120,
    height: 120,
    opacity: 0.8,
  },
});