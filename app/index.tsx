import { router } from 'expo-router';
import { onAuthStateChanged } from 'firebase/auth';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { auth } from '../firebaseConfig'; // Dikkat: Dosya yolunu kontrol et

export default function StartPage() {
  useEffect(() => {
    // onAuthStateChanged, kullanıcının giriş durumunu dinleyen bir yapıdır.
    // Uygulama açıldığında veya giriş/çıkış yapıldığında otomatik olarak çalışır.
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      // Bir 'user' nesnesi varsa, kullanıcı giriş yapmış demektir.
      if (user) {
        // Kullanıcıyı sekmelerin olduğu ana ekrana yönlendir.
        // `replace` kullanıyoruz ki geri tuşuna basınca bu boş ekrana dönmesin.
        router.replace('/(tabs)/explore');
      } else {
        // 'user' nesnesi yoksa, kullanıcı giriş yapmamış demektir.
        // Kullanıcıyı giriş ekranına yönlendir.
        router.replace('/(auth)/login');
      }
    });

    // Bu component ekrandan kaldırıldığında listener'ı temizle.
    return () => unsubscribe();
  }, []);

  // Yönlendirme yapılırken ekranda bir yüklenme animasyonu göster.
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator size="large" />
    </View>
  );
}