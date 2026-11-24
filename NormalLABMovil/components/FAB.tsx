import { Pressable, StyleSheet, Text } from 'react-native';

interface Props {
  label: string;
  position?: 'left' | 'right';
  onPress?: () => void;
  onLongPress?: () => void;
}

export default function FAB({ label, position = 'right', onPress, onLongPress }: Props) {
  return (
    <Pressable
      // Pressable entrega un objeto { pressed }: hay que desestructurarlo.
      style={({ pressed }) => [
        styles.floattingButton,
        position === 'right' ? styles.positionRight : styles.positionLeft,
        { opacity: pressed ? 0.7 : 1 },
      ]}
      onPress={onPress}
      onLongPress={onLongPress}
    >
      <Text style={{ color: 'white', fontSize: 20 }}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  floattingButton: {
    position: 'absolute',
    bottom: 20,
    backgroundColor: '#007AFF',
    borderRadius: 15,
    paddingVertical: 12,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  positionRight: { right: 20 },
  positionLeft: { left: 20 },
});
