import React, { useRef, useState } from 'react';
import {
  Animated,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors } from '../../core/theme/colors';

interface SearchBarProps {
  onSearch?: (query: string) => void;
  onVoice?: () => void;
}

export function SearchBar({ onSearch, onVoice }: SearchBarProps) {
  const [query, setQuery] = useState('');
  const [focused, setFocused] = useState(false);
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handleFocus = () => {
    setFocused(true);
    Animated.spring(scaleAnim, { toValue: 1.02, useNativeDriver: true, friction: 8 }).start();
  };

  const handleBlur = () => {
    setFocused(false);
    Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, friction: 8 }).start();
  };

  return (
    <Animated.View style={[styles.wrapper, { transform: [{ scale: scaleAnim }] }]}> 
      <View style={[styles.inputRow, focused && styles.inputRowFocused]}>
        <MaterialCommunityIcons name="magnify" size={22} color={focused ? colors.primary : colors.muted} />
        <TextInput
          style={styles.input}
          placeholder="Search PetCare+"
          placeholderTextColor={colors.muted}
          value={query}
          onChangeText={setQuery}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onSubmitEditing={() => onSearch?.(query)}
          returnKeyType="search"
        />
        {query.length > 0 && (
          <Pressable onPress={() => setQuery('')}>
            <MaterialCommunityIcons name="close-circle" size={18} color={colors.muted} />
          </Pressable>
        )}
        <Pressable onPress={onVoice} style={[styles.voiceBtn, { backgroundColor: colors.primary + '15' }]}> 
          <MaterialCommunityIcons name="microphone" size={18} color={colors.primary} />
        </Pressable>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: { marginBottom: 16, zIndex: 10 },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
    borderWidth: 1.5,
    borderColor: colors.line,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  inputRowFocused: { borderColor: colors.primary },
  input: { flex: 1, fontSize: 14, fontWeight: '600', color: colors.text },
  voiceBtn: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
});
