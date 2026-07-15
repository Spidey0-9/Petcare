import { ReactNode } from 'react';
import { SafeAreaView, ScrollView, StyleSheet, View, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, gradients } from '../theme/colors';

type Props = {
  children: ReactNode;
  scroll?: boolean;
  contentStyle?: ViewStyle;
};

export function AppScreen({ children, scroll = true, contentStyle }: Props) {
  const content = scroll ? (
    <ScrollView contentContainerStyle={[styles.content, contentStyle]} showsVerticalScrollIndicator={false}>
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.staticContent, contentStyle]}>{children}</View>
  );

  return (
    <SafeAreaView style={styles.safe}>
      <LinearGradient colors={gradients.app} style={StyleSheet.absoluteFillObject} />
      <View style={styles.glowOne} />
      <View style={styles.glowTwo} />
      {content}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
    overflow: 'hidden',
  },
  content: {
    padding: 20,
    paddingBottom: 36,
  },
  staticContent: {
    flex: 1,
  },
  glowOne: {
    position: 'absolute',
    top: -80,
    right: -70,
    width: 190,
    height: 190,
    borderRadius: 95,
    backgroundColor: 'rgba(20,184,166,0.16)',
  },
  glowTwo: {
    position: 'absolute',
    bottom: -90,
    left: -80,
    width: 210,
    height: 210,
    borderRadius: 105,
    backgroundColor: 'rgba(16,185,129,0.14)',
  },
});
