import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext({ user: null });

export function RequireAuth({ children }) {
  const [user, setUser] = useState(null);

  // Lógica simples de autenticação ou contexto do usuário
  return (
    <AuthContext.Provider value={{ user }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);