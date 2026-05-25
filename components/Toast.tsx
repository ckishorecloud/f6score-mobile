import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';

interface ToastProps {
  message: string;
  visible: boolean;
  color?: string;
}

export function Toast({ message, visible, color = '#00cccc' }: ToastProps) {
  const translateY = useRef(new Animated.Value(80)).current;
  const opacity    = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(translateY, { toValue: 0,  duration: 280, useNativeDriver: true }),
        Animated.timing(opacity,    { toValue: 1,  duration: 280, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(translateY, { toValue: 80, duration: 220, useNativeDriver: true }),
        Animated.timing(opacity,    { toValue: 0,  duration: 220, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.toast, { borderColor: color, transform: [{ translateY }], opacity }]}
    >
      <Text style={styles.text}>{message}</Text>
    </Animated.View>
  );
}

// Hook to manage toast state
import { useState, useCallback } from 'react';

export function useToast() {
  const [state, setState] = useState({ visible: false, message: '', color: '#00cccc' });
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = useCallback((message: string, color = '#00cccc') => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setState({ visible: true, message, color });
    timerRef.current = setTimeout(() => setState(s => ({ ...s, visible: false })), 2600);
  }, []);

  return { toastState: state, showToast: show };
}

const styles = StyleSheet.create({
  toast: {
    position: 'absolute',
    bottom: 90,
    alignSelf: 'center',
    backgroundColor: '#16181f',
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 20,
    zIndex: 9999,
  },
  text: {
    fontFamily: 'Montserrat_500Medium',
    fontSize: 13,
    color: '#eef0f5',
    textAlign: 'center',
  },
});
