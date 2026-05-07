import { StyleSheet } from '../base_components';
import ImageButton from './image_button';
import type { StyleInput } from '../base_components';
import { styles, getButtonStyles } from './button_style';
import type { StyleProps } from './button_style';

const iconStyles = StyleSheet.create({
  button: { width: '2.8rem' },
  image: {
    position: 'absolute',
    top: '0.5rem',
    left: '0.5rem',
    right: '0.5rem',
    bottom: '0.5rem',
  },
});

interface Props extends StyleProps {
  source: string;
  style?: StyleInput;
  onPress: () => void;
  underlayColor?: string;
}

export default function IconButton(props: Props) {
  const { source, style, onPress, underlayColor } = props;
  const { button_extra } = getButtonStyles(props);

  return (
    <ImageButton
      style={[styles.textButton, button_extra, iconStyles.button, style]}
      imageStyle={iconStyles.image}
      source={source}
      onPress={onPress}
      {...(underlayColor !== undefined ? { underlayColor } : {})}
    />
  );
}
