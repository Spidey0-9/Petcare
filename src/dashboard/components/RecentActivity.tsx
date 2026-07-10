import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors } from '../../core/theme/colors';

export interface RecentActivityItem {
  id: string;
  day: string;
  icon: string;
  color: string;
  bgColor: string;
  title: string;
  time: string;
  done: boolean;
}

export function RecentActivity({ activities }: { activities: RecentActivityItem[] }) {
  const grouped: Record<string, RecentActivityItem[]> = {};
  activities.forEach(a => {
    if (!grouped[a.day]) grouped[a.day] = [];
    grouped[a.day].push(a);
  });

  return (
    <View style={styles.container}>
      {Object.entries(grouped).map(([day, acts]) => (
        <DayGroup key={day} day={day} activities={acts} />
      ))}
    </View>
  );
}

function DayGroup({ day, activities }: { day: string; activities: RecentActivityItem[] }) {
  return (
    <View style={styles.group}>
      <View style={styles.dayRow}>
        <View style={styles.dayLine} />
        <View style={styles.dayBadge}>
          <Text style={styles.dayText}>{day}</Text>
        </View>
        <View style={styles.dayLine} />
      </View>

      {activities.map((act, i) => (
        <ActivityRow key={act.id} activity={act} index={i} />
      ))}
    </View>
  );
}

function ActivityRow({ activity, index }: { activity: RecentActivityItem; index: number }) {
  const slideAnim = useRef(new Animated.Value(24)).current;
  const fadeAnim  = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const delay = 100 + index * 100;
    Animated.parallel([
      Animated.spring(slideAnim, { toValue: 0, friction: 8, delay, useNativeDriver: true }),
      Animated.timing(fadeAnim,  { toValue: 1, duration: 400, delay, useNativeDriver: true }),
    ]).start();
  }, [fadeAnim, index, slideAnim]);

  return (
    <Animated.View style={[styles.row, { opacity: fadeAnim, transform: [{ translateX: slideAnim }] }]}> 
      <View style={styles.timeline}>
        <View style={[styles.timelineDot, { backgroundColor: activity.color }]}> 
          {activity.done && <MaterialCommunityIcons name="check" size={10} color="#fff" />}
        </View>
        <View style={[styles.timelineLine, { backgroundColor: activity.color + '30' }]} />
      </View>

      <View style={[styles.actCard, { borderLeftColor: activity.color, borderLeftWidth: 3 }]}> 
        <View style={[styles.actIcon, { backgroundColor: activity.bgColor }]}> 
          <MaterialCommunityIcons name={activity.icon as any} size={18} color={activity.color} />
        </View>
        <View style={styles.actInfo}>
          <Text style={styles.actTitle}>{activity.title}</Text>
          <Text style={styles.actTime}>{activity.time}</Text>
        </View>
        {activity.done ? (
          <MaterialCommunityIcons name="check-circle" size={20} color={colors.success} />
        ) : (
          <MaterialCommunityIcons name="clock-outline" size={20} color={colors.muted} />
        )}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 4 },
  group: { gap: 8, marginBottom: 8 },
  dayRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginVertical: 4 },
  dayLine: { flex: 1, height: 1, backgroundColor: colors.line },
  dayBadge: { backgroundColor: colors.primary + '15', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 4 },
  dayText: { fontSize: 11, fontWeight: '800', color: colors.primary },
  row: { flexDirection: 'row', gap: 10 },
  timeline: { alignItems: 'center', width: 18 },
  timelineDot: { width: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  timelineLine: { flex: 1, width: 2, marginTop: 4 },
  actCard: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.surface, borderRadius: 14, padding: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 5, elevation: 2 },
  actIcon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  actInfo: { flex: 1 },
  actTitle: { fontSize: 13, fontWeight: '800', color: colors.text },
  actTime: { fontSize: 11, color: colors.muted, fontWeight: '600', marginTop: 2 },
});
