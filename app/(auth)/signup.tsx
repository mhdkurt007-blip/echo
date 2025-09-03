import { Link, router } from 'expo-router';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { useState } from 'react';
import { Alert, Button, StyleSheet, Text, TextInput, useColorScheme, View } from 'react-native';
import { auth } from '../../firebaseConfig';

export default function SignUpScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const colorScheme = useColorScheme(); // Cihazın renk modunu (light/dark) alıyoruz

  const handleSignUp = () => {
    // Şifre uzunluğu kontrolü gibi basit doğrulamalar ekleyebilirsiniz.
    if (password.length < 6) {
      Alert.alert('Hata', 'Şifreniz en az 6 karakter olmalıdır.');
      return;
    }

    createUserWithEmailAndPassword(auth, email, password)
      .then((userCredential) => {
        Alert.alert('Başarılı!', 'Hesabınız oluşturuldu. Ana ekrana yönlendiriliyorsunuz.');
        router.replace('/(tabs)/explore');
      })
      .catch((error) => {
        // Firebase'den gelen hata mesajlarını daha anlaşılır hale getirebiliriz.
        if (error.code === 'auth/email-already-in-use') {
          Alert.alert('Hata', 'Bu e-posta adresi zaten kullanılıyor.');
        } else {
          Alert.alert('Hata', error.message);
        }
      });
  };
  
  // Dinamik stiller oluşturuyoruz. Arka plan koyu ise yazı beyaz, açık ise siyah olacak.
  const textInputStyle = {
    color: colorScheme === 'dark' ? '#FFF' : '#000',
    borderColor: colorScheme === 'dark' ? '#555' : '#CCC',
  };

  const labelStyle = {
    color: colorScheme === 'dark' ? '#EEE' : '#333',
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Hesap Oluştur</Text>
      
      <Text style={[styles.label, labelStyle]}>E-posta</Text>
      <TextInput
        style={[styles.input, textInputStyle]}
        placeholder="example@eposta.com"
        placeholderTextColor="gray"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />

      <Text style={[styles.label, labelStyle]}>Şifre</Text>
      <TextInput
        style={[styles.input, textInputStyle]}
        placeholder="En az 6 karakter"
        placeholderTextColor="gray"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />

      <View style={styles.buttonContainer}>
        <Button title="Kayıt Ol" onPress={handleSignUp} />
      </View>

      <Link href="/(auth)/login" style={styles.linkContainer}>
        <Text style={styles.linkText}>Zaten bir hesabın var mı? Giriş Yap</Text>
      </Link>
    </View>
  );
}

// Stiller login.tsx dosyasıyla aynı
const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 32,
    textAlign: 'center',
    color: '#888'
  },
  label: {
    fontSize: 16,
    marginBottom: 8,
  },
  input: {
    height: 50,
    borderWidth: 1,
    marginBottom: 16,
    paddingHorizontal: 16,
    borderRadius: 8,
    fontSize: 16,
  },
  buttonContainer: {
    marginTop: 8,
  },
  linkContainer: {
    marginTop: 24,
    alignItems: 'center',
  },
  linkText: {
    color: '#007AFF',
    fontSize: 16,
  },
});