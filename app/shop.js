/**
 * Shop Screen - Shop Page
 * Purpose: Purchase game tools
 */

import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  SafeAreaView, 
  Alert,
  Image,
  ScrollView
} from 'react-native';
import { router } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import useGameStore from '../store/gameStore';
import { GAME_CONSTANTS } from '../store/gameStore';

export default function Shop() {
  const { bambooBalance, inventory, purchaseTool } = useGameStore();
  const [purchasing, setPurchasing] = useState(null);

  const tools = [
    {
      id: 'hint',
      name: 'Hint',
      description: 'Highlight a pair of connectable tiles',
      imageUrl: 'https://dzdbhsix5ppsc.cloudfront.net/monster/linker/lighttab.png',
      price: GAME_CONSTANTS.TOOL_PRICES.hint,
      color: '#FFC107',
    },
    {
      id: 'bomb',
      name: 'Bomb',
      description: 'Remove a random connectable pair',
      imageUrl: 'https://dzdbhsix5ppsc.cloudfront.net/monster/linker/boomtab.png',
      price: GAME_CONSTANTS.TOOL_PRICES.bomb,
      color: '#FF5722',
    },
    {
      id: 'shuffle',
      name: 'Shuffle',
      description: 'Rearrange remaining tiles',
      imageUrl: 'https://dzdbhsix5ppsc.cloudfront.net/monster/linker/washtab.png',
      price: GAME_CONSTANTS.TOOL_PRICES.shuffle,
      color: '#9C27B0',
    },
  ];

  const handleBack = () => {
    router.back();
  };

  const handlePurchase = async (tool) => {
    if (bambooBalance < tool.price) {
      Alert.alert('Insufficient Bamboo', `You need ${tool.price} bamboo to purchase this tool.`);
      return;
    }

    setPurchasing(tool.id);
    
    try {
      const success = await purchaseTool(tool.id);
      if (!success) {
        Alert.alert('Purchase Failed', 'Something went wrong, please try again.');
      }
    } catch (error) {
      Alert.alert('Error', 'Purchase failed.');
    }
    
    setPurchasing(null);
  };

  const renderToolCard = (tool) => (
    <View key={tool.id} style={styles.toolCard}>
      <View style={[styles.toolIcon, { backgroundColor: `${tool.color}20` }]}>
        <Image 
          source={{ uri: tool.imageUrl }}
          style={styles.toolIconImage}
        />
      </View>
      
      <View style={styles.toolInfo}>
        <Text style={styles.toolName}>{tool.name}</Text>
        <Text style={styles.toolDescription}>{tool.description}</Text>
        
        <View style={styles.inventoryRow}>
          <Text style={styles.inventoryText}>Owned: {inventory[tool.id]}</Text>
        </View>
        
        <View style={styles.priceRow}>
          <Text style={styles.bambooEmoji}>🎋</Text>
          <Text style={styles.priceText}>{tool.price}</Text>
        </View>
      </View>
      
      <TouchableOpacity
        style={[
          styles.buyButton,
          bambooBalance < tool.price && styles.buyButtonDisabled,
          purchasing === tool.id && styles.buyButtonPurchasing,
        ]}
        onPress={() => handlePurchase(tool)}
        disabled={bambooBalance < tool.price || purchasing === tool.id}
      >
        <Text style={[
          styles.buyButtonText,
          bambooBalance < tool.price && styles.buyButtonTextDisabled,
        ]}>
          {purchasing === tool.id ? 'Buying...' : 'Buy'}
        </Text>
      </TouchableOpacity>
    </View>
  )

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <MaterialIcons name="arrow-back" size={24} color="#666" />
        </TouchableOpacity>
        
        <Text style={styles.title}>Shop</Text>
        
        <View style={styles.bambooContainer}>
          <Text style={styles.bambooEmoji}>🎋</Text>
          <Text style={styles.bambooText}>{bambooBalance}</Text>
        </View>
      </View>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Description */}
        <View style={styles.description}>
          <Text style={styles.descriptionText}>
            Use bamboo to purchase tools and get help in difficult levels!
          </Text>
        </View>

        {/* Tools List */}
        <View style={styles.toolsGrid}>
          {tools.map(renderToolCard)}
        </View>

        {/* Tips */}
        <View style={styles.tips}>
          <Text style={styles.tipsTitle}>💡 Tips</Text>
          <Text style={styles.tipsText}>
            • Earn bamboo by completing levels{'\n'}
            • Tools don't consume time or hearts{'\n'}
            • Stock up on tools before attempting difficult levels!
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F0F8F0',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 50,
    paddingBottom: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  backButton: {
    padding: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2E7D32',
    flex: 1,
    textAlign: 'center',
  },
  bambooContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  bambooText: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 4,
    color: '#333',
  },
  bambooEmoji: {
    fontSize: 16,
  },
  description: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  descriptionText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
  },
  toolsGrid: {
    paddingHorizontal: 20,
    gap: 16,
  },
  toolCard: {
    backgroundColor: '#FFF',
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    flexDirection: 'row',
    alignItems: 'center',
  },
  toolIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  toolIconImage: {
    width: 40,
    height: 40,
    resizeMode: 'contain',
  },
  toolInfo: {
    flex: 1,
  },
  toolName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  toolDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  inventoryRow: {
    marginBottom: 8,
  },
  inventoryText: {
    fontSize: 12,
    color: '#888',
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  priceText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4CAF50',
    marginLeft: 4,
  },
  buyButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  buyButtonDisabled: {
    backgroundColor: '#E0E0E0',
  },
  buyButtonPurchasing: {
    backgroundColor: '#FFC107',
  },
  buyButtonText: {
    color: '#FFF',
    fontWeight: '600',
  },
  buyButtonTextDisabled: {
    color: '#999',
  },
  tips: {
    margin: 20,
    padding: 16,
    backgroundColor: '#FFF',
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
  },
  tipsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  tipsText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
});