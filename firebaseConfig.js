import AsyncStorage from '@react-native-async-storage/async-storage';
import { initializeApp } from "firebase/app";
import { getReactNativePersistence, initializeAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Firebase'den kopyaladığın ve senin projen için DOĞRU olan veriler
const firebaseConfig = {
  apiKey: "AIzaSyBgkOEp1EpkQU2GGyXTltHDjjAMkgJcMiM",
  authDomain: "echo-b8393.firebaseapp.com",
  projectId: "echo-b8393",
  storageBucket: "echo-b8393.firebasestorage.app", // DİKKAT: Senin düzelttiğin ve doğru olan adres bu.
  messagingSenderId: "167698431220",
  appId: "1:167698431220:web:46e3ae50559dda5f2f32a1",
  measurementId: "G-R3YRCCB6T0"
};

const app = initializeApp(firebaseConfig);

// Kalıcı girişi sağlayan doğru yapı
export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage)
});

// Diğer servisler
export const db = getFirestore(app);
export const storage = getStorage(app);