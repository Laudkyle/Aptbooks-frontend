import { useContext } from 'react'; 
import { AuthContext } from '../../app/providers/AuthProvider.jsx'; 

export function useAuth() {
  return useContext(AuthContext); 
}
