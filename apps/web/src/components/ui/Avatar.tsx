import './Avatar.css';

const PALETTE = ['#6366f1', '#0ea5e9', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6'];

interface AvatarProps {
  name: string;
  size?: 'sm' | 'md';
  online?: boolean;
}

export function Avatar({ name, size = 'md', online }: AvatarProps) {
  const initials = name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');
  const hue = PALETTE[[...name].reduce((sum, char) => sum + char.charCodeAt(0), 0) % PALETTE.length];

  return (
    <span className={`avatar avatar--${size}`} style={{ background: hue }} aria-hidden="true">
      {initials}
      {online !== undefined ? (
        <span className={`avatar__dot${online ? ' avatar__dot--online' : ''}`} />
      ) : null}
    </span>
  );
}
