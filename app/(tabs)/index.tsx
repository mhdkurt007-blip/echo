import { Image } from 'expo-image';
import { StyleSheet } from 'react-native';

import ParallaxScrollView from '@/components/ParallaxScrollView';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';

export default function HomeScreen() {
  return (
    <ParallaxScrollView
      headerBackgroundColor={{ light: '#A1CEDC', dark: '#1D3D47' }}
      headerImage={
        <Image
          source={require('@/assets/images/partial-react-logo.png')}
          style={styles.reactLogo}
        />
      }>
      
      {/* --- KENDİ KODLARINIZI BURADAN İTİBAREN YAZABİLİRSİNİZ --- */}
      
      {/* Bu sizin eklediğiniz başlık, bu kalsın */}
      <ThemedView style={styles.titleContainer}>
        <ThemedText type="title">E C H O</ThemedText>
      </ThemedView>

      {/* Örnek olarak yeni bir alan ekleyelim */}
      <ThemedView style={styles.stepContainer}>
        <ThemedText>
          Selam bebek 
        </ThemedText>
      </ThemedView>

      {/* Buraya yeni ThemedView'lar, Butonlar, Resimler ekleyebilirsiniz... */}

    </ParallaxScrollView>
  );
}

const styles = StyleSheet.create({
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 16, // Biraz boşluk eklemek iyi olabilir
  },
  stepContainer: {
    gap: 8,
    margin: 16, // Kenarlardan boşluk bırakalım
  },
  reactLogo: {
    height: 178,
    width: 290,
    bottom: 0,
    left: 0,
    position: 'absolute',
  },
});