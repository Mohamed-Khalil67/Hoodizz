import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';

export type VariantKind = 'size' | 'color';

@Component({
  selector: 'app-variant-selector',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <fieldset class="variant-selector" [attr.aria-label]="kind() + ' selection'">
      <legend class="variant-selector__label">
        {{ label() }}
        @if (showError()) {
          <span class="variant-selector__error">required</span>
        }
      </legend>
      <div class="variant-selector__options" role="radiogroup">
        @for (option of options(); track option) {
          <button
            type="button"
            class="variant-selector__option"
            [class.is-selected]="option === selected()"
            [class.is-swatch]="kind() === 'color'"
            [attr.role]="'radio'"
            [attr.aria-checked]="option === selected()"
            [attr.aria-label]="option"
            [style.background]="kind() === 'color' ? option : null"
            (click)="onSelect(option)"
          >
            @if (kind() === 'size') {
              {{ option }}
            }
          </button>
        }
      </div>
    </fieldset>
  `,
  styleUrl: './variant-selector.scss',
})
export class VariantSelector {
  readonly kind = input.required<VariantKind>();
  readonly options = input.required<string[]>();
  readonly selected = input<string | null>(null);
  readonly showError = input<boolean>(false);

  readonly selectionChange = output<string | null>();

  readonly label = computed(() =>
    this.kind() === 'size' ? 'Size' : 'Color',
  );

  onSelect(option: string) {
    this.selectionChange.emit(this.selected() === option ? null : option);
  }
}
