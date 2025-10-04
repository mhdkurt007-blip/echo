import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { addDoc, collection, doc, getDoc, onSnapshot, orderBy, query, serverTimestamp, setDoc } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Image, KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, TouchableOpacity, useColorScheme, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { auth, db } from '../../firebaseConfig';

// Arayüz tanımlamaları
interface Message {
  id: string;
  text: string;
  senderId: string;
  createdAt: any;
}

interface OtherUser {
  username: string;
  profilePictureUrl?: string;
}

export default function ChatScreen() {
  const router = useRouter();
  const { chatId, username } = useLocalSearchParams<{ chatId: string, username?: string }>();
  const colorScheme = useColorScheme();
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [otherUser, setOtherUser] = useState<OtherUser | null>(null);

  useEffect(() => {
    if (!chatId || typeof chatId !== 'string') return;
    const currentUser = auth.currentUser;
    if (!currentUser) return;

    // --- YENİ VE GELİŞTİRİLMİŞ VERİ ÇEKME MANTIĞI ---
    const fetchChatInfoAndMessages = async () => {
      // 1. Önce diğer kullanıcının bilgilerini çek
      try {
        const chatDocRef = doc(db, 'chats', chatId);
        const chatDoc = await getDoc(chatDocRef);

        if (chatDoc.exists()) {
          const participants = chatDoc.data().participants;
          const otherUserId = participants.find((uid: string) => uid !== currentUser.uid);
          
          if (otherUserId) {
            const userDocRef = doc(db, 'users', otherUserId);
            const userDoc = await getDoc(userDocRef);
            if (userDoc.exists()) {
              setOtherUser(userDoc.data() as OtherUser);
            }
          }
        }
      } catch (error) {
        console.error("Kullanıcı bilgisi çekilirken hata:", error);
      }

      // 2. Ardından mesajları dinlemeye başla
      const messagesRef = collection(db, 'chats', chatId, 'messages');
      const q = query(messagesRef, orderBy('createdAt', 'desc'));
      
      const unsubscribe = onSnapshot(q, (querySnapshot) => {
        const fetchedMessages: Message[] = [];
        querySnapshot.forEach((doc) => {
          fetchedMessages.push({ id: doc.id, ...doc.data() } as Message);
        });
        setMessages(fetchedMessages);
        setLoading(false); // Hem kullanıcı bilgisi hem de mesajlar geldikten sonra yüklemeyi bitir
      });

      return unsubscribe;
    };

    const unsubscribePromise = fetchChatInfoAndMessages();

    // Ekran kapandığında dinleyiciyi temizle
    return () => {
      unsubscribePromise.then(unsubscribe => unsubscribe && unsubscribe());
    };
  }, [chatId]);

  // handleSendMessage fonksiyonu aynı kalıyor...
  const handleSendMessage = async () => {
    if (inputText.trim() === '' || !chatId || typeof chatId !== 'string') return;
    const currentUser = auth.currentUser;
    if (!currentUser) return;
    const messagesRef = collection(db, 'chats', chatId, 'messages');
    await addDoc(messagesRef, { text: inputText, senderId: currentUser.uid, createdAt: serverTimestamp(),  deletedFor: [] });
    const chatDocRef = doc(db, 'chats', chatId);
    await setDoc(chatDocRef, { lastMessage: inputText, lastUpdatedAt: serverTimestamp(), deletedFor: [] }, { merge: true });
    setInputText('');
  };

  // Dinamik stiller
  const containerStyle = { backgroundColor: colorScheme === 'dark' ? '#000' : '#FFF' };
  const headerStyle = { backgroundColor: colorScheme === 'dark' ? '#121212' : '#F8F8F8', borderBottomColor: colorScheme === 'dark' ? '#333' : '#DDD' };
  const headerTextStyle = { color: colorScheme === 'dark' ? '#FFF' : '#000' };
  const inputContainerStyle = { backgroundColor: colorScheme === 'dark' ? '#1C1C1E' : '#FFF', borderTopColor: colorScheme === 'dark' ? '#333' : '#DDD' };
  const inputStyle = { color: colorScheme === 'dark' ? '#FFF' : '#000', backgroundColor: colorScheme === 'dark' ? '#2c2c2e' : '#EFEFEF' };

  return (
    <SafeAreaView style={[styles.container, containerStyle]}>
      <Stack.Screen options={{ headerShown: false }} />
      
      <View style={[styles.header, headerStyle]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={32} color="#007AFF" />
        </TouchableOpacity>
        
        {/* --- YENİ VE GELİŞTİRİLMİŞ BAŞLIK --- */}
        {/* Yükleme bitene kadar başlık içeriğini gösterme */}
        {!loading && (
          <View style={styles.headerProfile}>
            <Image 
              source={{ uri: otherUser?.profilePictureUrl || 'https://placehold.co/40x40' }}
              style={styles.headerImage}
            />
            <Text style={[styles.headerTitle, headerTextStyle]}>{otherUser?.username || username || 'Sohbet'}</Text>
          </View>
        )}

        <View style={{width: 40}} />
      </View>

      {/* Yükleme durumunu ekranın ortasında göster */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" />
        </View>
      ) : (
        <KeyboardAvoidingView 
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <FlatList
            data={messages}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => {
              const isMyMessage = item.senderId === auth.currentUser?.uid;
              return (
                <View style={[styles.messageContainer, isMyMessage ? styles.myMessageContainer : styles.theirMessageContainer]}>
                  <Text style={styles.messageText}>{item.text}</Text>
                </View>
              );
            }}
            inverted
            style={styles.messageList}
          />
          
          <View style={[styles.inputContainer, inputContainerStyle]}>
            <TextInput
              style={[styles.input, inputStyle]}
              value={inputText}
              onChangeText={setInputText}
              placeholder="Mesaj yaz..."
              placeholderTextColor="gray"
            />
            <TouchableOpacity onPress={handleSendMessage} style={styles.sendButton}>
              <Ionicons name="send" size={24} color="#007AFF" />
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      )}
    </SafeAreaView>
  );
}

// Stilleri güncelliyoruz
const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', height: 60, borderBottomWidth: 1, paddingHorizontal: 10 },
  backButton: { width: 40, justifyContent: 'center', alignItems: 'flex-start' },
  headerProfile: { flexDirection: 'row', alignItems: 'center' },
  headerImage: { width: 40, height: 40, borderRadius: 20, marginRight: 10 },
  headerTitle: { fontSize: 17, fontWeight: '600' },
  messageList: { flex: 1, paddingHorizontal: 10 },
  messageContainer: { padding: 12, borderRadius: 18, marginVertical: 4, maxWidth: '80%' },
  myMessageContainer: { backgroundColor: '#007AFF', alignSelf: 'flex-end' },
  theirMessageContainer: { backgroundColor: '#333', alignSelf: 'flex-start' },
  messageText: { color: 'white', fontSize: 16 },
  inputContainer: { flexDirection: 'row', alignItems: 'center', padding: 10, borderTopWidth: 1, paddingBottom: 10 },
  input: { flex: 1, height: 40, borderRadius: 20, paddingHorizontal: 15 },
  sendButton: { marginLeft: 10, padding: 5 },
});