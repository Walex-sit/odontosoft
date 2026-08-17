import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext<any>({ user: null, profile: null });

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState<any>(null);

  return (
    <AuthContext.Provider value={{ user, profile }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);