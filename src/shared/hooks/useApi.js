import { useContext } from 'react'; 
import { ApiContext } from '../../app/providers/AppProviders.jsx'; 

export function useApi() {
  const api = useContext(ApiContext); 
  if (!api) throw new Error('ApiContext not available'); 
  return api; 
}
