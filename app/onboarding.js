/**
 * Onboarding Screen - Introduction and tutorial
 * Purpose: Welcome new users and explain core game mechanics
 * Extension: Add interactive tutorials, animated demonstrations, or skip options
 */

import React, { useState, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  SafeAreaView,
  ScrollView,
  Dimensions 
} from 'react-native';
import { router } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

const slides = [
  {
    id: 1,
    title: 'Connect Pairs',
    description: 'Connect two identical tiles with a path that has ≤2 turns (corners)',
    icon: 'link',
    color: '#4CAF50',
  },
  {
    id: 2,
    title: 'Earn Bamboo',
    description: 'Complete levels to earn bamboo. Spend it in the shop on helpful tools!',
    icon: 'eco',
    color: '#FF9800',
  },
  {
    id: 3,
    title: 'Beat Challenges',
    description: 'Race against time and manage your hearts. No ads, just pure puzzle fun!',
    icon: 'timer',
    color: '#9C27B0',
  },
];

export default function Onboarding() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const scrollViewRef = useRef(null);

  const handleNext = () => {
    if (currentSlide < slides.length - 1) {
      const nextSlide = currentSlide + 1;
      setCurrentSlide(nextSlide);
      scrollViewRef.current?.scrollTo({
        x: nextSlide * width,
        animated: true,
      });
    }
  };

  const handlePrevious = () => {
    if (currentSlide > 0) {
      const prevSlide = currentSlide - 1;
      setCurrentSlide(prevSlide);
      scrollViewRef.current?.scrollTo({
        x: prevSlide * width,
        animated: true,
      });
    }
  };

  const handleGetStarted = () => {
    router.replace('/(tabs)');
  };

  const handleSkip = () => {
    router.replace('/(tabs)');
  };

  const renderSlide = (slide, index) => (
    <View key={slide.id} style={[styles.slide, { width }]}>
      <View style={[styles.iconContainer, { backgroundColor: `${slide.color}20` }]}>
        <MaterialIcons name={slide.icon} size={80} color={slide.color} />
      </View>
      
      <Text style={styles.slideTitle}>{slide.title}</Text>
      <Text style={styles.slideDescription}>{slide.description}</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Skip Button */}
      <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
        <Text style={styles.skipText}>Skip</Text>
      </TouchableOpacity>

      {/* Slides */}
      <ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        scrollEnabled={false}
        contentContainerStyle={styles.slideContainer}
      >
        {slides.map(renderSlide)}
      </ScrollView>

      {/* Page Indicators */}
      <View style={styles.indicatorContainer}>
        {slides.map((_, index) => (
          <View
            key={index}
            style={[
              styles.indicator,
              currentSlide === index && styles.indicatorActive,
            ]}
          />
        ))}
      </View>

      {/* Navigation Buttons */}
      <View style={styles.navigationContainer}>
        {currentSlide > 0 && (
          <TouchableOpacity style={styles.previousButton} onPress={handlePrevious}>
            <MaterialIcons name="chevron-left" size={24} color="#666" />
            <Text style={styles.previousText}>Previous</Text>
          </TouchableOpacity>
        )}
        
        <View style={styles.spacer} />
        
        {currentSlide < slides.length - 1 ? (
          <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
            <Text style={styles.nextText}>Next</Text>
            <MaterialIcons name="chevron-right" size={24} color="#FFF" />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.getStartedButton} onPress={handleGetStarted}>
            <Text style={styles.getStartedText}>Get Started</Text>
            <MaterialIcons name="play-arrow" size={24} color="#FFF" />
          </TouchableOpacity>
        )}
      </View>

      {/* Footer Links */}
      <View style={styles.footer}>
        <TouchableOpacity style={styles.footerLink}>
          <Text style={styles.footerLinkText}>Privacy Policy</Text>
        </TouchableOpacity>
        <Text style={styles.footerSeparator}>•</Text>
        <TouchableOpacity style={styles.footerLink}>
          <Text style={styles.footerLinkText}>Help</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F0F8F0',
  },
  skipButton: {
    alignSelf: 'flex-end',
    padding: 16,
    marginRight: 10,
  },
  skipText: {
    fontSize: 16,
    color: '#666',
  },
  slideContainer: {
    alignItems: 'center',
  },
  slide: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  iconContainer: {
    width: 160,
    height: 160,
    borderRadius: 80,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 40,
  },
  slideTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2E7D32',
    textAlign: 'center',
    marginBottom: 16,
  },
  slideDescription: {
    fontSize: 18,
    color: '#666',
    textAlign: 'center',
    lineHeight: 26,
    paddingHorizontal: 20,
  },
  indicatorContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
  },
  indicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#E0E0E0',
    marginHorizontal: 4,
  },
  indicatorActive: {
    backgroundColor: '#4CAF50',
    width: 20,
  },
  navigationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  previousButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 25,
    backgroundColor: '#FFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  previousText: {
    fontSize: 16,
    color: '#666',
    marginLeft: 4,
  },
  spacer: {
    flex: 1,
  },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 25,
    backgroundColor: '#4CAF50',
  },
  nextText: {
    fontSize: 16,
    color: '#FFF',
    fontWeight: '600',
    marginRight: 4,
  },
  getStartedButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 25,
    backgroundColor: '#2E7D32',
  },
  getStartedText: {
    fontSize: 16,
    color: '#FFF',
    fontWeight: '600',
    marginRight: 4,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
  },
  footerLink: {
    padding: 8,
  },
  footerLinkText: {
    fontSize: 14,
    color: '#666',
    textDecorationLine: 'underline',
  },
  footerSeparator: {
    fontSize: 14,
    color: '#CCC',
    marginHorizontal: 8,
  },
});