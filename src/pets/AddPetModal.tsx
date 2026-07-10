import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { petService, type PetListItem } from '../services/pets';
import { authService } from '../services/auth';
import { colors } from '../core/theme/colors';

interface DropdownProps {
  label: string;
  value: string;
  options: string[];
  onSelect: (v: string) => void;
  color?: string;
  required?: boolean;
}

function Dropdown({ label, value, options, onSelect, color = colors.primary, required }: DropdownProps) {
  const [open, setOpen] = useState(false);
  return (
    <View style={dd.wrapper}>
      <Text style={dd.label}>{label}{required && <Text style={{ color: '#EF4444' }}> *</Text>}</Text>
      <Pressable style={dd.selector} onPress={() => setOpen(o => !o)}>
        <Text style={[dd.value, !value && { color: colors.muted }]}>{value || `Select ${label}`}</Text>
        <MaterialCommunityIcons name={open ? 'chevron-up' : 'chevron-down'} size={18} color={colors.muted} />
      </Pressable>
      {open && (
        <View style={dd.menu}>
          {options.map(opt => (
            <Pressable key={opt} style={dd.option} onPress={() => { onSelect(opt); setOpen(false); }}>
              <Text style={[dd.optText, value === opt && { color, fontWeight: '800' }]}>{opt}</Text>
              {value === opt && <MaterialCommunityIcons name="check" size={14} color={color} />}
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

const dd = StyleSheet.create({
  wrapper: { marginBottom: 14, zIndex: 10 },
  label: { fontSize: 12, fontWeight: '800', color: colors.muted, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
  selector: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.background, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13, borderWidth: 1.5, borderColor: colors.line },
  value: { flex: 1, fontSize: 14, fontWeight: '600', color: colors.text },
  menu: { backgroundColor: colors.surface, borderRadius: 12, borderWidth: 1, borderColor: colors.line, marginTop: 4, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 5 },
  option: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.line },
  optText: { fontSize: 14, color: colors.text },
});

interface FieldProps { label: string; value: string; onChange: (v: string) => void; placeholder?: string; multiline?: boolean; keyboardType?: any; required?: boolean; }
function Field({ label, value, onChange, placeholder, multiline, keyboardType, required }: FieldProps) {
  return (
    <View style={fld.wrapper}>
      <Text style={fld.label}>{label}{required && <Text style={{ color: '#EF4444' }}> *</Text>}</Text>
      <TextInput
        style={[fld.input, multiline && fld.multiline]}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder ?? label}
        placeholderTextColor={colors.muted}
        multiline={multiline}
        numberOfLines={multiline ? 3 : 1}
        keyboardType={keyboardType}
        textAlignVertical={multiline ? 'top' : 'center'}
      />
    </View>
  );
}

function formatIsoDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatDisplayDate(value: string) {
  if (!value) return '';
  const [year, month, day] = value.split('-');
  if (!year || !month || !day) return value;
  return `${day}/${month}/${year}`;
}

function parseIsoDate(value: string) {
  if (!value) return null;
  const [year, month, day] = value.split('-').map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
}

function CalendarField({ label, value, onSelect, required }: { label: string; value: string; onSelect: (value: string) => void; required?: boolean }) {
  const [open, setOpen] = useState(false);
  const [visibleMonth, setVisibleMonth] = useState(() => parseIsoDate(value) ?? new Date());
  const today = useMemo(() => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    return date;
  }, []);

  const calendarDays = useMemo(() => {
    const year = visibleMonth.getFullYear();
    const month = visibleMonth.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    return [
      ...Array.from({ length: firstDay }, () => null),
      ...Array.from({ length: daysInMonth }, (_, index) => new Date(year, month, index + 1)),
    ];
  }, [visibleMonth]);

  const selectedDate = parseIsoDate(value);
  const monthLabel = new Intl.DateTimeFormat('en-IN', { month: 'long', year: 'numeric' }).format(visibleMonth);

  function moveMonth(delta: number) {
    setVisibleMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + delta, 1));
  }

  return (
    <View style={cal.wrapper}>
      <Text style={cal.label}>{label}{required && <Text style={{ color: '#EF4444' }}> *</Text>}</Text>
      <Pressable style={cal.selector} onPress={() => setOpen(openValue => !openValue)}>
        <MaterialCommunityIcons name="calendar-month" size={18} color={colors.primary} />
        <Text style={[cal.value, !value && { color: colors.muted }]}>{value ? formatDisplayDate(value) : 'Select from calendar'}</Text>
        <MaterialCommunityIcons name={open ? 'chevron-up' : 'chevron-down'} size={18} color={colors.muted} />
      </Pressable>
      {open && (
        <View style={cal.panel}>
          <View style={cal.header}>
            <Pressable style={cal.navButton} onPress={() => moveMonth(-1)}><MaterialCommunityIcons name="chevron-left" size={20} color={colors.primary} /></Pressable>
            <Text style={cal.month}>{monthLabel}</Text>
            <Pressable style={cal.navButton} onPress={() => moveMonth(1)}><MaterialCommunityIcons name="chevron-right" size={20} color={colors.primary} /></Pressable>
          </View>
          <View style={cal.weekRow}>{['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => <Text key={`${day}-${index}`} style={cal.weekDay}>{day}</Text>)}</View>
          <View style={cal.grid}>
            {calendarDays.map((date, index) => {
              if (!date) return <View key={`empty-${index}`} style={cal.dayButton} />;
              const normalized = new Date(date);
              normalized.setHours(0, 0, 0, 0);
              const disabled = normalized.getTime() > today.getTime();
              const isSelected = !!selectedDate && formatIsoDate(selectedDate) === formatIsoDate(date);
              return (
                <Pressable
                  key={formatIsoDate(date)}
                  style={[cal.dayButton, isSelected && cal.daySelected, disabled && cal.dayDisabled]}
                  disabled={disabled}
                  onPress={() => { onSelect(formatIsoDate(date)); setOpen(false); }}
                >
                  <Text style={[cal.dayText, isSelected && cal.dayTextSelected, disabled && cal.dayTextDisabled]}>{date.getDate()}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      )}
    </View>
  );
}

const cal = StyleSheet.create({
  wrapper: { marginBottom: 14, zIndex: 9 },
  label: { fontSize: 12, fontWeight: '800', color: colors.muted, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
  selector: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.background, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13, borderWidth: 1.5, borderColor: colors.line },
  value: { flex: 1, fontSize: 14, fontWeight: '600', color: colors.text },
  panel: { marginTop: 6, borderRadius: 14, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surface, padding: 10 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  navButton: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary + '10' },
  month: { color: colors.text, fontSize: 14, fontWeight: '900' },
  weekRow: { flexDirection: 'row', marginBottom: 4 },
  weekDay: { width: `${100 / 7}%`, textAlign: 'center', color: colors.muted, fontSize: 11, fontWeight: '900' },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  dayButton: { width: `${100 / 7}%`, aspectRatio: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 10 },
  daySelected: { backgroundColor: colors.primary },
  dayDisabled: { opacity: 0.35 },
  dayText: { color: colors.text, fontSize: 13, fontWeight: '800' },
  dayTextSelected: { color: '#FFFFFF' },
  dayTextDisabled: { color: colors.muted },
});

const fld = StyleSheet.create({
  wrapper: { marginBottom: 14 },
  label: { fontSize: 12, fontWeight: '800', color: colors.muted, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
  input: { backgroundColor: colors.background, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13, fontSize: 14, fontWeight: '600', color: colors.text, borderWidth: 1.5, borderColor: colors.line },
  multiline: { minHeight: 80, paddingTop: 12 },
});

interface AddPetModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialPet?: PetListItem | null;
}

export function AddPetModal({ visible, onClose, onSuccess, initialPet }: AddPetModalProps) {
  const slideAnim = useRef(new Animated.Value(800)).current;
  const successAnim = useRef(new Animated.Value(0)).current;
  const checkScale = useRef(new Animated.Value(0)).current;
  const [saving, setSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [petPhotoUri, setPetPhotoUri] = useState<string | null>(null);
  const [photoChanged, setPhotoChanged] = useState(false);

  const [name, setName] = useState('');
  const [species, setSpecies] = useState('');
  const [breed, setBreed] = useState('');
  const [gender, setGender] = useState('');
  const [dob, setDob] = useState('');
  const [weight, setWeight] = useState('');
  const [petColor, setPetColor] = useState('');
  const [microchip, setMicrochip] = useState('');
  const [bloodGroup, setBloodGroup] = useState('');
  const [allergies, setAllergies] = useState('');
  const [conditions, setConditions] = useState('');
  const [vaccStatus, setVaccStatus] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [emergency, setEmergency] = useState('');

  const isEditing = !!initialPet?.id;

  useEffect(() => {
    if (visible) {
      if (initialPet) {
        setName(initialPet.name ?? '');
        setSpecies(initialPet.species ?? initialPet.type ?? '');
        setBreed(initialPet.breed ?? '');
        setGender(initialPet.gender ?? '');
        setDob(initialPet.date_of_birth ?? '');
        setWeight(initialPet.weight == null ? '' : String(initialPet.weight));
        setPetColor(initialPet.color ?? '');
        setMicrochip(initialPet.microchip_number ?? '');
        setBloodGroup(initialPet.blood_group ?? '');
        setAllergies(initialPet.allergies ?? '');
        setConditions(initialPet.medical_conditions ?? '');
        setVaccStatus(initialPet.vaccination_status ?? '');
        setOwnerName(initialPet.owner_name ?? '');
        setEmergency(initialPet.emergency_contact ?? '');
        setPetPhotoUri(initialPet.image_url ?? null);
        setPhotoChanged(false);
      } else {
        resetForm();
      }
      Animated.spring(slideAnim, { toValue: 0, friction: 9, tension: 50, useNativeDriver: true }).start();
    } else {
      Animated.timing(slideAnim, { toValue: 800, duration: 300, useNativeDriver: true }).start();
    }
  }, [visible, initialPet?.id]);

  const pickPhoto = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Allow photo library access to upload pet photos.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setPetPhotoUri(result.assets[0].uri);
      setPhotoChanged(true);
    }
  };

  const takePhoto = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Allow camera access to take pet photos.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ allowsEditing: true, aspect: [1, 1], quality: 0.8 });
    if (!result.canceled && result.assets[0]) {
      setPetPhotoUri(result.assets[0].uri);
      setPhotoChanged(true);
    }
  };

  function resetForm() {
    setName(''); setSpecies(''); setBreed(''); setGender(''); setDob('');
    setWeight(''); setPetColor(''); setMicrochip(''); setBloodGroup('');
    setAllergies(''); setConditions(''); setVaccStatus(''); setOwnerName(''); setEmergency('');
    setPetPhotoUri(null); setPhotoChanged(false); setSaving(false); setShowSuccess(false);
    successAnim.setValue(0); checkScale.setValue(0);
  }

  const handleClose = () => { resetForm(); onClose(); };

  const validate = () => {
    if (!name.trim()) { Alert.alert('Required', 'Pet name is required'); return false; }
    if (!species) { Alert.alert('Required', 'Species is required'); return false; }
    if (!breed.trim()) { Alert.alert('Required', 'Breed is required'); return false; }
    if (!gender) { Alert.alert('Required', 'Gender is required'); return false; }
    if (!dob) { Alert.alert('Required', 'Date of birth is required. Select it from the calendar.'); return false; }
    if (weight && Number(weight) <= 0) { Alert.alert('Invalid weight', 'Weight must be greater than zero.'); return false; }
    return true;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      const user = await authService.getCurrentUser();
      if (!user) throw new Error('Login required to save pet profiles.');

      const payload = {
        owner_id: user.id,
        name: name.trim(),
        species,
        type: species,
        breed: breed.trim(),
        age: null,
        date_of_birth: dob,
        gender,
        weight: weight ? parseFloat(weight) : null,
        color: petColor.trim() || null,
        microchip_number: microchip.trim() || null,
        blood_group: bloodGroup || null,
        allergies: allergies.trim() || null,
        medical_conditions: conditions.trim() || null,
        vaccination_status: vaccStatus || null,
        owner_name: ownerName.trim() || null,
        emergency_contact: emergency.trim() || null,
      };

      const savedPet = isEditing && initialPet?.id
        ? await petService.updatePet(initialPet.id, payload)
        : await petService.createPet(payload);

      // ── Photo upload (non-blocking for pet creation) ──────────────────────
      // Run after the pet row exists so we have a valid petId for the path.
      // If the upload fails we still show the success state for the pet save
      // but alert the user that the photo needs to be re-uploaded.
      if (photoChanged && petPhotoUri) {
        try {
          await petService.uploadPetImage(
            user.id,
            savedPet.id,
            { uri: petPhotoUri, fileName: `${savedPet.name}-profile.jpg`, mimeType: 'image/jpeg' },
          );
        } catch (photoErr: any) {
          // Pet is saved — only the photo failed.  Show a specific message so
          // the user knows the pet was created and can retry the photo later.
          console.error('[AddPetModal] Photo upload failed:', photoErr);
          setSaving(false);
          Alert.alert(
            'Pet saved — photo upload failed',
            photoErr?.message
              ?? 'The pet profile was saved but the photo could not be uploaded. ' +
                 'You can add the photo by editing the pet.',
          );
          onSuccess(); // refresh the list so the new pet without photo appears
          handleClose();
          return;
        }
      }

      setSaving(false);
      setShowSuccess(true);
      Animated.parallel([
        Animated.timing(successAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.spring(checkScale, { toValue: 1, friction: 5, tension: 80, useNativeDriver: true }),
      ]).start(() => {
        setTimeout(() => {
          handleClose();
          onSuccess();
        }, 1000);
      });
    } catch (err: any) {
      setSaving(false);
      Alert.alert('Error', err.message ?? 'Failed to save pet. Check Supabase table schema.');
    }
  };

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={handleClose}>
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={handleClose} />
        <Animated.View style={[styles.sheet, { transform: [{ translateY: slideAnim }] }]}>
          {showSuccess && (
            <Animated.View style={[styles.successOverlay, { opacity: successAnim }]}>
              <Animated.View style={[styles.successCircle, { transform: [{ scale: checkScale }] }]}>
                <MaterialCommunityIcons name="check-bold" size={56} color="#fff" />
              </Animated.View>
              <Text style={styles.successTitle}>{isEditing ? 'Pet Updated!' : 'Pet Added!'}</Text>
              <Text style={styles.successSub}>Your pet profile has been saved successfully</Text>
            </Animated.View>
          )}

          <View style={styles.sheetHeader}>
            <View style={styles.sheetHandle} />
            <View style={styles.headerRow}>
              <Pressable style={styles.closeBtn} onPress={handleClose}>
                <MaterialCommunityIcons name="close" size={20} color={colors.text} />
              </Pressable>
              <Text style={styles.sheetTitle}>{isEditing ? 'Edit Pet' : 'Add New Pet'}</Text>
              <Pressable style={[styles.submitBtn, saving && styles.submitBtnDisabled]} onPress={handleSubmit} disabled={saving}>
                <Text style={styles.submitText}>{saving ? 'Saving...' : 'Submit'}</Text>
              </Pressable>
            </View>
          </View>

          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
            <ScrollView contentContainerStyle={styles.formBody} showsVerticalScrollIndicator={false}>
              <View style={styles.photoSection}>
                <Pressable style={styles.photoUpload} onPress={pickPhoto}>
                  {petPhotoUri ? (
                    <Image source={{ uri: petPhotoUri }} style={styles.photoPreview} />
                  ) : (
                    <>
                      <MaterialCommunityIcons name="camera-plus" size={32} color={colors.primary} />
                      <Text style={styles.photoText}>Upload Pet Photo</Text>
                      <Text style={styles.photoSub}>Tap to choose from gallery</Text>
                    </>
                  )}
                </Pressable>
                <Pressable style={styles.cameraBtn} onPress={takePhoto}>
                  <MaterialCommunityIcons name="camera" size={20} color={colors.primary} />
                  <Text style={styles.cameraBtnText}>Camera</Text>
                </Pressable>
              </View>

              <SectionLabel title="Basic Information" icon="paw" />
              <Field label="Pet Name" value={name} onChange={setName} required placeholder="e.g. Buddy" />
              <Dropdown label="Species" value={species} options={['Dog', 'Cat', 'Bird', 'Rabbit', 'Fish', 'Hamster', 'Other']} onSelect={setSpecies} required />
              <Field label="Breed" value={breed} onChange={setBreed} required placeholder="e.g. Golden Retriever" />
              <Dropdown label="Gender" value={gender} options={['Male', 'Female']} onSelect={setGender} required />
              <CalendarField label="Date of Birth" value={dob} onSelect={setDob} required />
              <Field label="Weight (kg)" value={weight} onChange={setWeight} keyboardType="decimal-pad" placeholder="e.g. 12.5" />
              <Field label="Color / Markings" value={petColor} onChange={setPetColor} placeholder="e.g. Golden with white patch" />

              <SectionLabel title="Medical Information" icon="medical-bag" color="#EF4444" />
              <Field label="Microchip Number (Optional)" value={microchip} onChange={setMicrochip} placeholder="15-digit chip ID" />
              <Dropdown label="Blood Group" value={bloodGroup} options={['DEA 1.1+', 'DEA 1.1-', 'DEA 1.2+', 'DEA 1.2-', 'Unknown']} onSelect={setBloodGroup} color="#EF4444" />
              <Field label="Allergies" value={allergies} onChange={setAllergies} placeholder="e.g. Chicken, Dust mites" multiline />
              <Field label="Medical Conditions" value={conditions} onChange={setConditions} placeholder="e.g. Diabetes, Hip dysplasia" multiline />
              <Dropdown label="Vaccination Status" value={vaccStatus} options={['Fully Vaccinated', 'Partially Vaccinated', 'Not Vaccinated', 'Due for Vaccination']} onSelect={setVaccStatus} color="#22C55E" />

              <SectionLabel title="Owner & Emergency" icon="account" color="#0EA5E9" />
              <Field label="Owner Name" value={ownerName} onChange={setOwnerName} placeholder="Full name of owner" />
              <Field label="Emergency Contact" value={emergency} onChange={setEmergency} placeholder="+91 98765 43210" keyboardType="phone-pad" />
              <View style={{ height: 40 }} />
            </ScrollView>
          </KeyboardAvoidingView>
        </Animated.View>
      </View>
    </Modal>
  );
}

function SectionLabel({ title, icon, color = colors.primary }: { title: string; icon: string; color?: string }) {
  return (
    <View style={sec.row}>
      <View style={[sec.icon, { backgroundColor: color + '20' }]}>
        <MaterialCommunityIcons name={icon as any} size={16} color={color} />
      </View>
      <Text style={[sec.text, { color }]}>{title}</Text>
    </View>
  );
}
const sec = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 20, marginBottom: 14 },
  icon: { width: 30, height: 30, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  text: { fontSize: 13, fontWeight: '900', letterSpacing: 0.3 },
});

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.55)' },
  sheet: { backgroundColor: colors.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28, maxHeight: '95%', flex: 1, shadowColor: '#000', shadowOffset: { width: 0, height: -6 }, shadowOpacity: 0.15, shadowRadius: 20, elevation: 20 },
  sheetHeader: { paddingTop: 10, paddingHorizontal: 20, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: colors.line },
  sheetHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: colors.line, alignSelf: 'center', marginBottom: 14 },
  headerRow: { flexDirection: 'row', alignItems: 'center' },
  closeBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' },
  sheetTitle: { flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '900', color: colors.text },
  submitBtn: { backgroundColor: colors.primary, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 8 },
  submitBtnDisabled: { opacity: 0.6 },
  submitText: { fontSize: 13, fontWeight: '900', color: '#fff' },
  formBody: { paddingHorizontal: 20, paddingTop: 20 },
  photoSection: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 },
  photoUpload: { flex: 1, borderWidth: 2, borderColor: colors.primary + '40', borderStyle: 'dashed', borderRadius: 16, padding: 20, alignItems: 'center', gap: 6, backgroundColor: colors.primary + '06', minHeight: 100, justifyContent: 'center' },
  photoPreview: { width: '100%', height: 100, borderRadius: 14, resizeMode: 'cover' },
  cameraBtn: { alignItems: 'center', gap: 6, backgroundColor: colors.primary + '12', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 16 },
  cameraBtnText: { fontSize: 11, fontWeight: '800', color: colors.primary },
  photoText: { fontSize: 15, fontWeight: '800', color: colors.primary },
  photoSub: { fontSize: 12, color: colors.muted, fontWeight: '600' },
  successOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', gap: 16, zIndex: 100, borderTopLeftRadius: 28, borderTopRightRadius: 28 },
  successCircle: { width: 110, height: 110, borderRadius: 55, backgroundColor: colors.success, alignItems: 'center', justifyContent: 'center', shadowColor: colors.success, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.4, shadowRadius: 16, elevation: 10 },
  successTitle: { fontSize: 26, fontWeight: '900', color: colors.text },
  successSub: { fontSize: 14, color: colors.muted, fontWeight: '600' },
});
