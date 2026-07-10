import { AppointmentNavigator } from './navigation/AppointmentNavigator';

// Change role to 'DOCTOR' to test the doctor view
const USER_ROLE: 'CUSTOMER' | 'DOCTOR' = 'CUSTOMER';

export function AppointmentsScreen() {
  return <AppointmentNavigator role={USER_ROLE} />;
}
