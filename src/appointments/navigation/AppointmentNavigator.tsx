import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { CustomerAppointmentsScreen } from '../screens/CustomerAppointmentsScreen';
import { DoctorAppointmentsScreen } from '../screens/DoctorAppointmentsScreen';
import { BookAppointmentScreen } from '../screens/BookAppointmentScreen';
import { AppointmentDetailsScreen } from '../screens/AppointmentDetailsScreen';
import { AddDiagnosisScreen } from '../screens/AddDiagnosisScreen';
import { RateAppointmentScreen } from '../screens/RateAppointmentScreen';

export type SelectedHospitalParam = {
  hospitalId: string;
  hospitalName: string;
  clinicId: string;
  consultationFee: number;
  doctorCount: number;
  latitude: number | null;
  longitude: number | null;
  address: string;
};

export type AppointmentStackParamList = {
  CustomerAppointments: undefined;
  DoctorAppointments: undefined;
  BookAppointment: {
    customerId?: string;
    selectedHospital?: SelectedHospitalParam;
    startAtDoctorSelection?: boolean;
  } | undefined;
  AppointmentDetails: { appointmentId: string; isCustomer: boolean };
  AddDiagnosis: { appointmentId: string };
  RateAppointment: { appointmentId: string };
};

const Stack = createNativeStackNavigator<AppointmentStackParamList>();

interface Props {
  role?: 'CUSTOMER' | 'DOCTOR';
}

export function AppointmentNavigator({ role = 'CUSTOMER' }: Props) {
  const isDoctor = role === 'DOCTOR';

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {/* Root screen based on role */}
      {isDoctor ? (
        <Stack.Screen name="DoctorAppointments" component={DoctorAppointmentsScreen} />
      ) : (
        <Stack.Screen name="CustomerAppointments" component={CustomerAppointmentsScreen} />
      )}
      {/* Shared screens */}
      <Stack.Screen name="BookAppointment" component={BookAppointmentScreen} />
      <Stack.Screen name="AppointmentDetails" component={AppointmentDetailsScreen} />
      <Stack.Screen name="AddDiagnosis" component={AddDiagnosisScreen} />
      <Stack.Screen name="RateAppointment" component={RateAppointmentScreen} />
    </Stack.Navigator>
  );
}

