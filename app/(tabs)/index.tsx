import { Ionicons } from '@expo/vector-icons';
import { Redirect, useFocusEffect, useRouter } from 'expo-router';
import { signOut } from 'firebase/auth';
import { collection, deleteDoc, doc, getDoc, getDocs, orderBy, query, where } from 'firebase/firestore';
import { deleteObject, ref } from 'firebase/storage';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Button, FlatList, Image, StyleSheet, Text, TouchableOpacity, View, useColorScheme } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { auth, db, storage } from '../../firebaseConfig';

// Arayüz (interface) tanımlamaları
interface UserProfile {
  username: string;
  bio: string;
  email: string;
  profilePictureUrl?: string;
}
interface Echo {
  id: string;
  audioURL: string;
  createdAt: {
    seconds: number;
    nanoseconds: number;
  };
  userId: string; // Silme işlemi için bu alanı da ekliyoruz
}

export default function ProfileScreen() {
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [echos, setEchos] = useState<Echo[]>([]);
  const colorScheme = useColorScheme();
  const router = useRouter(); 

  const handleDeleteEcho = (echoId: string, audioURL: string) => {
    Alert.alert(
      "Eko'yu Sil",
      "Bu Eko'yu kalıcı olarak silmek istediğinizden emin misiniz?",
      [
        { text: "Vazgeç", style: "cancel" },
        {
          text: "Sil",
          style: "destructive",
          onPress: async () => {
            try {
              // 1. Firestore'dan Eko dökümanını sil
              await deleteDoc(doc(db, 'echos', echoId));

              // 2. Storage'dan ses dosyasını sil
              const audioRef = ref(storage, audioURL);
              await deleteObject(audioRef);

              Alert.alert("Başarılı", "Eko'nuz başarıyla silindi.");
              // Listeyi ve sayacı güncellemek için verileri yeniden çek
              fetchProfileData();
            } catch (error) {
              console.error("Eko silinirken hata:", error);
              Alert.alert("Hata", "Eko silinirken bir sorun oluştu.");
            }
          },
        },
      ]
    );
  };

  const fetchProfileData = async () => {
    // setLoading(true) useFocusEffect içinde çağrılıyor
    const user = auth.currentUser;
    if (!user) {
      setLoading(false);
      return;
    }
    try {
      const userDocRef = doc(db, 'users', user.uid);
      const userDocSnap = await getDoc(userDocRef);
      
      if (userDocSnap.exists()) {
        setUserProfile(userDocSnap.data() as UserProfile);

        // Profil varsa, kullanıcının Eko'larını çek
        const echosQuery = query(collection(db, 'echos'), where('userId', '==', user.uid), orderBy('createdAt', 'desc'));
        const querySnapshot = await getDocs(echosQuery);
        const userEchos: Echo[] = [];
        querySnapshot.forEach(doc => {
          userEchos.push({ id: doc.id, ...doc.data() } as Echo);
        });
        setEchos(userEchos);
      } else {
        // Profil bulunamazsa, state'i null olarak ayarla ki Redirect tetiklensin
        setUserProfile(null);
      }
    } catch (error) {
      console.error("Profil verileri çekilirken hata oluştu: ", error);
      setUserProfile(null); // Hata durumunda da null yap
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(useCallback(() => { setLoading(true); fetchProfileData(); }, []));

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.replace('/(auth)/login');
    } catch (error) {
      Alert.alert("Çıkış Hatası", (error as Error).message);
    }
  };

  // --- YENİ VE DOĞRU YÖNLENDİRME MANTIĞI ---

  // 1. Veri yükleniyorsa, bekleme animasyonunu göster
  if (loading) {
    return <SafeAreaView style={styles.container}><ActivityIndicator size="large" /></SafeAreaView>;
  }

  // 2. Yükleme bittiyse VE profil hala yoksa, yönlendir
  if (!userProfile) {
    return <Redirect href="/edit-profile" />;
  }

  // 3. Yükleme bittiyse VE profil varsa, normal ekranı göster
  const usernameColor = colorScheme === 'dark' ? '#FFF' : '#000';
  const bioTextColor = colorScheme === 'dark' ? '#CCC' : '#333';
  const bioHeaderColor = colorScheme === 'dark' ? '#EEE' : '#111';
  const statNumberColor = colorScheme === 'dark' ? '#FFF' : '#000';

  return (
    <SafeAreaView style={styles.container}>
      <Image
        source={{ uri: userProfile.profilePictureUrl || 'https://placehold.co/150x150' }}
        style={styles.profileImage}
      />
      <Text style={[styles.username, { color: usernameColor }]}>{userProfile.username}</Text>
      <Text style={[styles.email, { color: usernameColor }]}>{userProfile.email}</Text>
      
      <View style={styles.statsContainer}>
        <Text style={[styles.statNumber, { color: statNumberColor }]}>{echos.length}</Text>
        <Text style={styles.statLabel}>Eko</Text>
      </View>

      <View style={styles.bioContainer}>
        <Text style={[styles.bioHeader, { color: bioHeaderColor }]}>Hakkında</Text>
        <Text style={[styles.bioText, { color: bioTextColor }]}>{userProfile.bio}</Text>
      </View>

      <View style={styles.buttonContainer}>
        <Button title="Profili Düzenle" onPress={() => router.push('/edit-profile')} color="#9400D3" />
        <View style={{ marginVertical: 8 }} />
        <Button title="Çıkış Yap" onPress={handleLogout} color="#FF3B30" />
      </View>
      
      <View style={styles.listContainer}>
        <Text style={[styles.listHeader, { color: bioHeaderColor }]}>Paylaştığım Eko'lar</Text>
        <FlatList
          data={echos}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={styles.echoItem}>
              <Text style={{ color: bioTextColor }}>
                {item.createdAt ? new Date(item.createdAt.seconds * 1000).toLocaleDateString('tr-TR') : 'Tarih yok'}
              </Text>
              <TouchableOpacity onPress={() => handleDeleteEcho(item.id, item.audioURL)}>
                <Ionicons name="trash-bin-outline" size={24} color="#FF3B30" />
              </TouchableOpacity>
            </View>
          )}
          ListEmptyComponent={<Text style={{ color: 'gray', textAlign: 'center' }}>Henüz hiç Eko paylaşmadın.</Text>}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', paddingTop: 20, paddingHorizontal: 20 },
  profileImage: { width: 120, height: 120, borderRadius: 60, marginBottom: 10, backgroundColor: '#333' },
  username: { fontSize: 24, fontWeight: 'bold', marginBottom: 5 },
  email: { fontSize: 16, marginBottom: 15, opacity: 0.2 },
  statsContainer: { alignItems: 'center', marginBottom: 15 },
  statNumber: { fontSize: 20, fontWeight: 'bold' },
  statLabel: { fontSize: 14, color: 'gray' },
  bioContainer: { alignSelf: 'stretch', marginBottom: 15 },
  bioHeader: { fontSize: 18, fontWeight: 'bold', marginBottom: 8, textAlign: 'center' },
  bioText: { fontSize: 16, textAlign: 'center' },
  buttonContainer: { width: '90%', flexDirection: 'row', justifyContent: 'space-around', marginBottom: 10 },
  listContainer: {
    flex: 1,
    width: '100%',
    borderTopWidth: 1,
    borderTopColor: '#333',
    marginTop: 15,
    paddingTop: 10,
  },
  listHeader: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
  },
  echoItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#9b44ff3b',
    borderRadius: 8,
    marginBottom: 10,
  },
});