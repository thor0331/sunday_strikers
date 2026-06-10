interface CircularAvatarProps {
  src?: string | null;
  alt: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  onClick?: () => void;
}

const sizeClasses = {
  sm: 'h-8 w-8',
  md: 'h-10 w-10',
  lg: 'h-14 w-14',
  xl: 'h-20 w-20',
};

export function CircularAvatar({ src, alt, size = 'md', className = '', onClick }: CircularAvatarProps) {
  return (
    <div
      className={`shrink-0 overflow-hidden rounded-full border-2 border-white shadow-md ${sizeClasses[size]} ${onClick ? 'cursor-pointer hover:ring-2 hover:ring-teal-400 transition-all' : ''} ${className}`}
      onClick={onClick}
    >
      {src ? (
        <img src={src} alt={alt} className="h-full w-full object-cover" />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-teal-400 to-teal-600 text-sm font-bold text-white">
          {alt.charAt(0).toUpperCase()}
        </div>
      )}
    </div>
  );
}
