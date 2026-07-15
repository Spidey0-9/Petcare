import React from 'react';
import { useNavigation } from '@react-navigation/native';
import type { NavigationProp, ParamListBase } from '@react-navigation/native';

import { EnterpriseFloatingBottomNav, type EnterpriseBottomNavItem } from '../core/components/EnterprisePrimitives';

const TABS: EnterpriseBottomNavItem[] = [
  { route: 'Dashboard', label: 'Home', icon: 'view-dashboard-outline' },
  { route: 'Bookings', label: 'Appts', icon: 'calendar-check-outline' },
  { route: 'Shop', label: 'Shop', icon: 'shopping-outline' },
  { route: 'Revenue', label: 'Revenue', icon: 'cash-multiple' },
  { route: 'Profile', label: 'Profile', icon: 'account-circle-outline' },
];

export function GroomerBottomNavigation({ activeRoute }: { activeRoute: string }) {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  return <EnterpriseFloatingBottomNav items={TABS} activeRoute={activeRoute} onNavigate={(route) => navigation.navigate(route)} />;
}
