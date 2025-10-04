import { Link } from 'expo-router';
import { collection, getDocs, limit, query, where } from 'firebase/firestore';
import React, { useState } from 'react';
import { ActivityIndicator, FlatList, Image, StyleSheet, Text, TextInput, TouchableOpacity, useColorScheme } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { db } from '../../firebaseConfig';

interface SearchedUser {
  uid: string;
  username: string;
  profilePictureUrl?: string;
}

export default function SearchScreen() {
  const colorScheme = useColorScheme();
  const [searchText, setSearchText] = useState('');
  const [users, setUsers] = useState<SearchedUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const handleSearch = async () => {
    if (searchText.trim() === '') {
      setUsers([]);
      return;
    }
    setLoading(true);
    setSearched(true);

    const usersRef = collection(db, 'users');
    const q = query(
      usersRef,
      where('username', '>=', searchText.toLowerCase()),
      where('username', '<=', searchText.toLowerCase() + '\uf8ff'),
      limit(10)
    );

    const querySnapshot = await getDocs(q);
    const foundUsers: SearchedUser[] = [];
    querySnapshot.forEach((doc) => {
      foundUsers.push({ uid: doc.id, ...doc.data() } as SearchedUser);
    });

    setUsers(foundUsers);
    setLoading(false);
  };

  const inputStyle = {
    color: colorScheme === 'dark' ? '#FFF' : '#000',
    borderColor: colorScheme === 'dark' ? '#555' : '#CCC',
    backgroundColor: colorScheme === 'dark' ? '#1C1C1E' : '#FFF',
  };
  const textColor = { color: colorScheme === 'dark' ? '#FFF' : '#000' };

  return (
    <SafeAreaView style={styles.container}>
      <TextInput
        style={[styles.searchInput, inputStyle]}
        placeholder="Kullanıcı adı ara..."
        placeholderTextColor="gray"
        value={searchText}
        onChangeText={setSearchText}
        onSubmitEditing={handleSearch}
        autoCapitalize="none"
      />
      {loading ? (
        <ActivityIndicator size="large" style={{ marginTop: 20 }} />
      ) : (
        <FlatList
          data={users}
          keyExtractor={(item) => item.uid}
          renderItem={({ item }) => (
            <Link href={`/users/${item.uid}`} asChild>
              <TouchableOpacity style={styles.resultItem}>
                <Image 
                  source={{ uri: item.profilePictureUrl || 'https://placehold.co/50x50' }} 
                  style={styles.resultImage} 
                />
                <Text style={[styles.resultText, textColor]}>{item.username}</Text>
              </TouchableOpacity>
            </Link>
          )}
          ListEmptyComponent={() => (
            searched && !loading ? <Text style={styles.emptyText}>Sonuç bulunamadı.</Text> : null
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 24,
    paddingHorizontal: 16,
  },
  searchInput: {
    height: 50,
    borderWidth: 1,
    paddingHorizontal: 16,
    borderRadius: 8,
    fontSize: 16,
    marginBottom: 16,
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  resultImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 16,
  },
  resultText: {
    fontSize: 18,
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 20,
    color: 'gray',
  },
});