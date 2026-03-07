/**
 * Распаковка JsonNullable из OpenAPI/Jackson.
 * Без JsonNullableModule бэкенд сериализует как {present: true, value: "..."}.
 * Эта функция извлекает значение для безопасного рендеринга.
 */
export function unwrapJsonNullable<T>(
  val: T | { present?: boolean; value?: T } | null | undefined
): T | undefined {
  if (val == null) return undefined;
  if (typeof val === 'object' && 'present' in val) {
    const obj = val as { present?: boolean; value?: T };
    return obj.present ? obj.value : undefined;
  }
  return val as T;
}
