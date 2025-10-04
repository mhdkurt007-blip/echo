import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import * as Location from 'expo-location';
import { useFocusEffect, useRouter } from 'expo-router';
import { addDoc, arrayRemove, arrayUnion, collection, doc, getDoc, getDocs, query, serverTimestamp, updateDoc } from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, Modal, Platform, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import MapView, { Marker, Region } from 'react-native-maps';
import { auth, db, storage } from '../../firebaseConfig';


// Veri yapısı
type EchoMarkerType = {
  id: string;
  location: { latitude: number; longitude: number; };
  audioURL: string;
  userId: string;
  username: string;
  profilePictureUrl?: string;
  likes?: string[];
};

export default function ExploreScreen() {
  const router = useRouter();
  const [mapRegion, setMapRegion] = useState<Region | undefined>(undefined);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [echos, setEchos] = useState<EchoMarkerType[]>([]);
  const [isMapReady, setIsMapReady] = useState(false);
  const [recording, setRecording] = useState<Audio.Recording | undefined>();
  const [isRecording, setIsRecording] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [sound, setSound] = useState<Audio.Sound>();
  
  // YENİ: Seçili Eko'yu ve modal görünürlüğünü tutacak state
  const [selectedEcho, setSelectedEcho] = useState<EchoMarkerType | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);


  const playSound = async (url: string) => {
    console.log('Loading Sound');
    if (sound) await sound.unloadAsync(); // Önceki sesi temizle
    try {
      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: url },
        { shouldPlay: true }, // Yüklenince direkt oynat
        (status) => { // Sesin durumunu anlık olarak dinle
            if (status.isLoaded) { // Eğer ses yüklendiyse
                if (status.didJustFinish) {
                    // DEĞİŞİKLİK BURADA: Ses bittiğinde artık modal KAPANMAYACAK.
                    // Sadece çalma durumunu `false` olarak güncelliyoruz.
                    setIsPlaying(false);
                    console.log('Sound finished playing.');
                }
            }
        }
      );
      setSound(newSound);
      setIsPlaying(true); // Ses çalmaya başladığı için durumu `true` yap
      console.log('Playing Sound');
    } catch (error) {
      console.error("Ses çalınırken hata oluştu", error);
    }
  };
  
  // YENİ: Modal kapandığında veya değiştiğinde sesi durdurup temizleyen useEffect
  useEffect(() => {
    // Component unmount olduğunda sesi temizle
    return sound ? () => {
        console.log('Unloading Sound');
        sound.unloadAsync();
    } : undefined;
  }, [sound]);

  // YENİ: `selectedEcho` değiştiğinde sesi çalan useEffect
  useEffect(() => {
    if (selectedEcho) {
        playSound(selectedEcho.audioURL);
    } else {
        // Eğer selectedEcho null ise (modal kapandıysa), sesi durdur ve temizle
        if (sound) {
            sound.stopAsync();
            sound.unloadAsync();
            setIsPlaying(false);
        }
    }
  }, [selectedEcho]);


  const fetchEchos = async () => {
    // ... (Bu fonksiyon aynı kalıyor, değişiklik yok)
    try {
      const q = query(collection(db, "echos"));
      const querySnapshot = await getDocs(q);
      
      const fetchedEchosPromises = querySnapshot.docs.map(async (echoDoc) => {
        const echoData = echoDoc.data();
        if (!echoData.userId) return null;
        
        const userDocRef = doc(db, 'users', echoData.userId);
        const userDocSnap = await getDoc(userDocRef);
        const userData = userDocSnap.exists() ? userDocSnap.data() : null;

        return {
          id: echoDoc.id,
          ...echoData,
          username: userData?.username || 'Bilinmeyen',
          profilePictureUrl: userData?.profilePictureUrl,
        } as EchoMarkerType;
      });

      const fetchedEchos = (await Promise.all(fetchedEchosPromises)).filter(echo => echo !== null) as EchoMarkerType[];
      setEchos(fetchedEchos);
    } catch (e) {
      console.error("Error fetching echos: ", e);
    }
  };

  useEffect(() => {
    // ... (Bu fonksiyon aynı kalıyor, değişiklik yok)
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setErrorMsg('Konum izni reddedildi.');
        setLoading(false);
        return;
      }
      try {
        let location = await Location.getCurrentPositionAsync({});
        setMapRegion({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          latitudeDelta: 0.0922,
          longitudeDelta: 0.0421,
        });
      } catch (error) {
        setErrorMsg('Konum alınamadı. Cihazınızın GPS\'i açık mı?');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useFocusEffect(useCallback(() => { fetchEchos(); }, []));

   const handleLikeToggle = async (echo: EchoMarkerType) => {
    // ... (Bu fonksiyon aynı kalıyor, değişiklik yok)
    const currentUser = auth.currentUser;
    if (!currentUser) return;

    const echoRef = doc(db, 'echos', echo.id);
    const hasLiked = echo.likes?.includes(currentUser.uid);

    try {
      if (hasLiked) {
        await updateDoc(echoRef, { likes: arrayRemove(currentUser.uid) });
      } else {
        await updateDoc(echoRef, { likes: arrayUnion(currentUser.uid) });
      }
      // Arayüzü anında güncellemek için Eko listesini ve seçili Eko'yu güncelle
      const updatedEchoDoc = await getDoc(echoRef);
      const updatedEchoData = { id: updatedEchoDoc.id, ...updatedEchoDoc.data() } as EchoMarkerType;
      
      // Tam kullanıcı bilgisiyle güncellemek için ek bilgi çek
      const userDocRef = doc(db, 'users', updatedEchoData.userId);
      const userDocSnap = await getDoc(userDocRef);
      const userData = userDocSnap.exists() ? userDocSnap.data() : {};

      setSelectedEcho({ ...updatedEchoData, username: userData.username, profilePictureUrl: userData.profilePictureUrl});
      
      await fetchEchos();
    } catch (error) {
      console.error("Beğeni işlemi sırasında hata:", error);
      Alert.alert("Hata", "İşlem sırasında bir sorun oluştu.");
    }
  };

async function startRecording() {
    console.log("startRecording fonksiyonu tetiklendi.");
    try {
      if (sound) {
        console.log("Mevcut ses nesnesi temizleniyor...");
        await sound.unloadAsync();
        setSound(undefined);
      }
      
      console.log("Ses izinleri isteniyor...");
      await Audio.requestPermissionsAsync();
      
      console.log("Ses modu kayıt için ayarlanıyor...");
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });
      
      console.log("Yeni kayıt oluşturuluyor...");
      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      
      setRecording(recording);
      setIsRecording(true);
      console.log("Kayıt başarıyla başladı!");

    } catch (err) {
      console.error("Kayıt başlatılırken HATA oluştu:", err);
      Alert.alert('Hata', 'Kayıt başlatılamadı.');
    }
  }

  async function stopRecording() {
    setIsRecording(false);
    if (recording) {
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      if (uri) {
        uploadAudio(uri);
      }
    }
  }

  async function uploadAudio(uri: string) {
    setIsUploading(true);
    try {
      const response = await fetch(uri);
      const blob = await response.blob();
      const user = auth.currentUser;
      if (!user) throw new Error("Kullanıcı giriş yapmamış.");

      const storageRef = ref(storage, `echos/${user.uid}/${Date.now()}.m4a`);
      await uploadBytes(storageRef, blob);

      const downloadURL = await getDownloadURL(storageRef);
      const location = await Location.getCurrentPositionAsync({});
      
      await addDoc(collection(db, 'echos'), {
        userId: user.uid,
        audioURL: downloadURL,
        location: { latitude: location.coords.latitude, longitude: location.coords.longitude },
        createdAt: serverTimestamp(),
        likes: [] // Beğeni dizisini başlangıçta boş olarak ekleyelim
      });

      Alert.alert('Başarılı!', 'Eko\'nuz haritaya eklendi.');
      await fetchEchos();

    } catch (error: any) {
      Alert.alert('Yükleme Hatası', error.message);
    } finally {
      setIsUploading(false);
    }
  }

  if (loading) { return <View style={styles.centered}><ActivityIndicator size="large" /></View>; }
  if (errorMsg) { return <View style={styles.centered}><Text style={{ color: 'red' }}>{errorMsg}</Text></View>; }
  if (!mapRegion) { return <View style={styles.centered}><Text>Harita bölgesi ayarlanamadı.</Text></View>; }
   const isAndroid = Platform.OS === 'android';
    return (
    <View style={styles.container}>
      <MapView
  style={styles.map}
  region={mapRegion}
  showsUserLocation
  onMapReady={() => setIsMapReady(true)}
  // Sadece Android'de harita araç çubuğunu gizle
  {...(isAndroid && { showsMapToolbar: false })}
>
  {isMapReady && echos.map(echo => (
    <Marker
      key={echo.id}
      coordinate={echo.location}
      // DEĞİŞTİ: onPress artık sesi çalmıyor, modalı açmak için state'i güncelliyor.
      onPress={() => setSelectedEcho(echo)}
    >
      <Image
        source={{ uri: echo.profilePictureUrl || 'https://placehold.co/50x50' }}
        style={styles.markerImage}
      />
    </Marker>
  ))}
</MapView>

      {/* YENİ: Eko Oynatıcı Modal'ı */}
      {selectedEcho && (
        <Modal
          animationType="fade"
          transparent={true}
          visible={selectedEcho !== null}
          onRequestClose={() => setSelectedEcho(null)}
        >
          <Pressable style={styles.modalBackdrop} onPress={() => setSelectedEcho(null)}>
            <Pressable style={styles.modalContent} onPress={() => {}}>
                <Image
                    source={{ uri: selectedEcho.profilePictureUrl || 'https://placehold.co/100x100' }}
                    style={styles.modalProfileImage}
                />
                <Text style={styles.modalUsername}>{selectedEcho.username}</Text>
                
                {/* YENİ: Oynatma göstergesi (basit bir metin, istersen animasyonlu yapabilirsin) */}
                <View style={styles.playerIndicator}>
                    <Ionicons name="pulse" size={24} color="#9400D3" />
                    <Text style={styles.playerText}>{isPlaying ? 'Eko çalınıyor...' : 'Eko bitti'}</Text>
                </View>

                {/* YENİ: Etkileşim Butonları */}
                <View style={styles.actionsContainer}>
                    <TouchableOpacity style={styles.actionButton} onPress={() => handleLikeToggle(selectedEcho)}>
                        <Ionicons 
                            name={selectedEcho.likes?.includes(auth.currentUser?.uid ?? '') ? "heart" : "heart-outline"} 
                            size={24} 
                            color={selectedEcho.likes?.includes(auth.currentUser?.uid ?? '') ? "#9400D3" : "#9400D3"}
                        />
                        <Text style={styles.actionText}>{selectedEcho.likes?.length || 0}</Text>
                    </TouchableOpacity>

                    <TouchableOpacity 
                        style={styles.actionButton} 
                        onPress={() => {
                            setSelectedEcho(null); // Modalı kapat
                            router.push(`/users/${selectedEcho.userId}` as any); // Profile git
                        }}
                    >
                        <Ionicons name="person-circle-outline" size={24} color="#9400D3" />
                        <Text style={styles.actionText}>Profil</Text>
                    </TouchableOpacity>
                </View>

                <TouchableOpacity style={styles.closeButton} onPress={() => setSelectedEcho(null)}>
                    <Text style={styles.closeButtonText}>Kapat</Text>
                </TouchableOpacity>

            </Pressable>
          </Pressable>
        </Modal>
      )}

      <View style={styles.recordButtonContainer}>
        <TouchableOpacity style={isRecording ? styles.recordButtonRecording : styles.recordButton} onPress={isRecording ? stopRecording : startRecording} disabled={isUploading}>
          <Text style={styles.recordButtonText}>{isUploading ? 'Yükleniyor...' : (isRecording ? 'Durdur' : 'Eko Bırak')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // ... (Eski stiller aynı kalıyor)
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  map: { width: '100%', height: '100%' },
  markerImage: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#9400D3',
  },
  recordButtonContainer: { position: 'absolute', bottom: 50, alignSelf: 'center' },
  recordButton: { width: 120, height: 50, borderRadius: 25, backgroundColor: '#9400D3', justifyContent: 'center', alignItems: 'center' },
  recordButtonRecording: { width: 120, height: 50, borderRadius: 25, backgroundColor: '#FF3B30', justifyContent: 'center', alignItems: 'center' },
  recordButtonText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
  calloutContainer: { width: 150, padding: 10, backgroundColor: 'rgba(0, 0, 0, 0.8)', borderRadius: 10, alignItems: 'center' },
  calloutUsername: { color: 'white', fontWeight: 'bold', fontSize: 16 },
  calloutText: { color: '#BDBDBD', fontSize: 12, marginTop: 4 },
  
  // YENİ: Modal için stiller
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '80%',
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalProfileImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 12,
  },
  modalUsername: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  playerIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  playerText: {
    marginLeft: 8,
    fontSize: 16,
    color: '#333'
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginBottom: 20,
  },
  actionButton: {
    alignItems: 'center',
  },
  actionText: {
    fontSize: 12,
    color: '#9400D3',
    marginTop: 4,
  },
  closeButton: {
    backgroundColor: '#EFEFEF',
    borderRadius: 15,
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  closeButtonText: {
    color: '#9400D3',
    fontWeight: 'bold',
  }
});