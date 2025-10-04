import { TabBarIcon } from '@/components/navigation/TabBarIcon';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Tabs } from 'expo-router';
import React, { useEffect } from 'react';
import { Platform } from 'react-native';

// --- YENİ IMPORT'LAR ---
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '../../firebaseConfig';

// Bildirim geldiğinde telefonun nasıl davranacağını belirleyen ayar
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true, 
    shouldShowList: true,
  }),
});

// --- YENİ FONKSİYON ---
async function registerForPushNotificationsAsync() {
  let token;

  // Android için özel bildirim kanalı ayarı
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
  }

  // Bildirimler sadece gerçek cihazlarda çalışır, emülatörlerde/simülatörlerde değil.
  if (!Device.isDevice) {
    console.log("Push notifications only work on physical devices.");
    return;
  }
  
  // Kullanıcıdan bildirim izni istiyoruz.
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== 'granted') {
    console.log('Failed to get push token for push notification!');
    return;
  }

  // Cihaza özel benzersiz Expo Push Token'ı alıyoruz.
  try {
    const pushToken = (await Notifications.getExpoPushTokenAsync({
      // Bu ID, app.json dosyasındaki extra.eas.projectId değeridir.
      projectId: 'b0df4857-9969-4eff-9737-3e31e786d11c',
    })).data;
    token = pushToken;
    console.log("Expo Push Token:", token);
  } catch (e) {
      console.error("Token alınırken hata:", e);
  }
  
  // Aldığımız token'ı Firestore'daki kullanıcı profiline kaydediyoruz.
  if (token) {
    const user = auth.currentUser;
    if (user) {
      const userDocRef = doc(db, 'users', user.uid);
      await setDoc(userDocRef, { pushToken: token }, { merge: true });
    }
  }

  return token;
}


export default function TabLayout() {
  const colorScheme = useColorScheme();

  // Bu component (yani sekmeli yapı) ekrana geldiğinde bildirim kaydını başlat.
  useEffect(() => {
    registerForPushNotificationsAsync();
  }, []);

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colorScheme === 'light' ? '#000000' : '#FFFFFF',
        headerShown: false,
      }}>
        {/* Sekmelerin geri kalanı aynı */}
      <Tabs.Screen
        name="index"
        options={{ title: 'Profil', tabBarIcon: ({ color, focused }) => (<TabBarIcon name={focused ? 'person' : 'person-outline'} color={color} />), }}
      />
      <Tabs.Screen
        name="search"
        options={{ title: 'Ara', tabBarIcon: ({ color, focused }) => (<TabBarIcon name={focused ? 'search' : 'search-outline'} color={color} />), }}
      />
      <Tabs.Screen
        name="explore"
        options={{ title: 'Keşfet', tabBarIcon: ({ color, focused }) => (<TabBarIcon name={focused ? 'map' : 'map-outline'} color={color} />), }}
      />
      <Tabs.Screen
        name="messages"
        options={{ title: 'Mesajlar', tabBarIcon: ({ color, focused }) => (<TabBarIcon name={focused ? 'chatbubbles' : 'chatbubbles-outline'} color={color} />), }}
      />
    </Tabs>
  );
}