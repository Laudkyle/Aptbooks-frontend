import React from 'react';
import { HrShell, ModuleCards, Users } from './_hrShared.jsx';

export default function HrOverview() {
  return (
    <HrShell title="Human Resources" subtitle="HR master data, employees, payroll, leave, benefits, statutory rules and reports." icon={Users}>
      <ModuleCards />
    </HrShell>
  );
}
