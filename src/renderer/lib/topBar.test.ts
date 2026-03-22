import { describe, expect, it } from 'vitest';
import { isVisibleTopBarAction } from './topBar';

describe('isVisibleTopBarAction', () => {
  it('defaults actions to visible when the flag is omitted', () => {
    expect(
      isVisibleTopBarAction({
        id: 'save',
        label: 'Save',
        onSelect: () => {},
        variant: 'primary',
      }),
    ).toBe(true);
  });

  it('hides actions when explicitly marked invisible', () => {
    expect(
      isVisibleTopBarAction({
        id: 'delete',
        label: 'Delete',
        onSelect: () => {},
        variant: 'danger',
        visible: false,
      }),
    ).toBe(false);
  });
});
