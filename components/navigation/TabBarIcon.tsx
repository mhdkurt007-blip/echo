import { Ionicons } from '@expo/vector-icons';
import { StyleSheet } from 'react-native';

// Karmaşık tip tanımları yerine basit bir arayüz kullanıyoruz.
interface TabBarIconProps {
  name: React.ComponentProps<typeof Ionicons>['name'];
  color: string;
  focused?: boolean; // focused prop'unu da ekleyelim
}

export function TabBarIcon({ name, color }: TabBarIconProps) {
  return <Ionicons size={28} style={styles.tabBarIcon} name={name} color={color} />;
}

const styles = StyleSheet.create({
  tabBarIcon: {
    marginBottom: -3,
  },
});