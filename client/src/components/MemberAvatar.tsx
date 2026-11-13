import { getInitials } from '../lib/utils';

interface MemberAvatarProps {
  name: string;
  color: string;
  size?: 'sm' | 'md' | 'lg';
  showOnline?: boolean;
  className?: string;
}

const SIZES = {
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-14 h-14 text-base',
};

export default function MemberAvatar({
  name,
  color,
  size = 'md',
  showOnline,
  className = '',
}: MemberAvatarProps) {
  return (
    <div className={`relative inline-flex ${className}`}>
      <div
        className={`${SIZES[size]} rounded-full flex items-center justify-center font-bold text-white shrink-0 ring-2 ring-surface-950`}
        style={{ backgroundColor: color || '#3B5BFF' }}
        title={name}
      >
        {getInitials(name)}
      </div>
      {showOnline && (
        <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-400 rounded-full ring-2 ring-surface-950" />
      )}
    </div>
  );
}
