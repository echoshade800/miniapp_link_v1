/**
 * Settings Screen - Settings Page
 * Purpose: Contains level selection, personal settings and statistics
 */

import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  SafeAreaView, 
  Switch, 
  ScrollView,
  FlatList 
} from 'react-native';
import { router } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import useGameStore from '../store/gameStore';
import { GameUtils } from '../store/gameStore';

export default function Settings() {
  const { 
    maxLevel, 
    currentLevel,
    bestTime, 
    bambooBalance, 
    settings, 
    updateSettings,
    startLevel 
  } = useGameStore();

  const [activeTab, setActiveTab] = useState('levels'); // 'levels', 'settings', 'stats'

  const handleBack = () => {
    router.back();
  };

  const handleSettingToggle = (setting, value) => {
    updateSettings({ [setting]: value });
  };

  const handleLevelSelect = (levelId) => {
    if (levelId <= maxLevel + 1) {
      startLevel(levelId);
      router.push('/game');
    }
  };

  const formatTime = (seconds) => {
    if (!seconds) return 'N/A';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Generate level data
  const generateLevelsData = () => {
    const levels = [];
    const maxVisible = Math.max(maxLevel + 20, 50);
    
    for (let i = 1; i <= maxVisible; i++) {
      levels.push({
        id: i,
        size: GameUtils.getLevelSize(i),
        kinds: GameUtils.getLevelKinds(i),
        layout: GameUtils.getLevelLayout(i),
        hearts: GameUtils.calculateHearts(i),
        timeLimit: GameUtils.calculateTimeLimit(i),
        isUnlocked: i <= maxLevel + 1,
        isCurrent: i === currentLevel,
        isCompleted: i <= maxLevel,
      });
    }
    return levels;
  };

  const levelsData = generateLevelsData();

  const renderLevelItem = ({ item }) => {
    const [rows, cols] = GameUtils.getBoardDimensions(item.size);
    
    return (
      <TouchableOpacity
        style={[
          styles.levelItem,
          !item.isUnlocked && styles.levelItemLocked,
          item.isCurrent && styles.levelItemCurrent,
        ]}
        onPress={() => handleLevelSelect(item.id)}
        disabled={!item.isUnlocked}
      >
        <View style={styles.levelHeader}>
          <Text style={[styles.levelNumber, !item.isUnlocked && styles.lockedText]}>
            Level {item.id}
          </Text>
          {item.isCompleted && (
            <MaterialIcons name="check-circle" size={20} color="#4CAF50" />
          )}
          {item.isCurrent && (
            <MaterialIcons name="play-circle-filled" size={20} color="#FF9800" />
          )}
          {!item.isUnlocked && (
            <MaterialIcons name="lock" size={20} color="#999" />
          )}
        </View>
        
        <View style={styles.levelInfo}>
          <Text style={[styles.levelDetail, !item.isUnlocked && styles.lockedText]}>
            {rows}×{cols} • {item.kinds} kinds
          </Text>
          <Text style={[styles.levelDetail, !item.isUnlocked && styles.lockedText]}>
            {item.layout} • {item.hearts} ♥
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'levels':
        return (
          <View style={styles.tabContent}>
            <Text style={styles.tabTitle}>Level Selection</Text>
            <Text style={styles.tabSubtitle}>Progress: {maxLevel} levels completed</Text>
            <FlatList
              data={levelsData}
              renderItem={renderLevelItem}
              keyExtractor={(item) => item.id.toString()}
              numColumns={2}
              contentContainerStyle={styles.levelGrid}
              showsVerticalScrollIndicator={false}
            />
          </View>
        );
      
      case 'settings':
        return (
          <ScrollView style={styles.tabContent}>
            <Text style={styles.tabTitle}>Game Settings</Text>
            
            <View style={styles.settingItem}>
              <View style={styles.settingInfo}>
                <MaterialIcons name="music-note" size={24} color="#666" />
                <View style={styles.settingText}>
                  <Text style={styles.settingLabel}>Background Music</Text>
                  <Text style={styles.settingDescription}>Enable/disable background music</Text>
                </View>
              </View>
              <Switch
                value={settings.musicOn}
                onValueChange={(value) => handleSettingToggle('musicOn', value)}
                trackColor={{ false: '#E0E0E0', true: '#4CAF50' }}
                thumbColor={settings.musicOn ? '#FFF' : '#FFF'}
              />
            </View>
            
            <View style={styles.settingItem}>
              <View style={styles.settingInfo}>
                <MaterialIcons name="volume-up" size={24} color="#666" />
                <View style={styles.settingText}>
                  <Text style={styles.settingLabel}>Sound Effects</Text>
                  <Text style={styles.settingDescription}>Game sound effects</Text>
                </View>
              </View>
              <Switch
                value={settings.sfxOn}
                onValueChange={(value) => handleSettingToggle('sfxOn', value)}
                trackColor={{ false: '#E0E0E0', true: '#4CAF50' }}
                thumbColor={settings.sfxOn ? '#FFF' : '#FFF'}
              />
            </View>
            
            <View style={styles.settingItem}>
              <View style={styles.settingInfo}>
                <MaterialIcons name="vibration" size={24} color="#666" />
                <View style={styles.settingText}>
                  <Text style={styles.settingLabel}>Vibration Feedback</Text>
                  <Text style={styles.settingDescription}>Haptic feedback</Text>
                </View>
              </View>
              <Switch
                value={settings.hapticsOn}
                onValueChange={(value) => handleSettingToggle('hapticsOn', value)}
                trackColor={{ false: '#E0E0E0', true: '#4CAF50' }}
                thumbColor={settings.hapticsOn ? '#FFF' : '#FFF'}
              />
            </View>

            <View style={styles.additionalOptions}>
              <TouchableOpacity 
                style={styles.optionItem}
                onPress={() => router.push('/onboarding')}
              >
                <MaterialIcons name="help" size={24} color="#666" />
                <Text style={styles.optionLabel}>Game Tutorial</Text>
                <MaterialIcons name="chevron-right" size={24} color="#CCC" />
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.optionItem}>
                <MaterialIcons name="info" size={24} color="#666" />
                <Text style={styles.optionLabel}>About Game</Text>
                <MaterialIcons name="chevron-right" size={24} color="#CCC" />
              </TouchableOpacity>
            </View>
          </ScrollView>
        );
      
      case 'stats':
        return (
          <ScrollView style={styles.tabContent}>
            <Text style={styles.tabTitle}>Game Statistics</Text>
            
            <View style={styles.statsGrid}>
              <View style={styles.statRow}>
                <MaterialIcons name="emoji-events" size={24} color="#FFD700" />
                <View style={styles.statInfo}>
                  <Text style={styles.statLabel}>Highest Level</Text>
                  <Text style={styles.statValue}>{maxLevel}</Text>
                </View>
              </View>
              
              <View style={styles.statRow}>
                <MaterialIcons name="timer" size={24} color="#FF9800" />
                <View style={styles.statInfo}>
                  <Text style={styles.statLabel}>Best Time</Text>
                  <Text style={styles.statValue}>{formatTime(bestTime)}</Text>
                </View>
              </View>
              
              <View style={styles.statRow}>
                <MaterialIcons name="eco" size={24} color="#4CAF50" />
                <View style={styles.statInfo}>
                  <Text style={styles.statLabel}>Bamboo Balance</Text>
                  <Text style={styles.statValue}>{bambooBalance}</Text>
                </View>
              </View>
            </View>

            <View style={styles.versionSection}>
              <Text style={styles.versionText}>Link v1.0.0</Text>
              <Text style={styles.versionSubtext}>Connect pairs, climb levels, no ads!</Text>
            </View>
          </ScrollView>
        );
      
      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <MaterialIcons name="arrow-back" size={24} color="#666" />
        </TouchableOpacity>
        
        <Text style={styles.title}>Settings</Text>
        
        <View style={styles.headerSpacer} />
      </View>

      {/* Tab Navigation */}
      <View style={styles.tabNavigation}>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'levels' && styles.tabButtonActive]}
          onPress={() => setActiveTab('levels')}
        >
          <Text style={[styles.tabButtonText, activeTab === 'levels' && styles.tabButtonTextActive]}>
            Levels
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'settings' && styles.tabButtonActive]}
          onPress={() => setActiveTab('settings')}
        >
          <Text style={[styles.tabButtonText, activeTab === 'settings' && styles.tabButtonTextActive]}>
            Settings
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'stats' && styles.tabButtonActive]}
          onPress={() => setActiveTab('stats')}
        >
          <Text style={[styles.tabButtonText, activeTab === 'stats' && styles.tabButtonTextActive]}>
            Stats
          </Text>
        </TouchableOpacity>
      </View>

      {/* Tab Content */}
      {renderTabContent()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F0F8F0',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  backButton: {
    padding: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2E7D32',
    flex: 1,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 40,
  },
  tabNavigation: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 12,
    padding: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
  },
  tabButtonActive: {
    backgroundColor: '#4CAF50',
  },
  tabButtonText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  tabButtonTextActive: {
    color: '#FFF',
    fontWeight: '600',
  },
  tabContent: {
    flex: 1,
    paddingHorizontal: 20,
  },
  tabTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  tabSubtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
  },
  levelGrid: {
    paddingBottom: 20,
  },
  levelItem: {
    flex: 1,
    backgroundColor: '#FFF',
    margin: 5,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  levelItemLocked: {
    backgroundColor: '#F5F5F5',
    opacity: 0.6,
  },
  levelItemCurrent: {
    borderWidth: 2,
    borderColor: '#FF9800',
  },
  levelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  levelNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2E7D32',
  },
  lockedText: {
    color: '#999',
  },
  levelInfo: {
    gap: 4,
  },
  levelDetail: {
    fontSize: 12,
    color: '#666',
  },
  settingItem: {
    backgroundColor: '#FFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    marginBottom: 12,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  settingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingText: {
    marginLeft: 16,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  settingDescription: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  additionalOptions: {
    marginTop: 20,
  },
  optionItem: {
    backgroundColor: '#FFF',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    marginBottom: 12,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  optionLabel: {
    fontSize: 16,
    color: '#333',
    marginLeft: 16,
    flex: 1,
  },
  statsGrid: {
    gap: 16,
    marginBottom: 30,
  },
  statRow: {
    backgroundColor: '#FFF',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statInfo: {
    marginLeft: 16,
    flex: 1,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  bambooIcon: {
    fontSize: 24,
  },
  versionSection: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  versionText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  versionSubtext: {
    fontSize: 14,
    color: '#888',
    marginTop: 4,
  },
});