import 'react-native-gesture-handler';
import React from 'react';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createDrawerNavigator } from '@react-navigation/drawer';

import { colors } from '../core/theme/colors';
import { DrawerContent } from '../navigation/DrawerContent';

// Auth screens
import { SplashScreen }             from '../auth/SplashScreen';
import { OnboardingScreen }         from '../auth/OnboardingScreen';
import { PermissionsScreen }        from '../auth/PermissionsScreen';
import { LoginScreen }              from '../auth/LoginScreen';
import { RegisterScreen }           from '../auth/RegisterScreen';
import { ForgotPasswordScreen }     from '../auth/ForgotPasswordScreen';
import { RoleSelectionScreen }      from '../auth/RoleSelectionScreen';
import { PhoneVerificationScreen }  from '../auth/PhoneVerificationScreen';
import { EmailVerificationScreen }  from '../auth/EmailVerificationScreen';
import { CompleteProfileScreen }    from '../auth/CompleteProfileScreen';
import { TutorialScreen }           from '../auth/TutorialScreen';
import { TermsScreen }              from '../auth/TermsScreen';
import { PrivacyScreen }            from '../auth/PrivacyScreen';

// Dashboard screens
import { AiHealthScreen }           from '../ai_health/AiHealthScreen';
import { SymptomCheckerScreen }     from '../ai_health/SymptomCheckerScreen';
import { AiAssistantScreen }        from '../ai_health/AiAssistantScreen';
import { FoodSafetyScreen }         from '../ai_health/FoodSafetyScreen';
import { HealthReportScreen }       from '../ai_health/HealthReportScreen';
import { AppointmentsScreen }       from '../appointments/AppointmentsScreen';
import { HomeScreen }               from '../dashboard/HomeScreen';
import { ShopScreen }               from '../shop/ShopScreen';
import { ProfileScreen }            from '../profile/ProfileScreen';
import {
  EditProfileScreen,
  HelpSupportScreen,
  OrderHistoryScreen,
  PaymentMethodsScreen,
  PremiumMembershipScreen,
  ProfileSettingsScreen,
} from '../profile/ProfileModuleScreens';
import { AdminScreen }              from '../admin/AdminScreen';
import { SuperAdminDashboardScreen } from '../admin/SuperAdminDashboardScreen';
import { DoctorDashboardScreen }    from '../doctors/DoctorDashboardScreen';
import { AdoptionScreen }           from '../adoption/AdoptionScreen';
import { BillingScreen }            from '../billing/BillingScreen';
import { CommunityScreen }          from '../community/CommunityScreen';
import { EmergencyScreen }          from '../emergency/EmergencyScreen';
import { GpsScreen }                from '../gps/GpsScreen';
import { GroomingScreen }           from '../grooming/GroomingScreen';
import { NotificationsScreen }      from '../notifications/NotificationsScreen';
import { NutritionScreen }          from '../nutrition/NutritionScreen';
import { PetsScreen }               from '../pets/PetsScreen';
import { PharmacyScreen }           from '../pharmacy/PharmacyScreen';
import { RemindersScreen }          from '../reminders/RemindersScreen';
import { ReportsScreen }            from '../reports/ReportsScreen';
import { VaccinationScreen }        from '../vaccination/VaccinationScreen';

import type {
  AuthStackParamList,
  MainTabParamList,
  HomeStackParamList,
  ProfileStackParamList,
} from './types';

const AuthStack   = createNativeStackNavigator<AuthStackParamList>();
const Tabs        = createBottomTabNavigator<MainTabParamList>();
const HomeStack   = createNativeStackNavigator<HomeStackParamList>();
const ProfileStack = createNativeStackNavigator<ProfileStackParamList>();
const Drawer      = createDrawerNavigator();

// ── Home stack ────────────────────────────────────────────────────────────────

function HomeStackNavigator() {
  return (
    <HomeStack.Navigator screenOptions={{ headerShown: false }}>
      <HomeStack.Screen name="HomeMain"       component={HomeScreen} />
      <HomeStack.Screen name="Pets"           component={PetsScreen} />
      <HomeStack.Screen name="Vaccination"    component={VaccinationScreen} />
      <HomeStack.Screen name="Pharmacy"       component={PharmacyScreen} />
      <HomeStack.Screen name="Reminders"      component={RemindersScreen} />
      <HomeStack.Screen name="Nutrition"      component={NutritionScreen} />
      <HomeStack.Screen name="Grooming"       component={GroomingScreen} />
      <HomeStack.Screen name="Community"      component={CommunityScreen} />
      <HomeStack.Screen name="Gps"            component={GpsScreen} />
      <HomeStack.Screen name="Adoption"       component={AdoptionScreen} />
      <HomeStack.Screen name="Emergency"      component={EmergencyScreen} />
      <HomeStack.Screen name="Billing"        component={BillingScreen} />
      <HomeStack.Screen name="Notifications"  component={NotificationsScreen} />
      <HomeStack.Screen name="Reports"        component={ReportsScreen} />
      <HomeStack.Screen name="Admin"          component={AdminScreen} />
      <HomeStack.Screen name="SymptomChecker" component={SymptomCheckerScreen} />
      <HomeStack.Screen name="AiAssistant"    component={AiAssistantScreen} />
      <HomeStack.Screen name="FoodSafety"     component={FoodSafetyScreen} />
      <HomeStack.Screen name="HealthReport"   component={HealthReportScreen} />
    </HomeStack.Navigator>
  );
}

