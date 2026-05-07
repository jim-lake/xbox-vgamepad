import ImageButton from './image_button';
import type { StyleInput } from '../base_components';
import { styles, getButtonStyles } from './button_style';
import type { StyleProps } from './button_style';

interface Props extends StyleProps {
  source: string;
  style?: StyleInput;
  imageStyle?: StyleInput;
  onPress: () => void;
  underlayColor?: string;
}

export default function IconButton(props: Props) {
  const { source, style, imageStyle, onPress, underlayColor } = props;
  const { button_extra } = getButtonStyles(props);

  return (
    <ImageButton
      style={[styles.textButton, button_extra, { width: '2.8rem' }, style]}
      imageStyle={imageStyle}
      source={source}
      onPress={onPress}
      underlayColor={underlayColor}
    />
  );
}
