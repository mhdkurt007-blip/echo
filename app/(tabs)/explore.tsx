import * as Location from 'expo-location';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import MapView, { Region } from 'react-native-maps';

export default function ExploreScreen() {
  // Haritanın göstereceği bölgeyi (konum ve zoom seviyesi) tutmak için bir state
  const [mapRegion, setMapRegion] = useState<Region | undefined>(undefined);
  // İzin verilmezse veya hata olursa diye bir hata mesajı state'i
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    // Bu fonksiyon, component ilk açıldığında çalışacak
    (async () => {
      // 1. Kullanıcıdan konum izni istiyoruz
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setErrorMsg('Konum izni reddedildi. Haritayı kullanmak için lütfen ayarlardan izin verin.');
        return;
      }

      // 2. İzin verildiyse, kullanıcının mevcut konumunu alıyoruz
      try {
        let location = await Location.getCurrentPositionAsync({});
        
        // 3. Aldığımız konum bilgileriyle haritanın odaklanacağı bölgeyi ayarlıyoruz
        setMapRegion({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          latitudeDelta: 0.0922, // Bunlar zoom seviyesini belirler
          longitudeDelta: 0.0421, // Değerler küçüldükçe haritaya daha çok yakınlaşır
        });
      } catch (error) {
        setErrorMsg('Konum alınamadı. Lütfen GPS\'inizin açık olduğundan emin olun.');
      }
    })();
  }, []);

  // Yükleme veya hata durumunu yönetmek için bir içerik değişkeni
  let content = <ActivityIndicator size="large" />;

  if (errorMsg) {
    // Eğer bir hata varsa, hata mesajını göster
    content = <Text style={styles.errorText}>{errorMsg}</Text>;
  } else if (mapRegion) {
    // Hata yoksa ve konum bilgisi geldiyse, haritayı göster
    content = <MapView style={styles.map} region={mapRegion} />;
  }

  return (
    <View style={styles.container}>
      {content}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  map: {
    width: '100%',
    height: '100%',
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
    padding: 20,
  }
});