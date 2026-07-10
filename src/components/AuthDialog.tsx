/**
 * AuthDialog — Professional animated success/error/info modal.
 * Replaces all alert() calls in auth flows.
 *
 * Usage:
 *   const [dialog, setDialog] = useAuthDialog();
 *   setDialog({ type: 'success', title: 'Done', message: 'Profile saved.', onDismiss: () => ... });
 *   <AuthDialog {...dialog} />
 */

import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors } from '../core/theme/colors';

// ── Types ────────────────────────────────────────────────────────────────────

export type DialogType = 'success' | 'error' | 'info' | 'warning';

export type AuthDialogProps = {
  visible: boolean;
  type: DialogType;
  title: string;
  message?: string;
  confirmLabel?: string;
  onConfirm?: () => void;
  onDismiss?: () => void;
  /** Auto-dismiss after this many ms (0 = never) */
  autoDismissMs?: number;
};

// ── Meta ─────────────────────────────────────────────────────────────────────

const META: Record<DialogType, { icon: keyof typeof MaterialCommunityIcons.glyphMap; color: string; bg: string }> = {
  success: { icon: 'check-circle',    color: colors.success,  bg: '#DCFCE7' },
  error:   { icon: 'alert-circle',    color: colors.danger,   bg: '#FEE2E2' },
  warning: { icon: 'alert',           color: '#FF8F00',        bg: '#FFF3E0' },
  info:    { icon: 'information',     color: colors.primary,   bg: '#F0EEFF' },
};

// ── Component ─────────────────────────────────────────────────────────────────

export function AuthDialog({
  visible,
  type,
  title,
  message,
  confirmLabel = 'OK',
  onConfirm,
  onDismiss,
  autoDismissMs = 0,
}: AuthDialogProps) {
  const scaleAnim   = useRef(new Animated.Value(0.8)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const iconScale   = useRef(new Animated.Value(0)).current;
  const meta        = META[type];

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(scaleAnim,   { toValue: 1,   friction: 7, tension: 80, useNativeDriver: true }),
        Animated.timing(opacityAnim, { toValue: 1,   duration: 220,            useNativeDriver: true }),
        Animated.spring(iconScale,   { toValue: 1,   friction: 5, tension: 100,delay: 100, useNativeDriver: true }),
      ]).start();

      if (autoDismissMs > 0) {
        const t = setTimeout(() => handleDismiss(), autoDismissMs);
        return () => clearTimeout(t);
      }
    } else {
      scaleAnim.setValue(0.8);
      opacityAnim.setValue(0);
      iconScale.setValue(0);
    }
  }, [visible]);

  function handleDismiss() {
    if (onDismiss) onDismiss();
    else if (onConfirm) onConfirm();
  }

  function handleConfirm() {
    if (onConfirm) onConfirm();
    else handleDismiss();
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={handleDismiss}
    >
      <Pressable style={styles.overlay} onPress={handleDismiss}>
        <Animated.View
          style={[styles.card, { opacity: opacityAnim, transform: [{ scale: scaleAnim }] }]}
          // prevent tap-through
          onStartShouldSetResponder={() => true}
        >
          {/* Icon */}
          <Animated.View
            style={[styles.iconWrap, { backgroundColor: meta.bg, transform: [{ scale: iconScale }] }]}
          >
            <MaterialCommunityIcons name={meta.icon} size={48} color={meta.color} />
          </Animated.View>

          {/* Text */}
          <Text style={styles.title}>{title}</Text>
          {!!message && <Text style={styles.message}>{message}</Text>}

          {/* Button */}
          <Pressable
            style={[styles.button, { backgroundColor: meta.color }]}
            onPress={handleConfirm}
            android_ripple={{ color: 'rgba(255,255,255,0.3)' }}
          >
            <Text style={styles.buttonText}>{confirmLabel}</Text>
          </Pressable>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export type DialogState = Omit<AuthDialogProps, 'visible'>;

const HIDDEN: AuthDialogProps = {
  visible: false,
  type: 'info',
  title: '',
};

export function useAuthDialog(): [AuthDialogProps, (state: DialogState | null) => void] {
  const [state, setState] = React.useState<AuthDialogProps>(HIDDEN);

  function show(next: DialogState | null) {
    if (!next) {
      setState(HIDDEN);
    } else {
      setState({ ...next, visible: true });
    }
  }

  return [state, show];
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: colors.surface,
    borderRadius: 28,
    padding: 28,
    alignItems: 'center',
    gap: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 16,
  },
  iconWrap: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '900',
    color: colors.text,
    textAlign: 'center',
  },
  message: {
    fontSize: 14,
    color: colors.muted,
    textAlign: 'center',
    lineHeight: 21,
  },
  button: {
    marginTop: 6,
    width: '100%',
    paddingVertical: 15,
    borderRadius: 16,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '900',
  },
});
