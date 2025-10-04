import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { addDoc, collection, doc, getCountFromServer, getDoc, getDocs, query, where } from 'firebase/firestore';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Button, Image, StyleSheet, Text, useColorScheme, View } from 'react-native';
import { auth, db } from '../../firebaseConfig';

// UserProfile arayüzü
interface UserProfile {
  username: string;
  bio: string;
  email: string;
  profilePictureUrl?: string;
}

export default function UserProfileScreen() {
  const router = useRouter();
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const colorScheme = useColorScheme();
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [echoCount, setEchoCount] = useState(0);

  const handleSendMessage = async () => {
    const currentUser = auth.currentUser;
    if (!currentUser || typeof userId !== 'string' || !userProfile) return;

    if (currentUser.uid === userId) {
      Alert.alert("Hata", "Kendinize mesaj gönderemezsiniz.");
      return;
    }

    try {
      const chatsRef = collection(db, 'chats');
      const q = query(chatsRef, where('participants', 'array-contains', currentUser.uid));
      const querySnapshot = await getDocs(q);
      
      let existingChatId: string | null = null;
      querySnapshot.forEach(doc => {
        const data = doc.data();
        if (data.participants.includes(userId)) {
          existingChatId = doc.id;
        }
      });

      if (existingChatId) {
        // TypeScript hatasını çözmek için 'as any' ekledik
        router.push({ pathname: `/chat/${existingChatId}` as any, params: { username: userProfile.username } });
      } else {
        const newChatRef = await addDoc(collection(db, 'chats'), {
          participants: [currentUser.uid, userId],
          lastMessage: '',
          lastUpdatedAt: new Date(),
        });
        // TypeScript hatasını çözmek için 'as any' ekledik
        router.push({ pathname: `/chat/${newChatRef.id}` as any, params: { username: userProfile.username } });
      }
    } catch (error) {
      console.error("Sohbet başlatma hatası: ", error);
      Alert.alert("Hata", "Sohbet başlatılamadı.");
    }
  };

  const fetchProfileData = async () => {
    if (!userId || typeof userId !== 'string') {
      setLoading(false);
      return;
    }
    try {
      const userDocRef = doc(db, 'users', userId);
      const userDocSnap = await getDoc(userDocRef);
      if (userDocSnap.exists()) {
        setUserProfile(userDocSnap.data() as UserProfile);
      }
      const echosQuery = query(collection(db, 'echos'), where('userId', '==', userId));
      const snapshot = await getCountFromServer(echosQuery);
      setEchoCount(snapshot.data().count);
    } catch (error) {
      Alert.alert("Hata", "Profil bilgileri yüklenemedi.");
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetchProfileData();
    }, [userId])
  );

  if (loading) {
    return <View style={styles.container}><ActivityIndicator size="large" /></View>;
  }
  if (!userProfile) {
    return <View style={styles.container}><Text>Kullanıcı bulunamadı.</Text></View>;
  }

  const textColor = { color: colorScheme === 'dark' ? '#FFF' : '#000' };
  const isMyProfile = auth.currentUser?.uid === userId;

  return (
    <View style={styles.container}>
      <Image
        source={{ uri: userProfile.profilePictureUrl || 'https://placehold.co/150x150' }}
        style={styles.profileImage}
      />
      <Text style={[styles.username, textColor]}>{userProfile.username}</Text>

      <View style={styles.statsContainer}>
        <Text style={[styles.statNumber, textColor]}>{echoCount}</Text>
        <Text style={styles.statLabel}>Eko</Text>
      </View>

      <View style={styles.bioContainer}>
        <Text style={[styles.bioHeader, textColor]}>Hakkında</Text>
        <Text style={[styles.bioText, { color: colorScheme === 'dark' ? '#CCC' : '#333' }]}>
          {userProfile.bio}
        </Text>
      </View>
      
      {!isMyProfile && (
        <View style={styles.buttonContainer}>
          <Button title="Mesaj Gönder" onPress={handleSendMessage} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', paddingTop: 40, paddingHorizontal: 20 },
  profileImage: { width: 150, height: 150, borderRadius: 75, marginBottom: 20, backgroundColor: '#333' },
  username: { fontSize: 26, fontWeight: 'bold', marginBottom: 20 },
  statsContainer: { alignItems: 'center', marginBottom: 20 },
  statNumber: { fontSize: 22, fontWeight: 'bold' },
  statLabel: { fontSize: 16, color: 'gray' },
  bioContainer: { alignSelf: 'stretch', marginBottom: 30 },
  bioHeader: { fontSize: 18, fontWeight: 'bold', marginBottom: 8, textAlign: 'center' },
  bioText: { fontSize: 16, textAlign: 'center' },
  buttonContainer: {
    width: '80%',
    marginTop: 20,
  }
});

