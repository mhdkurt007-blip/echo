import { Stack } from 'expo-router';
import React from 'react';

export default function AuthLayout() {
  return (
    <Stack
      // Bu gruptaki TÜM ekranların başlığını gizlemek için screenOptions kullan
      screenOptions={{
        headerShown: false,
      }}
    />
    // Not: Bu gruptaki ekranlara (login, signin vb.) özel başka ayarlar
    // yapmayacaksan, içine ayrıca <Stack.Screen> tanımlamana gerek yok.
    // screenOptions tümü için bu ayarı otomatik yapar.
  );
}