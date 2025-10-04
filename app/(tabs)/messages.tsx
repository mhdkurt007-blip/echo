import { Link, useFocusEffect } from 'expo-router';
import { arrayUnion, collection, doc, getDoc, onSnapshot, orderBy, query, updateDoc, where } from 'firebase/firestore';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Image, StyleSheet, Text, TouchableOpacity, useColorScheme, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { auth, db } from '../../firebaseConfig';

interface Chat {
  id: string;
  otherUser: {
    uid: string;
    username: string;
    profilePictureUrl?: string;
  };
  lastMessage: string;
}

export default function MessagesScreen() {
  const colorScheme = useColorScheme();
  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(true);

  // --- GÜNCELLENMİŞ SİLME FONKSİYONU ---
  const handleDeleteChat = (chatId: string) => {
    Alert.alert(
      "Sohbeti Sil",
      "Bu sohbeti listenizden silmek istediğinizden emin misiniz? Diğer kişi sohbeti görmeye devam edecektir.",
      [
        { text: "Vazgeç", style: "cancel" },
        { 
          text: "Benden Sil", 
          onPress: async () => {
            try {
              const currentUser = auth.currentUser;
              if (!currentUser) return;

              const chatDocRef = doc(db, 'chats', chatId);
              // Dökümanı silmek yerine, 'deletedFor' dizisine kendi UID'mizi ekliyoruz.
              await updateDoc(chatDocRef, {
                deletedFor: arrayUnion(currentUser.uid)
              });

            } catch (error) {
              console.error("Sohbet gizlenirken hata oluştu:", error);
              Alert.alert("Hata", "Sohbet gizlenirken bir sorun oluştu.");
            }
          },
          style: "destructive"
        }
      ]
    );
  };

  useFocusEffect(
    useCallback(() => {
      const currentUser = auth.currentUser;
      if (!currentUser) return;

      const chatsRef = collection(db, 'chats');
      const q = query(
        chatsRef, 
        where('participants', 'array-contains', currentUser.uid),
        orderBy('lastUpdatedAt', 'desc')
      );

      const unsubscribe = onSnapshot(q, async (querySnapshot) => {
        const chatsPromises = querySnapshot.docs
          // --- GÜNCELLENMİŞ FİLTRELEME ---
          // 'deletedFor' dizisinde bizim UID'miz olmayan sohbetleri al
          .filter(doc => !doc.data().deletedFor?.includes(currentUser.uid))
          .map(async (chatDoc) => {
            const chatData = chatDoc.data();
            const otherUserId = chatData.participants.find((uid: string) => uid !== currentUser.uid);

            if (otherUserId) {
              const userDoc = await getDoc(doc(db, 'users', otherUserId));
              const userData = userDoc.data();
              
              return {
                id: chatDoc.id,
                otherUser: {
                  uid: otherUserId,
                  username: userData?.username || 'Bilinmeyen Kullanıcı',
                  profilePictureUrl: userData?.profilePictureUrl,
                },
                lastMessage: chatData.lastMessage,
              };
            }
            return null;
          });

        const resolvedChats = (await Promise.all(chatsPromises)).filter(chat => chat !== null) as Chat[];
        setChats(resolvedChats);
        setLoading(false);
      });

      return () => unsubscribe();
    }, [])
  );

  const textColor = { color: colorScheme === 'dark' ? '#FFF' : '#000' };

  if (loading) {
    return <ActivityIndicator style={{ flex: 1 }} size="large" />;
  }

  return (
    <SafeAreaView style={styles.container}>
      <Text style={[styles.title, textColor]}>Sohbetler</Text>
      <FlatList
        data={chats}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <Link href={`/chat/${item.id}`} asChild>
            <TouchableOpacity 
              style={styles.chatItem}
              onLongPress={() => handleDeleteChat(item.id)}
            >
              <Image 
                source={{ uri: item.otherUser.profilePictureUrl || 'https://placehold.co/60x60' }} 
                style={styles.chatImage} 
              />
              <View style={styles.chatInfo}>
                <Text style={[styles.chatName, textColor]}>{item.otherUser.username}</Text>
                <Text style={styles.lastMessage} numberOfLines={1}>{item.lastMessage || 'Sohbeti başlat...'}</Text>
              </View>
            </TouchableOpacity>
          </Link>
        )}
        ListEmptyComponent={() => <Text style={styles.emptyText}>Henüz bir sohbetiniz yok.</Text>}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
    container: { flex: 1, paddingTop: 60, paddingHorizontal: 16 },
    title: { fontSize: 32, fontWeight: 'bold', marginBottom: 20 },
    chatItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#333' },
    chatImage: { width: 60, height: 60, borderRadius: 30 },
    chatInfo: { marginLeft: 12, flex: 1 },
    chatName: { fontSize: 18, fontWeight: 'bold' },
    lastMessage: { fontSize: 14, color: 'gray', marginTop: 4 },
    emptyText: { textAlign: 'center', marginTop: 50, color: 'gray', fontSize: 16 },
});