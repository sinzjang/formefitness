// 운동 장소 탭: GYM | HOME | + (폴더형, 뉴트럴)
import { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  Modal,
  TextInput,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, layout } from '../../constants/theme';
import { t } from '../../lib/i18n';
import { useLanguage } from '../../stores/settingsStore';
import { useLocationStore } from '../../stores/locationStore';

const TAB_RADIUS = 10;
const SCOOP_RADIUS = 10;

interface FolderTabProps {
  label: string;
  active: boolean;
  onPress: () => void;
}

/** 상단 둥글고 하단 모서리가 오목하게 휘는 폴더형 탭 */
function FolderTab({ label, active, onPress }: FolderTabProps) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.tabWrap, active && styles.tabWrapActive]}
    >
      {active && (
        <>
          <View style={[styles.scoop, styles.scoopLeft]} />
          <View style={[styles.scoop, styles.scoopRight]} />
        </>
      )}
      <View style={[styles.tabBody, active ? styles.tabBodyActive : styles.tabBodyInactive]}>
        <Text style={[styles.tabText, active && styles.tabTextActive]} numberOfLines={1}>
          {label}
        </Text>
      </View>
    </Pressable>
  );
}

export function LocationTabs() {
  const lang = useLanguage();
  const locations = useLocationStore((s) => s.locations);
  const selectedId = useLocationStore((s) => s.selectedLocationId);
  const setSelected = useLocationStore((s) => s.setSelectedLocation);
  const addLocation = useLocationStore((s) => s.addLocation);

  const [modalVisible, setModalVisible] = useState(false);
  const [newName, setNewName] = useState('');

  const handleAdd = () => {
    if (newName.trim()) {
      addLocation(newName);
      setNewName('');
      setModalVisible(false);
    }
  };

  return (
    <>
      <View style={styles.tabBar}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabScroll}
          style={styles.tabScrollView}
        >
          {locations.map((loc) => (
            <FolderTab
              key={loc.id}
              label={loc.name}
              active={loc.id === selectedId}
              onPress={() => setSelected(loc.id)}
            />
          ))}
        </ScrollView>

        <Pressable
          style={({ pressed }) => [styles.addBtn, pressed && styles.addBtnPressed]}
          onPress={() => setModalVisible(true)}
          hitSlop={4}
        >
          <Ionicons name="add" size={20} color={colors.textSecondary} />
        </Pressable>
      </View>

      {/* 장소 추가 모달 */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <Pressable style={styles.overlay} onPress={() => setModalVisible(false)}>
          <Pressable style={styles.sheet} onPress={() => {}}>
            <Text style={styles.modalTitle}>{t('addLocation', lang)}</Text>
            <TextInput
              style={styles.input}
              placeholder={t('locationNamePlaceholder', lang)}
              placeholderTextColor={colors.textMuted}
              value={newName}
              onChangeText={setNewName}
              autoCapitalize="characters"
              autoFocus
            />
            <View style={styles.modalActions}>
              <Pressable style={styles.cancelBtn} onPress={() => setModalVisible(false)}>
                <Text style={styles.cancelText}>{t('cancel', lang)}</Text>
              </Pressable>
              <Pressable style={styles.saveBtn} onPress={handleAdd}>
                <Text style={styles.saveText}>{t('save', lang)}</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: colors.surface,
    paddingHorizontal: layout.screenPadding,
    paddingTop: 10,
    minHeight: 48,
  },
  tabScrollView: {
    flex: 1,
  },
  tabScroll: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 4,
    paddingRight: 8,
  },
  tabWrap: {
    position: 'relative',
    marginBottom: 0,
  },
  tabWrapActive: {
    zIndex: 2,
    marginBottom: -1,
  },
  tabBody: {
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 11,
    minWidth: 72,
  },
  tabBodyActive: {
    backgroundColor: colors.background,
    borderTopLeftRadius: TAB_RADIUS,
    borderTopRightRadius: TAB_RADIUS,
    borderWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: 0,
    borderColor: colors.border,
    paddingBottom: 12,
  },
  tabBodyInactive: {
    backgroundColor: '#EBEBEB',
    borderTopLeftRadius: TAB_RADIUS - 2,
    borderTopRightRadius: TAB_RADIUS - 2,
    borderWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: 0,
    borderColor: colors.border,
    marginBottom: 1,
    opacity: 0.85,
  },
  scoop: {
    position: 'absolute',
    bottom: 0,
    width: SCOOP_RADIUS,
    height: SCOOP_RADIUS,
    backgroundColor: colors.surface,
  },
  scoopLeft: {
    left: -SCOOP_RADIUS,
    borderBottomRightRadius: SCOOP_RADIUS,
  },
  scoopRight: {
    right: -SCOOP_RADIUS,
    borderBottomLeftRadius: SCOOP_RADIUS,
  },
  tabText: {
    ...typography.listItem,
    fontSize: 13,
    letterSpacing: 0.6,
    color: colors.textSecondary,
  },
  tabTextActive: {
    color: colors.textPrimary,
  },
  addBtn: {
    width: 36,
    height: 36,
    borderRadius: TAB_RADIUS - 2,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    backgroundColor: '#EBEBEB',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
    marginLeft: 4,
  },
  addBtnPressed: {
    backgroundColor: colors.border,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    paddingHorizontal: layout.screenPadding,
  },
  sheet: {
    backgroundColor: colors.background,
    borderRadius: layout.cardRadius,
    padding: 20,
  },
  modalTitle: {
    ...typography.sectionHeader,
    fontSize: 18,
    marginBottom: 12,
  },
  input: {
    ...typography.listItem,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 16,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  cancelBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  cancelText: {
    ...typography.listItem,
    color: colors.textSecondary,
  },
  saveBtn: {
    backgroundColor: colors.textPrimary,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  saveText: {
    ...typography.button,
    color: colors.background,
    textTransform: 'none',
  },
});
