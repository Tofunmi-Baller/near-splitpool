const CATEGORY_EMOJIS: Record<string, string> = {
  groceries: '\u{1F6D2}',
  rent: '\u{1F3E0}',
  utilities: '⚡',
  transport: '\u{1F697}',
  food: '\u{1F355}',
  entertainment: '\u{1F3AC}',
  supplies: '\u{1F4E6}',
  deposit: '\u{1F4B0}',
  settlement: '\u{1F91D}',
  other: '\u{1F4B3}',
};

interface CategoryIconProps {
  category: string;
  className?: string;
}

export default function CategoryIcon({ category, className = '' }: CategoryIconProps) {
  const emoji = CATEGORY_EMOJIS[category?.toLowerCase()] || CATEGORY_EMOJIS.other;
  return <span className={`text-lg ${className}`}>{emoji}</span>;
}

export function getCategoryEmoji(category: string): string {
  return CATEGORY_EMOJIS[category?.toLowerCase()] || CATEGORY_EMOJIS.other;
}
