import { StyleSheet, Text, View } from '@/components/base_components';
import TextButton from '@/components/buttons/text_button';
import type { StyleProps } from '@/components/buttons/button_style';

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'var(--row-border)',
    paddingBottom: '0.4rem',
    marginBottom: '0.4rem',
  },
  title: {
    color: 'var(--text-muted)',
    fontSize: '1.4rem',
    fontWeight: '600',
    textTransform: 'uppercase',
  },
});

interface Props {
  title: string;
  buttonText?: string;
  buttonType?: StyleProps['type'];
  onPress?: () => void;
}

export default function SectionHeader({
  title,
  buttonText,
  buttonType,
  onPress,
}: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      {buttonText !== undefined && onPress !== undefined && (
        <TextButton
          text={buttonText}
          type={buttonType ?? 'default'}
          onPress={onPress}
        />
      )}
    </View>
  );
}
