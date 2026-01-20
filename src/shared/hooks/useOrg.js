import { useContext } from 'react';
import { OrgContext } from '../../app/providers/OrgProvider.jsx';

export function useOrg() {
  return useContext(OrgContext);
}
