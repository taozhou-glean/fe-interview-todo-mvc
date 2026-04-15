import { useState } from 'react';
import { getDisplayName, setDisplayName } from '../ws';

interface HeaderProps {
  connectedUsers: string[];
}

export function Header({ connectedUsers }: HeaderProps) {
  const [name, setName] = useState(getDisplayName());

  const handleBlur = () => {
    const trimmed = name.trim();
    if (!trimmed) {
      // Reset to current stored name if user cleared the input
      setName(getDisplayName());
      return;
    }
    if (trimmed !== getDisplayName()) {
      setDisplayName(trimmed);
    }
  };

  return (
    <header className="header">
      <h1>todos</h1>
      <div className="connected-users">
        <input
          className="user-id-input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
          aria-label="Your display name"
        />
        {connectedUsers.length > 0 && (
          <span className="online-badge">
            <span className="online-dot" />
            {connectedUsers.length}
          </span>
        )}
      </div>
    </header>
  );
}
