import { computed, signal } from '@angular/core';

export interface VariantSelectionApi {
  selectedSize: ReturnType<typeof signal<string | null>>;
  selectedColor: ReturnType<typeof signal<string | null>>;
  attempted: ReturnType<typeof signal<boolean>>;
  canAdd: ReturnType<typeof computed<boolean>>;
  toggleSize: (size: string) => void;
  toggleColor: (color: string) => void;
  markAttempted: () => void;
  reset: () => void;
}

export function useVariantSelection(): VariantSelectionApi {
  const selectedSize = signal<string | null>(null);
  const selectedColor = signal<string | null>(null);
  const attempted = signal(false);

  const canAdd = computed(() => !!selectedSize() && !!selectedColor());

  const toggle = (sig: ReturnType<typeof signal<string | null>>, value: string) => {
    sig.set(sig() === value ? null : value);
  };

  return {
    selectedSize,
    selectedColor,
    attempted,
    canAdd,
    toggleSize: (size: string) => toggle(selectedSize, size),
    toggleColor: (color: string) => toggle(selectedColor, color),
    markAttempted: () => attempted.set(true),
    reset: () => {
      selectedSize.set(null);
      selectedColor.set(null);
      attempted.set(false);
    },
  };
}
