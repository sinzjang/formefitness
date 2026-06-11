// Profile 탭 — 읽기 전용 프로필 + Edit 모달
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../../constants/theme';
import { useLanguage } from '../../stores/settingsStore';
import { ProfileNavBar } from '../../components/profile/ProfileNavBar';
import { ProfileViewHeader } from '../../components/profile/ProfileViewHeader';
import { ProfileViewInfo } from '../../components/profile/ProfileViewInfo';
import { ProfileFeedGrid } from '../../components/profile/ProfileFeedGrid';
import { ProfileEditModal } from '../../components/profile/ProfileEditModal';
import { ProfileSettingsModal } from '../../components/profile/ProfileSettingsModal';
import { AuthModal } from '../../components/auth/AuthModal';

export default function ProfileScreen() {
  const lang = useLanguage();
  const [editOpen, setEditOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ProfileFeedGrid
        lang={lang}
        header={
          <View>
            <ProfileNavBar
              lang={lang}
              onSettingsPress={() => setSettingsOpen(true)}
              onEditPress={() => setEditOpen(true)}
            />
            <ProfileViewHeader lang={lang} onLoginPress={() => setAuthOpen(true)} />
            <ProfileViewInfo lang={lang} />
          </View>
        }
      />

      <ProfileEditModal
        visible={editOpen}
        lang={lang}
        onClose={() => setEditOpen(false)}
      />
      <ProfileSettingsModal
        visible={settingsOpen}
        lang={lang}
        onClose={() => setSettingsOpen(false)}
      />
      <AuthModal
        visible={authOpen}
        lang={lang}
        onClose={() => setAuthOpen(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
});
