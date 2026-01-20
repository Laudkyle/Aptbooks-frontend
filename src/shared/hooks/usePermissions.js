import { useContext } from 'react';
import { AbilityContext } from '../../app/providers/AbilityProvider.jsx';

export function usePermissions() {
  return useContext(AbilityContext);
}
