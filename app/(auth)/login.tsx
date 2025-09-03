import { Link, router } from 'expo-router';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { useState } from 'react';
import { Alert, Button, StyleSheet, Text, TextInput, useColorScheme, View } from 'react-native';
import { auth } from '../../firebaseConfig';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const colorScheme = useColorScheme(); // Cihazın renk modunu (light/dark) alıyoruz

  const handleLogin = () => {
    signInWithEmailAndPassword(auth, email, password)
      .then((userCredential) => {
        router.replace('/(tabs)/explore');
      })
      .catch((error) => {
        Alert.alert('Hata', 'E-posta veya şifre hatalı.');
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
      <Text style={styles.title}>Giriş Yap</Text>
      
      <Text style={[styles.label, labelStyle]}>E-posta</Text>
      <TextInput
        style={[styles.input, textInputStyle]}
        placeholder="example@eposta.com"
        placeholderTextColor="gray" // Placeholder rengini sabitliyoruz
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />

      <Text style={[styles.label, labelStyle]}>Şifre</Text>
      <TextInput
        style={[styles.input, textInputStyle]}
        placeholder="••••••••"
        placeholderTextColor="gray" // Placeholder rengini sabitliyoruz
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />

      <View style={styles.buttonContainer}>
        <Button title="Giriş Yap" onPress={handleLogin} />
      </View>

      <Link href="/(auth)/signup" style={styles.linkContainer}>
        <Text style={styles.linkText}>Hesabın yok mu? Kayıt Ol</Text>
      </Link>
    </View>
  );
}

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
    color: '#888' // Rengi temanın etkilememesi için sabitliyoruz
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