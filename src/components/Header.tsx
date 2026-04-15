interface HeaderProps {
  connectedUsers: string[];
}

export function Header({ connectedUsers }: HeaderProps) {
  return (
    <header className="header">
      <h1>todos</h1>
      <div className="connected-users">
        {connectedUsers.length > 0 && (
          <span>{connectedUsers.length} user(s) online</span>
        )}
      </div>
    </header>
  );
}
