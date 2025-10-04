import { Stack } from 'expo-router';

export default function UsersLayout() {
  // Bu layout dosyası, /users klasörü içindeki tüm ekranların
  // navigasyonunu kontrol eder.
  // headerShown: false diyerek, o çirkin varsayılan başlığı
  // bu gruptaki tüm ekranlar için gizliyoruz.
  return <Stack screenOptions={{ headerShown: false }} />;
}