// ── Profile stack ─────────────────────────────────────────────────────────────

function ProfileStackNavigator() {
  return (
    <ProfileStack.Navigator screenOptions={{ headerShown: false }}>
      <ProfileStack.Screen name="ProfileMain"        component={ProfileScreen} />
      <ProfileStack.Screen name="EditProfile"        component={EditProfileScreen} />
      <ProfileStack.Screen name="PremiumMembership"  component={PremiumMembershipScreen} />
      <ProfileStack.Screen name="OrderHistory"       component={OrderHistoryScreen} />
      <ProfileStack.Screen name="PaymentMethods"     component={PaymentMethodsScreen} />
      <ProfileStack.Screen name="ProfileSettings"    component={ProfileSettingsScreen} />
      <ProfileStack.Screen name="HelpSupport"        component={HelpSupportScreen} />
    </ProfileStack.Navigator>
  );
}

// ── Bottom tabs ───────────────────────────────────────────────────────────────

function MainTabs() {
  const labels: Record<keyof MainTabParamList, string> = {
    Home: 'Home', Appointments: 'Appts', Health: 'Health', Shop: 'Shop', Profile: 'Profile',
  };

  return (
    <Tabs.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.muted,
        tabBarLabel: labels[route.name],
        tabBarAllowFontScaling: false,
        tabBarLabelPosition: 'below-icon',
        tabBarLabelStyle: { fontSize: 11, lineHeight: 14, fontWeight: '800', marginTop: 2 },
        tabBarItemStyle:  { minWidth: 0, paddingHorizontal: 0 },
        tabBarIconStyle:  { marginTop: 2 },
        tabBarStyle:      { height: 72, paddingBottom: 9, paddingTop: 7, borderTopColor: '#ECEEF5' },
        tabBarIcon: ({ color, size }) => {
          const icons: Record<keyof MainTabParamList, keyof typeof MaterialCommunityIcons.glyphMap> = {
            Home: 'home', Appointments: 'calendar-month', Health: 'heart-pulse', Shop: 'shopping', Profile: 'account',
          };
          return <MaterialCommunityIcons name={icons[route.name]} size={size} color={color} />;
        },
      })}
    >
      <Tabs.Screen name="Home"         component={HomeStackNavigator} />
      <Tabs.Screen name="Appointments" component={AppointmentsScreen} />
      <Tabs.Screen name="Health"       component={AiHealthScreen} />
      <Tabs.Screen name="Shop"         component={ShopScreen} />
      <Tabs.Screen name="Profile"      component={ProfileStackNavigator} />
    </Tabs.Navigator>
  );
}

// ── Drawer ────────────────────────────────────────────────────────────────────

function DrawerNavigator() {
  return (
    <Drawer.Navigator
      drawerContent={(props) => <DrawerContent {...props} />}
      screenOptions={{
        headerShown: false,
        drawerType: 'slide',
        drawerStyle: { width: 300, backgroundColor: 'transparent' },
        overlayColor: 'rgba(0,0,0,0.5)',
        swipeEdgeWidth: 60,
      }}
    >
      <Drawer.Screen name="AppTabs" component={MainTabs} />
    </Drawer.Navigator>
  );
}

// ── Root navigator ────────────────────────────────────────────────────────────

export function AppNavigator() {
  return (
    <AuthStack.Navigator screenOptions={{ headerShown: false }}>
      {/* Boot */}
      <AuthStack.Screen name="Splash"               component={SplashScreen} />
      <AuthStack.Screen name="Onboarding"           component={OnboardingScreen} />
      <AuthStack.Screen name="Permissions"          component={PermissionsScreen} />

      {/* Auth */}
      <AuthStack.Screen name="Login"                component={LoginScreen} />
      <AuthStack.Screen name="Register"             component={RegisterScreen} />
      <AuthStack.Screen name="ForgotPassword"       component={ForgotPasswordScreen} />
      <AuthStack.Screen name="RoleSelection"        component={RoleSelectionScreen} />

      {/* Verification pipeline */}
      <AuthStack.Screen name="PhoneVerification"    component={PhoneVerificationScreen} />
      <AuthStack.Screen name="EmailVerification"    component={EmailVerificationScreen} />

      {/* Profile & tutorial */}
      <AuthStack.Screen name="CompleteProfile"      component={CompleteProfileScreen} />
      <AuthStack.Screen name="Tutorial"             component={TutorialScreen} />

      {/* Legal */}
      <AuthStack.Screen name="Terms"                component={TermsScreen} />
      <AuthStack.Screen name="Privacy"              component={PrivacyScreen} />

      {/* Dashboards */}
      <AuthStack.Screen name="MainTabs"             component={DrawerNavigator} />
      <AuthStack.Screen name="DoctorDashboard"      component={DoctorDashboardScreen} />
      <AuthStack.Screen name="SuperAdminDashboard"  component={SuperAdminDashboardScreen} />
    </AuthStack.Navigator>
  );
}
