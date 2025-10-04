import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { doc, getDoc, setDoc } from 'firebase/firestore'; // updateDoc'u setDoc ile değiştirdik
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Button, Image, StyleSheet, Text, TextInput, TouchableOpacity, useColorScheme, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { auth, db, storage } from '../firebaseConfig';

export default function EditProfileScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [imageUri, setImageUri] = useState<string | null>(null);

  useEffect(() => {
    const loadCurrentUserProfile = async () => {
      const user = auth.currentUser;
      if (!user) {
        router.back();
        return;
      }
      const userDocRef = doc(db, 'users', user.uid);
      const userDocSnap = await getDoc(userDocRef);

      if (userDocSnap.exists()) {
        const data = userDocSnap.data();
        setUsername(data.username);
        setBio(data.bio);
        setImageUri(data.profilePictureUrl || null);
      }
      setLoading(false);
    };

    loadCurrentUserProfile();
  }, []);

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Üzgünüz, galeriye erişim izni gerekiyor!');
      return;
    }

    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images, // UYARI DÜZELTİLDİ
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });

    if (!result.canceled) {
      setImageUri(result.assets[0].uri);
    }
  };
  
  const uploadImage = async (uri: string): Promise<string> => {
    const response = await fetch(uri);
    const blob = await response.blob();
    const user = auth.currentUser;
    if (!user) throw new Error("Kullanıcı bulunamadı");
    
    const storageRef = ref(storage, `profilePictures/${user.uid}`);
    await uploadBytes(storageRef, blob);
    
    return await getDownloadURL(storageRef);
  };

  const handleSave = async () => {
    setSaving(true);
    const user = auth.currentUser;
    if (!user) {
      setSaving(false);
      return;
    }

    try {
      let newProfilePictureUrl = imageUri;
      if (imageUri && imageUri.startsWith('file://')) {
        newProfilePictureUrl = await uploadImage(imageUri);
      }

      const userDocRef = doc(db, 'users', user.uid);
      
      // HEM OLUŞTURMA HEM DE GÜNCELLEME İÇİN EN İYİ YÖNTEM
      await setDoc(userDocRef, {
        username: username,
        bio: bio,
        profilePictureUrl: newProfilePictureUrl,
        email: user.email // E-postayı da profile ekliyoruz
      }, { merge: true }); // merge:true, var olan alanlara dokunmaz, sadece yenileri ekler/değiştirir.

      Alert.alert("Başarılı", "Profiliniz güncellendi.");
      router.back();
    } catch (error) {
      console.error("Profil güncellenirken hata:", error);
      Alert.alert("Hata", "Profil güncellenirken bir sorun oluştu.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <View style={styles.container}><ActivityIndicator size="large" /></View>;
  }

  const labelStyle = { color: colorScheme === 'dark' ? '#EEE' : '#333' };
  const inputStyle = {
    color: colorScheme === 'dark' ? '#FFF' : '#000',
    borderColor: colorScheme === 'dark' ? '#555' : '#CCC',
    backgroundColor: colorScheme === 'dark' ? '#1C1C1E' : '#FFF',
  };

  return (
    <SafeAreaView style={styles.container}>
      <TouchableOpacity onPress={pickImage}>
        <Image
          source={{ uri: imageUri || 'https://placehold.co/150x150/000000/FFFFFF?text=Resim+Seç' }}
          style={styles.profileImage}
        />
        <Text style={styles.changePhotoText}>Değiştir</Text>
      </TouchableOpacity>
      
      <Text style={[styles.label, labelStyle]}>Kullanıcı Adı</Text>
      <TextInput
        style={[styles.input, inputStyle]}
        value={username}
        onChangeText={setUsername}
        placeholder="Kullanıcı adınız"
        placeholderTextColor="gray"
      />

      <Text style={[styles.label, labelStyle]}>Hakkında</Text>
      <TextInput
        style={[styles.input, styles.bioInput, inputStyle]}
        value={bio}
        onChangeText={setBio}
        placeholder="Kendinizden bahsedin"
        placeholderTextColor="gray"
        multiline
      />

      <View style={styles.buttonContainer}>
        {saving ? (
          <ActivityIndicator size="large" color="#007AFF" />
        ) : (
          <Button title="Kaydet" onPress={handleSave} />
        )}
      </View>
     </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    alignItems: 'center',
  },
  profileImage: {
    width: 150,
    height: 150,
    borderRadius: 75,
    marginBottom: 10,
    backgroundColor: '#333',
  },
  changePhotoText: {
    color: '#007AFF',
    textAlign: 'center',
    marginBottom: 20,
    fontSize: 16,
  },
  label: {
    alignSelf: 'flex-start',
    fontSize: 16,
    marginBottom: 8,
  },
  input: {
    width: '100%',
    height: 50,
    borderWidth: 1,
    paddingHorizontal: 16,
    borderRadius: 8,
    fontSize: 16,
    marginBottom: 20,
  },
  bioInput: {
    height: 100,
    textAlignVertical: 'top',
    paddingTop: 16,
  },
  buttonContainer: {
    width: '100%',
    marginTop: 'auto',
  },
});
