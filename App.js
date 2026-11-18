import React, { useEffect, useState } from 'react';
import {
  SafeAreaView, View, Text, TextInput, Pressable, FlatList,
  Alert, StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { supabase } from './src/supabase';

const colors = { bg:'#100D18', panel:'#1B1626', gold:'#D9B56D', text:'#F7F3FC', muted:'#A9A0B5', line:'#342B43', danger:'#F28B82' };

export default function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [caption, setCaption] = useState('');
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [posts, setPosts] = useState([]);
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState('feed');

  useEffect(() => {
    if (!supabase) { setLoading(false); return; }
    supabase.auth.getSession().then(({ data, error }) => {
      if (error) Alert.alert('خطا', error.message);
      setSession(data?.session ?? null);
      setLoading(false);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (session) {
      loadPosts();
      loadProfile();
    } else {
      setPosts([]);
    }
  }, [session]);

  async function loadPosts() {
    const { data, error } = await supabase.from('posts')
      .select('id,user_id,caption,created_at')
      .order('created_at', { ascending: false }).limit(50);
    if (error) Alert.alert('خطا در دریافت پست‌ها', error.message);
    else setPosts(data || []);
  }

  async function loadProfile() {
    const { data, error } = await supabase.from('profiles')
      .select('username,bio').eq('id', session.user.id).maybeSingle();
    if (error) return;
    setUsername(data?.username || '');
    setBio(data?.bio || '');
  }

  async function signIn() {
    if (!email.trim() || !password) return Alert.alert('اطلاعات ناقص', 'ایمیل و رمز عبور را وارد کن.');
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setBusy(false);
    if (error) Alert.alert('ورود ناموفق', error.message);
  }

  async function signUp() {
    if (!email.trim() || password.length < 6) return Alert.alert('اطلاعات ناقص', 'ایمیل معتبر و رمز حداقل ۶ کاراکتری وارد کن.');
    setBusy(true);
    const { data, error } = await supabase.auth.signUp({ email: email.trim(), password });
    setBusy(false);
    if (error) return Alert.alert('ثبت‌نام ناموفق', error.message);
    if (!data.session) Alert.alert('ایمیل تأیید', 'برای فعال شدن حساب، ایمیل تأیید را بررسی کن.');
  }

  async function publish() {
    if (!caption.trim()) return;
    setBusy(true);
    const { error } = await supabase.from('posts').insert({
      user_id: session.user.id, caption: caption.trim()
    });
    setBusy(false);
    if (error) Alert.alert('انتشار ناموفق', error.message);
    else { setCaption(''); loadPosts(); }
  }

  async function saveProfile() {
    setBusy(true);
    const { error } = await supabase.from('profiles').upsert({
      id: session.user.id,
      username: username.trim() || null,
      bio: bio.trim()
    });
    setBusy(false);
    if (error) Alert.alert('ذخیره نشد', error.message);
    else Alert.alert('انجام شد', 'پروفایل ذخیره شد.');
  }

  async function signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) Alert.alert('خطا', error.message);
  }

  if (loading) return <SafeAreaView style={styles.center}><ActivityIndicator color={colors.gold} size="large" /></SafeAreaView>;

  if (!supabase) return (
    <SafeAreaView style={styles.center}>
      <StatusBar style="light" />
      <Text style={styles.logo}>AVENZO</Text>
      <Text style={styles.muted}>تنظیمات اتصال Supabase پیدا نشد.</Text>
      <Text style={styles.muted}>فایل .env را بساز و آدرس پروژه و کلید Publishable را وارد کن.</Text>
    </SafeAreaView>
  );

  if (!session) return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.authWrap}>
        <Text style={styles.logo}>AVENZO</Text>
        <Text style={styles.tagline}>دنیای تو، ارتباط‌های تو</Text>
        <View style={styles.panel}>
          <Text style={styles.heading}>ورود یا ساخت حساب</Text>
          <TextInput style={styles.input} placeholder="ایمیل" placeholderTextColor={colors.muted} autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail} />
          <TextInput style={styles.input} placeholder="رمز عبور (حداقل ۶ کاراکتر)" placeholderTextColor={colors.muted} secureTextEntry value={password} onChangeText={setPassword} />
          <Action title="ورود" onPress={signIn} disabled={busy} />
          <Pressable onPress={signUp} disabled={busy} style={styles.secondaryButton}><Text style={styles.secondaryText}>ساخت حساب جدید</Text></Pressable>
          {busy && <ActivityIndicator color={colors.gold} />}
          <Text style={styles.note}>در این نسخه ورود با ایمیل فعال است؛ ورود پیامکی هنوز راه‌اندازی نشده است.</Text>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      <View style={styles.header}>
        <Text style={styles.logoSmall}>AVENZO</Text>
        <Pressable onPress={signOut}><Text style={styles.secondaryText}>خروج</Text></Pressable>
      </View>
      <View style={styles.tabs}>
        <Pressable onPress={() => setTab('feed')} style={[styles.tab, tab === 'feed' && styles.activeTab]}><Text style={styles.tabText}>خانه</Text></Pressable>
        <Pressable onPress={() => setTab('profile')} style={[styles.tab, tab === 'profile' && styles.activeTab]}><Text style={styles.tabText}>پروفایل</Text></Pressable>
      </View>
      {tab === 'feed' ? (
        <View style={styles.content}>
          <View style={styles.panel}>
            <Text style={styles.heading}>چه خبر؟</Text>
            <TextInput style={[styles.input, styles.captionInput]} placeholder="چیزی بنویس..." placeholderTextColor={colors.muted} multiline value={caption} onChangeText={setCaption} />
            <Action title="انتشار پست" onPress={publish} disabled={busy || !caption.trim()} />
          </View>
          <FlatList
            data={posts}
            keyExtractor={(item) => String(item.id)}
            refreshing={false}
            onRefresh={loadPosts}
            ListEmptyComponent={<Text style={styles.empty}>هنوز پستی منتشر نشده است. اولین پست را تو منتشر کن!</Text>}
            renderItem={({ item }) => (
              <View style={styles.post}>
                <Text style={styles.postAuthor}>کاربر AVENZO</Text>
                <Text style={styles.postText}>{item.caption}</Text>
                <Text style={styles.date}>{new Date(item.created_at).toLocaleString()}</Text>
              </View>
            )}
          />
        </View>
      ) : (
        <View style={styles.content}>
          <View style={styles.panel}>
            <Text style={styles.heading}>پروفایل من</Text>
            <Text style={styles.label}>نام کاربری</Text>
            <TextInput style={styles.input} placeholder="مثلاً avenzo_user" placeholderTextColor={colors.muted} value={username} onChangeText={setUsername} autoCapitalize="none" />
            <Text style={styles.label}>درباره من</Text>
            <TextInput style={[styles.input, styles.captionInput]} placeholder="چند کلمه درباره خودت..." placeholderTextColor={colors.muted} value={bio} onChangeText={setBio} multiline />
            <Action title="ذخیره پروفایل" onPress={saveProfile} disabled={busy} />
            <Text style={styles.note}>ایمیل حساب: {session.user.email}</Text>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

function Action({ title, onPress, disabled }) {
  return <Pressable onPress={onPress} disabled={disabled} style={[styles.action, disabled && { opacity: 0.5 }]}><Text style={styles.actionText}>{title}</Text></Pressable>;
}

const styles = StyleSheet.create({
  container:{ flex:1, backgroundColor:colors.bg },
  center:{ flex:1, backgroundColor:colors.bg, alignItems:'center', justifyContent:'center', padding:24, gap:12 },
  authWrap:{ flex:1, justifyContent:'center', padding:22 },
  logo:{ color:colors.gold, fontSize:38, fontWeight:'900', letterSpacing:5, textAlign:'center' },
  logoSmall:{ color:colors.gold, fontSize:23, fontWeight:'900', letterSpacing:3 },
  tagline:{ color:colors.muted, textAlign:'center', marginTop:8, marginBottom:30 },
  panel:{ backgroundColor:colors.panel, borderColor:colors.line, borderWidth:1, borderRadius:18, padding:18, marginBottom:16 },
  heading:{ color:colors.text, fontSize:19, fontWeight:'800', marginBottom:16, textAlign:'right' },
  input:{ backgroundColor:'#120F1B', borderWidth:1, borderColor:colors.line, borderRadius:12, padding:13, color:colors.text, marginBottom:12, textAlign:'right' },
  captionInput:{ minHeight:76, textAlignVertical:'top' },
  action:{ backgroundColor:colors.gold, borderRadius:12, padding:14, alignItems:'center', marginTop:4 },
  actionText:{ color:'#21182A', fontWeight:'900', fontSize:15 },
  secondaryButton:{ padding:14, alignItems:'center' },
  secondaryText:{ color:colors.gold, fontWeight:'700' },
  note:{ color:colors.muted, fontSize:12, lineHeight:19, textAlign:'center', marginTop:12 },
  muted:{ color:colors.muted, textAlign:'center', lineHeight:22 },
  header:{ paddingHorizontal:18, paddingVertical:12, flexDirection:'row', justifyContent:'space-between', alignItems:'center' },
  tabs:{ flexDirection:'row', borderBottomWidth:1, borderColor:colors.line },
  tab:{ flex:1, padding:13, alignItems:'center' },
  activeTab:{ borderBottomWidth:2, borderColor:colors.gold },
  tabText:{ color:colors.text, fontWeight:'700' },
  content:{ flex:1, padding:14 },
  empty:{ color:colors.muted, textAlign:'center', padding:30 },
  post:{ backgroundColor:colors.panel, borderColor:colors.line, borderWidth:1, borderRadius:16, padding:16, marginBottom:12 },
  postAuthor:{ color:colors.gold, fontWeight:'800', textAlign:'right', marginBottom:10 },
  postText:{ color:colors.text, fontSize:16, lineHeight:24, textAlign:'right' },
  date:{ color:colors.muted, fontSize:11, marginTop:12, textAlign:'right' },
  label:{ color:colors.muted, textAlign:'right', marginBottom:7 }
});
