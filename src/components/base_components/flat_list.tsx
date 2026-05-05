import React from 'react';
import { StyleSheet, type StyleInput } from './styles';
import { ScrollView } from './views';

interface SeparatorsType {
  highlight: () => void;
  unhighlight: () => void;
  updateProps: () => void;
}

interface RenderItemInfo<T> {
  item: T;
  index: number;
  separators: SeparatorsType;
}

interface FlatListProps<T> {
  data?: T[];
  inverted?: boolean;
  renderItem: (info: RenderItemInfo<T>) => React.ReactNode;
  contentContainerStyle?: StyleInput;
  keyExtractor?: (item: T, index: number) => string;
  ListHeaderComponent?: React.ReactNode;
  ListEmptyComponent?: React.ReactNode;
  ListFooterComponent?: React.ReactNode;
  style?: StyleInput;
}

const styles = StyleSheet.create({
  flatList: { flexDirection: 'column' },
  innerList: { flex: 1, alignSelf: 'stretch', flexDirection: 'column' },
  innerListInverted: {
    flex: 1,
    alignSelf: 'stretch',
    flexDirection: 'column-reverse',
  },
});

export function FlatList<T>(props: FlatListProps<T>) {
  const { data } = props;
  const { inverted } = props;
  const { renderItem } = props;
  const keyExtractor: (item: T, index: number) => string =
    props.keyExtractor ?? _keyExtractor;
  const ListHeaderComponent = props.ListHeaderComponent ?? null;
  const ListEmptyComponent = props.ListEmptyComponent ?? null;
  const ListFooterComponent = props.ListFooterComponent ?? null;
  const inner_style = inverted ? styles.innerListInverted : styles.innerList;
  const elements =
    data && data.length > 0
      ? data.map((item, index) => {
          const obj = renderItem({
            item,
            index,
            separators: {
              highlight: _noop,
              unhighlight: _noop,
              updateProps: _noop,
            },
          });
          const key = keyExtractor(item, index);
          return <React.Fragment key={key}>{obj}</React.Fragment>;
        })
      : ListEmptyComponent;

  return (
    <ScrollView
      style={[styles.flatList, props.style]}
      contentContainerStyle={[props.contentContainerStyle, inner_style]}
    >
      {ListHeaderComponent}
      {elements}
      {ListFooterComponent}
    </ScrollView>
  );
}
function _keyExtractor(item: unknown, index: number): string {
  return (
    (item as { key?: string | number }).key?.toString() ?? index.toString()
  );
}
function _noop(): void {
  // No operation needed
}
