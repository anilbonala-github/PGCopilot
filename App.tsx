import React, { useEffect, useMemo, useState } from 'react';
import {
  Image,
  InputAccessoryView,
  Keyboard,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar as NativeStatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as DocumentPicker from 'expo-document-picker';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { Session } from '@supabase/supabase-js';
import { isSupabaseConfigured, supabase } from './src/lib/supabase';
import {
  acceptStaffInvites,
  buildSummary,
  createOwnerHostel,
  createExpense as saveExpense,
  createTenant as saveTenant,
  fallbackData,
  generateMonthlyRent as generateRentBills,
  inviteStaff,
  loadPgMasterData,
  recordRentPayment as saveRentPayment,
  updateTenant as saveTenantUpdate,
  vacateTenant as saveTenantVacate,
  type HostelSetupInput,
  type ExpenseCategory,
  type NewTenantInput,
  type NewExpenseInput,
  type PaymentMode,
  type RecordRentPaymentInput,
  type RentBill,
  type RentReceipt,
  type PgMasterData,
  type Tenant,
  type TenantActivity,
  type TenantDocument,
  type TenantDocumentInput,
  type TenantDocumentType,
  type UpdateTenantInput,
  type VacateTenantInput,
} from './src/lib/pgcopilotData';

type IconName = keyof typeof MaterialCommunityIcons.glyphMap;
type Tab = 'Home' | 'Rooms' | 'Tenants' | 'Rent' | 'AI' | 'More';
type Tone = 'green' | 'orange' | 'red' | 'blue' | 'ink' | 'purple';
type AiIntent = 'greeting' | 'room_lookup' | 'pending_rent' | 'vacant_beds' | 'vacating_next_month' | 'profit' | 'profit_decrease' | 'new_admissions' | 'expense_analysis' | 'documents' | 'daily_ops' | 'reports' | 'command' | 'general';

type AiAnswer = {
  type: AiIntent;
  title: string;
  answer: string;
  bullets: string[];
  insight?: string;
  metrics?: { label: string; value: string; tone: Tone }[];
  actions?: string[];
  source: 'local' | 'gemini';
};

type BusinessHealth = {
  score: number;
  label: string;
  tone: Tone;
  positives: string[];
  warnings: string[];
  recommendation: string;
};

type OwnerProfile = {
  name: string;
  phone?: string;
  role: string;
  propertyName: string;
  propertyAddress?: string;
  photoUrl?: string;
};

type AiChatMessage = {
  id: string;
  role: 'owner' | 'assistant';
  text: string;
  answer?: AiAnswer;
  createdAt: Date;
};

type AiCommand =
  | {
      kind: 'record_payment';
      title: string;
      summary: string;
      tenantName: string;
      billId?: string;
      amount: number;
      paymentMode: PaymentMode;
      disabledReason?: string;
    }
  | {
      kind: 'add_expense';
      title: string;
      summary: string;
      amount: number;
      category: ExpenseCategory;
      disabledReason?: string;
    }
  | {
      kind: 'generate_report' | 'send_reminder' | 'move_tenant' | 'vacate_tenant' | 'open_profile';
      title: string;
      summary: string;
      disabledReason?: string;
    };

const colors = {
  bg: '#F6F6F1',
  card: '#FFFFFF',
  ink: '#17231F',
  muted: '#75827D',
  line: '#E8ECE8',
  green: '#0E7A5F',
  paleGreen: '#E6F4EE',
  orange: '#E98B37',
  paleOrange: '#FFF2E3',
  red: '#D95E52',
  paleRed: '#FDECEA',
  blue: '#3E78B2',
  paleBlue: '#EBF3FB',
  purple: '#7657AF',
  palePurple: '#F0EBFA',
};

const loginKeyboardAccessoryId = 'pgcopilot-login-keyboard-actions';

const money = (value: number) =>
  `₹${value.toLocaleString('en-IN')}`;

const maskAadhaar = (value?: string) => {
  const digits = (value ?? '').replace(/\D/g, '');
  return digits.length >= 4 ? `XXXX XXXX ${digits.slice(-4)}` : 'Not added';
};

const whatsappPhone = (value: string) => {
  const digits = value.replace(/\D/g, '');
  return digits.length === 10 ? `91${digits}` : digits;
};

const initialsForName = (name: string) =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || 'PG';

const pgcopilotLogo = require('./assets/login-mark.png');

const greetingForTime = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
};

const formatChatTime = (date: Date) =>
  date.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });

const newAiMessageId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

function AppIcon({ name, size = 20, color = colors.green }: { name: IconName; size?: number; color?: string }) {
  return <MaterialCommunityIcons name={name} size={size} color={color} />;
}

function Chip({ label, tone = 'green' }: { label: string; tone?: Tone }) {
  const palette: Record<Tone, [string, string]> = {
    green: [colors.paleGreen, colors.green],
    orange: [colors.paleOrange, colors.orange],
    red: [colors.paleRed, colors.red],
    blue: [colors.paleBlue, colors.blue],
    purple: [colors.palePurple, colors.purple],
    ink: ['#EDF0EE', colors.ink],
  };
  return (
    <View style={[styles.chip, { backgroundColor: palette[tone][0] }]}>
      <Text style={[styles.chipText, { color: palette[tone][1] }]}>{label}</Text>
    </View>
  );
}

function TenantAvatar({
  initials,
  name,
  photoUrl,
  tone,
  size = 'list',
  onPress,
}: {
  initials?: string;
  name: string;
  photoUrl?: string;
  tone?: string;
  size?: 'list' | 'detail';
  onPress?: () => void;
}) {
  const dimension = size === 'detail' ? 58 : 39;
  const content = (
    <View style={[size === 'detail' ? styles.detailAvatar : styles.avatar, { backgroundColor: tone ?? colors.paleGreen }]}>
      {photoUrl ? (
        <Image source={{ uri: photoUrl }} style={{ width: dimension, height: dimension, borderRadius: dimension / 2 }} resizeMode="cover" />
      ) : (
        <Text style={size === 'detail' ? styles.detailAvatarText : styles.avatarText}>{initials || initialsForName(name)}</Text>
      )}
    </View>
  );
  return onPress ? <TouchableOpacity onPress={onPress}>{content}</TouchableOpacity> : content;
}

function ImagePreviewModal({ uri, onClose }: { uri?: string; onClose: () => void }) {
  return (
    <Modal visible={Boolean(uri)} animationType="fade" transparent>
      <View style={styles.imagePreviewBackdrop}>
        <View style={styles.imagePreviewCard}>
          <TouchableOpacity style={styles.imagePreviewClose} onPress={onClose}><AppIcon name="close" size={22} color={colors.ink} /></TouchableOpacity>
          {uri ? <Image source={{ uri }} style={styles.imagePreview} resizeMode="contain" /> : null}
        </View>
      </View>
    </Modal>
  );
}

function SectionTitle({ title, action }: { title: string; action?: string }) {
  return (
    <View style={styles.sectionHeading}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {action ? <Text style={styles.sectionAction}>{action}</Text> : null}
    </View>
  );
}

function Header({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <View style={styles.header}>
      <View>
        <Text style={styles.pageTitle}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      <TouchableOpacity style={styles.iconButton}>
        <AppIcon name="bell-outline" size={22} color={colors.ink} />
        <View style={styles.notificationDot} />
      </TouchableOpacity>
    </View>
  );
}

function SyncBanner({ loading, source, error }: { loading: boolean; source: 'supabase' | 'demo'; error?: string }) {
  const label = loading
    ? 'Syncing with Supabase...'
    : source === 'supabase'
      ? 'Live Supabase data'
      : error
        ? `Live database unavailable: ${error}`
        : 'Live database not connected. Add Hostinger environment variables and redeploy.';

  return (
    <View style={[styles.syncBanner, source === 'supabase' && !loading ? styles.syncBannerLive : styles.syncBannerDemo]}>
      <AppIcon name={source === 'supabase' && !loading ? 'database-check-outline' : 'database-clock-outline'} size={15} color={source === 'supabase' && !loading ? colors.green : colors.orange} />
      <Text style={styles.syncText}>{label}</Text>
    </View>
  );
}

function Dashboard({
  onNavigate,
  data,
  loading,
  source,
  error,
  onSelectHostel,
  onCreateHostel,
}: {
  onNavigate: (tab: Tab) => void;
  data: PgMasterData;
  loading: boolean;
  source: 'supabase' | 'demo';
  error?: string;
  onSelectHostel: (hostelId: string) => Promise<void>;
  onCreateHostel: (input: HostelSetupInput) => Promise<void>;
}) {
  const [hostelPickerOpen, setHostelPickerOpen] = useState(false);
  const summary = buildSummary(data);
  const metrics = [
    { label: 'Total beds', value: String(summary.totalBeds), icon: 'bed-outline' as IconName, tone: 'green' as Tone },
    { label: 'Occupied', value: String(summary.occupiedBeds), icon: 'account-check-outline' as IconName, tone: 'blue' as Tone },
    { label: 'Vacant', value: String(summary.vacantBeds), icon: 'bed-empty' as IconName, tone: 'orange' as Tone },
    { label: 'Occupancy', value: `${summary.occupancyRate}%`, icon: 'chart-donut' as IconName, tone: 'purple' as Tone },
  ];
  const recentActivities = (data.tenantActivities ?? []).slice(0, 3);
  const aiInsights = buildAiInsights(data).slice(0, 4);
  return (
    <>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <SyncBanner loading={loading} source={source} error={error} />
        <View style={styles.welcomeHeader}>
          <View>
            <Text style={styles.eyebrow}>TUESDAY, 2 JUNE</Text>
            <Text style={styles.greeting}>Good evening, Anil</Text>
            <TouchableOpacity style={styles.propertyRow} onPress={() => setHostelPickerOpen(true)}>
              <Text style={styles.propertyName}>{data.propertyName}</Text>
              <AppIcon name="chevron-down" size={18} color={colors.green} />
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={styles.iconButton}>
            <AppIcon name="bell-outline" size={22} color={colors.ink} />
            <View style={styles.notificationDot} />
          </TouchableOpacity>
        </View>

        <View style={styles.metricsGrid}>
          {metrics.map((item) => (
            <View key={item.label} style={styles.metricCard}>
              <View style={[styles.miniIcon, { backgroundColor: item.tone === 'green' ? colors.paleGreen : item.tone === 'blue' ? colors.paleBlue : item.tone === 'orange' ? colors.paleOrange : colors.palePurple }]}>
                <AppIcon name={item.icon} size={18} color={colors[item.tone]} />
              </View>
              <Text style={styles.metricValue}>{item.value}</Text>
              <Text style={styles.metricLabel}>{item.label}</Text>
            </View>
          ))}
        </View>

      <View style={styles.collectionCard}>
        <View style={styles.collectionTop}>
          <View>
            <Text style={styles.cardEyebrow}>JUNE COLLECTION</Text>
            <Text style={styles.collectionValue}>{money(summary.collectedRent)}</Text>
            <Text style={styles.collectionTotal}>of {money(summary.expectedRent)} expected</Text>
          </View>
          <View style={styles.progressCircle}>
            <Text style={styles.progressValue}>{summary.occupancyRate}%</Text>
          </View>
        </View>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${summary.expectedRent ? Math.round((summary.collectedRent / summary.expectedRent) * 100) : 0}%` }]} />
        </View>
        <View style={styles.collectionFooter}>
          <View>
            <Text style={styles.smallMuted}>Collected</Text>
            <Text style={styles.smallStrong}>{money(summary.collectedRent)}</Text>
          </View>
          <View>
            <Text style={styles.smallMuted}>Pending</Text>
            <Text style={[styles.smallStrong, { color: colors.red }]}>{money(summary.pendingRent)}</Text>
          </View>
          <TouchableOpacity style={styles.remindButton}>
            <AppIcon name="message-text-outline" size={15} color={colors.green} />
            <Text style={styles.remindText}>Remind</Text>
          </TouchableOpacity>
        </View>
      </View>

      <SectionTitle title="AI insights" action="Ask AI" />
      <View style={styles.aiInsightGrid}>
        {aiInsights.map((insight) => (
          <TouchableOpacity key={insight.title} style={styles.aiInsightCard} onPress={() => onNavigate('AI')}>
            <View style={[styles.aiInsightIcon, { backgroundColor: toneBackground(insight.tone) }]}>
              <AppIcon name={insight.icon} size={18} color={colors[insight.tone]} />
            </View>
            <Text style={styles.aiInsightTitle}>{insight.title}</Text>
            <Text style={styles.aiInsightText}>{insight.text}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <SectionTitle title="Needs attention" action="View all" />
      <View style={styles.attentionRow}>
        <TouchableOpacity style={styles.attentionCard} onPress={() => onNavigate('Rent')}>
          <View style={[styles.attentionIcon, { backgroundColor: colors.paleRed }]}>
            <AppIcon name="wallet-outline" color={colors.red} size={20} />
          </View>
          <Text style={styles.attentionValue}>{data.tenants.filter((tenant) => tenant.status !== 'Paid').length}</Text>
          <Text style={styles.attentionLabel}>Pending rents</Text>
          <Text style={styles.attentionCaption}>{money(summary.pendingRent)} due</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.attentionCard} onPress={() => onNavigate('Tenants')}>
          <View style={[styles.attentionIcon, { backgroundColor: colors.paleOrange }]}>
            <AppIcon name="calendar-clock-outline" color={colors.orange} size={20} />
          </View>
          <Text style={styles.attentionValue}>{summary.upcomingVacates}</Text>
          <Text style={styles.attentionLabel}>Upcoming vacates</Text>
          <Text style={styles.attentionCaption}>Next 30 days</Text>
        </TouchableOpacity>
      </View>

      <SectionTitle title="Quick actions" />
      <View style={styles.quickRow}>
        {[
          ['account-plus-outline', 'Add tenant', 'Tenants'],
          ['cash-plus', 'Record rent', 'Rent'],
          ['bed-outline', 'Manage beds', 'Rooms'],
          ['robot-outline', 'Ask AI', 'AI'],
        ].map(([icon, label, tab]) => (
          <TouchableOpacity key={label} style={styles.quickAction} onPress={() => onNavigate(tab as Tab)}>
            <View style={styles.quickIcon}><AppIcon name={icon as IconName} size={21} /></View>
            <Text style={styles.quickLabel}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <SectionTitle title="Recent activity" action="View all" />
      <View style={styles.listCard}>
        {recentActivities.length ? recentActivities.map((activity, index, all) => (
          <Activity
            key={activity.id}
            icon={activityIcon(activity.activityType)}
            tone={activityTone(activity.activityType)}
            title={activityTitle(activity)}
            caption={activityDetail(activity)}
            last={index === all.length - 1}
          />
        )) : (
          <>
            <Activity icon="cash-check" tone="green" title={`Rent collected from ${data.tenants.find((tenant) => tenant.status === 'Paid')?.name ?? 'tenant'}`} caption="UPI payment - synced record" value={`+ ${money(data.tenants.find((tenant) => tenant.status === 'Paid')?.rent ?? 0)}`} />
            <Activity icon="account-plus-outline" tone="blue" title={`${summary.newAdmissions} active admissions`} caption={`${data.tenants.length} tenants available`} />
            <Activity icon="file-document-outline" tone="orange" title={`${data.expenses[0]?.label ?? 'Expense'} added`} caption="Current month" value={`- ${money(data.expenses[0]?.amount ?? 0)}`} last />
          </>
        )}
      </View>
      </ScrollView>
      <HostelSwitcherModal
        visible={hostelPickerOpen}
        data={data}
        onClose={() => setHostelPickerOpen(false)}
        onSelectHostel={onSelectHostel}
        onCreateHostel={onCreateHostel}
      />
    </>
  );
}

function HostelSwitcherModal({
  visible,
  data,
  onClose,
  onSelectHostel,
  onCreateHostel,
}: {
  visible: boolean;
  data: PgMasterData;
  onClose: () => void;
  onSelectHostel: (hostelId: string) => Promise<void>;
  onCreateHostel: (input: HostelSetupInput) => Promise<void>;
}) {
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const hostels = data.hostels ?? [];
  const selectedHostelId = data.selectedHostelId ?? data.hostelId;
  const canCreateHostel = data.currentUserRole === 'Owner';

  const handleCreate = async () => {
    if (!name.trim() || !address.trim()) {
      setError('Hostel name and address are required.');
      return;
    }

    setSaving(true);
    setError(undefined);
    try {
      await onCreateHostel({
        name: name.trim(),
        address: address.trim(),
        contactNumber: contactNumber.trim(),
      });
      setName('');
      setAddress('');
      setContactNumber('');
      onClose();
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : 'Unable to create hostel.');
    } finally {
      setSaving(false);
    }
  };

  const handleSelect = async (hostelId: string) => {
    await onSelectHostel(hostelId);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <View style={styles.modalSheet}>
          <View style={styles.modalHandle} />
          <View style={styles.modalHeader}>
            <View>
              <Text style={styles.modalTitle}>Switch hostel</Text>
              <Text style={styles.subtitle}>Each hostel has isolated rooms, beds, tenants and reports.</Text>
            </View>
            <TouchableOpacity onPress={onClose}><AppIcon name="close" size={23} color={colors.ink} /></TouchableOpacity>
          </View>

          <SectionTitle title="Your hostels" />
          <View style={styles.listCard}>
            {hostels.map((hostel, index) => (
              <TouchableOpacity
                key={hostel.id}
                style={[styles.hostelOption, index !== hostels.length - 1 && styles.divider, selectedHostelId === hostel.id && styles.hostelOptionActive]}
                onPress={() => handleSelect(hostel.id)}
              >
                <View style={styles.flex}>
                  <Text style={styles.tenantName}>{hostel.name}</Text>
                  <Text style={styles.activityCaption}>{hostel.address}</Text>
                </View>
                <Chip label={hostel.role} tone={hostel.role === 'Owner' ? 'green' : 'purple'} />
              </TouchableOpacity>
            ))}
          </View>

          {canCreateHostel ? (
            <>
              <SectionTitle title="Add another hostel" />
              <View style={styles.hostelCreateBox}>
                <View style={styles.formRow}>
                  <View style={[styles.formField, styles.flex]}><Text style={styles.fieldLabel}>HOSTEL NAME</Text><TextInput placeholder="Green Home Boys Hostel" style={styles.fieldInput} value={name} onChangeText={setName} /></View>
                </View>
                <View style={styles.formRow}>
                  <View style={[styles.formField, styles.flex]}><Text style={styles.fieldLabel}>ADDRESS</Text><TextInput placeholder="Area, city" style={styles.fieldInput} value={address} onChangeText={setAddress} /></View>
                </View>
                <View style={styles.formRow}>
                  <View style={[styles.formField, styles.flex]}><Text style={styles.fieldLabel}>CONTACT NUMBER</Text><TextInput placeholder="Optional" style={styles.fieldInput} value={contactNumber} onChangeText={setContactNumber} keyboardType="phone-pad" /></View>
                </View>
                {error ? <Text style={styles.authError}>{error}</Text> : null}
                <TouchableOpacity style={styles.primaryButton} onPress={handleCreate} disabled={saving}><Text style={styles.primaryButtonText}>{saving ? 'Creating...' : 'Create and switch'}</Text></TouchableOpacity>
              </View>
            </>
          ) : (
            <Text style={styles.loginSecurityHint}>Staff can switch only between hostels assigned by an owner.</Text>
          )}
        </View>
      </View>
    </Modal>
  );
}

function Activity({ icon, tone, title, caption, value, last }: { icon: IconName; tone: Tone; title: string; caption: string; value?: string; last?: boolean }) {
  const palette = { green: colors.paleGreen, blue: colors.paleBlue, orange: colors.paleOrange, red: colors.paleRed, purple: colors.palePurple, ink: '#EDF0EE' };
  return (
    <View style={[styles.activity, !last && styles.divider]}>
      <View style={[styles.activityIcon, { backgroundColor: palette[tone] }]}>
        <AppIcon name={icon} size={18} color={colors[tone]} />
      </View>
      <View style={styles.flex}>
        <Text style={styles.activityTitle}>{title}</Text>
        <Text style={styles.activityCaption}>{caption}</Text>
      </View>
      {value ? <Text style={[styles.activityValue, { color: value.startsWith('+') ? colors.green : colors.red }]}>{value}</Text> : null}
    </View>
  );
}

function Rooms({ data }: { data: PgMasterData }) {
  const [filter, setFilter] = useState('All');
  const summary = buildSummary(data);
  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
      <Header title="Rooms & Beds" subtitle={`${summary.totalBeds} beds across ${data.rooms.length} rooms`} />
      <View style={styles.searchBar}>
        <AppIcon name="magnify" size={20} color={colors.muted} />
        <Text style={styles.searchPlaceholder}>Search room or bed number</Text>
        <AppIcon name="tune-variant" size={19} color={colors.green} />
      </View>
      <View style={styles.filterRow}>
        {['All', 'Vacant', 'Occupied', 'Reserved'].map((item) => (
          <TouchableOpacity key={item} style={[styles.filterChip, filter === item && styles.filterChipActive]} onPress={() => setFilter(item)}>
            <Text style={[styles.filterText, filter === item && styles.filterTextActive]}>{item}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <View style={styles.statsStrip}>
        <SmallStat value={String(summary.vacantBeds)} label="Vacant" tone="green" />
        <SmallStat value={String(summary.occupiedBeds)} label="Occupied" tone="blue" />
        <SmallStat value={String(summary.reservedBeds)} label="Reserved" tone="orange" />
        <SmallStat value={String(summary.maintenanceBeds)} label="Repair" tone="red" />
      </View>
      <SectionTitle title="Room master" action="+ Add room" />
      {data.rooms.map((room) => (
        <View key={room.number} style={styles.roomCard}>
          <View style={styles.roomTop}>
            <View>
              <Text style={styles.roomTitle}>Room {room.number}</Text>
              <Text style={styles.roomCaption}>{room.floor} · {room.type} sharing</Text>
            </View>
            <AppIcon name="dots-horizontal" color={colors.muted} size={21} />
          </View>
          <View style={styles.bedRow}>
            {room.beds.map((status, index) => (
              <View key={`${room.number}-${index}`} style={[styles.bedBox, status === 'Vacant' && styles.bedVacant, status === 'Reserved' && styles.bedReserved, status === 'Maintenance' && styles.bedMaintenance]}>
                <AppIcon name="bed-outline" size={19} color={status === 'Vacant' ? colors.green : status === 'Reserved' ? colors.orange : status === 'Maintenance' ? colors.red : colors.blue} />
                <Text style={styles.bedName}>{room.bedNumbers?.[index] ?? `${room.number}-${String.fromCharCode(65 + index)}`}</Text>
                <Text style={[styles.bedStatus, { color: status === 'Vacant' ? colors.green : status === 'Reserved' ? colors.orange : status === 'Maintenance' ? colors.red : colors.blue }]}>{status}</Text>
              </View>
            ))}
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

function SmallStat({ value, label, tone }: { value: string; label: string; tone: Tone }) {
  return <View style={styles.smallStat}><Text style={[styles.smallStatValue, { color: colors[tone] }]}>{value}</Text><Text style={styles.smallStatLabel}>{label}</Text></View>;
}

function Tenants({
  data,
  onAddTenant,
  onUpdateTenant,
  onVacateTenant,
  onRecordPayment,
  onGenerateRent,
}: {
  data: PgMasterData;
  onAddTenant: (input: NewTenantInput) => Promise<void>;
  onUpdateTenant: (input: UpdateTenantInput) => Promise<void>;
  onVacateTenant: (input: VacateTenantInput) => Promise<void>;
  onRecordPayment: (input: RecordRentPaymentInput) => Promise<void>;
  onGenerateRent: () => Promise<void>;
}) {
  const [modal, setModal] = useState(false);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('All');
  const [selectedTenantId, setSelectedTenantId] = useState<string | undefined>();
  const summary = buildSummary(data);
  const selectedTenant = data.tenants.find((tenant) => (tenant.id ?? tenant.name) === selectedTenantId);
  const visibleTenants = data.tenants.filter((tenant) => {
    const haystack = [tenant.name, tenant.mobile, tenant.room, tenant.roomNumber, tenant.companyCollege].join(' ').toLowerCase();
    const matchesSearch = haystack.includes(query.toLowerCase());
    const matchesFilter =
      filter === 'All'
      || (filter === 'Active' && tenant.admissionStatus !== 'Vacated')
      || (filter === 'Vacated' && tenant.admissionStatus === 'Vacated')
      || (filter === 'Rent paid' && tenant.status === 'Paid')
      || (filter === 'Rent pending' && tenant.status === 'Pending')
      || (filter === 'Rent partial' && tenant.status === 'Partial')
      || (filter === 'Missing docs' && (tenant.documentCount ?? 0) < tenantDocumentTypes.length)
      || (filter === 'Food included' && tenant.foodIncluded)
      || (filter === 'Food not included' && !tenant.foodIncluded);
    return matchesSearch && matchesFilter;
  });

  if (selectedTenant) {
    return (
      <TenantDetail
        tenant={selectedTenant}
        data={data}
        onBack={() => setSelectedTenantId(undefined)}
        onUpdateTenant={onUpdateTenant}
        onVacateTenant={onVacateTenant}
        onRecordPayment={onRecordPayment}
        onGenerateRent={onGenerateRent}
      />
    );
  }

  return (
    <>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <Header title="Tenants" subtitle={`${summary.activeTenants} active residents`} />
        <View style={styles.searchBar}>
          <AppIcon name="magnify" size={20} color={colors.muted} />
          <TextInput placeholder="Search name, mobile, room or company" placeholderTextColor={colors.muted} value={query} onChangeText={setQuery} style={styles.searchInput} />
          <AppIcon name="tune-variant" size={19} color={colors.green} />
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroller}>
          {['All', 'Active', 'Vacated', 'Rent paid', 'Rent pending', 'Rent partial', 'Missing docs', 'Food included', 'Food not included'].map((item) => (
            <TouchableOpacity key={item} style={[styles.filterChip, filter === item && styles.filterChipActive]} onPress={() => setFilter(item)}>
              <Text style={[styles.filterText, filter === item && styles.filterTextActive]}>{item}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        <View style={styles.tenantSummary}>
          <View><Text style={styles.summaryNumber}>{summary.activeTenants}</Text><Text style={styles.summaryLabel}>Active</Text></View>
          <View><Text style={styles.summaryNumber}>{summary.newAdmissions}</Text><Text style={styles.summaryLabel}>New this month</Text></View>
          <View><Text style={styles.summaryNumber}>{summary.upcomingVacates}</Text><Text style={styles.summaryLabel}>Vacating soon</Text></View>
        </View>
        <SectionTitle title="Residents" action={`${visibleTenants.length} shown`} />
        <View style={styles.listCard}>
          {visibleTenants.map((tenant, index) => (
            <TouchableOpacity key={tenant.id ?? tenant.name} style={[styles.tenantRow, index !== visibleTenants.length - 1 && styles.divider]} onPress={() => setSelectedTenantId(tenant.id ?? tenant.name)}>
              <TenantAvatar initials={tenant.initials} name={tenant.name} photoUrl={tenant.photoUrl} tone={tenant.tone} />
              <View style={styles.flex}>
                <Text style={styles.tenantName}>{tenant.name}</Text>
                <Text style={styles.activityCaption}>Room {tenant.room} - {tenant.mobile}</Text>
                <Text style={styles.activityCaption}>{tenant.companyCollege || 'Company/college not added'} - {tenant.documentCount ?? 0} documents</Text>
              </View>
              <Chip label={tenant.admissionStatus ?? 'Active'} tone={tenant.admissionStatus === 'Vacated' ? 'red' : 'green'} />
              <AppIcon name="chevron-right" size={20} color={colors.muted} />
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
      <TouchableOpacity accessibilityLabel="Add tenant" style={styles.fab} onPress={() => setModal(true)}><AppIcon name="plus" size={28} color="#FFF" /></TouchableOpacity>
      <AddTenantModal visible={modal} onClose={() => setModal(false)} onSubmit={onAddTenant} availableBeds={data.assignableBeds ?? []} />
    </>
  );
}
const tenantDocumentTypes: TenantDocumentType[] = [
  'Tenant Photo',
  'Aadhaar Front',
  'Aadhaar Back',
  'Employee ID',
  'Student ID',
  'Agreement Document',
];

function documentTypeLabel(type: TenantDocumentType) {
  if (type === 'Tenant Photo') return 'Photo';
  if (type === 'Agreement Document') return 'Agreement';
  return type;
}

function AddTenantModal({ visible, onClose, onSubmit, availableBeds }: { visible: boolean; onClose: () => void; onSubmit: (input: NewTenantInput) => Promise<void>; availableBeds: string[] }) {
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [emergencyContact, setEmergencyContact] = useState('');
  const [aadhaarNumber, setAadhaarNumber] = useState('');
  const [companyCollege, setCompanyCollege] = useState('');
  const [joiningDate, setJoiningDate] = useState(new Date().toISOString().slice(0, 10));
  const [roomBed, setRoomBed] = useState('');
  const [rent, setRent] = useState('');
  const [deposit, setDeposit] = useState('');
  const [foodIncluded, setFoodIncluded] = useState(true);
  const [rentDueDay, setRentDueDay] = useState('5');
  const [status, setStatus] = useState<'Active' | 'Vacated'>('Active');
  const [documents, setDocuments] = useState<TenantDocumentInput[]>([]);
  const [formError, setFormError] = useState<string | undefined>();
  const [saving, setSaving] = useState(false);

  const resetForm = () => {
    setName('');
    setMobile('');
    setEmergencyContact('');
    setAadhaarNumber('');
    setCompanyCollege('');
    setJoiningDate(new Date().toISOString().slice(0, 10));
    setRoomBed('');
    setRent('');
    setDeposit('');
    setFoodIncluded(true);
    setRentDueDay('5');
    setStatus('Active');
    setDocuments([]);
    setFormError(undefined);
  };

  const pickDocument = async (type: TenantDocumentType) => {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['image/*', 'application/pdf'],
      copyToCacheDirectory: true,
      multiple: false,
    });

    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];
    setDocuments((current) => [
      ...current.filter((document) => document.type !== type),
      {
        type,
        uri: asset.uri,
        name: asset.name || `${type}.file`,
        mimeType: asset.mimeType,
      },
    ]);
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      setFormError('Full name is required.');
      return;
    }

    if (mobile.replace(/\D/g, '').length !== 10) {
      setFormError('Mobile number must be 10 digits.');
      return;
    }

    if (aadhaarNumber && aadhaarNumber.replace(/\D/g, '').length !== 12) {
      setFormError('Aadhaar number should be 12 digits if entered.');
      return;
    }

    if (Number(rent || 0) <= 0) {
      setFormError('Rent must be greater than 0.');
      return;
    }

    if (Number(deposit || 0) < 0) {
      setFormError('Deposit cannot be negative.');
      return;
    }

    const dueDay = Number(rentDueDay || 5);
    if (!Number.isFinite(dueDay) || dueDay < 1 || dueDay > 31) {
      setFormError('Rent due date must be a day between 1 and 31.');
      return;
    }

    setSaving(true);
    setFormError(undefined);
    try {
      await onSubmit({
        name: name.trim(),
        mobile: mobile.trim(),
        emergencyContact: emergencyContact.trim(),
        aadhaarNumber: aadhaarNumber.trim(),
        companyCollege: companyCollege.trim(),
        joiningDate: joiningDate.trim(),
        roomBed: roomBed.trim(),
        rent: Number(rent || 0),
        deposit: Number(deposit || 0),
        foodIncluded,
        rentDueDay: dueDay,
        status,
        documents,
      });
      resetForm();
      onClose();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Unable to save tenant admission.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalBackdrop}>
        <View style={styles.modalSheet}>
          <View style={styles.modalHandle} />
          <View style={styles.modalHeader}>
            <View><Text style={styles.modalTitle}>New admission</Text><Text style={styles.subtitle}>Add tenant details and assign a bed</Text></View>
            <TouchableOpacity onPress={onClose}><AppIcon name="close" size={23} color={colors.ink} /></TouchableOpacity>
          </View>
          <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
          <View style={styles.formRow}>
            <View style={[styles.formField, styles.flex]}><Text style={styles.fieldLabel}>FULL NAME</Text><TextInput placeholder="Tenant name" style={styles.fieldInput} value={name} onChangeText={setName} /></View>
          </View>
          <View style={styles.formRow}>
            <View style={[styles.formField, styles.flex]}><Text style={styles.fieldLabel}>MOBILE NUMBER</Text><TextInput placeholder="+91" style={styles.fieldInput} value={mobile} onChangeText={setMobile} keyboardType="phone-pad" /></View>
            <View style={[styles.formField, styles.flex]}><Text style={styles.fieldLabel}>ROOM / BED</Text><TextInput placeholder="101-C" style={styles.fieldInput} value={roomBed} onChangeText={setRoomBed} /></View>
          </View>
          <View style={styles.availableBedBox}>
            <Text style={styles.fieldLabel}>AVAILABLE BEDS</Text>
            <View style={styles.availableBedRow}>
              {availableBeds.length ? availableBeds.map((bedNumber) => (
                <TouchableOpacity key={bedNumber} style={[styles.availableBedChip, roomBed === bedNumber && styles.availableBedChipActive]} onPress={() => setRoomBed(bedNumber)}>
                  <Text style={[styles.availableBedText, roomBed === bedNumber && styles.availableBedTextActive]}>{bedNumber}</Text>
                </TouchableOpacity>
              )) : <Text style={styles.activityCaption}>No vacant beds available in this hostel.</Text>}
            </View>
          </View>
          <View style={styles.formRow}>
            <View style={[styles.formField, styles.flex]}><Text style={styles.fieldLabel}>EMERGENCY CONTACT</Text><TextInput placeholder="+91" style={styles.fieldInput} value={emergencyContact} onChangeText={setEmergencyContact} keyboardType="phone-pad" /></View>
            <View style={[styles.formField, styles.flex]}><Text style={styles.fieldLabel}>AADHAAR NUMBER</Text><TextInput placeholder="xxxx xxxx xxxx" style={styles.fieldInput} value={aadhaarNumber} onChangeText={setAadhaarNumber} keyboardType="numeric" /></View>
          </View>
          <View style={styles.formRow}>
            <View style={[styles.formField, styles.flex]}><Text style={styles.fieldLabel}>COMPANY / COLLEGE</Text><TextInput placeholder="Company or college" style={styles.fieldInput} value={companyCollege} onChangeText={setCompanyCollege} /></View>
          </View>
          <View style={styles.formRow}>
            <View style={[styles.formField, styles.flex]}><Text style={styles.fieldLabel}>JOINING DATE</Text><TextInput placeholder="YYYY-MM-DD" style={styles.fieldInput} value={joiningDate} onChangeText={setJoiningDate} /></View>
            <View style={[styles.formField, styles.flex]}><Text style={styles.fieldLabel}>RENT DUE DATE</Text><TextInput placeholder="5" style={styles.fieldInput} value={rentDueDay} onChangeText={setRentDueDay} keyboardType="numeric" /></View>
          </View>
          <View style={styles.formRow}>
            <View style={[styles.formField, styles.flex]}><Text style={styles.fieldLabel}>MONTHLY RENT</Text><TextInput placeholder="₹ 0" style={styles.fieldInput} value={rent} onChangeText={setRent} keyboardType="numeric" /></View>
            <View style={[styles.formField, styles.flex]}><Text style={styles.fieldLabel}>DEPOSIT</Text><TextInput placeholder="₹ 0" style={styles.fieldInput} value={deposit} onChangeText={setDeposit} keyboardType="numeric" /></View>
          </View>
          <View style={styles.toggleRow}>
            <Text style={styles.tenantName}>Food included</Text>
            <View style={styles.segmentRow}>
              {(['Yes', 'No'] as const).map((item) => (
                <TouchableOpacity key={item} style={[styles.segmentChip, (foodIncluded ? item === 'Yes' : item === 'No') && styles.segmentChipActive]} onPress={() => setFoodIncluded(item === 'Yes')}>
                  <Text style={[styles.segmentText, (foodIncluded ? item === 'Yes' : item === 'No') && styles.segmentTextActive]}>{item}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          <View style={styles.toggleRow}>
            <Text style={styles.tenantName}>Status</Text>
            <View style={styles.segmentRow}>
              {(['Active', 'Vacated'] as const).map((item) => (
                <TouchableOpacity key={item} style={[styles.segmentChip, status === item && styles.segmentChipActive]} onPress={() => setStatus(item)}>
                  <Text style={[styles.segmentText, status === item && styles.segmentTextActive]}>{item}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          <SectionTitle title="Document uploads" />
          <View style={styles.documentGrid}>
            {tenantDocumentTypes.map((type) => {
              const document = documents.find((item) => item.type === type);
              return (
                <TouchableOpacity key={type} style={styles.documentButton} onPress={() => pickDocument(type)}>
                  <AppIcon name={document ? 'check-circle-outline' : 'upload-outline'} size={18} color={document ? colors.green : colors.muted} />
                  <View style={styles.flex}>
                    <Text style={styles.documentTitle}>{type}</Text>
                    <Text style={styles.activityCaption}>{document?.name ?? 'Tap to upload'}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
          {formError ? <Text style={styles.authError}>{formError}</Text> : null}
          <TouchableOpacity style={styles.primaryButton} onPress={handleSubmit} disabled={saving}><Text style={styles.primaryButtonText}>{saving ? 'Saving...' : 'Save admission'}</Text></TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function InfoLine({ label, value }: { label: string; value?: string | number }) {
  return (
    <View style={styles.infoLine}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value || 'Not added'}</Text>
    </View>
  );
}

function EditTenantModal({
  tenant,
  visible,
  onClose,
  onSubmit,
  availableBeds,
}: {
  tenant?: Tenant;
  visible: boolean;
  onClose: () => void;
  onSubmit: (input: UpdateTenantInput) => Promise<void>;
  availableBeds: string[];
}) {
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [emergencyContact, setEmergencyContact] = useState('');
  const [aadhaarNumber, setAadhaarNumber] = useState('');
  const [companyCollege, setCompanyCollege] = useState('');
  const [joiningDate, setJoiningDate] = useState('');
  const [roomBed, setRoomBed] = useState('');
  const [rent, setRent] = useState('');
  const [deposit, setDeposit] = useState('');
  const [foodIncluded, setFoodIncluded] = useState(true);
  const [rentDueDay, setRentDueDay] = useState('5');
  const [status, setStatus] = useState<'Active' | 'Vacated'>('Active');
  const [documents, setDocuments] = useState<TenantDocumentInput[]>([]);
  const [previewDocument, setPreviewDocument] = useState<TenantDocument | undefined>();
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | undefined>();

  useEffect(() => {
    if (!tenant) return;
    setName(tenant.name);
    setMobile(tenant.mobile);
    setEmergencyContact(tenant.emergencyContact ?? '');
    setAadhaarNumber(tenant.aadhaarNumber ?? '');
    setCompanyCollege(tenant.companyCollege ?? '');
    setJoiningDate(tenant.joiningDate ?? new Date().toISOString().slice(0, 10));
    setRoomBed(tenant.room === 'Unassigned' ? '' : tenant.room);
    setRent(String(tenant.rent || 0));
    setDeposit(String(tenant.deposit ?? 0));
    setFoodIncluded(Boolean(tenant.foodIncluded));
    setRentDueDay(String(tenant.rentDueDay ?? 5));
    setStatus(tenant.admissionStatus ?? 'Active');
    setDocuments([]);
    setPreviewDocument(undefined);
    setFormError(undefined);
  }, [tenant?.id]);

  const pickDocument = async (type: TenantDocumentType) => {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['image/*', 'application/pdf'],
      copyToCacheDirectory: true,
      multiple: false,
    });

    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];
    setDocuments((current) => [
      ...current.filter((document) => document.type !== type),
      {
        type,
        uri: asset.uri,
        name: asset.name || `${type}.file`,
        mimeType: asset.mimeType,
      },
    ]);
  };

  const handleSubmit = async () => {
    if (!tenant?.id) return;
    const digits = mobile.replace(/\D/g, '');
    if (!name.trim()) {
      setFormError('Full name is required.');
      return;
    }
    if (digits.length !== 10) {
      setFormError('Mobile number must be 10 digits.');
      return;
    }
    if (aadhaarNumber && aadhaarNumber.replace(/\D/g, '').length !== 12) {
      setFormError('Aadhaar number should be 12 digits if entered.');
      return;
    }
    if (Number(rent || 0) <= 0) {
      setFormError('Rent must be greater than 0.');
      return;
    }
    if (Number(deposit || 0) < 0) {
      setFormError('Deposit cannot be negative.');
      return;
    }

    setSaving(true);
    setFormError(undefined);
    try {
      await onSubmit({
        id: tenant.id,
        name: name.trim(),
        mobile: mobile.trim(),
        emergencyContact: emergencyContact.trim(),
        aadhaarNumber: aadhaarNumber.trim(),
        companyCollege: companyCollege.trim(),
        joiningDate: joiningDate.trim(),
        roomBed: roomBed.trim(),
        rent: Number(rent || 0),
        deposit: Number(deposit || 0),
        foodIncluded,
        rentDueDay: Number(rentDueDay || 5),
        status,
        documents,
      });
      onClose();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Unable to update tenant.');
    } finally {
      setSaving(false);
    }
  };

  const bedOptions = Array.from(new Set([tenant?.room, ...availableBeds].filter(Boolean))) as string[];

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalBackdrop}>
        <View style={styles.modalSheet}>
          <View style={styles.modalHandle} />
          <View style={styles.modalHeader}>
            <View><Text style={styles.modalTitle}>Edit tenant</Text><Text style={styles.subtitle}>Update profile, stay and rent details</Text></View>
            <TouchableOpacity onPress={onClose}><AppIcon name="close" size={23} color={colors.ink} /></TouchableOpacity>
          </View>
          <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
            <View style={styles.formRow}>
              <View style={[styles.formField, styles.flex]}><Text style={styles.fieldLabel}>FULL NAME</Text><TextInput style={styles.fieldInput} value={name} onChangeText={setName} /></View>
            </View>
            <View style={styles.formRow}>
              <View style={[styles.formField, styles.flex]}><Text style={styles.fieldLabel}>MOBILE NUMBER</Text><TextInput style={styles.fieldInput} value={mobile} onChangeText={setMobile} keyboardType="phone-pad" /></View>
              <View style={[styles.formField, styles.flex]}><Text style={styles.fieldLabel}>ROOM / BED</Text><TextInput style={styles.fieldInput} value={roomBed} onChangeText={setRoomBed} /></View>
            </View>
            <View style={styles.availableBedBox}>
              <Text style={styles.fieldLabel}>AVAILABLE BEDS</Text>
              <View style={styles.availableBedRow}>
                {bedOptions.map((bedNumber) => (
                  <TouchableOpacity key={bedNumber} style={[styles.availableBedChip, roomBed === bedNumber && styles.availableBedChipActive]} onPress={() => setRoomBed(bedNumber)}>
                    <Text style={[styles.availableBedText, roomBed === bedNumber && styles.availableBedTextActive]}>{bedNumber}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            <View style={styles.formRow}>
              <View style={[styles.formField, styles.flex]}><Text style={styles.fieldLabel}>EMERGENCY CONTACT</Text><TextInput style={styles.fieldInput} value={emergencyContact} onChangeText={setEmergencyContact} keyboardType="phone-pad" /></View>
              <View style={[styles.formField, styles.flex]}><Text style={styles.fieldLabel}>AADHAAR NUMBER</Text><TextInput style={styles.fieldInput} value={aadhaarNumber} onChangeText={setAadhaarNumber} keyboardType="numeric" /></View>
            </View>
            <View style={styles.formRow}>
              <View style={[styles.formField, styles.flex]}><Text style={styles.fieldLabel}>COMPANY / COLLEGE</Text><TextInput style={styles.fieldInput} value={companyCollege} onChangeText={setCompanyCollege} /></View>
            </View>
            <View style={styles.formRow}>
              <View style={[styles.formField, styles.flex]}><Text style={styles.fieldLabel}>JOINING DATE</Text><TextInput style={styles.fieldInput} value={joiningDate} onChangeText={setJoiningDate} /></View>
              <View style={[styles.formField, styles.flex]}><Text style={styles.fieldLabel}>RENT DUE DATE</Text><TextInput style={styles.fieldInput} value={rentDueDay} onChangeText={setRentDueDay} keyboardType="numeric" /></View>
            </View>
            <View style={styles.formRow}>
              <View style={[styles.formField, styles.flex]}><Text style={styles.fieldLabel}>MONTHLY RENT</Text><TextInput style={styles.fieldInput} value={rent} onChangeText={setRent} keyboardType="numeric" /></View>
              <View style={[styles.formField, styles.flex]}><Text style={styles.fieldLabel}>DEPOSIT</Text><TextInput style={styles.fieldInput} value={deposit} onChangeText={setDeposit} keyboardType="numeric" /></View>
            </View>
            <View style={styles.toggleRow}>
              <Text style={styles.tenantName}>Food included</Text>
              <View style={styles.segmentRow}>
                {(['Yes', 'No'] as const).map((item) => (
                  <TouchableOpacity key={item} style={[styles.segmentChip, (foodIncluded ? item === 'Yes' : item === 'No') && styles.segmentChipActive]} onPress={() => setFoodIncluded(item === 'Yes')}>
                    <Text style={[styles.segmentText, (foodIncluded ? item === 'Yes' : item === 'No') && styles.segmentTextActive]}>{item}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            <View style={styles.toggleRow}>
              <Text style={styles.tenantName}>Status</Text>
              <View style={styles.segmentRow}>
                {(['Active', 'Vacated'] as const).map((item) => (
                  <TouchableOpacity key={item} style={[styles.segmentChip, status === item && styles.segmentChipActive]} onPress={() => setStatus(item)}>
                    <Text style={[styles.segmentText, status === item && styles.segmentTextActive]}>{item}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            <SectionTitle title="Documents" action="Tap to view or replace" />
            <View style={styles.documentGrid}>
              {tenantDocumentTypes.map((type) => {
                const existingDocument = (tenant?.documents ?? []).find((item) => item.type === documentTypeLabel(type));
                const replacement = documents.find((item) => item.type === type);
                return (
                  <View key={type} style={styles.documentButton}>
                    <TouchableOpacity style={styles.flex} onPress={() => existingDocument ? setPreviewDocument(existingDocument) : pickDocument(type)}>
                      <View style={styles.inlineDocumentRow}>
                        <AppIcon name={existingDocument || replacement ? 'check-circle-outline' : 'upload-outline'} size={18} color={existingDocument || replacement ? colors.green : colors.muted} />
                        <View style={styles.flex}>
                          <Text style={styles.documentTitle}>{type}</Text>
                          <Text style={styles.activityCaption}>{replacement?.name ?? existingDocument?.fileName ?? 'Tap to upload'}</Text>
                        </View>
                      </View>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.replaceDocButton} onPress={() => pickDocument(type)}>
                      <Text style={styles.replaceDocText}>{existingDocument ? 'Replace' : 'Upload'}</Text>
                    </TouchableOpacity>
                  </View>
                );
              })}
            </View>
            {formError ? <Text style={styles.authError}>{formError}</Text> : null}
            <TouchableOpacity style={styles.primaryButton} onPress={handleSubmit} disabled={saving}><Text style={styles.primaryButtonText}>{saving ? 'Saving...' : 'Save changes'}</Text></TouchableOpacity>
          </ScrollView>
        </View>
      </View>
      <DocumentViewerModal document={previewDocument} onClose={() => setPreviewDocument(undefined)} />
    </Modal>
  );
}

function activityIcon(type: TenantActivity['activityType']): IconName {
  if (type === 'payment_received') return 'cash-check';
  if (type === 'rent_generated') return 'script-text-outline';
  if (type === 'document_upload') return 'file-upload-outline';
  if (type === 'vacate') return 'logout-variant';
  if (type === 'tenant_update') return 'account-edit-outline';
  return 'account-plus-outline';
}

function activityTone(type: TenantActivity['activityType']): Tone {
  if (type === 'payment_received') return 'blue';
  if (type === 'rent_generated') return 'orange';
  if (type === 'document_upload') return 'purple';
  if (type === 'vacate') return 'red';
  if (type === 'tenant_update') return 'ink';
  return 'green';
}

function activityCaption(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString('en-IN');
}

function activityTitle(activity: TenantActivity) {
  const tenantName = activity.tenantName ?? 'Tenant';
  if (activity.activityType === 'payment_received') return `Rent received from ${tenantName}`;
  if (activity.activityType === 'rent_generated') return `Rent bill generated for ${tenantName}`;
  if (activity.activityType === 'document_upload') return `${tenantName}: ${activity.description}`;
  if (activity.activityType === 'tenant_update') return `${tenantName} profile updated`;
  if (activity.activityType === 'vacate') return `${tenantName} vacated`;
  if (activity.activityType === 'admission') return `${tenantName} admitted`;
  return activity.description;
}

function activityDetail(activity: TenantActivity) {
  const details: string[] = [];
  if (activity.room) details.push(`Room ${activity.room}`);
  if (activity.amount) details.push(money(activity.amount));
  if (activity.paymentMode) details.push(activity.paymentMode);
  if (activity.receiptNumber) details.push(activity.receiptNumber);
  details.push(activityCaption(activity.createdAt));
  return details.join(' - ');
}

function VacateTenantModal({ tenant, visible, onClose, onSubmit, pendingRent }: { tenant?: Tenant; visible: boolean; onClose: () => void; onSubmit: (input: VacateTenantInput) => Promise<void>; pendingRent: number }) {
  const [vacateDate, setVacateDate] = useState(new Date().toISOString().slice(0, 10));
  const [damageCharges, setDamageCharges] = useState('0');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const deposit = tenant?.deposit ?? 0;
  const refundAmount = Math.max(deposit - Number(damageCharges || 0) - pendingRent, 0);

  useEffect(() => {
    if (tenant) {
      setVacateDate(new Date().toISOString().slice(0, 10));
      setDamageCharges('0');
      setNotes('');
      setError(undefined);
    }
  }, [tenant?.id]);

  const handleSubmit = async () => {
    if (!tenant?.id) return;
    setSaving(true);
    setError(undefined);
    try {
      await onSubmit({
        tenantId: tenant.id,
        vacateDate,
        depositAmount: deposit,
        damageCharges: Number(damageCharges || 0),
        pendingRent,
        refundAmount,
        notes: notes.trim(),
      });
      onClose();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Unable to vacate tenant.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalBackdrop}>
        <View style={styles.modalSheet}>
          <View style={styles.modalHandle} />
          <View style={styles.modalHeader}>
            <View><Text style={styles.modalTitle}>Vacate tenant</Text><Text style={styles.subtitle}>{tenant?.name ?? 'Tenant'} settlement</Text></View>
            <TouchableOpacity onPress={onClose}><AppIcon name="close" size={23} color={colors.ink} /></TouchableOpacity>
          </View>
          <View style={styles.formRow}>
            <View style={[styles.formField, styles.flex]}><Text style={styles.fieldLabel}>VACATE DATE</Text><TextInput style={styles.fieldInput} value={vacateDate} onChangeText={setVacateDate} /></View>
          </View>
          <View style={styles.formRow}>
            <View style={[styles.formField, styles.flex]}><Text style={styles.fieldLabel}>DAMAGE CHARGES</Text><TextInput style={styles.fieldInput} value={damageCharges} onChangeText={setDamageCharges} keyboardType="numeric" /></View>
            <View style={[styles.formField, styles.flex]}><Text style={styles.fieldLabel}>PENDING RENT</Text><Text style={styles.fieldInput}>{money(pendingRent)}</Text></View>
          </View>
          <View style={styles.settlementBox}>
            <InfoLine label="Deposit amount" value={money(deposit)} />
            <InfoLine label="Refund amount" value={money(refundAmount)} />
          </View>
          <View style={styles.formRow}>
            <View style={[styles.formField, styles.flex]}><Text style={styles.fieldLabel}>NOTES</Text><TextInput style={styles.fieldInput} value={notes} onChangeText={setNotes} placeholder="Optional" /></View>
          </View>
          {error ? <Text style={styles.authError}>{error}</Text> : null}
          <TouchableOpacity style={[styles.primaryButton, styles.dangerButton]} onPress={handleSubmit} disabled={saving}><Text style={styles.primaryButtonText}>{saving ? 'Saving...' : 'Confirm vacate'}</Text></TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

function TenantDetail({
  tenant,
  data,
  onBack,
  onUpdateTenant,
  onVacateTenant,
  onRecordPayment,
  onGenerateRent,
}: {
  tenant: Tenant;
  data: PgMasterData;
  onBack: () => void;
  onUpdateTenant: (input: UpdateTenantInput) => Promise<void>;
  onVacateTenant: (input: VacateTenantInput) => Promise<void>;
  onRecordPayment: (input: RecordRentPaymentInput) => Promise<void>;
  onGenerateRent: () => Promise<void>;
}) {
  const [editOpen, setEditOpen] = useState(false);
  const [vacateOpen, setVacateOpen] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [previewPhoto, setPreviewPhoto] = useState<string | undefined>();
  const [previewDocument, setPreviewDocument] = useState<TenantDocument | undefined>();
  const [message, setMessage] = useState<string | undefined>();
  const tenantBills = (data.rentBills ?? []).filter((bill) => bill.tenantId === tenant.id);
  const currentBill = tenantBills[0];
  const pendingRent = currentBill?.pendingAmount ?? (tenant.status === 'Paid' ? 0 : tenant.rent);
  const tenantActivities = (data.tenantActivities ?? []).filter((activity) => activity.tenantId === tenant.id);

  const openWhatsApp = (template: 'rent' | 'pending' | 'paid') => {
    const amount = template === 'paid' ? (currentBill?.paidAmount ?? tenant.rent) : pendingRent;
    const dueDate = currentBill?.dueDate ?? `day ${tenant.rentDueDay ?? 5}`;
    const text = template === 'paid'
      ? `Hi ${tenant.name}, we received your rent payment of ${money(amount)}. Thank you. - PGCopilot`
      : template === 'pending'
        ? `Hi ${tenant.name}, your pending rent is ${money(amount)}. Please complete the payment. - PGCopilot`
        : `Hi ${tenant.name}, your PG rent of ${money(amount)} is due on ${dueDate}. Please pay before due date. - PGCopilot`;
    Linking.openURL(`https://wa.me/${whatsappPhone(tenant.mobile)}?text=${encodeURIComponent(text)}`);
  };

  const handleGenerateRent = async () => {
    setMessage(undefined);
    await onGenerateRent();
    setMessage('Rent bill generated. Reopen tenant if it does not appear immediately.');
  };

  return (
    <>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <TouchableOpacity style={styles.backLink} onPress={onBack}><AppIcon name="chevron-left" size={22} color={colors.green} /><Text style={styles.backText}>Back to tenants</Text></TouchableOpacity>
        <View style={styles.detailHeader}>
          <TenantAvatar initials={tenant.initials} name={tenant.name} photoUrl={tenant.photoUrl} tone={tenant.tone} size="detail" onPress={tenant.photoUrl ? () => setPreviewPhoto(tenant.photoUrl) : undefined} />
          <View style={styles.flex}>
            <Text style={styles.pageTitle}>{tenant.name}</Text>
            <Text style={styles.subtitle}>{tenant.mobile}</Text>
            <Text style={styles.subtitle}>Room {tenant.room} {tenant.floor ? `- ${tenant.floor}` : ''}</Text>
          </View>
          <View style={styles.alignEnd}>
            <Chip label={tenant.admissionStatus ?? 'Active'} tone={tenant.admissionStatus === 'Vacated' ? 'red' : 'green'} />
            <Chip label={tenant.status} tone={tenant.status === 'Paid' ? 'green' : tenant.status === 'Partial' ? 'orange' : 'red'} />
          </View>
        </View>
        <View style={styles.actionGrid}>
          <TouchableOpacity style={styles.actionButton} onPress={() => Linking.openURL(`tel:${tenant.mobile}`)}><AppIcon name="phone-outline" /><Text style={styles.actionText}>Call</Text></TouchableOpacity>
          <TouchableOpacity style={styles.actionButton} onPress={() => openWhatsApp('rent')}><AppIcon name="whatsapp" /><Text style={styles.actionText}>WhatsApp</Text></TouchableOpacity>
          <TouchableOpacity style={styles.actionButton} onPress={() => setEditOpen(true)}><AppIcon name="pencil-outline" /><Text style={styles.actionText}>Edit</Text></TouchableOpacity>
          <TouchableOpacity style={styles.actionButton} onPress={() => setVacateOpen(true)}><AppIcon name="logout-variant" color={colors.red} /><Text style={[styles.actionText, { color: colors.red }]}>Vacate</Text></TouchableOpacity>
        </View>

        <SectionTitle title="Personal details" />
        <View style={styles.listCard}>
          <InfoLine label="Full name" value={tenant.name} />
          <InfoLine label="Mobile number" value={tenant.mobile} />
          <InfoLine label="Emergency contact" value={tenant.emergencyContact} />
          <InfoLine label="Aadhaar number" value={maskAadhaar(tenant.aadhaarNumber)} />
          <InfoLine label="Company / College" value={tenant.companyCollege} />
          <InfoLine label="Food included" value={tenant.foodIncluded ? 'Yes' : 'No'} />
        </View>

        <SectionTitle title="Stay details" />
        <View style={styles.listCard}>
          <InfoLine label="Hostel" value={data.propertyName} />
          <InfoLine label="Room / Bed" value={tenant.room} />
          <InfoLine label="Floor" value={tenant.floor} />
          <InfoLine label="Monthly rent" value={money(tenant.rent)} />
          <InfoLine label="Deposit amount" value={money(tenant.deposit ?? 0)} />
          <InfoLine label="Rent due date" value={`Day ${tenant.rentDueDay ?? 5}`} />
          <InfoLine label="Joining date" value={tenant.joiningDate} />
          {tenant.vacateDate ? <InfoLine label="Vacate date" value={tenant.vacateDate} /> : null}
        </View>

        <SectionTitle title="Current rent" action={currentBill ? currentBill.status : 'No bill'} />
        <View style={styles.rentHero}>
          <Text style={styles.cardEyebrow}>EXPECTED RENT</Text>
          <Text style={styles.rentHeroValue}>{money(currentBill?.amount ?? tenant.rent)}</Text>
          <View style={styles.rentHeroBottom}><Text style={styles.rentHeroCaption}>Paid {money(currentBill?.paidAmount ?? 0)}</Text><Text style={styles.rentHeroPending}>Pending {money(pendingRent)}</Text></View>
          <View style={styles.detailButtonRow}>
            {currentBill ? <TouchableOpacity style={[styles.secondaryButton, styles.rentHeroActionButton]} onPress={() => setPaymentOpen(true)}><Text style={styles.rentHeroActionText}>Add payment</Text></TouchableOpacity> : <TouchableOpacity style={[styles.secondaryButton, styles.rentHeroActionButton]} onPress={handleGenerateRent}><Text style={styles.rentHeroActionText}>Generate rent bill</Text></TouchableOpacity>}
            <TouchableOpacity style={[styles.secondaryButton, styles.rentHeroActionButton]} onPress={() => openWhatsApp('pending')}><Text style={styles.rentHeroActionText}>Reminder</Text></TouchableOpacity>
          </View>
          {message ? <Text style={styles.inviteMessage}>{message}</Text> : null}
        </View>

        <SectionTitle title="Payment history" action={`${tenantBills.reduce((sum, bill) => sum + bill.receipts.length, 0)} receipts`} />
        <View style={styles.listCard}>
          {tenantBills.flatMap((bill) => bill.receipts.map((receipt) => ({ bill, receipt }))).length ? tenantBills.flatMap((bill) => bill.receipts.map((receipt) => ({ bill, receipt }))).map(({ bill, receipt }) => (
            <TouchableOpacity key={receipt.id} style={[styles.activity, styles.divider]} onPress={() => downloadReceiptPdf(data, bill, receipt)}>
              <AppIcon name="file-document-outline" size={18} color={colors.green} />
              <View style={styles.flex}><Text style={styles.tenantName}>{receipt.receiptNumber}</Text><Text style={styles.activityCaption}>{new Date(receipt.paymentDate).toLocaleDateString('en-IN')} - {receipt.paymentMode} - {receipt.notes || 'No notes'}</Text></View>
              <Text style={styles.rentAmount}>{money(receipt.amount)}</Text>
            </TouchableOpacity>
          )) : <Text style={styles.activityCaption}>No payment history yet.</Text>}
        </View>

        <SectionTitle title="Documents" action={`${tenant.documentCount ?? 0}/${tenantDocumentTypes.length}`} />
        <View style={styles.documentGrid}>
          {tenantDocumentTypes.map((type) => {
            const document = (tenant.documents ?? []).find((item) => item.type === documentTypeLabel(type));
            return (
              <TouchableOpacity key={type} style={styles.documentButton} onPress={() => document ? setPreviewDocument(document) : undefined} disabled={!document}>
                <AppIcon name={document ? 'check-circle-outline' : 'alert-circle-outline'} size={18} color={document ? colors.green : colors.orange} />
                <View style={styles.flex}><Text style={styles.documentTitle}>{type}</Text><Text style={styles.activityCaption}>{document?.fileName ?? `${type} missing`}</Text></View>
                {document ? <AppIcon name="eye-outline" size={18} color={colors.green} /> : null}
              </TouchableOpacity>
            );
          })}
        </View>

        <SectionTitle title="Activity timeline" />
        <View style={styles.listCard}>
          {tenantActivities.length ? tenantActivities.slice(0, 8).map((activity, index, all) => (
            <Activity
              key={activity.id}
              icon={activityIcon(activity.activityType)}
              tone={activityTone(activity.activityType)}
              title={activityTitle(activity)}
              caption={activityDetail(activity)}
              last={index === all.length - 1}
            />
          )) : (
            <>
              <Activity icon="account-plus-outline" tone="green" title="Tenant admitted" caption={tenant.joiningDate || 'Admission date not added'} />
              {currentBill?.receipts[0] ? <Activity icon="cash-check" tone="blue" title="Rent paid" caption={`${money(currentBill.receipts[0].amount)} - ${currentBill.receipts[0].receiptNumber}`} /> : null}
              {tenant.vacateDate ? <Activity icon="logout-variant" tone="red" title="Tenant vacated" caption={tenant.vacateDate} last /> : null}
            </>
          )}
        </View>
      </ScrollView>
      <EditTenantModal tenant={tenant} visible={editOpen} onClose={() => setEditOpen(false)} onSubmit={onUpdateTenant} availableBeds={data.assignableBeds ?? []} />
      <VacateTenantModal tenant={tenant} visible={vacateOpen} onClose={() => setVacateOpen(false)} onSubmit={onVacateTenant} pendingRent={pendingRent} />
      <PaymentModal visible={paymentOpen} bill={currentBill} onClose={() => setPaymentOpen(false)} onSubmit={onRecordPayment} />
      <ImagePreviewModal uri={previewPhoto} onClose={() => setPreviewPhoto(undefined)} />
      <DocumentViewerModal document={previewDocument} onClose={() => setPreviewDocument(undefined)} />
    </>
  );
}

function receiptHtml(data: PgMasterData, bill: RentBill, receipt: RentReceipt) {
  const escapeHtml = (value: string | undefined) => String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
  return `
    <html>
      <body style="font-family: Arial, sans-serif; padding: 32px; color: #17231F;">
        <h1 style="margin-bottom: 4px;">PGCopilot Rent Receipt</h1>
        <p style="color: #75827D;">${escapeHtml(data.propertyName)}</p>
        <hr />
        <h2>Receipt ${escapeHtml(receipt.receiptNumber)}</h2>
        <p><strong>Tenant:</strong> ${escapeHtml(bill.tenantName)}</p>
        <p><strong>Room / Bed:</strong> ${escapeHtml(bill.room)}</p>
        <p><strong>Rent Month:</strong> ${escapeHtml(bill.rentMonth)}</p>
        <p><strong>Payment Date:</strong> ${new Date(receipt.paymentDate).toLocaleString('en-IN')}</p>
        <p><strong>Amount:</strong> ${money(receipt.amount)}</p>
        <p><strong>Payment Mode:</strong> ${escapeHtml(receipt.paymentMode)}</p>
        <p><strong>Bill Amount:</strong> ${money(bill.amount)}</p>
        <p><strong>Total Paid:</strong> ${money(bill.paidAmount)}</p>
        <p><strong>Pending:</strong> ${money(bill.pendingAmount)}</p>
        ${receipt.notes ? `<p><strong>Notes:</strong> ${escapeHtml(receipt.notes)}</p>` : ''}
        <hr />
        <p style="font-size: 12px; color: #75827D;">Generated by PGCopilot</p>
      </body>
    </html>
  `;
}

async function downloadReceiptPdf(data: PgMasterData, bill: RentBill, receipt: RentReceipt) {
  const html = receiptHtml(data, bill, receipt);
  if (Platform.OS === 'web') {
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = globalThis.document.createElement('a');
    link.href = url;
    link.download = `${receipt.receiptNumber}.html`;
    globalThis.document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    return;
  }
  const printed = await Print.printToFileAsync({ html });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(printed.uri, { mimeType: 'application/pdf', dialogTitle: receipt.receiptNumber });
  }
}

function PaymentModal({
  visible,
  bill,
  onClose,
  onSubmit,
}: {
  visible: boolean;
  bill?: RentBill;
  onClose: () => void;
  onSubmit: (input: RecordRentPaymentInput) => Promise<void>;
}) {
  const [amount, setAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().slice(0, 10));
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('UPI');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | undefined>();

  useEffect(() => {
    if (bill) {
      setAmount(String(bill.pendingAmount || bill.amount));
      setPaymentDate(new Date().toISOString().slice(0, 10));
      setPaymentMode('UPI');
      setNotes('');
      setError(undefined);
    }
  }, [bill?.id]);

  const handleSubmit = async () => {
    if (!bill) return;
    const paymentAmount = Number(amount || 0);
    if (!paymentAmount || paymentAmount <= 0) {
      setError('Enter a valid payment amount.');
      return;
    }
    setSaving(true);
    setError(undefined);
    try {
      await onSubmit({
        rentPaymentId: bill.id,
        amount: paymentAmount,
        paymentDate,
        paymentMode,
        notes: notes.trim(),
      });
      onClose();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Unable to record payment.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalBackdrop}>
        <View style={styles.modalSheet}>
          <View style={styles.modalHandle} />
          <View style={styles.modalHeader}>
            <View><Text style={styles.modalTitle}>Record payment</Text><Text style={styles.subtitle}>{bill?.tenantName ?? 'Tenant'} · Pending {money(bill?.pendingAmount ?? 0)}</Text></View>
            <TouchableOpacity onPress={onClose}><AppIcon name="close" size={23} color={colors.ink} /></TouchableOpacity>
          </View>
          <View style={styles.formRow}>
            <View style={[styles.formField, styles.flex]}><Text style={styles.fieldLabel}>AMOUNT</Text><TextInput placeholder="0" style={styles.fieldInput} value={amount} onChangeText={setAmount} keyboardType="numeric" /></View>
            <View style={[styles.formField, styles.flex]}><Text style={styles.fieldLabel}>PAYMENT DATE</Text><TextInput placeholder="YYYY-MM-DD" style={styles.fieldInput} value={paymentDate} onChangeText={setPaymentDate} /></View>
          </View>
          <View style={styles.toggleRow}>
            <Text style={styles.tenantName}>Payment mode</Text>
            <View style={styles.segmentRow}>
              {(['Cash', 'UPI', 'Bank Transfer'] as PaymentMode[]).map((mode) => (
                <TouchableOpacity key={mode} style={[styles.segmentChip, paymentMode === mode && styles.segmentChipActive]} onPress={() => setPaymentMode(mode)}>
                  <Text style={[styles.segmentText, paymentMode === mode && styles.segmentTextActive]}>{mode}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          <View style={styles.formRow}>
            <View style={[styles.formField, styles.flex]}><Text style={styles.fieldLabel}>NOTES</Text><TextInput placeholder="Optional" style={styles.fieldInput} value={notes} onChangeText={setNotes} /></View>
          </View>
          {error ? <Text style={styles.authError}>{error}</Text> : null}
          <TouchableOpacity style={styles.primaryButton} onPress={handleSubmit} disabled={saving}><Text style={styles.primaryButtonText}>{saving ? 'Saving...' : 'Save payment'}</Text></TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

function Rent({ data, onGenerateRent, onRecordPayment }: { data: PgMasterData; onGenerateRent: () => Promise<void>; onRecordPayment: (input: RecordRentPaymentInput) => Promise<void> }) {
  const [filter, setFilter] = useState('All');
  const [selectedBill, setSelectedBill] = useState<RentBill | undefined>();
  const [generating, setGenerating] = useState(false);
  const [message, setMessage] = useState<string | undefined>();
  const summary = buildSummary(data);
  const rentBills = data.rentBills ?? [];
  const visibleBills = rentBills.filter((bill) => filter === 'All' || bill.status === filter);

  const handleGenerate = async () => {
    setGenerating(true);
    setMessage(undefined);
    try {
      await onGenerateRent();
      setMessage('Monthly rent generated. Existing bills were skipped.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to generate rent.');
    } finally {
      setGenerating(false);
    }
  };
  return (
    <>
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
      <Header title="Rent Collection" subtitle="Monthly billing and receipts" />
      <View style={styles.rentHero}>
        <Text style={styles.cardEyebrow}>TOTAL COLLECTED</Text>
        <Text style={styles.rentHeroValue}>{money(summary.collectedRent)}</Text>
        <View style={styles.rentHeroBottom}><Text style={styles.rentHeroCaption}>{summary.expectedRent ? Math.round((summary.collectedRent / summary.expectedRent) * 100) : 0}% of {money(summary.expectedRent)}</Text><Text style={styles.rentHeroPending}>{money(summary.pendingRent)} pending</Text></View>
        <View style={styles.progressTrack}><View style={[styles.progressFill, { width: `${summary.expectedRent ? Math.round((summary.collectedRent / summary.expectedRent) * 100) : 0}%` }]} /></View>
      </View>
      <TouchableOpacity style={[styles.primaryButton, styles.rentGenerateButton]} onPress={handleGenerate} disabled={generating}>
        <Text style={styles.primaryButtonText}>{generating ? 'Generating...' : 'Generate monthly rent'}</Text>
      </TouchableOpacity>
      {message ? <Text style={styles.inviteMessage}>{message}</Text> : null}
      <View style={styles.filterRow}>
        {['All', 'Paid', 'Pending', 'Partial'].map((item) => (
          <TouchableOpacity key={item} style={[styles.filterChip, filter === item && styles.filterChipActive]} onPress={() => setFilter(item)}>
            <Text style={[styles.filterText, filter === item && styles.filterTextActive]}>{item}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <SectionTitle title="Rent bills" action={`${visibleBills.length} shown`} />
      <View style={styles.listCard}>
        {visibleBills.length ? visibleBills.map((bill, index) => {
          const billTenant = data.tenants.find((tenant) => tenant.id === bill.tenantId);
          return (
          <View key={bill.id} style={[styles.rentBillRow, index !== visibleBills.length - 1 && styles.divider]}>
            <TenantAvatar initials={billTenant?.initials || initialsForName(bill.tenantName)} name={bill.tenantName} photoUrl={billTenant?.photoUrl} tone={billTenant?.tone} />
            <View style={styles.flex}>
              <Text style={styles.tenantName}>{bill.tenantName}</Text>
              <Text style={styles.activityCaption}>Room {bill.room} - Due {bill.dueDate}</Text>
              <Text style={styles.activityCaption}>Paid {money(bill.paidAmount)} - Pending {money(bill.pendingAmount)}</Text>
              {bill.receipts.length ? (
                <View style={styles.receiptList}>
                  {bill.receipts.map((receipt) => (
                    <TouchableOpacity key={receipt.id} style={styles.receiptChip} onPress={() => downloadReceiptPdf(data, bill, receipt)}>
                      <AppIcon name="file-document-outline" size={14} color={colors.green} />
                      <Text style={styles.receiptText}>{receipt.receiptNumber}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              ) : null}
            </View>
            <View style={styles.alignEnd}>
              <Text style={styles.rentAmount}>{money(bill.amount)}</Text>
              <Chip label={bill.status} tone={bill.status === 'Paid' ? 'green' : bill.status === 'Partial' ? 'orange' : 'red'} />
              {bill.status !== 'Paid' ? <TouchableOpacity style={styles.smallActionButton} onPress={() => setSelectedBill(bill)}><Text style={styles.smallActionText}>Pay</Text></TouchableOpacity> : null}
            </View>
          </View>
          );
        }) : (
          <View style={styles.rentRow}>
            <Text style={styles.activityCaption}>No rent bills generated yet. Tap Generate monthly rent to create bills for active tenants.</Text>
          </View>
        )}
      </View>
    </ScrollView>
    <PaymentModal visible={Boolean(selectedBill)} bill={selectedBill} onClose={() => setSelectedBill(undefined)} onSubmit={onRecordPayment} />
    </>
  );
}

function More({
  data,
  onInviteStaff,
  onAddExpense,
  onNavigate,
  onLogout,
}: {
  data: PgMasterData;
  onInviteStaff: (phone: string) => Promise<void>;
  onAddExpense: (input: NewExpenseInput) => Promise<void>;
  onNavigate: (tab: Tab) => void;
  onLogout: () => Promise<void>;
}) {
  const [view, setView] = useState<'menu' | 'expenses' | 'reports'>('menu');
  const [staffPhone, setStaffPhone] = useState('');
  const [inviteMessage, setInviteMessage] = useState<string | undefined>();
  const [inviting, setInviting] = useState(false);
  const summary = buildSummary(data);
  if (view === 'expenses') return <Phase2Expenses data={data} onBack={() => setView('menu')} onAddExpense={onAddExpense} />;
  if (view === 'reports') return <Phase2Reports data={data} onBack={() => setView('menu')} />;

  const handleInvite = async () => {
    if (!staffPhone.trim()) return;
    setInviting(true);
    setInviteMessage(undefined);
    try {
      await onInviteStaff(staffPhone.trim());
      setStaffPhone('');
      setInviteMessage('Staff invite saved. Ask them to login with OTP using this mobile number.');
    } catch (error) {
      setInviteMessage(error instanceof Error ? error.message : 'Unable to invite staff.');
    } finally {
      setInviting(false);
    }
  };

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
      <Header title="More" subtitle="Manage your property" />
      <View style={styles.profileCard}>
        <View style={styles.propertyIcon}><AppIcon name="office-building-outline" size={26} /></View>
        <View style={styles.flex}><Text style={styles.propertyCardName}>{data.propertyName}</Text><Text style={styles.activityCaption}>{data.propertyAddress} · {summary.totalBeds} beds</Text></View>
        <AppIcon name="chevron-right" size={21} color={colors.muted} />
      </View>
      <SectionTitle title="Operations" />
      <View style={styles.menuCard}>
        <MenuRow icon="silverware-fork-knife" label="Food management" caption="Meals, groceries and cost per resident" tone="orange" />
        <MenuRow icon="file-document-outline" label="Expense management" caption="Utilities, salaries and supplies" tone="blue" onPress={() => setView('expenses')} />
        <MenuRow icon="chart-box-outline" label="Reports & analytics" caption="Occupancy, pending rents and P&L" tone="purple" onPress={() => setView('reports')} />
        <MenuRow icon="robot-outline" label="AI Copilot" caption="Ask rent, bed, expense and profit questions" tone="green" onPress={() => onNavigate('AI')} last />
      </View>
      <SectionTitle title="Property settings" />
      <View style={styles.menuCard}>
        <MenuRow icon="office-building-cog-outline" label="Hostel details" caption="Address, contact, GST and bank details" tone="green" />
        <MenuRow icon="message-text-outline" label="Reminder templates" caption="WhatsApp and SMS rent reminders" tone="blue" />
        <MenuRow icon="account-group-outline" label="Staff access" caption="Manage wardens and accountants" tone="purple" />
        <MenuRow icon="shield-lock-outline" label="Privacy Policy" caption="View data usage and deletion policy" tone="ink" onPress={() => Linking.openURL('https://pgcopilot.com/privacy-policy.html')} last />
      </View>
      {data.currentUserRole === 'Owner' && data.hostelId ? (
        <>
          <SectionTitle title="Invite staff" />
          <View style={styles.inviteCard}>
            <Text style={styles.loginCaption}>Staff can add tenants and payments but cannot delete hostel data.</Text>
            <View style={styles.loginInput}><Text style={styles.prefix}>+91</Text><TextInput style={styles.flex} placeholder="Staff mobile number" keyboardType="phone-pad" value={staffPhone} onChangeText={setStaffPhone} /></View>
            {inviteMessage ? <Text style={styles.inviteMessage}>{inviteMessage}</Text> : null}
            <TouchableOpacity style={styles.primaryButton} onPress={handleInvite} disabled={inviting}><Text style={styles.primaryButtonText}>{inviting ? 'Inviting...' : 'Invite staff'}</Text></TouchableOpacity>
          </View>
        </>
      ) : null}
      <TouchableOpacity style={styles.logoutButton} onPress={onLogout}><Text style={styles.logoutText}>Logout</Text></TouchableOpacity>
    </ScrollView>
  );
}

function MenuRow({ icon, label, caption, tone, last, onPress }: { icon: IconName; label: string; caption: string; tone: Tone; last?: boolean; onPress?: () => void }) {
  const palette = { green: colors.paleGreen, blue: colors.paleBlue, orange: colors.paleOrange, purple: colors.palePurple, red: colors.paleRed, ink: '#EDF0EE' };
  return (
    <TouchableOpacity style={[styles.menuRow, !last && styles.divider]} onPress={onPress}>
      <View style={[styles.menuIcon, { backgroundColor: palette[tone] }]}><AppIcon name={icon} size={19} color={colors[tone]} /></View>
      <View style={styles.flex}><Text style={styles.menuLabel}>{label}</Text><Text style={styles.activityCaption}>{caption}</Text></View>
      <AppIcon name="chevron-right" size={20} color={colors.muted} />
    </TouchableOpacity>
  );
}

function BackHeader({ title, onBack }: { title: string; onBack: () => void }) {
  return <View style={styles.backHeader}><TouchableOpacity onPress={onBack} style={styles.backButton}><AppIcon name="arrow-left" size={21} color={colors.ink} /></TouchableOpacity><Text style={styles.pageTitle}>{title}</Text></View>;
}

function Expenses({ data, onBack }: { data: PgMasterData; onBack: () => void }) {
  const summary = buildSummary(data);
  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
      <BackHeader title="Expenses" onBack={onBack} />
      <View style={styles.expenseHero}><Text style={styles.cardEyebrow}>TOTAL EXPENSES · JUNE</Text><Text style={styles.expenseHeroValue}>{money(summary.expensesTotal)}</Text><Text style={styles.expenseHeroCaption}>Synced across web, Android and iOS</Text></View>
      <SectionTitle title="Expense breakdown" action="+ Add expense" />
      <View style={styles.listCard}>
        {data.expenses.map((item, index) => <Activity key={item.id ?? item.label} icon={item.icon as IconName} tone={item.tone} title={item.label} caption="June 2026" value={`- ${money(item.amount)}`} last={index === data.expenses.length - 1} />)}
      </View>
      <SectionTitle title="Food cost overview" />
      <View style={styles.foodCard}>
        <View><Text style={styles.smallMuted}>Food expense</Text><Text style={styles.foodValue}>{money(summary.foodExpense)}</Text></View>
        <View style={styles.foodDivider} />
        <View><Text style={styles.smallMuted}>Residents</Text><Text style={styles.foodValue}>{summary.foodResidents}</Text></View>
        <View style={styles.foodDivider} />
        <View><Text style={styles.smallMuted}>Per person</Text><Text style={styles.foodValue}>{money(summary.foodResidents ? Math.round(summary.foodExpense / summary.foodResidents) : 0)}</Text></View>
      </View>
    </ScrollView>
  );
}

function Reports({ data, onBack }: { data: PgMasterData; onBack: () => void }) {
  const summary = buildSummary(data);
  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
      <BackHeader title="Reports" onBack={onBack} />
      <View style={styles.reportHero}>
        <View><Text style={styles.cardEyebrow}>NET PROFIT · JUNE</Text><Text style={styles.reportHeroValue}>{money(summary.profit)}</Text><Text style={styles.expenseHeroCaption}>Live from shared database</Text></View>
        <AppIcon name="chart-line" size={40} color={colors.green} />
      </View>
      <View style={styles.pnlRow}>
        <View style={styles.pnlCard}><Text style={styles.smallMuted}>Income</Text><Text style={[styles.pnlValue, { color: colors.green }]}>{money(summary.income)}</Text></View>
        <View style={styles.pnlCard}><Text style={styles.smallMuted}>Expenses</Text><Text style={[styles.pnlValue, { color: colors.red }]}>{money(summary.expensesTotal)}</Text></View>
      </View>
      <SectionTitle title="Occupancy" />
      <View style={styles.occupancyCard}>
        <View style={styles.occupancyRing}><Text style={styles.occupancyValue}>{summary.occupancyRate}%</Text></View>
        <View style={styles.flex}>
          <View style={styles.occupancyLegend}><View style={[styles.legendDot, { backgroundColor: colors.green }]} /><Text style={styles.legendText}>Occupied beds</Text><Text style={styles.legendValue}>{summary.occupiedBeds}</Text></View>
          <View style={styles.occupancyLegend}><View style={[styles.legendDot, { backgroundColor: colors.orange }]} /><Text style={styles.legendText}>Vacant beds</Text><Text style={styles.legendValue}>{summary.vacantBeds}</Text></View>
        </View>
      </View>
      <SectionTitle title="Pending rent report" action="Download" />
      <View style={styles.listCard}>
        {data.tenants.filter((tenant) => tenant.status !== 'Paid').map((tenant, index, all) => (
          <View key={tenant.id ?? tenant.name} style={[styles.pendingRow, index !== all.length - 1 && styles.divider]}>
            <Text style={styles.tenantName}>{tenant.name}</Text><Text style={styles.activityCaption}>Room {tenant.room}</Text><Text style={styles.pendingValue}>{money(tenant.rent)}</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const expenseCategoryOptions: ExpenseCategory[] = ['Food', 'Electricity', 'Water', 'Internet', 'Cook Salary', 'Cleaning', 'Maintenance', 'Other'];

function toneBackground(tone: Tone) {
  const palette: Record<Tone, string> = {
    green: colors.paleGreen,
    orange: colors.paleOrange,
    red: colors.paleRed,
    blue: colors.paleBlue,
    purple: colors.palePurple,
    ink: '#EDF0EE',
  };
  return palette[tone];
}

function Phase2Expenses({ data, onBack, onAddExpense }: { data: PgMasterData; onBack: () => void; onAddExpense: (input: NewExpenseInput) => Promise<void> }) {
  const [addOpen, setAddOpen] = useState(false);
  const summary = buildSummary(data);
  const monthlyLabel = new Date().toLocaleString('en-IN', { month: 'long', year: 'numeric' });
  const categoryTotals = expenseCategoryOptions
    .map((category) => ({
      category,
      amount: data.expenses.filter((expense) => expense.category === category || (!expense.category && expense.label.toLowerCase().includes(category.toLowerCase()))).reduce((sum, expense) => sum + expense.amount, 0),
    }))
    .filter((item) => item.amount > 0);

  return (
    <>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <BackHeader title="Expenses" onBack={onBack} />
        <View style={styles.expenseHero}><Text style={styles.cardEyebrow}>TOTAL EXPENSES</Text><Text style={styles.expenseHeroValue}>{money(summary.expensesTotal)}</Text><Text style={styles.expenseHeroCaption}>{monthlyLabel} expense control</Text></View>
        <View style={styles.sectionHeading}>
          <Text style={styles.sectionTitle}>Expense breakdown</Text>
          <TouchableOpacity style={styles.sectionButton} onPress={() => setAddOpen(true)}><Text style={styles.sectionButtonText}>+ Add expense</Text></TouchableOpacity>
        </View>
        <View style={styles.listCard}>
          {data.expenses.length ? data.expenses.map((item, index) => (
            <View key={item.id ?? item.label} style={[styles.expenseRow, index !== data.expenses.length - 1 && styles.divider]}>
              <View style={[styles.activityIcon, { backgroundColor: toneBackground(item.tone) }]}>
                <AppIcon name={item.icon as IconName} size={18} color={colors[item.tone]} />
              </View>
              <View style={styles.flex}>
                <Text style={styles.activityTitle}>{item.label}</Text>
                <Text style={styles.activityCaption}>{item.date ?? monthlyLabel}{item.vendor ? ` - ${item.vendor}` : ''}</Text>
                {item.notes ? <Text style={styles.expenseNotes}>{item.notes}</Text> : null}
                {item.billUrl ? (
                  <TouchableOpacity style={styles.inlineLink} onPress={() => Linking.openURL(item.billUrl!)}>
                    <AppIcon name="paperclip" size={13} color={colors.green} />
                    <Text style={styles.inlineLinkText}>{item.billFileName ?? 'View bill'}</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
              <Text style={[styles.activityValue, { color: colors.red }]}>- {money(item.amount)}</Text>
            </View>
          )) : <Text style={styles.emptyState}>No expenses added yet.</Text>}
        </View>
        <SectionTitle title="Category-wise expenses" />
        <View style={styles.listCard}>
          {categoryTotals.length ? categoryTotals.map((item, index) => (
            <View key={item.category} style={[styles.categoryRow, index !== categoryTotals.length - 1 && styles.divider]}>
              <Text style={styles.tenantName}>{item.category}</Text>
              <Text style={styles.pendingValue}>{money(item.amount)}</Text>
            </View>
          )) : <Text style={styles.emptyState}>Category report will appear after adding expenses.</Text>}
        </View>
        <SectionTitle title="Food cost overview" />
        <View style={styles.foodCard}>
          <View><Text style={styles.smallMuted}>Food expense</Text><Text style={styles.foodValue}>{money(summary.foodExpense)}</Text></View>
          <View style={styles.foodDivider} />
          <View><Text style={styles.smallMuted}>Residents</Text><Text style={styles.foodValue}>{summary.foodResidents}</Text></View>
          <View style={styles.foodDivider} />
          <View><Text style={styles.smallMuted}>Per person</Text><Text style={styles.foodValue}>{money(summary.foodResidents ? Math.round(summary.foodExpense / summary.foodResidents) : 0)}</Text></View>
        </View>
      </ScrollView>
      <AddExpenseModal visible={addOpen} onClose={() => setAddOpen(false)} onSubmit={onAddExpense} />
    </>
  );
}

function Phase2Reports({ data, onBack }: { data: PgMasterData; onBack: () => void }) {
  const summary = buildSummary(data);
  const pendingBills = (data.rentBills ?? []).filter((bill) => bill.status !== 'Paid');
  const expenseTotals = expenseCategoryOptions.map((category) => ({
    category,
    amount: data.expenses.filter((expense) => expense.category === category || (!expense.category && expense.label.toLowerCase().includes(category.toLowerCase()))).reduce((sum, expense) => sum + expense.amount, 0),
  })).filter((item) => item.amount > 0);
  const reportPayload = buildReportPayload(data, summary, pendingBills, expenseTotals);

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
      <BackHeader title="Reports" onBack={onBack} />
      <View style={styles.reportHero}>
        <View><Text style={styles.cardEyebrow}>NET PROFIT</Text><Text style={styles.reportHeroValue}>{money(summary.profit)}</Text><Text style={styles.expenseHeroCaption}>Income minus expenses</Text></View>
        <AppIcon name="chart-line" size={40} color={colors.green} />
      </View>
      <View style={styles.pnlRow}>
        <View style={styles.pnlCard}><Text style={styles.smallMuted}>Income</Text><Text style={[styles.pnlValue, { color: colors.green }]}>{money(summary.income)}</Text></View>
        <View style={styles.pnlCard}><Text style={styles.smallMuted}>Expenses</Text><Text style={[styles.pnlValue, { color: colors.red }]}>{money(summary.expensesTotal)}</Text></View>
      </View>
      <SectionTitle title="Occupancy" />
      <View style={styles.occupancyCard}>
        <View style={styles.occupancyRing}><Text style={styles.occupancyValue}>{summary.occupancyRate}%</Text></View>
        <View style={styles.flex}>
          <View style={styles.occupancyLegend}><View style={[styles.legendDot, { backgroundColor: colors.green }]} /><Text style={styles.legendText}>Total beds</Text><Text style={styles.legendValue}>{summary.totalBeds}</Text></View>
          <View style={styles.occupancyLegend}><View style={[styles.legendDot, { backgroundColor: colors.green }]} /><Text style={styles.legendText}>Occupied beds</Text><Text style={styles.legendValue}>{summary.occupiedBeds}</Text></View>
          <View style={styles.occupancyLegend}><View style={[styles.legendDot, { backgroundColor: colors.orange }]} /><Text style={styles.legendText}>Vacant beds</Text><Text style={styles.legendValue}>{summary.vacantBeds}</Text></View>
        </View>
      </View>
      <SectionTitle title="Rent collection" />
      <View style={styles.reportMetricGrid}>
        <View style={styles.reportMetric}><Text style={styles.smallMuted}>Expected</Text><Text style={styles.pnlValue}>{money(summary.expectedRent)}</Text></View>
        <View style={styles.reportMetric}><Text style={styles.smallMuted}>Collected</Text><Text style={[styles.pnlValue, { color: colors.green }]}>{money(summary.collectedRent)}</Text></View>
        <View style={styles.reportMetric}><Text style={styles.smallMuted}>Pending</Text><Text style={[styles.pnlValue, { color: colors.orange }]}>{money(summary.pendingRent)}</Text></View>
      </View>
      <SectionTitle title="Expense report" />
      <View style={styles.listCard}>
        {expenseTotals.length ? expenseTotals.map((item, index) => (
          <View key={item.category} style={[styles.categoryRow, index !== expenseTotals.length - 1 && styles.divider]}>
            <Text style={styles.tenantName}>{item.category}</Text>
            <Text style={styles.pendingValue}>{money(item.amount)}</Text>
          </View>
        )) : <Text style={styles.emptyState}>No expenses yet.</Text>}
      </View>
      <SectionTitle title="Pending rent report" />
      <View style={styles.listCard}>
        {pendingBills.length ? pendingBills.map((bill, index) => (
          <View key={bill.id} style={[styles.pendingRow, index !== pendingBills.length - 1 && styles.divider]}>
            <Text style={styles.tenantName}>{bill.tenantName}</Text><Text style={styles.activityCaption}>Room {bill.room}</Text><Text style={styles.pendingValue}>{money(bill.pendingAmount)}</Text>
          </View>
        )) : <Text style={styles.emptyState}>No pending rent.</Text>}
      </View>
      <SectionTitle title="Exports" />
      <View style={styles.exportGrid}>
        <ExportButton label="Tenant CSV" onPress={() => exportCsv('pgcopilot-tenant-list.csv', reportPayload.tenantList)} />
        <ExportButton label="Pending CSV" onPress={() => exportCsv('pgcopilot-pending-rent.csv', reportPayload.pendingRent)} />
        <ExportButton label="Occupancy CSV" onPress={() => exportCsv('pgcopilot-occupancy.csv', reportPayload.occupancy)} />
        <ExportButton label="Expense CSV" onPress={() => exportCsv('pgcopilot-expense-summary.csv', reportPayload.expenseSummary)} />
        <ExportButton label="P&L CSV" onPress={() => exportCsv('pgcopilot-profit-loss.csv', reportPayload.profitLoss)} />
        <ExportButton label="Excel report" onPress={() => exportExcel('pgcopilot-reports.xls', reportPayload)} />
        <ExportButton label="PDF report" onPress={() => exportReportPdf(data, reportPayload)} />
      </View>
    </ScrollView>
  );
}

function AddExpenseModal({
  visible,
  onClose,
  onSubmit,
}: {
  visible: boolean;
  onClose: () => void;
  onSubmit: (input: NewExpenseInput) => Promise<void>;
}) {
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [category, setCategory] = useState<ExpenseCategory>('Food');
  const [vendor, setVendor] = useState('');
  const [notes, setNotes] = useState('');
  const [bill, setBill] = useState<NewExpenseInput['bill']>();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | undefined>();

  const pickBill = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['image/*', 'application/pdf'],
      copyToCacheDirectory: true,
    });
    if (!result.canceled && result.assets[0]) {
      setBill({
        uri: result.assets[0].uri,
        name: result.assets[0].name,
        mimeType: result.assets[0].mimeType,
      });
    }
  };

  const resetAndClose = () => {
    setAmount('');
    setDate(new Date().toISOString().slice(0, 10));
    setCategory('Food');
    setVendor('');
    setNotes('');
    setBill(undefined);
    setError(undefined);
    onClose();
  };

  const handleSubmit = async () => {
    const expenseAmount = Number(amount || 0);
    if (!expenseAmount || expenseAmount <= 0) {
      setError('Enter a valid expense amount.');
      return;
    }
    if (!date.trim()) {
      setError('Enter expense date.');
      return;
    }
    setSaving(true);
    setError(undefined);
    try {
      await onSubmit({
        amount: expenseAmount,
        date: date.trim(),
        category,
        vendor: vendor.trim(),
        notes: notes.trim(),
        bill,
      });
      resetAndClose();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Unable to save expense.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalBackdrop}>
        <View style={styles.modalSheet}>
          <View style={styles.modalHandle} />
          <View style={styles.modalHeader}>
            <View><Text style={styles.modalTitle}>Add expense</Text><Text style={styles.subtitle}>Track amount, category and bill proof</Text></View>
            <TouchableOpacity onPress={resetAndClose}><AppIcon name="close" size={23} color={colors.ink} /></TouchableOpacity>
          </View>
          <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
            <View style={styles.formRow}>
              <View style={[styles.formField, styles.flex]}><Text style={styles.fieldLabel}>AMOUNT</Text><TextInput placeholder="0" style={styles.fieldInput} value={amount} onChangeText={setAmount} keyboardType="numeric" /></View>
              <View style={[styles.formField, styles.flex]}><Text style={styles.fieldLabel}>DATE</Text><TextInput placeholder="YYYY-MM-DD" style={styles.fieldInput} value={date} onChangeText={setDate} /></View>
            </View>
            <View style={styles.availableBedBox}>
              <Text style={styles.fieldLabel}>CATEGORY</Text>
              <View style={styles.availableBedRow}>
                {expenseCategoryOptions.map((item) => (
                  <TouchableOpacity key={item} style={[styles.availableBedChip, category === item && styles.availableBedChipActive]} onPress={() => setCategory(item)}>
                    <Text style={[styles.availableBedText, category === item && styles.availableBedTextActive]}>{item}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            <View style={styles.formRow}>
              <View style={[styles.formField, styles.flex]}><Text style={styles.fieldLabel}>VENDOR / PERSON</Text><TextInput placeholder="Vendor or staff name" style={styles.fieldInput} value={vendor} onChangeText={setVendor} /></View>
            </View>
            <View style={styles.formRow}>
              <View style={[styles.formField, styles.flex]}><Text style={styles.fieldLabel}>NOTES</Text><TextInput placeholder="Optional notes" style={styles.fieldInput} value={notes} onChangeText={setNotes} /></View>
            </View>
            <TouchableOpacity style={styles.documentButton} onPress={pickBill}>
              <AppIcon name={bill ? 'check-circle-outline' : 'paperclip'} size={18} color={bill ? colors.green : colors.muted} />
              <View style={styles.flex}><Text style={styles.documentTitle}>Bill Upload</Text><Text style={styles.activityCaption}>{bill?.name ?? 'Image or PDF, optional'}</Text></View>
            </TouchableOpacity>
            {error ? <Text style={styles.authError}>{error}</Text> : null}
            <TouchableOpacity style={styles.primaryButton} onPress={handleSubmit} disabled={saving}><Text style={styles.primaryButtonText}>{saving ? 'Saving...' : 'Save expense'}</Text></TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

type ReportRow = Record<string, string | number | boolean | undefined>;

function buildReportPayload(
  data: PgMasterData,
  summary: ReturnType<typeof buildSummary>,
  pendingBills: RentBill[],
  expenseTotals: { category: ExpenseCategory; amount: number }[],
) {
  return {
    tenantList: data.tenants.map((tenant) => ({
      Name: tenant.name,
      Mobile: tenant.mobile,
      Room: tenant.room,
      Status: tenant.admissionStatus ?? 'Active',
      RentStatus: tenant.status,
      MonthlyRent: tenant.rent,
      Deposit: tenant.deposit ?? 0,
      CompanyCollege: tenant.companyCollege ?? '',
    })),
    pendingRent: pendingBills.map((bill) => ({
      Tenant: bill.tenantName,
      Room: bill.room,
      RentMonth: bill.rentMonth,
      DueDate: bill.dueDate,
      Amount: bill.amount,
      Paid: bill.paidAmount,
      Pending: bill.pendingAmount,
      Status: bill.status,
    })),
    occupancy: [
      { Metric: 'Total Beds', Value: summary.totalBeds },
      { Metric: 'Occupied Beds', Value: summary.occupiedBeds },
      { Metric: 'Vacant Beds', Value: summary.vacantBeds },
      { Metric: 'Occupancy Rate', Value: `${summary.occupancyRate}%` },
    ],
    expenseSummary: expenseTotals.map((item) => ({ Category: item.category, Amount: item.amount })),
    profitLoss: [
      { Metric: 'Expected Rent', Value: summary.expectedRent },
      { Metric: 'Collected Rent', Value: summary.collectedRent },
      { Metric: 'Pending Rent', Value: summary.pendingRent },
      { Metric: 'Expenses', Value: summary.expensesTotal },
      { Metric: 'Profit', Value: summary.profit },
    ],
  };
}

function ExportButton({ label, onPress }: { label: string; onPress: () => void }) {
  return <TouchableOpacity style={styles.exportButton} onPress={onPress}><AppIcon name="download-outline" size={16} color={colors.green} /><Text style={styles.exportButtonText}>{label}</Text></TouchableOpacity>;
}

function escapeCsv(value: string | number | boolean | undefined) {
  const text = String(value ?? '');
  return `"${text.replace(/"/g, '""')}"`;
}

function rowsToCsv(rows: ReportRow[]) {
  if (!rows.length) return '';
  const headers = Object.keys(rows[0]);
  return [headers.map(escapeCsv).join(','), ...rows.map((row) => headers.map((header) => escapeCsv(row[header])).join(','))].join('\n');
}

function downloadWebFile(fileName: string, content: string, mimeType: string) {
  if (Platform.OS !== 'web') return false;
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = globalThis.document.createElement('a');
  link.href = url;
  link.download = fileName;
  globalThis.document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  return true;
}

function exportCsv(fileName: string, rows: ReportRow[]) {
  downloadWebFile(fileName, rowsToCsv(rows), 'text/csv;charset=utf-8');
}

function reportTableHtml(title: string, rows: ReportRow[]) {
  const headers = rows.length ? Object.keys(rows[0]) : ['Report'];
  const bodyRows = rows.length ? rows : [{ Report: 'No data' }];
  return `
    <h2>${title}</h2>
    <table>
      <thead><tr>${headers.map((header) => `<th>${header}</th>`).join('')}</tr></thead>
      <tbody>${bodyRows.map((row) => `<tr>${headers.map((header) => `<td>${String(row[header] ?? '')}</td>`).join('')}</tr>`).join('')}</tbody>
    </table>
  `;
}

function reportHtml(data: PgMasterData, payload: ReturnType<typeof buildReportPayload>) {
  return `
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; color: #17231F; padding: 28px; }
          h1 { margin-bottom: 4px; }
          h2 { margin-top: 28px; }
          table { border-collapse: collapse; width: 100%; }
          th, td { border: 1px solid #E8ECE8; padding: 8px; text-align: left; font-size: 12px; }
          th { background: #E6F4EE; }
        </style>
      </head>
      <body>
        <h1>PGCopilot Reports</h1>
        <p>${data.propertyName}</p>
        ${reportTableHtml('Tenant List', payload.tenantList)}
        ${reportTableHtml('Pending Rent', payload.pendingRent)}
        ${reportTableHtml('Occupancy', payload.occupancy)}
        ${reportTableHtml('Expense Summary', payload.expenseSummary)}
        ${reportTableHtml('Profit & Loss', payload.profitLoss)}
      </body>
    </html>
  `;
}

function exportExcel(fileName: string, payload: ReturnType<typeof buildReportPayload>) {
  const html = reportHtml({ propertyName: 'PGCopilot' } as PgMasterData, payload);
  downloadWebFile(fileName, html, 'application/vnd.ms-excel;charset=utf-8');
}

async function exportReportPdf(data: PgMasterData, payload: ReturnType<typeof buildReportPayload>) {
  const html = reportHtml(data, payload);
  if (downloadWebFile('pgcopilot-reports.html', html, 'text/html;charset=utf-8')) return;
  const printed = await Print.printToFileAsync({ html });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(printed.uri, { mimeType: 'application/pdf', dialogTitle: 'PGCopilot Reports' });
  }
}

function buildAiInsights(data: PgMasterData): { title: string; text: string; icon: IconName; tone: Tone }[] {
  const summary = buildSummary(data);
  const pendingCount = getPendingRentRows(data).length;
  const vacantBeds = getVacantBeds(data);
  const topExpense = getTopExpenseCategory(data);
  return [
    {
      title: 'Pending rent',
      text: pendingCount ? `${pendingCount} tenants pending - ${money(summary.pendingRent)} due` : 'All generated rent is paid',
      icon: 'wallet-outline',
      tone: summary.pendingRent ? 'red' : 'green',
    },
    {
      title: 'Vacant beds',
      text: vacantBeds.length ? `${vacantBeds.length} beds available now` : 'No vacant beds available',
      icon: 'bed-empty',
      tone: vacantBeds.length ? 'orange' : 'green',
    },
    {
      title: 'Occupancy',
      text: `${summary.occupancyRate}% occupied across ${summary.totalBeds} beds`,
      icon: 'chart-donut',
      tone: summary.occupancyRate >= 90 ? 'green' : summary.occupancyRate >= 75 ? 'orange' : 'red',
    },
    {
      title: 'Profit',
      text: `${money(summary.profit)} after ${money(summary.expensesTotal)} expenses`,
      icon: 'chart-line',
      tone: summary.profit >= 0 ? 'green' : 'red',
    },
    {
      title: 'Expense watch',
      text: topExpense ? `${topExpense.category} is highest at ${money(topExpense.amount)}` : 'No expenses recorded yet',
      icon: 'alert-decagram-outline',
      tone: topExpense ? 'purple' : 'green',
    },
  ];
}

function OwnerAvatarButton({ profile, size = 43, onPress }: { profile: OwnerProfile; size?: number; onPress: () => void }) {
  const initials = initialsForName(profile.name || profile.phone || 'Owner');
  return (
    <TouchableOpacity
      style={[styles.ownerAvatarButton, { width: size, height: size, borderRadius: size / 2 }]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      {profile.photoUrl ? (
        <Image source={{ uri: profile.photoUrl }} style={{ width: size, height: size, borderRadius: size / 2 }} resizeMode="cover" />
      ) : (
        <Text style={styles.ownerAvatarText}>{initials}</Text>
      )}
    </TouchableOpacity>
  );
}

function getMissingDocumentTenants(data: PgMasterData) {
  return data.tenants.filter((tenant) => tenant.admissionStatus !== 'Vacated' && (tenant.documentCount ?? 0) < tenantDocumentTypes.length);
}

function buildBusinessHealth(data: PgMasterData): BusinessHealth {
  const summary = buildSummary(data);
  const pendingPercent = summary.expectedRent ? summary.pendingRent / summary.expectedRent : 0;
  const profitMargin = summary.income ? summary.profit / summary.income : 0;
  const missingDocs = getMissingDocumentTenants(data).length;
  const maintenanceBeds = summary.maintenanceBeds;
  const vacantBeds = getVacantBeds(data).length;

  let score = 100;
  score -= Math.max(0, 92 - summary.occupancyRate) * 0.75;
  score -= Math.min(30, pendingPercent * 100);
  if (profitMargin < 0.35) score -= Math.min(18, (0.35 - Math.max(profitMargin, 0)) * 50);
  score -= Math.min(10, vacantBeds * 2);
  score -= Math.min(10, maintenanceBeds * 3);
  score -= Math.min(12, missingDocs * 1.5);
  score = Math.max(0, Math.min(100, Math.round(score)));

  const positives: string[] = [];
  const warnings: string[] = [];
  if (summary.occupancyRate >= 90) positives.push(`Occupancy is strong at ${summary.occupancyRate}%.`);
  else warnings.push(`Occupancy is ${summary.occupancyRate}%; fill vacant beds to improve revenue.`);
  if (summary.pendingRent <= 0) positives.push('No pending rent in generated bills.');
  else warnings.push(`Pending rent is ${money(summary.pendingRent)} and needs follow-up.`);
  if (summary.profit >= 0) positives.push(`Current profit is ${money(summary.profit)}.`);
  else warnings.push(`Current loss is ${money(Math.abs(summary.profit))}.`);
  if (maintenanceBeds) warnings.push(`${maintenanceBeds} beds are under maintenance.`);
  if (missingDocs) warnings.push(`${missingDocs} active tenants have missing documents.`);

  const projectedVacancyRecovery = vacantBeds * Math.round(summary.activeTenants ? summary.expectedRent / summary.activeTenants : 0);
  const recommendation = summary.pendingRent > 0
    ? `Recover ${money(summary.pendingRent)} pending rent first.`
    : vacantBeds > 0
      ? `Fill ${vacantBeds} vacant beds to increase projected monthly income by about ${money(projectedVacancyRecovery)}.`
      : maintenanceBeds > 0
        ? 'Clear maintenance beds so they can return to inventory.'
        : 'Business looks healthy. Keep rent collection and document hygiene steady.';

  return {
    score,
    label: score >= 85 ? 'Excellent' : score >= 70 ? 'Good' : score >= 50 ? 'Needs attention' : 'Critical',
    tone: score >= 85 ? 'green' : score >= 70 ? 'blue' : score >= 50 ? 'orange' : 'red',
    positives,
    warnings,
    recommendation,
  };
}

function detectAiIntent(question: string): AiIntent {
  const text = question.toLowerCase();
  const compact = text.trim().replace(/[.!?]+$/g, '');
  if (detectAiCommand(question, fallbackData)) return 'command';
  if (['hi', 'hello', 'hey', 'good morning', 'good afternoon', 'good evening', 'gm'].includes(compact) || compact.includes('what would you like to do')) return 'greeting';
  if ((text.includes('who') || text.includes('tenant') || text.includes('person') || text.includes('resident')) && text.includes('room')) return 'room_lookup';
  if (text.includes('not paid') || text.includes('pending rent') || text.includes('rent due') || text.includes('unpaid')) return 'pending_rent';
  if (text.includes('vacant') || text.includes('available bed') || text.includes('free bed') || text.includes('available room')) return 'vacant_beds';
  if (text.includes('vacating') || text.includes('leaving') || text.includes('departure') || text.includes('vacate')) return 'vacating_next_month';
  if (text.includes('decrease') || text.includes('down') || text.includes('why') && text.includes('profit')) return 'profit_decrease';
  if (text.includes('profit') || text.includes('income') || text.includes('net')) return 'profit';
  if (text.includes('joined') || text.includes('admission') || text.includes('new tenant')) return 'new_admissions';
  if (text.includes('expense') || text.includes('food') || text.includes('electricity') || text.includes('cost')) return 'expense_analysis';
  if (text.includes('document') || text.includes('aadhaar') || text.includes('agreement') || text.includes('photo')) return 'documents';
  if (text.includes('today') || text.includes('work') || text.includes('task')) return 'daily_ops';
  if (text.includes('report') || text.includes('export') || text.includes('pdf') || text.includes('excel')) return 'reports';
  return 'general';
}

function parseCommandAmount(question: string) {
  const match = question.replace(/,/g, '').match(/(?:₹|rs\.?|inr)?\s*(\d{2,7})/i);
  return match ? Number(match[1]) : 0;
}

function findTenantFromQuestion(question: string, data: PgMasterData) {
  const text = question.toLowerCase();
  return data.tenants.find((tenant) => {
    const name = tenant.name.toLowerCase();
    const firstName = name.split(/\s+/)[0];
    return text.includes(name) || text.includes(firstName);
  });
}

function findRoomTokenFromQuestion(question: string) {
  const match = question.toUpperCase().match(/\b(\d{2,4}\s*[-/]?\s*[A-Z]?)\b/);
  return match?.[1]?.replace(/\s+/g, '');
}

function findTenantByRoomQuestion(question: string, data: PgMasterData) {
  const roomToken = findRoomTokenFromQuestion(question);
  if (!roomToken) return undefined;
  const normalizedRoom = roomToken.toLowerCase();
  return data.tenants.find((tenant) =>
    tenant.admissionStatus !== 'Vacated'
    && tenant.room.replace(/\s+/g, '').toLowerCase().includes(normalizedRoom)
  );
}

function findRentBillForTenant(tenant: Tenant | undefined, data: PgMasterData) {
  if (!tenant) return undefined;
  const bills = data.rentBills ?? [];
  return bills.find((item) =>
    (item.tenantId === tenant.id || item.tenantName.toLowerCase() === tenant.name.toLowerCase())
    && item.status !== 'Paid'
    && item.pendingAmount > 0
  ) ?? bills.find((item) => item.tenantId === tenant.id || item.tenantName.toLowerCase() === tenant.name.toLowerCase());
}

function categoryFromQuestion(question: string): ExpenseCategory {
  const text = question.toLowerCase();
  if (text.includes('food') || text.includes('grocery') || text.includes('rice') || text.includes('vegetable')) return 'Food';
  if (text.includes('electric')) return 'Electricity';
  if (text.includes('water')) return 'Water';
  if (text.includes('internet') || text.includes('wifi')) return 'Internet';
  if (text.includes('cook') || text.includes('salary')) return 'Cook Salary';
  if (text.includes('clean')) return 'Cleaning';
  if (text.includes('maintenance') || text.includes('repair')) return 'Maintenance';
  return 'Other';
}

function detectAiCommand(question: string, data: PgMasterData): AiCommand | undefined {
  const text = question.toLowerCase().trim();
  const amount = parseCommandAmount(question);
  const tenant = findTenantFromQuestion(question, data);
  const wantsPaymentUpdate = text.includes('payment')
    || text.includes('rent paid')
    || text.includes('paid')
    || text.includes('mark paid')
    || text.includes('as paid')
    || text.includes('update rent')
    || text.includes('rent status');

  if ((text.includes('add') || text.includes('record') || text.includes('update') || text.includes('mark') || text.includes('set')) && wantsPaymentUpdate) {
    const bill = findRentBillForTenant(tenant, data);
    const paymentAmount = amount || bill?.pendingAmount || tenant?.rent || 0;
    return {
      kind: 'record_payment',
      title: 'Record rent payment',
      tenantName: tenant?.name ?? 'Tenant not found',
      amount: paymentAmount,
      billId: bill?.id,
      paymentMode: text.includes('cash') ? 'Cash' : text.includes('bank') ? 'Bank Transfer' : 'UPI',
      summary: tenant && paymentAmount ? `Record ${money(paymentAmount)} payment from ${tenant.name}.` : 'I need tenant name and amount before recording payment.',
      disabledReason: !tenant ? 'Tenant not found. Try: Update John N rent 8000 as paid.' : !paymentAmount ? 'Payment amount missing.' : !bill ? 'No rent bill found for this tenant. Generate monthly rent first.' : bill.status === 'Paid' ? 'This rent bill is already marked paid.' : undefined,
    };
  }

  if ((text.includes('add') || text.includes('record')) && (text.includes('expense') || text.includes('bill') || text.includes('electric') || text.includes('food'))) {
    const category = categoryFromQuestion(question);
    return {
      kind: 'add_expense',
      title: 'Add expense',
      amount,
      category,
      summary: amount ? `Add ${category} expense of ${money(amount)}.` : `Add ${category} expense.`,
      disabledReason: !amount ? 'Expense amount missing.' : undefined,
    };
  }

  if (text.includes('move') && tenant) {
    return {
      kind: 'move_tenant',
      title: 'Move tenant',
      summary: `Move ${tenant.name} to another bed.`,
      disabledReason: 'Move tenant command needs a confirmation workflow with bed selection. This is planned next.',
    };
  }

  if (text.includes('vacate') && tenant) {
    return {
      kind: 'vacate_tenant',
      title: 'Vacate tenant',
      summary: `Start vacate process for ${tenant.name}.`,
      disabledReason: 'Vacate command requires refund/damage confirmation. Open tenant profile for now.',
    };
  }

  if (text.includes('reminder') || text.includes('collect pending')) {
    return {
      kind: 'send_reminder',
      title: 'Create rent reminders',
      summary: 'Prepare WhatsApp reminders for pending rent tenants.',
      disabledReason: 'Bulk reminder scheduling is planned. You can send reminders from tenant/rent screens now.',
    };
  }

  if (text.includes('report') || text.includes('export')) {
    return {
      kind: 'generate_report',
      title: 'Generate report',
      summary: 'Open Reports & analytics to export PDF, Excel, or CSV.',
    };
  }

  if ((text.includes('open') || text.includes('view')) && tenant) {
    return {
      kind: 'open_profile',
      title: 'Open tenant profile',
      summary: `Open ${tenant.name}'s tenant profile.`,
      disabledReason: 'Direct AI navigation to a specific profile is planned. Open Tenants and search this name for now.',
    };
  }

  return undefined;
}

function getPendingRentRows(data: PgMasterData) {
  const bills = (data.rentBills ?? []).filter((bill) => bill.status !== 'Paid' && bill.pendingAmount > 0);
  if (bills.length) {
    return bills.map((bill) => ({
      tenantName: bill.tenantName,
      room: bill.room,
      pendingAmount: bill.pendingAmount,
      dueDate: bill.dueDate,
    }));
  }
  return data.tenants
    .filter((tenant) => tenant.admissionStatus !== 'Vacated' && tenant.status !== 'Paid')
    .map((tenant) => ({
      tenantName: tenant.name,
      room: tenant.room,
      pendingAmount: tenant.rent,
      dueDate: `Day ${tenant.rentDueDay ?? 5}`,
    }));
}

function getVacantBeds(data: PgMasterData) {
  return data.rooms.flatMap((room) => room.beds.map((status, index) => ({
    status,
    room: room.number,
    floor: room.floor,
    bed: room.bedNumbers?.[index] ?? `${room.number}-${index + 1}`,
  }))).filter((item) => item.status === 'Vacant');
}

function getNextMonthVacates(data: PgMasterData) {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 2, 0, 23, 59, 59);
  return data.tenants.filter((tenant) => {
    if (!tenant.vacateDate || tenant.admissionStatus === 'Vacated') return false;
    const vacateDate = new Date(tenant.vacateDate);
    return vacateDate >= start && vacateDate <= end;
  });
}

function getThisMonthAdmissions(data: PgMasterData) {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
  return data.tenants.filter((tenant) => {
    if (!tenant.joiningDate) return false;
    const joiningDate = new Date(tenant.joiningDate);
    return joiningDate >= start && joiningDate <= end;
  });
}

function getTopExpenseCategory(data: PgMasterData) {
  const totals = expenseCategoryOptions.map((category) => ({
    category,
    amount: data.expenses.filter((expense) => expense.category === category || (!expense.category && expense.label.toLowerCase().includes(category.toLowerCase()))).reduce((sum, expense) => sum + expense.amount, 0),
  })).filter((item) => item.amount > 0).sort((a, b) => b.amount - a.amount);
  return totals[0];
}

function buildLocalAiAnswer(question: string, data: PgMasterData): AiAnswer {
  const command = detectAiCommand(question, data);
  if (command) {
    return {
      type: 'command',
      title: command.title,
      answer: command.summary,
      insight: command.disabledReason
        ? 'This command needs one more step before it can be saved safely.'
        : 'I understood this as a write command. I will not save anything until you confirm.',
      bullets: command.disabledReason
        ? [command.disabledReason]
        : ['Review the detected action.', 'Tap Confirm only if the tenant, amount, and action are correct.'],
      metrics: command.kind === 'record_payment'
        ? [
            { label: 'Tenant', value: command.tenantName, tone: 'blue' },
            { label: 'Amount', value: money(command.amount), tone: 'green' },
            { label: 'Mode', value: command.paymentMode, tone: 'purple' },
          ]
        : command.kind === 'add_expense'
          ? [
              { label: 'Category', value: command.category, tone: 'purple' },
              { label: 'Amount', value: money(command.amount), tone: 'red' },
            ]
          : undefined,
      actions: command.disabledReason ? ['Review manually'] : ['Confirm command', 'Cancel'],
      source: 'local',
    };
  }
  const intent = detectAiIntent(question);
  const summary = buildSummary(data);
  const pendingRows = getPendingRentRows(data);
  const vacantBeds = getVacantBeds(data);
  const nextMonthVacates = getNextMonthVacates(data);
  const admissions = getThisMonthAdmissions(data);
  const topExpense = getTopExpenseCategory(data);
  const missingDocs = getMissingDocumentTenants(data);
  const health = buildBusinessHealth(data);

  if (intent === 'greeting') {
    return {
      type: intent,
      title: `${greetingForTime()}, Anil`,
      answer: 'Hello Anil. I am ready to help you run the hostel today.',
      insight: health.recommendation,
      bullets: [
        `Business Health is ${health.score}/100 (${health.label}).`,
        `Pending rent is ${money(summary.pendingRent)}.`,
        `${vacantBeds.length} beds are vacant.`,
        'Ask me about rent, beds, expenses, reports, or today\'s work.',
      ],
      metrics: [
        { label: 'Health', value: `${health.score}/100`, tone: health.tone },
        { label: 'Pending', value: money(summary.pendingRent), tone: summary.pendingRent ? 'red' : 'green' },
        { label: 'Vacant', value: String(vacantBeds.length), tone: vacantBeds.length ? 'orange' : 'green' },
      ],
      actions: ["Today's work", 'Who has not paid rent?', 'Which beds are vacant?'],
      source: 'local',
    };
  }

  if (intent === 'room_lookup') {
    const roomToken = findRoomTokenFromQuestion(question);
    const tenant = findTenantByRoomQuestion(question, data);
    const vacantBed = getVacantBeds(data).find((item) =>
      roomToken ? `${item.room}-${item.bed}`.replace(/\s+/g, '').toLowerCase().includes(roomToken.toLowerCase()) || item.bed.replace(/\s+/g, '').toLowerCase().includes(roomToken.toLowerCase()) : false
    );
    return {
      type: intent,
      title: roomToken ? `Room ${roomToken}` : 'Room lookup',
      answer: tenant
        ? `${tenant.name} is currently assigned to ${tenant.room}.`
        : vacantBed
          ? `${vacantBed.bed} is currently vacant.`
          : roomToken
            ? `I could not find an active tenant in ${roomToken}.`
            : 'Please include the room or bed number, for example: Who is in room 301-A?',
      insight: tenant ? `${tenant.name}'s rent status is ${tenant.status}.` : 'Vacant rooms can be filled from the tenant admission flow.',
      bullets: tenant
        ? [`Mobile: ${tenant.mobile}`, `Company / College: ${tenant.companyCollege || 'Not added'}`, `Rent: ${money(tenant.rent)}`]
        : vacantBed
          ? [`Bed: ${vacantBed.bed}`, `Room: ${vacantBed.room}`, `Floor: ${vacantBed.floor}`]
          : ['Try a full bed number like 301-A or room number like 301.'],
      metrics: tenant
        ? [
            { label: 'Tenant', value: tenant.name, tone: 'blue' },
            { label: 'Rent', value: money(tenant.rent), tone: 'green' },
            { label: 'Status', value: tenant.status, tone: tenant.status === 'Paid' ? 'green' : 'red' },
          ]
        : [{ label: 'Room', value: roomToken ?? 'Missing', tone: vacantBed ? 'orange' : 'red' }],
      actions: tenant ? ['Open Tenants tab', 'Check rent status'] : ['Add tenant', 'Which beds are vacant?'],
      source: 'local',
    };
  }

  if (intent === 'pending_rent') {
    const total = pendingRows.reduce((sum, item) => sum + item.pendingAmount, 0);
    return {
      type: intent,
      title: 'Pending rent',
      answer: pendingRows.length ? `${pendingRows.length} tenants have pending rent. Total pending amount is ${money(total)}.` : 'No pending rent found for the current generated bills.',
      insight: pendingRows.length ? `Pending rent is ${summary.expectedRent ? Math.round((total / summary.expectedRent) * 100) : 0}% of expected rent. This should be the first recovery action.` : 'Rent collection is healthy for current bills.',
      bullets: pendingRows.slice(0, 8).map((item) => `${item.tenantName} - ${money(item.pendingAmount)} pending, Room ${item.room}, Due ${item.dueDate}`),
      metrics: [
        { label: 'Pending tenants', value: String(pendingRows.length), tone: pendingRows.length ? 'red' : 'green' },
        { label: 'Pending amount', value: money(total), tone: pendingRows.length ? 'red' : 'green' },
      ],
      actions: pendingRows.length ? ['Open Rent tab and send reminders.', 'Collect partial payments for high pending amounts first.'] : ['No reminder needed right now.'],
      source: 'local',
    };
  }

  if (intent === 'vacant_beds') {
    return {
      type: intent,
      title: 'Vacant beds',
      answer: vacantBeds.length ? `${vacantBeds.length} beds are vacant and available for admission.` : 'No vacant beds are available right now.',
      insight: vacantBeds.length ? `Filling these beds can increase next month revenue. Use the admission flow before the next rent cycle.` : 'Occupancy is tight. Keep a waiting list ready for upcoming vacates.',
      bullets: vacantBeds.slice(0, 12).map((item) => `${item.bed} - Room ${item.room}, ${item.floor}`),
      metrics: [
        { label: 'Vacant beds', value: String(vacantBeds.length), tone: vacantBeds.length ? 'orange' : 'green' },
        { label: 'Occupancy', value: `${summary.occupancyRate}%`, tone: summary.occupancyRate >= 90 ? 'green' : 'orange' },
      ],
      actions: vacantBeds.length ? ['Use vacant bed list during new tenant admission.', 'Prioritize rooms with multiple vacant beds.'] : ['Keep a waitlist for upcoming vacates.'],
      source: 'local',
    };
  }

  if (intent === 'vacating_next_month') {
    return {
      type: intent,
      title: 'Expected departures',
      answer: nextMonthVacates.length ? `${nextMonthVacates.length} tenants are marked to vacate next month.` : 'No tenants are marked as vacating next month.',
      insight: nextMonthVacates.length ? 'Expected departures should be marketed early so vacancy does not affect next month rent.' : 'No upcoming departures are recorded for next month.',
      bullets: nextMonthVacates.map((tenant) => `${tenant.name} - Room ${tenant.room}, Vacate date ${tenant.vacateDate}`),
      metrics: [
        { label: 'Next month vacates', value: String(nextMonthVacates.length), tone: nextMonthVacates.length ? 'orange' : 'green' },
      ],
      actions: nextMonthVacates.length ? ['Confirm checkout dates.', 'Start filling these beds before they become vacant.'] : ['No checkout follow-up needed for next month.'],
      source: 'local',
    };
  }

  if (intent === 'profit') {
    return {
      type: intent,
      title: "This month's profit",
      answer: `This month's net profit is ${money(summary.profit)}.`,
      insight: `Profit margin is ${summary.income ? Math.round((summary.profit / summary.income) * 100) : 0}%. Pending rent and expenses are the main levers.`,
      bullets: [`Income: ${money(summary.income)}`, `Expenses: ${money(summary.expensesTotal)}`, `Net profit: ${money(summary.profit)}`],
      metrics: [
        { label: 'Income', value: money(summary.income), tone: 'green' },
        { label: 'Expenses', value: money(summary.expensesTotal), tone: 'red' },
        { label: 'Net profit', value: money(summary.profit), tone: summary.profit >= 0 ? 'green' : 'red' },
      ],
      actions: summary.pendingRent ? ['Recover pending rent to improve cash flow.'] : ['Profit is clean against collected rent.'],
      source: 'local',
    };
  }

  if (intent === 'profit_decrease') {
    const riskBullets = [
      summary.pendingRent > 0 ? `Pending rent is ${money(summary.pendingRent)}, which directly reduces cash collected.` : 'Pending rent is currently under control.',
      summary.vacantBeds > 0 ? `${summary.vacantBeds} vacant beds reduce expected monthly income.` : 'Vacancy is not a major issue right now.',
      topExpense ? `${topExpense.category} is the highest expense category at ${money(topExpense.amount)}.` : 'No expense categories are recorded yet.',
    ];
    return {
      type: intent,
      title: 'Profit decrease analysis',
      answer: 'I can explain the current profit pressure from available data. Month-over-month comparison will become sharper after more historical expense and rent records are available.',
      insight: health.recommendation,
      bullets: riskBullets,
      metrics: [
        { label: 'Occupancy', value: `${summary.occupancyRate}%`, tone: summary.occupancyRate >= 90 ? 'green' : 'orange' },
        { label: 'Pending rent', value: money(summary.pendingRent), tone: summary.pendingRent ? 'red' : 'green' },
        { label: 'Expenses', value: money(summary.expensesTotal), tone: 'red' },
      ],
      actions: ['Follow up on pending rent first.', 'Review the top expense category.', 'Fill vacant beds before the next billing cycle.'],
      source: 'local',
    };
  }

  if (intent === 'new_admissions') {
    return {
      type: intent,
      title: 'New admissions',
      answer: admissions.length ? `${admissions.length} tenants joined this month.` : 'No new admissions found for this month.',
      insight: admissions.length ? 'Check document completion and rent bill generation for new joiners.' : 'No new admissions this month means growth depends on filling vacant beds.',
      bullets: admissions.map((tenant) => `${tenant.name} - Room ${tenant.room}, Joined ${tenant.joiningDate}`),
      metrics: [{ label: 'Joined this month', value: String(admissions.length), tone: admissions.length ? 'blue' : 'green' }],
      actions: admissions.length ? ['Check document completion for new tenants.'] : ['Admissions pipeline is quiet this month.'],
      source: 'local',
    };
  }

  if (intent === 'expense_analysis') {
    return {
      type: intent,
      title: 'Expense analysis',
      answer: topExpense ? `${topExpense.category} is currently the largest expense category at ${money(topExpense.amount)}.` : 'No expenses have been recorded yet.',
      insight: topExpense ? `Track ${topExpense.category} closely this month. If it rises while occupancy is flat, profit will compress.` : 'Expense insight will improve once daily bills are entered.',
      bullets: expenseCategoryOptions.map((category) => {
        const amount = data.expenses.filter((expense) => expense.category === category || (!expense.category && expense.label.toLowerCase().includes(category.toLowerCase()))).reduce((sum, expense) => sum + expense.amount, 0);
        return amount ? `${category}: ${money(amount)}` : '';
      }).filter(Boolean),
      metrics: [
        { label: 'Total expenses', value: money(summary.expensesTotal), tone: 'red' },
        { label: 'Top category', value: topExpense?.category ?? 'None', tone: 'purple' },
      ],
      actions: topExpense ? [`Review ${topExpense.category} bills for unusual increases.`] : ['Start adding expenses to unlock analysis.'],
      source: 'local',
    };
  }

  if (intent === 'documents') {
    return {
      type: intent,
      title: 'Missing documents',
      answer: missingDocs.length ? `${missingDocs.length} active tenants have incomplete documents.` : 'All active tenants have complete document sets.',
      insight: missingDocs.length ? 'Missing documents create compliance risk. Close these before onboarding more tenants.' : 'Document hygiene is healthy.',
      bullets: missingDocs.slice(0, 10).map((tenant) => `${tenant.name} - ${tenant.documentCount ?? 0}/${tenantDocumentTypes.length} documents`),
      metrics: [{ label: 'Incomplete tenants', value: String(missingDocs.length), tone: missingDocs.length ? 'orange' : 'green' }],
      actions: missingDocs.length ? ['Open tenant profile and upload missing documents.', 'Prioritize Aadhaar and agreement documents.'] : ['No document follow-up needed today.'],
      source: 'local',
    };
  }

  if (intent === 'daily_ops') {
    return {
      type: intent,
      title: "Today's work",
      answer: `Business Health is ${health.score}/100 (${health.label}).`,
      insight: health.recommendation,
      bullets: [...health.warnings, ...health.positives].slice(0, 8),
      metrics: [
        { label: 'Health Score', value: `${health.score}/100`, tone: health.tone },
        { label: 'Pending Rent', value: money(summary.pendingRent), tone: summary.pendingRent ? 'red' : 'green' },
        { label: 'Vacant Beds', value: String(vacantBeds.length), tone: vacantBeds.length ? 'orange' : 'green' },
      ],
      actions: [...health.warnings, health.recommendation].slice(0, 3),
      source: 'local',
    };
  }

  if (intent === 'reports') {
    return {
      type: intent,
      title: 'Reports ready',
      answer: 'You can generate tenant, pending rent, occupancy, expense summary, and profit & loss reports from Reports & analytics.',
      insight: 'Reports are most useful after rent bills and expenses are updated for the month.',
      bullets: ['Tenant List', 'Pending Rent', 'Occupancy', 'Expense Summary', 'Profit & Loss'],
      metrics: [
        { label: 'Income', value: money(summary.income), tone: 'green' },
        { label: 'Expenses', value: money(summary.expensesTotal), tone: 'red' },
        { label: 'Profit', value: money(summary.profit), tone: summary.profit >= 0 ? 'green' : 'red' },
      ],
      actions: ['Open More > Reports & analytics.', 'Export PDF, Excel, or CSV as needed.'],
      source: 'local',
    };
  }

  return {
    type: 'general',
    title: 'Try a hostel question',
    answer: 'I can answer rent, vacant bed, vacate, profit, admission, and expense questions from your PGCopilot data.',
    insight: 'Start with daily work, pending rent, vacant beds, profit, or missing documents.',
    bullets: ['Who has not paid rent?', 'Which beds are vacant?', "Show this month's profit.", 'Why did profit decrease?'],
    actions: ['Tap one of the suggested questions below.'],
    source: 'local',
  };
}

async function askAiCopilot(question: string, data: PgMasterData): Promise<AiAnswer> {
  const localAnswer = buildLocalAiAnswer(question, data);
  if (!isSupabaseConfigured || !supabase || !data.hostelId) return localAnswer;

  try {
    const result = await supabase.functions.invoke('ask-ai', {
      body: { hostelId: data.hostelId, question },
    });
    if (!result.error && result.data?.answer) {
      return {
        ...localAnswer,
        title: localAnswer.type === 'general' ? 'PGCopilot answer' : localAnswer.title,
        answer: String(result.data.answer),
        bullets: Array.isArray(result.data.bullets) ? result.data.bullets.map(String) : localAnswer.bullets,
        insight: localAnswer.type === 'general' ? undefined : localAnswer.insight,
        actions: localAnswer.type === 'general' ? [] : localAnswer.actions,
        source: 'gemini',
      };
    }
  } catch {
    // The local intent engine keeps Copilot useful until the Edge Function is deployed.
  }
  return localAnswer;
}

function AICopilot({
  data,
  ownerProfile,
  onRecordPayment,
  onAddExpense,
  onNavigate,
  onOpenOwnerProfile,
}: {
  data: PgMasterData;
  ownerProfile: OwnerProfile;
  onRecordPayment: (input: RecordRentPaymentInput) => Promise<void>;
  onAddExpense: (input: NewExpenseInput) => Promise<void>;
  onNavigate: (tab: Tab) => void;
  onOpenOwnerProfile: () => void;
}) {
  const suggestions = [
    "Today's work",
    'Good morning',
    'Hello',
    'Who has not paid rent?',
    'Which beds are vacant?',
    'Who is vacating next month?',
    "Show this month's profit.",
    'Why did profit decrease?',
    'Who has missing documents?',
    'Generate report',
  ];
  const summary = buildSummary(data);
  const health = buildBusinessHealth(data);
  const pendingRows = getPendingRentRows(data);
  const vacantBeds = getVacantBeds(data);
  const today = new Date().toISOString().slice(0, 10);
  const todayCheckIns = data.tenants.filter((tenant) => tenant.joiningDate === today).length;
  const todayCheckOuts = data.tenants.filter((tenant) => tenant.vacateDate === today).length;
  const todayFoodCost = data.expenses
    .filter((expense) => expense.category === 'Food' && expense.date === today)
    .reduce((sum, expense) => sum + expense.amount, 0);
  const todayCollected = (data.rentBills ?? []).flatMap((bill) => bill.receipts)
    .filter((receipt) => receipt.paymentDate.slice(0, 10) === today)
    .reduce((sum, receipt) => sum + receipt.amount, 0);
  const summaryTiles = [
    { label: 'Occupancy', value: `${summary.occupancyRate}%`, icon: 'chart-donut' as IconName, tone: summary.occupancyRate >= 90 ? 'green' as Tone : 'orange' as Tone },
    { label: 'Vacant Beds', value: String(vacantBeds.length), icon: 'bed-empty' as IconName, tone: vacantBeds.length ? 'orange' as Tone : 'green' as Tone },
    { label: 'Pending Rent', value: money(summary.pendingRent), icon: 'wallet-outline' as IconName, tone: summary.pendingRent ? 'red' as Tone : 'green' as Tone },
    { label: 'Cash Today', value: money(todayCollected), icon: 'cash-check' as IconName, tone: 'green' as Tone },
    { label: 'Check-ins', value: String(todayCheckIns), icon: 'account-plus-outline' as IconName, tone: 'blue' as Tone },
    { label: 'Check-outs', value: String(todayCheckOuts), icon: 'logout-variant' as IconName, tone: todayCheckOuts ? 'orange' as Tone : 'green' as Tone },
    { label: 'Food Today', value: money(todayFoodCost), icon: 'silverware-fork-knife' as IconName, tone: todayFoodCost ? 'orange' as Tone : 'green' as Tone },
    { label: 'Net Profit', value: money(summary.profit), icon: 'chart-line' as IconName, tone: summary.profit >= 0 ? 'green' as Tone : 'red' as Tone },
  ];
  const priorityCards = [
    { label: `Collect rent from ${pendingRows.length} tenants`, icon: 'account-cash-outline' as IconName, tone: pendingRows.length ? 'red' as Tone : 'green' as Tone },
    { label: `${vacantBeds.length} beds vacant`, icon: 'bed-empty' as IconName, tone: vacantBeds.length ? 'orange' as Tone : 'green' as Tone },
    { label: health.warnings.find((item) => item.toLowerCase().includes('maintenance')) ?? 'No maintenance backlog', icon: 'hammer-wrench' as IconName, tone: health.warnings.some((item) => item.toLowerCase().includes('maintenance')) ? 'orange' as Tone : 'green' as Tone },
    { label: `${getThisMonthAdmissions(data).length} new admissions this month`, icon: 'account-plus-outline' as IconName, tone: 'blue' as Tone },
  ];
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState<AiAnswer>(() => buildLocalAiAnswer("Today's work", data));
  const [history, setHistory] = useState<AiChatMessage[]>(() => {
    const firstAnswer = buildLocalAiAnswer("Today's work", data);
    return [{
      id: newAiMessageId(),
      role: 'assistant',
      text: firstAnswer.answer,
      answer: firstAnswer,
      createdAt: new Date(),
    }];
  });
  const [pendingCommand, setPendingCommand] = useState<AiCommand | undefined>();
  const [commandMessage, setCommandMessage] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);
  const [voiceActive, setVoiceActive] = useState(false);
  const [promptMenuOpen, setPromptMenuOpen] = useState(false);

  const filteredSuggestions = question.trim()
    ? suggestions
        .filter((item) => item.toLowerCase().includes(question.trim().toLowerCase()) || question.trim().length >= 3)
        .slice(0, 4)
    : suggestions.slice(0, 5);

  const startVoiceInput = () => {
    Keyboard.dismiss();
    setCommandMessage(undefined);
    setVoiceActive(true);
    const SpeechRecognition = (globalThis as any).SpeechRecognition || (globalThis as any).webkitSpeechRecognition;
    if (Platform.OS === 'web' && SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.lang = 'en-IN';
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;
      recognition.onresult = (event: any) => {
        const transcript = event?.results?.[0]?.[0]?.transcript;
        if (transcript) setQuestion(transcript);
      };
      recognition.onerror = () => {
        setCommandMessage('Voice input was not available. Please type your question.');
        setVoiceActive(false);
      };
      recognition.onend = () => setVoiceActive(false);
      recognition.start();
      return;
    }
    setCommandMessage('Voice input is ready for web browsers that support speech recognition. Native iOS/Android voice needs the next Expo speech package step.');
    setTimeout(() => setVoiceActive(false), 700);
  };

  const submitQuestion = async (value = question) => {
    const trimmed = value.trim();
    if (!trimmed) return;
    Keyboard.dismiss();
    setPromptMenuOpen(false);
    setQuestion('');
    setCommandMessage(undefined);
    const userMessage: AiChatMessage = { id: newAiMessageId(), role: 'owner', text: trimmed, createdAt: new Date() };
    setHistory((current) => [...current, userMessage]);
    const command = detectAiCommand(trimmed, data);
    setPendingCommand(command);
    const localAnswer = buildLocalAiAnswer(trimmed, data);
    setAnswer(localAnswer);
    if (command) {
      setHistory((current) => [...current, {
        id: newAiMessageId(),
        role: 'assistant',
        text: localAnswer.answer,
        answer: localAnswer,
        createdAt: new Date(),
      }]);
      return;
    }
    setLoading(true);
    const nextAnswer = await askAiCopilot(trimmed, data);
    setAnswer(nextAnswer);
    setHistory((current) => [...current, {
      id: newAiMessageId(),
      role: 'assistant',
      text: nextAnswer.answer,
      answer: nextAnswer,
      createdAt: new Date(),
    }]);
    setLoading(false);
  };

  const confirmCommand = async () => {
    if (!pendingCommand || pendingCommand.disabledReason) return;
    setLoading(true);
    setCommandMessage(undefined);
    try {
      if (pendingCommand.kind === 'record_payment') {
        await onRecordPayment({
          rentPaymentId: pendingCommand.billId!,
          amount: pendingCommand.amount,
          paymentMode: pendingCommand.paymentMode,
          paymentDate: new Date().toISOString().slice(0, 10),
          notes: 'Recorded from AI Copilot command',
        });
        setCommandMessage(`Payment recorded for ${pendingCommand.tenantName}.`);
      }
      if (pendingCommand.kind === 'add_expense') {
        await onAddExpense({
          amount: pendingCommand.amount,
          date: new Date().toISOString().slice(0, 10),
          category: pendingCommand.category,
          vendor: '',
          notes: 'Recorded from AI Copilot command',
        });
        setCommandMessage(`${pendingCommand.category} expense saved.`);
      }
      if (pendingCommand.kind === 'generate_report') {
        onNavigate('More');
        setCommandMessage('Open More > Reports & analytics to export reports.');
      }
      setPendingCommand(undefined);
    } catch (error) {
      setCommandMessage(error instanceof Error ? error.message : 'Unable to complete command.');
    } finally {
      setLoading(false);
    }
  };

  const renderAnswerCard = (itemAnswer: AiAnswer) => (
    <View style={styles.aiAnswerCard}>
      <View style={styles.aiAnswerHeader}>
        <View style={styles.flex}>
          <Text style={styles.cardEyebrow}>{itemAnswer.source === 'gemini' ? 'GEMINI ASSISTED' : 'PGCOPILOT AI'}</Text>
          <Text style={styles.aiAnswerTitle}>{itemAnswer.title}</Text>
        </View>
        <TouchableOpacity style={styles.aiDetailsButton} onPress={() => itemAnswer.type === 'pending_rent' ? onNavigate('Rent') : undefined}>
          <Text style={styles.aiDetailsText}>View details</Text>
        </TouchableOpacity>
      </View>
      <Text style={styles.aiAnswerText}>{itemAnswer.answer}</Text>
      {itemAnswer.metrics?.length ? (
        <View style={styles.aiMetricRow}>
          {itemAnswer.metrics.map((item) => (
            <View key={`${itemAnswer.title}-${item.label}`} style={styles.aiMetricCard}>
              <Text style={styles.smallMuted}>{item.label}</Text>
              <Text style={[styles.aiMetricValue, { color: colors[item.tone] }]}>{item.value}</Text>
            </View>
          ))}
        </View>
      ) : null}
      {itemAnswer.type === 'pending_rent' && pendingRows.length ? (
        <View style={styles.aiTable}>
          <View style={styles.aiTableHeader}><Text style={styles.aiTableHeadTenant}>Tenant</Text><Text style={styles.aiTableHead}>Room</Text><Text style={styles.aiTableHead}>Pending</Text></View>
          {pendingRows.slice(0, 4).map((item) => (
            <View key={`${itemAnswer.title}-${item.tenantName}-${item.room}`} style={styles.aiTableRow}>
              <View style={styles.aiTableTenant}><TenantAvatar name={item.tenantName} initials={initialsForName(item.tenantName)} /><Text style={styles.tenantName}>{item.tenantName}</Text></View>
              <Text style={styles.aiTableCell}>{item.room}</Text>
              <Text style={[styles.aiTableCell, { color: colors.red }]}>{money(item.pendingAmount)}</Text>
            </View>
          ))}
        </View>
      ) : itemAnswer.bullets.length ? (
        <View style={styles.aiBulletList}>
          {itemAnswer.bullets.map((item) => (
            <View key={`${itemAnswer.title}-${item}`} style={styles.aiBulletRow}>
              <View style={styles.aiBulletDot} />
              <Text style={styles.aiBulletText}>{item}</Text>
            </View>
          ))}
        </View>
      ) : null}
      {itemAnswer.actions?.length ? (
        <View style={styles.aiSmartGrid}>
          {itemAnswer.actions.map((item, index) => (
            <TouchableOpacity
              key={`${itemAnswer.title}-${item}`}
              style={styles.aiSmartAction}
              onPress={() => {
                if (item.toLowerCase().includes('rent')) onNavigate('Rent');
                else if (item.toLowerCase().includes('report')) onNavigate('More');
                else if (item.toLowerCase().includes('tenant') || item.toLowerCase().includes('document')) onNavigate('Tenants');
                else submitQuestion(item);
              }}
            >
              <View style={[styles.aiSummaryIcon, { backgroundColor: index === 0 ? colors.paleGreen : colors.paleBlue }]}>
                <AppIcon name={index === 0 ? 'cash-multiple' : index === 1 ? 'bed-empty' : 'format-list-bulleted'} size={16} color={index === 0 ? colors.green : colors.blue} />
              </View>
              <Text style={styles.aiActionText}>{item}</Text>
            </TouchableOpacity>
          ))}
        </View>
      ) : null}
      {itemAnswer.insight ? (
        <View style={styles.aiInsightRecommendationRow}>
          <View style={styles.aiInsightBox}><AppIcon name="lightbulb-on-outline" size={18} color={colors.orange} /><Text style={styles.aiInsightBoxText}>{itemAnswer.insight}</Text></View>
        </View>
      ) : null}
    </View>
  );

  return (
    <View style={styles.aiScreen}>
      <View style={styles.aiTopBar}>
        <View style={styles.aiBrandIcon}><AppIcon name="robot-outline" size={28} color="#FFF" /></View>
        <View style={styles.flex}>
          <Text style={styles.aiTopTitle}>PGCopilot AI</Text>
          <Text style={styles.aiTopSubtitle}>Your smart hostel manager</Text>
        </View>
        <TouchableOpacity style={styles.aiBellButton}>
          <AppIcon name="bell-outline" size={21} color={colors.ink} />
          {pendingRows.length ? <View style={styles.aiBadge}><Text style={styles.aiBadgeText}>{Math.min(9, pendingRows.length)}</Text></View> : null}
        </TouchableOpacity>
        <OwnerAvatarButton profile={ownerProfile} size={44} onPress={onOpenOwnerProfile} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} style={styles.aiBody} contentContainerStyle={styles.aiBodyContent} keyboardShouldPersistTaps="handled">
      <View style={styles.aiOverviewCard}>
        <View style={styles.aiOverviewHeader}>
          <View style={styles.flex}>
            <Text style={styles.aiGreeting}>{greetingForTime()}, {ownerProfile.name.split(' ')[0] || 'Owner'}</Text>
            <Text style={styles.aiOverviewText}>Here's your business overview for today.</Text>
          </View>
          <View style={styles.aiHealthPill}>
            <View style={[styles.aiSummaryIcon, { backgroundColor: toneBackground(health.tone) }]}>
              <AppIcon name="shield-check-outline" size={17} color={colors[health.tone]} />
            </View>
            <View>
              <Text style={styles.aiHealthLabel}>Business Health</Text>
              <View style={styles.aiHealthInline}><Text style={[styles.aiHealthInlineScore, { color: colors[health.tone] }]}>{health.score}</Text><Text style={styles.aiHealthInlineMax}>/100</Text></View>
              <Text style={[styles.aiHealthStatus, { color: colors[health.tone] }]}>{health.label}</Text>
            </View>
          </View>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.aiSummaryScroller}>
          {summaryTiles.slice(0, 5).map((item) => (
            <View key={item.label} style={styles.aiSummaryTileCompact}>
              <View style={[styles.aiSummaryIcon, { backgroundColor: toneBackground(item.tone) }]}>
                <AppIcon name={item.icon} size={16} color={colors[item.tone]} />
              </View>
              <Text style={styles.aiSummaryLabelTop}>{item.label}</Text>
              <Text style={styles.aiSummaryValueLarge}>{item.value}</Text>
              <Text style={styles.aiSummaryLabel}>{item.label === 'Occupancy' ? `${summary.occupiedBeds} / ${summary.totalBeds} beds` : item.label === 'Pending Rent' ? `${pendingRows.length} tenants` : item.label === 'Vacant Beds' ? `${vacantBeds.length ? 'Needs filling' : 'Full'}` : item.label === 'Cash Today' ? 'Collected today' : 'Today'}</Text>
            </View>
          ))}
        </ScrollView>

      </View>

      <View style={styles.aiChatHistory}>
        <Text style={styles.sectionTitle}>Copilot history</Text>
        {history.map((message) => message.role === 'owner' ? (
          <View key={message.id} style={styles.aiUserMessageRow}>
            <View style={styles.aiUserBubble}>
              <Text style={styles.aiUserBubbleText}>{message.text}</Text>
              <Text style={styles.aiBubbleTime}>{formatChatTime(message.createdAt)}</Text>
              <AppIcon name="check-all" size={15} color={colors.green} />
            </View>
            <OwnerAvatarButton profile={ownerProfile} size={34} onPress={onOpenOwnerProfile} />
          </View>
        ) : (
          <View key={message.id}>
            <View style={styles.aiAssistantLabel}>
              <View style={styles.aiAssistantIcon}><AppIcon name="robot-outline" size={16} color="#FFF" /></View>
              <Text style={styles.aiAssistantName}>PGCopilot AI</Text>
              <Text style={styles.aiBubbleTime}>{formatChatTime(message.createdAt)}</Text>
            </View>
            {message.answer ? renderAnswerCard(message.answer) : <Text style={styles.aiAnswerText}>{message.text}</Text>}
          </View>
        ))}

        {pendingCommand ? (
          <View style={styles.aiCommandCard}>
            <View style={styles.aiAnswerHeader}>
              <View>
                <Text style={styles.cardEyebrow}>COMMAND MODE</Text>
                <Text style={styles.aiAnswerTitle}>{pendingCommand.title}</Text>
              </View>
              <Chip label={pendingCommand.disabledReason ? 'Needs review' : 'Ready'} tone={pendingCommand.disabledReason ? 'orange' : 'green'} />
            </View>
            <Text style={styles.aiAnswerText}>{pendingCommand.summary}</Text>
            {pendingCommand.disabledReason ? <Text style={styles.authError}>{pendingCommand.disabledReason}</Text> : null}
            <View style={styles.commandButtonRow}>
              <TouchableOpacity style={[styles.primaryButton, styles.commandButton]} onPress={confirmCommand} disabled={loading || Boolean(pendingCommand.disabledReason)}>
                <Text style={styles.primaryButtonText}>{loading ? 'Working...' : 'Confirm and save'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.secondaryButton, styles.commandButton]} onPress={() => setPendingCommand(undefined)}>
                <Text style={styles.secondaryButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : null}
        {commandMessage ? <Text style={styles.inviteMessage}>{commandMessage}</Text> : null}

      </View>
      </ScrollView>

      <View style={styles.aiStickyComposer}>
        {promptMenuOpen ? (
          <View style={styles.aiPromptMenu}>
            {filteredSuggestions.map((item) => (
              <TouchableOpacity key={item} style={styles.aiPromptMenuItem} onPress={() => submitQuestion(item)}>
                <View style={[styles.aiPromptIcon, { backgroundColor: colors.paleGreen }]}>
                  <AppIcon name={item.toLowerCase().includes('bed') ? 'bed-empty' : item.toLowerCase().includes('profit') ? 'chart-bar' : item.toLowerCase().includes('hello') || item.toLowerCase().includes('morning') ? 'hand-wave-outline' : 'cash-multiple'} size={15} color={colors.green} />
                </View>
                <Text style={styles.aiPromptMenuText}>{item}</Text>
              </TouchableOpacity>
            ))}
          </View>
        ) : null}
        <View style={styles.aiInputRowLarge}>
          <TouchableOpacity style={[styles.aiInlineVoiceButton, voiceActive && styles.aiInlineVoiceButtonActive]} onPress={startVoiceInput}>
            <AppIcon name={voiceActive ? 'microphone' : 'microphone-outline'} size={20} color={voiceActive ? '#FFF' : colors.green} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.aiPromptToggleButton} onPress={() => setPromptMenuOpen((open) => !open)}>
            <AppIcon name={promptMenuOpen ? 'chevron-up' : 'chevron-down'} size={21} color={colors.green} />
          </TouchableOpacity>
          <TextInput
            style={styles.aiInput}
            placeholder="Ask PGCopilot AI..."
            value={question}
            onChangeText={setQuestion}
            returnKeyType="send"
            onSubmitEditing={() => submitQuestion()}
          />
          <TouchableOpacity style={styles.aiSendButton} onPress={() => submitQuestion()} disabled={loading}>
            <AppIcon name={loading ? 'timer-sand' : 'send'} size={18} color="#FFF" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

function normaliseIndianPhone(value: string) {
  const digits = value.replace(/\D/g, '');
  if (digits.length === 10) return `+91${digits}`;
  if (digits.startsWith('91')) return `+${digits}`;
  return value.trim();
}

function Login({
  authEnabled,
  onDemoLogin,
  onSendOtp,
  onVerifyOtp,
  loading,
  error,
}: {
  authEnabled: boolean;
  onDemoLogin: () => void;
  onSendOtp: (phone: string) => Promise<void>;
  onVerifyOtp: (phone: string, code: string) => Promise<void>;
  loading: boolean;
  error?: string;
}) {
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);

  const handleAuthPress = async () => {
    Keyboard.dismiss();
    if (!authEnabled) {
      onDemoLogin();
      return;
    }
    const formattedPhone = normaliseIndianPhone(phone);
    if (!otpSent) {
      await onSendOtp(formattedPhone);
      setOtpSent(true);
      return;
    }
    await onVerifyOtp(formattedPhone, otp.trim());
  };

  const loginContent = (
    <>
      <View style={styles.loginTop}>
        <Image source={pgcopilotLogo} style={styles.logoImage} resizeMode="contain" />
        <Text style={styles.logoText}>
          <Text style={styles.logoTextBlue}>PG</Text>
          <Text style={styles.logoTextGreen}>Copilot</Text>
        </Text>
        <Text style={styles.loginTagline}>Where Tenants Find and Owners Thrive</Text>
      </View>
      <View style={styles.loginCard}>
        <Text style={styles.loginTitle}>Welcome back</Text>
        <Text style={styles.loginCaption}>{authEnabled ? 'Sign in with mobile OTP' : 'Demo mode because Supabase keys are missing'}</Text>
        <Text style={styles.loginFieldLabel}>MOBILE NUMBER</Text>
        <View style={styles.loginInput}>
          <Text style={styles.prefix}>+91</Text>
          <TextInput
            style={styles.flex}
            placeholder="Enter mobile number"
            keyboardType="phone-pad"
            value={phone}
            onChangeText={setPhone}
            inputAccessoryViewID={Platform.OS === 'ios' ? loginKeyboardAccessoryId : undefined}
            onSubmitEditing={Keyboard.dismiss}
            returnKeyType="done"
          />
        </View>
        {otpSent ? (
          <>
            <Text style={[styles.loginFieldLabel, styles.otpLabel]}>OTP CODE</Text>
            <View style={styles.loginInput}>
              <TextInput
                style={styles.flex}
                placeholder="Enter OTP"
                keyboardType="number-pad"
                value={otp}
                onChangeText={setOtp}
                inputAccessoryViewID={Platform.OS === 'ios' ? loginKeyboardAccessoryId : undefined}
                onSubmitEditing={Keyboard.dismiss}
                returnKeyType="done"
              />
            </View>
          </>
        ) : null}
        {error ? <Text style={styles.authError}>{error}</Text> : null}
        <TouchableOpacity style={styles.primaryButton} onPress={handleAuthPress} disabled={loading}>
          <Text style={styles.primaryButtonText}>{loading ? 'Please wait...' : authEnabled ? otpSent ? 'Verify OTP' : 'Send OTP' : 'Continue demo'}</Text>
        </TouchableOpacity>
        <Text style={styles.loginSecurityHint}>{authEnabled ? 'Secure access for PG owners and staff' : 'Connect Supabase to enable production login'}</Text>
      </View>
    </>
  );

  const wrappedLoginContent = Platform.OS === 'web' ? (
    <View style={styles.loginKeyboardContent}>{loginContent}</View>
  ) : (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.loginKeyboardContent}>
        {loginContent}
      </KeyboardAvoidingView>
    </TouchableWithoutFeedback>
  );

  return (
    <SafeAreaView style={styles.loginScreen}>
      {wrappedLoginContent}
      {Platform.OS === 'ios' ? (
        <InputAccessoryView nativeID={loginKeyboardAccessoryId}>
          <View style={styles.keyboardAccessory}>
            <TouchableOpacity onPress={Keyboard.dismiss} style={styles.keyboardDoneButton}>
              <Text style={styles.keyboardDoneText}>Done</Text>
            </TouchableOpacity>
          </View>
        </InputAccessoryView>
      ) : null}
    </SafeAreaView>
  );
}

function isImageDocument(document?: TenantDocument) {
  return Boolean(document?.mimeType?.startsWith('image/') || document?.fileName.match(/\.(png|jpe?g|webp|gif)$/i));
}

function isPdfDocument(document?: TenantDocument) {
  return Boolean(document?.mimeType === 'application/pdf' || document?.fileName.match(/\.pdf$/i));
}

function DocumentViewerModal({ document, onClose }: { document?: TenantDocument; onClose: () => void }) {
  const uri = document?.fileUrl;
  const canPreviewImage = Boolean(uri && isImageDocument(document));
  const canPreviewPdfOnWeb = Boolean(uri && isPdfDocument(document) && Platform.OS === 'web');
  const openDocument = () => {
    if (uri) Linking.openURL(uri);
  };

  return (
    <Modal visible={Boolean(document)} animationType="fade" transparent>
      <View style={styles.imagePreviewBackdrop}>
        <View style={styles.imagePreviewCard}>
          <TouchableOpacity style={styles.imagePreviewClose} onPress={onClose}><AppIcon name="close" size={22} color={colors.ink} /></TouchableOpacity>
          <Text style={styles.modalTitle}>{document?.type ?? 'Document'}</Text>
          <Text style={[styles.activityCaption, styles.documentViewerCaption]}>{document?.fileName ?? 'No file selected'}</Text>
          {canPreviewImage ? (
            <Image source={{ uri }} style={styles.imagePreview} resizeMode="contain" />
          ) : canPreviewPdfOnWeb ? (
            React.createElement('iframe' as any, {
              src: uri,
              style: { width: '100%', height: 420, border: '0', borderRadius: 13, backgroundColor: colors.bg },
              title: document?.fileName ?? 'Document preview',
            })
          ) : (
            <View style={styles.documentFallbackPreview}>
              <AppIcon name={isPdfDocument(document) ? 'file-pdf-box' : 'file-document-outline'} size={54} color={colors.green} />
              <Text style={styles.documentFallbackText}>{uri ? 'Preview opens in your browser or document app.' : 'Document URL is not available yet.'}</Text>
            </View>
          )}
          <TouchableOpacity style={styles.primaryButton} onPress={openDocument} disabled={!uri}>
            <Text style={styles.primaryButtonText}>{Platform.OS === 'web' ? 'Open / download' : 'Open document'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

function OwnerProfileModal({
  visible,
  profile,
  onClose,
  onSave,
}: {
  visible: boolean;
  profile: OwnerProfile;
  onClose: () => void;
  onSave: (profile: OwnerProfile) => void;
}) {
  const [draft, setDraft] = useState(profile);

  useEffect(() => {
    if (visible) setDraft(profile);
  }, [visible, profile]);

  const update = (key: keyof OwnerProfile, value: string) => {
    setDraft((current) => ({ ...current, [key]: value }));
  };

  return (
    <Modal visible={visible} animationType="slide">
      <SafeAreaView style={styles.app}>
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <View style={styles.backHeader}>
            <TouchableOpacity style={styles.backButton} onPress={onClose}><AppIcon name="chevron-left" size={24} color={colors.green} /></TouchableOpacity>
            <View style={styles.flex}>
              <Text style={styles.pageTitle}>Owner profile</Text>
              <Text style={styles.subtitle}>View and update owner details</Text>
            </View>
          </View>

          <View style={styles.ownerProfileHero}>
            <OwnerAvatarButton profile={draft} size={68} onPress={() => undefined} />
            <View style={styles.flex}>
              <Text style={styles.ownerProfileName}>{draft.name || 'Owner'}</Text>
              <Text style={styles.ownerProfileMeta}>{draft.role}</Text>
              <Text style={styles.ownerProfileMeta}>{draft.propertyName}</Text>
            </View>
          </View>

          <View style={styles.formCard}>
            <Text style={styles.loginFieldLabel}>FULL NAME</Text>
            <TextInput style={styles.formInput} value={draft.name} onChangeText={(value) => update('name', value)} placeholder="Owner name" />
            <Text style={styles.loginFieldLabel}>MOBILE NUMBER</Text>
            <TextInput style={styles.formInput} value={draft.phone ?? ''} onChangeText={(value) => update('phone', value)} placeholder="Mobile number" keyboardType="phone-pad" />
            <Text style={styles.loginFieldLabel}>ROLE</Text>
            <TextInput style={styles.formInput} value={draft.role} onChangeText={(value) => update('role', value)} placeholder="Owner / Staff" />
            <Text style={styles.loginFieldLabel}>HOSTEL</Text>
            <TextInput style={styles.formInput} value={draft.propertyName} onChangeText={(value) => update('propertyName', value)} placeholder="Hostel name" />
            <Text style={styles.loginFieldLabel}>ADDRESS</Text>
            <TextInput style={[styles.formInput, styles.textArea]} value={draft.propertyAddress ?? ''} onChangeText={(value) => update('propertyAddress', value)} placeholder="Hostel address" multiline />
          </View>

          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => {
              onSave(draft);
              onClose();
            }}
          >
            <Text style={styles.primaryButtonText}>Save profile</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

function HostelSetup({
  onCreate,
  onLogout,
  saving,
  error,
}: {
  onCreate: (input: HostelSetupInput) => Promise<void>;
  onLogout: () => Promise<void>;
  saving: boolean;
  error?: string;
}) {
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [contactNumber, setContactNumber] = useState('');

  const handleCreate = async () => {
    if (!name.trim() || !address.trim()) return;
    await onCreate({
      name: name.trim(),
      address: address.trim(),
      contactNumber: contactNumber.trim(),
    });
  };

  return (
    <SafeAreaView style={styles.loginScreen}>
      <View style={styles.setupCard}>
        <Text style={styles.loginTitle}>Create your hostel</Text>
        <Text style={styles.loginCaption}>This becomes your owner workspace. Staff can be invited after setup.</Text>
        <View style={styles.formField}><Text style={styles.fieldLabel}>HOSTEL / PG NAME</Text><TextInput placeholder="Example: Greenview PG" style={styles.fieldInput} value={name} onChangeText={setName} /></View>
        <View style={styles.formField}><Text style={styles.fieldLabel}>ADDRESS</Text><TextInput placeholder="Area, city" style={styles.fieldInput} value={address} onChangeText={setAddress} /></View>
        <View style={styles.formField}><Text style={styles.fieldLabel}>CONTACT NUMBER</Text><TextInput placeholder="+91" style={styles.fieldInput} value={contactNumber} onChangeText={setContactNumber} keyboardType="phone-pad" /></View>
        {error ? <Text style={styles.authError}>{error}</Text> : null}
        <TouchableOpacity style={styles.primaryButton} onPress={handleCreate} disabled={saving}><Text style={styles.primaryButtonText}>{saving ? 'Creating...' : 'Create hostel'}</Text></TouchableOpacity>
        <TouchableOpacity style={styles.secondaryButton} onPress={onLogout}><Text style={styles.secondaryButtonText}>Logout</Text></TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

function BottomNav({ active, onPress }: { active: Tab; onPress: (tab: Tab) => void }) {
  const tabs: [Tab, IconName, IconName][] = [
    ['Home', 'view-dashboard-outline', 'view-dashboard'],
    ['Rooms', 'bed-outline', 'bed'],
    ['Tenants', 'account-group-outline', 'account-group'],
    ['Rent', 'wallet-outline', 'wallet'],
    ['AI', 'robot-outline', 'robot'],
    ['More', 'dots-grid', 'dots-grid'],
  ];
  return (
    <View style={styles.bottomNav}>
      {tabs.map(([label, icon, activeIcon]) => (
        <TouchableOpacity key={label} style={styles.navItem} onPress={() => onPress(label)}>
          <AppIcon name={active === label ? activeIcon : icon} size={22} color={active === label ? colors.green : colors.muted} />
          <Text style={[styles.navText, active === label && styles.navTextActive]}>{label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [demoMode, setDemoMode] = useState(false);
  const [authReady, setAuthReady] = useState(!isSupabaseConfigured);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | undefined>();
  const [tab, setTab] = useState<Tab>('Home');
  const [pgData, setPgData] = useState<PgMasterData>(fallbackData);
  const [dataSource, setDataSource] = useState<'supabase' | 'demo'>('demo');
  const [dataError, setDataError] = useState<string | undefined>();
  const [loadingData, setLoadingData] = useState(false);
  const [needsHostelSetup, setNeedsHostelSetup] = useState(false);
  const [savingHostel, setSavingHostel] = useState(false);
  const [selectedHostelId, setSelectedHostelId] = useState<string | undefined>();
  const [liveDataReady, setLiveDataReady] = useState(!isSupabaseConfigured);
  const [ownerProfileOpen, setOwnerProfileOpen] = useState(false);
  const [ownerProfileDraft, setOwnerProfileDraft] = useState<Partial<OwnerProfile>>({});

  const authenticated = demoMode || Boolean(session);
  const ownerProfile = useMemo<OwnerProfile>(() => {
    const sessionName = String(session?.user?.user_metadata?.full_name ?? '').trim();
    const phone = session?.user?.phone ?? '';
    return {
      name: ownerProfileDraft.name || sessionName || (phone ? `Owner ${phone.slice(-4)}` : 'Anil'),
      phone: ownerProfileDraft.phone ?? phone,
      role: ownerProfileDraft.role ?? pgData.currentUserRole ?? 'Owner',
      propertyName: ownerProfileDraft.propertyName ?? pgData.propertyName,
      propertyAddress: ownerProfileDraft.propertyAddress ?? pgData.propertyAddress,
      photoUrl: ownerProfileDraft.photoUrl,
    };
  }, [ownerProfileDraft, pgData.currentUserRole, pgData.propertyAddress, pgData.propertyName, session]);

  const refreshData = async (hostelId = selectedHostelId) => {
    setLoadingData(true);
    try {
      const result = await loadPgMasterData(hostelId);
      setPgData(result.data);
      setDataSource(result.source);
      setDataError(result.error);
      setNeedsHostelSetup(Boolean(result.needsHostelSetup));
      setSelectedHostelId(result.data.selectedHostelId ?? result.data.hostelId);
      setLiveDataReady(true);
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      return;
    }

    supabase.auth.getSession().then(async ({ data }) => {
      setSession(data.session);
      setAuthReady(true);
      if (data.session) {
        setLiveDataReady(false);
        await acceptStaffInvites();
      }
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setDemoMode(false);
      setAuthReady(true);
      if (nextSession) {
        setLiveDataReady(false);
        acceptStaffInvites().finally(() => refreshData());
      } else {
        setPgData(fallbackData);
        setNeedsHostelSetup(false);
        setSelectedHostelId(undefined);
        setLiveDataReady(false);
      }
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (authenticated && authReady) {
      refreshData();
    }
  }, [authenticated, authReady]);

  const handleAddTenant = async (input: NewTenantInput) => {
    const nextData = await saveTenant(input, pgData);
    setPgData(nextData);
    setDataError(undefined);
  };

  const handleUpdateTenant = async (input: UpdateTenantInput) => {
    const nextData = await saveTenantUpdate(input, pgData);
    setPgData(nextData);
    setDataError(undefined);
  };

  const handleVacateTenant = async (input: VacateTenantInput) => {
    const nextData = await saveTenantVacate(input, pgData);
    setPgData(nextData);
    setDataError(undefined);
  };

  const handleSendOtp = async (phone: string) => {
    if (!supabase) return;
    setAuthLoading(true);
    setAuthError(undefined);
    try {
      const { error } = await supabase.auth.signInWithOtp({ phone });
      if (error) throw error;
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Unable to send OTP.');
      throw error;
    } finally {
      setAuthLoading(false);
    }
  };

  const handleVerifyOtp = async (phone: string, token: string) => {
    if (!supabase) return;
    setAuthLoading(true);
    setAuthError(undefined);
    try {
      const { data, error } = await supabase.auth.verifyOtp({ phone, token, type: 'sms' });
      if (error) throw error;
      setLiveDataReady(false);
      setSession(data.session);
      await acceptStaffInvites();
      await refreshData();
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Unable to verify OTP.');
      throw error;
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    if (supabase) {
      await supabase.auth.signOut();
    }
    setSession(null);
    setDemoMode(false);
    setTab('Home');
    setPgData(fallbackData);
    setNeedsHostelSetup(false);
    setSelectedHostelId(undefined);
    setLiveDataReady(false);
  };

  const handleCreateHostel = async (input: HostelSetupInput) => {
    setSavingHostel(true);
    setDataError(undefined);
    try {
      const nextData = await createOwnerHostel(input);
      setPgData(nextData);
      setSelectedHostelId(nextData.selectedHostelId ?? nextData.hostelId);
      setNeedsHostelSetup(false);
    } catch (error) {
      setDataError(error instanceof Error ? error.message : 'Unable to create hostel.');
    } finally {
      setSavingHostel(false);
    }
  };

  const handleInviteStaff = async (phone: string) => {
    await inviteStaff({ hostelId: pgData.hostelId, phone });
  };

  const handleGenerateRent = async () => {
    const result = await generateRentBills(pgData);
    setPgData(result.data);
    setDataError(undefined);
  };

  const handleRecordPayment = async (input: RecordRentPaymentInput) => {
    const result = await saveRentPayment(input, pgData);
    setPgData(result.data);
    setDataError(undefined);
  };

  const handleAddExpense = async (input: NewExpenseInput) => {
    const nextData = await saveExpense(input, pgData);
    setPgData(nextData);
    setDataError(undefined);
  };

  const handleSelectHostel = async (hostelId: string) => {
    setSelectedHostelId(hostelId);
    setTab('Home');
    await refreshData(hostelId);
  };

  const content = useMemo(() => {
    if (tab === 'Rooms') return <Rooms data={pgData} />;
    if (tab === 'Tenants') return <Tenants data={pgData} onAddTenant={handleAddTenant} onUpdateTenant={handleUpdateTenant} onVacateTenant={handleVacateTenant} onRecordPayment={handleRecordPayment} onGenerateRent={handleGenerateRent} />;
    if (tab === 'Rent') return <Rent data={pgData} onGenerateRent={handleGenerateRent} onRecordPayment={handleRecordPayment} />;
    if (tab === 'AI') return <AICopilot data={pgData} ownerProfile={ownerProfile} onRecordPayment={handleRecordPayment} onAddExpense={handleAddExpense} onNavigate={setTab} onOpenOwnerProfile={() => setOwnerProfileOpen(true)} />;
    if (tab === 'More') return <More data={pgData} onInviteStaff={handleInviteStaff} onAddExpense={handleAddExpense} onNavigate={setTab} onLogout={handleLogout} />;
    return <Dashboard onNavigate={setTab} data={pgData} loading={loadingData} source={dataSource} error={dataError} onSelectHostel={handleSelectHostel} onCreateHostel={handleCreateHostel} />;
  }, [tab, pgData, loadingData, dataSource, dataError, ownerProfile]);

  if (!authReady) return <SafeAreaView style={styles.loginScreen}><Text style={styles.loginTitle}>Loading PGCopilot...</Text></SafeAreaView>;
  if (!authenticated) return <><StatusBar style="dark" /><Login authEnabled={isSupabaseConfigured} onDemoLogin={() => setDemoMode(true)} onSendOtp={handleSendOtp} onVerifyOtp={handleVerifyOtp} loading={authLoading} error={authError} /></>;
  if (!demoMode && isSupabaseConfigured && !liveDataReady) return <SafeAreaView style={styles.loginScreen}><StatusBar style="dark" /><Text style={styles.loginTitle}>Loading your hostel...</Text><Text style={styles.loginCaption}>Syncing secure Supabase data</Text></SafeAreaView>;
  if (needsHostelSetup) return <><StatusBar style="dark" /><HostelSetup onCreate={handleCreateHostel} onLogout={handleLogout} saving={savingHostel} error={dataError} /></>;
  return (
    <SafeAreaView style={styles.app}>
      <StatusBar style="dark" />
      <View style={styles.content}>{content}</View>
      {tab !== 'AI' ? (
        <View style={styles.globalOwnerAvatar}>
          <OwnerAvatarButton profile={ownerProfile} size={42} onPress={() => setOwnerProfileOpen(true)} />
        </View>
      ) : null}
      <OwnerProfileModal
        visible={ownerProfileOpen}
        profile={ownerProfile}
        onClose={() => setOwnerProfileOpen(false)}
        onSave={(nextProfile) => setOwnerProfileDraft(nextProfile)}
      />
      <BottomNav active={tab} onPress={setTab} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  app: { flex: 1, backgroundColor: colors.bg, paddingTop: Platform.OS === 'android' ? NativeStatusBar.currentHeight : 0 },
  content: { flex: 1, width: '100%', maxWidth: 520, alignSelf: 'center' },
  flex: { flex: 1 },
  alignEnd: { alignItems: 'flex-end', gap: 5 },
  scrollContent: { padding: 20, paddingBottom: 32 },
  syncBanner: { flexDirection: 'row', alignItems: 'center', gap: 7, borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 9, marginBottom: 14 },
  syncBannerLive: { backgroundColor: colors.paleGreen, borderColor: '#CDEADE' },
  syncBannerDemo: { backgroundColor: colors.paleOrange, borderColor: '#F8DFC0' },
  syncText: { color: colors.ink, fontSize: 11, fontWeight: '700', flex: 1 },
  welcomeHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 22 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 },
  eyebrow: { fontSize: 10, fontWeight: '800', color: colors.green, letterSpacing: 1.1, marginBottom: 7 },
  greeting: { fontSize: 23, fontWeight: '800', color: colors.ink, letterSpacing: -0.5 },
  propertyRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6 },
  propertyName: { color: colors.green, fontSize: 13, fontWeight: '700' },
  iconButton: { width: 43, height: 43, borderRadius: 22, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.line },
  ownerAvatarButton: { backgroundColor: colors.paleGreen, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#CDEADE', overflow: 'hidden' },
  ownerAvatarText: { color: colors.green, fontSize: 13, fontWeight: '900' },
  globalOwnerAvatar: { position: 'absolute', top: Platform.OS === 'android' ? (NativeStatusBar.currentHeight ?? 0) + 12 : 14, right: 16, zIndex: 20 },
  notificationDot: { position: 'absolute', right: 10, top: 9, width: 7, height: 7, borderRadius: 4, backgroundColor: colors.orange, borderWidth: 1, borderColor: '#FFF' },
  pageTitle: { fontSize: 25, color: colors.ink, fontWeight: '800', letterSpacing: -0.6 },
  subtitle: { color: colors.muted, fontSize: 13, marginTop: 5 },
  metricsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 13 },
  metricCard: { width: '48%', padding: 14, backgroundColor: colors.card, borderRadius: 15, borderWidth: 1, borderColor: colors.line, marginBottom: 10 },
  miniIcon: { width: 31, height: 31, borderRadius: 9, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  metricValue: { color: colors.ink, fontSize: 23, fontWeight: '800' },
  metricLabel: { color: colors.muted, fontSize: 12, fontWeight: '600', marginTop: 3 },
  collectionCard: { backgroundColor: colors.ink, borderRadius: 18, padding: 18, marginBottom: 22 },
  collectionTop: { flexDirection: 'row', justifyContent: 'space-between' },
  cardEyebrow: { color: '#90A19B', fontWeight: '800', fontSize: 10, letterSpacing: 0.9 },
  collectionValue: { color: '#FFF', fontSize: 28, fontWeight: '800', marginTop: 7 },
  collectionTotal: { color: '#AAB8B4', fontSize: 12, marginTop: 3 },
  progressCircle: { width: 56, height: 56, borderRadius: 28, borderWidth: 5, borderColor: colors.green, alignItems: 'center', justifyContent: 'center' },
  progressValue: { color: '#FFF', fontWeight: '800', fontSize: 13 },
  progressTrack: { backgroundColor: 'rgba(255,255,255,0.18)', height: 5, borderRadius: 4, marginTop: 17, overflow: 'hidden' },
  progressFill: { width: '87%', height: '100%', borderRadius: 4, backgroundColor: '#39B98D' },
  collectionFooter: { flexDirection: 'row', alignItems: 'flex-end', gap: 22, marginTop: 16 },
  smallMuted: { color: colors.muted, fontSize: 11, marginBottom: 4 },
  smallStrong: { color: '#FFF', fontWeight: '700', fontSize: 13 },
  remindButton: { marginLeft: 'auto', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 7, backgroundColor: '#E2F3ED', flexDirection: 'row', gap: 5, alignItems: 'center' },
  remindText: { color: colors.green, fontWeight: '800', fontSize: 11 },
  aiInsightGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 18 },
  aiInsightCard: { width: '48%', backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: 15, padding: 13, marginBottom: 10 },
  aiInsightIcon: { width: 34, height: 34, borderRadius: 11, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  aiInsightTitle: { color: colors.ink, fontSize: 13, fontWeight: '800' },
  aiInsightText: { color: colors.muted, fontSize: 10.5, lineHeight: 15, marginTop: 5 },
  sectionHeading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4, marginBottom: 11 },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: colors.ink },
  sectionAction: { fontSize: 12, fontWeight: '700', color: colors.green },
  sectionButton: { borderRadius: 14, backgroundColor: colors.paleGreen, paddingHorizontal: 10, paddingVertical: 7 },
  sectionButtonText: { color: colors.green, fontSize: 11, fontWeight: '800' },
  attentionRow: { flexDirection: 'row', gap: 10, marginBottom: 21 },
  attentionCard: { width: '48.6%', borderRadius: 15, padding: 14, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line },
  attentionIcon: { width: 35, height: 35, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  attentionValue: { fontSize: 21, fontWeight: '800', color: colors.ink },
  attentionLabel: { fontSize: 12, fontWeight: '700', color: colors.ink, marginTop: 2 },
  attentionCaption: { fontSize: 11, color: colors.muted, marginTop: 5 },
  quickRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 22 },
  quickAction: { alignItems: 'center', width: '23%' },
  quickIcon: { width: 48, height: 48, borderRadius: 15, backgroundColor: colors.paleGreen, alignItems: 'center', justifyContent: 'center', marginBottom: 7 },
  quickLabel: { color: colors.ink, fontWeight: '700', fontSize: 11, textAlign: 'center' },
  listCard: { backgroundColor: colors.card, borderRadius: 15, borderWidth: 1, borderColor: colors.line, marginBottom: 20, overflow: 'hidden' },
  emptyState: { color: colors.muted, fontSize: 12, padding: 14 },
  activity: { flexDirection: 'row', alignItems: 'center', gap: 11, padding: 13 },
  divider: { borderBottomWidth: 1, borderBottomColor: colors.line },
  activityIcon: { width: 37, height: 37, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  activityTitle: { color: colors.ink, fontSize: 12, fontWeight: '700' },
  activityCaption: { color: colors.muted, fontSize: 10.5, marginTop: 4 },
  activityValue: { fontSize: 11, fontWeight: '800' },
  searchBar: { height: 46, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, flexDirection: 'row', alignItems: 'center', gap: 9, borderRadius: 12, paddingHorizontal: 13, marginBottom: 13 },
  searchPlaceholder: { flex: 1, color: colors.muted, fontSize: 13 },
  searchInput: { flex: 1, fontSize: 13, color: colors.ink, outlineStyle: 'none' } as any,
  filterRow: { flexDirection: 'row', gap: 7, marginBottom: 15 },
  filterScroller: { marginBottom: 13 },
  filterChip: { paddingVertical: 8, paddingHorizontal: 13, borderWidth: 1, borderColor: colors.line, borderRadius: 18, backgroundColor: colors.card },
  filterChipActive: { backgroundColor: colors.green, borderColor: colors.green },
  filterText: { fontSize: 11, fontWeight: '700', color: colors.muted },
  filterTextActive: { color: '#FFF' },
  statsStrip: { flexDirection: 'row', justifyContent: 'space-around', backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, paddingVertical: 12, borderRadius: 13, marginBottom: 18 },
  smallStat: { alignItems: 'center' },
  smallStatValue: { fontWeight: '800', fontSize: 17 },
  smallStatLabel: { color: colors.muted, fontSize: 10, marginTop: 3 },
  roomCard: { padding: 14, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: 15, marginBottom: 11 },
  roomTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  roomTitle: { color: colors.ink, fontWeight: '800', fontSize: 15 },
  roomCaption: { color: colors.muted, fontSize: 11, marginTop: 4 },
  bedRow: { flexDirection: 'row', gap: 7 },
  bedBox: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: 9, backgroundColor: colors.paleBlue },
  bedVacant: { backgroundColor: colors.paleGreen },
  bedReserved: { backgroundColor: colors.paleOrange },
  bedMaintenance: { backgroundColor: colors.paleRed },
  bedName: { color: colors.ink, fontSize: 10, fontWeight: '800', marginTop: 4 },
  bedStatus: { fontSize: 8.5, marginTop: 3, fontWeight: '700' },
  tenantSummary: { flexDirection: 'row', justifyContent: 'space-around', backgroundColor: colors.ink, borderRadius: 14, paddingVertical: 15, marginBottom: 18 },
  summaryNumber: { color: '#FFF', fontWeight: '800', fontSize: 20, textAlign: 'center' },
  summaryLabel: { color: '#AAB8B4', fontSize: 10, marginTop: 4 },
  tenantRow: { flexDirection: 'row', gap: 11, alignItems: 'center', padding: 13 },
  avatar: { width: 39, height: 39, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 11, fontWeight: '800', color: colors.ink },
  imagePreviewBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.62)', alignItems: 'center', justifyContent: 'center', padding: 22 },
  imagePreviewCard: { width: '100%', maxWidth: 430, backgroundColor: colors.card, borderRadius: 18, padding: 14 },
  imagePreviewClose: { alignSelf: 'flex-end', width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg, marginBottom: 10 },
  imagePreview: { width: '100%', height: 360, borderRadius: 13, backgroundColor: colors.bg },
  documentViewerCaption: { marginTop: 4, marginBottom: 12 },
  documentFallbackPreview: { height: 260, borderRadius: 13, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center', padding: 22, gap: 12 },
  documentFallbackText: { color: colors.muted, textAlign: 'center', lineHeight: 19 },
  tenantName: { color: colors.ink, fontWeight: '700', fontSize: 13 },
  backLink: { flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start', marginBottom: 14 },
  backText: { color: colors.green, fontWeight: '800', fontSize: 12 },
  detailHeader: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: 18, padding: 15, flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  detailAvatar: { width: 58, height: 58, borderRadius: 29, alignItems: 'center', justifyContent: 'center' },
  detailAvatarText: { color: colors.ink, fontWeight: '900', fontSize: 18 },
  actionGrid: { flexDirection: 'row', gap: 8, marginBottom: 20 },
  actionButton: { flex: 1, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: 13, paddingVertical: 10, alignItems: 'center', gap: 4 },
  actionText: { color: colors.green, fontWeight: '800', fontSize: 10 },
  infoLine: { padding: 13, borderBottomWidth: 1, borderBottomColor: colors.line },
  infoValue: { color: colors.ink, fontWeight: '700', fontSize: 13, marginTop: 5 },
  detailButtonRow: { flexDirection: 'row', gap: 8, marginTop: 10 },
  settlementBox: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: 12, marginBottom: 10, overflow: 'hidden' },
  dangerButton: { backgroundColor: colors.red },
  fab: { position: 'absolute', right: 21, bottom: 18, width: 55, height: 55, borderRadius: 28, backgroundColor: colors.green, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.16, shadowRadius: 8, elevation: 4 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: colors.bg, borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 20, paddingBottom: 28 },
  modalScroll: { maxHeight: Platform.OS === 'web' ? 560 : 520 },
  modalHandle: { width: 42, height: 4, backgroundColor: '#D1D8D5', borderRadius: 2, alignSelf: 'center', marginBottom: 17 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  modalTitle: { color: colors.ink, fontSize: 20, fontWeight: '800' },
  formRow: { flexDirection: 'row', gap: 9 },
  formField: { backgroundColor: '#FFF', borderWidth: 1, borderColor: colors.line, borderRadius: 10, padding: 10, marginBottom: 10 },
  fieldLabel: { color: colors.muted, fontWeight: '800', fontSize: 9, letterSpacing: 0.6 },
  fieldInput: { color: colors.ink, fontSize: 13, marginTop: 7, outlineStyle: 'none' } as any,
  availableBedBox: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: 10, padding: 10, marginBottom: 10 },
  availableBedRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 8 },
  availableBedChip: { paddingHorizontal: 10, paddingVertical: 7, borderRadius: 14, backgroundColor: colors.paleGreen, borderWidth: 1, borderColor: '#CDEADE' },
  availableBedChipActive: { backgroundColor: colors.green, borderColor: colors.green },
  availableBedText: { color: colors.green, fontWeight: '800', fontSize: 11 },
  availableBedTextActive: { color: '#FFF' },
  primaryButton: { backgroundColor: colors.green, height: 49, borderRadius: 11, alignItems: 'center', justifyContent: 'center', marginTop: 9 },
  rentGenerateButton: { marginBottom: 16 },
  primaryButtonText: { color: '#FFF', fontWeight: '800', fontSize: 14 },
  secondaryButton: { height: 44, borderRadius: 11, alignItems: 'center', justifyContent: 'center', marginTop: 10, borderWidth: 1, borderColor: colors.line },
  secondaryButtonText: { color: colors.ink, fontWeight: '800', fontSize: 13 },
  rentHeroActionButton: { minWidth: 116, paddingHorizontal: 14, borderColor: '#D9E5DF', backgroundColor: '#FFFFFF' },
  rentHeroActionText: { color: colors.ink, fontWeight: '900', fontSize: 13 },
  toggleRow: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: 10, padding: 10, marginBottom: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  segmentRow: { flexDirection: 'row', gap: 7 },
  segmentChip: { paddingHorizontal: 11, paddingVertical: 7, borderRadius: 16, backgroundColor: '#EDF0EE' },
  segmentChipActive: { backgroundColor: colors.green },
  segmentText: { color: colors.muted, fontSize: 11, fontWeight: '800' },
  segmentTextActive: { color: '#FFF' },
  documentGrid: { gap: 8, marginBottom: 8 },
  documentButton: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: 10, padding: 11, flexDirection: 'row', alignItems: 'center', gap: 10 },
  inlineDocumentRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  replaceDocButton: { borderWidth: 1, borderColor: colors.green, borderRadius: 9, paddingHorizontal: 10, paddingVertical: 7 },
  replaceDocText: { color: colors.green, fontSize: 11, fontWeight: '800' },
  documentTitle: { color: colors.ink, fontSize: 12, fontWeight: '800' },
  rentHero: { backgroundColor: colors.ink, padding: 18, borderRadius: 16, marginBottom: 15 },
  rentHeroValue: { color: '#FFF', fontSize: 29, fontWeight: '800', marginTop: 8 },
  rentHeroBottom: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 5 },
  rentHeroCaption: { color: '#AAB8B4', fontSize: 11 },
  rentHeroPending: { color: '#F0A25B', fontSize: 11, fontWeight: '700' },
  rentRow: { padding: 13, flexDirection: 'row', alignItems: 'center', gap: 11 },
  rentBillRow: { padding: 13, flexDirection: 'row', alignItems: 'flex-start', gap: 11 },
  rentAmount: { color: colors.ink, fontWeight: '800', fontSize: 13 },
  receiptList: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 7 },
  receiptChip: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.paleGreen, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 5 },
  receiptText: { color: colors.green, fontSize: 10, fontWeight: '800' },
  smallActionButton: { backgroundColor: colors.green, borderRadius: 9, paddingHorizontal: 12, paddingVertical: 7, marginTop: 6 },
  smallActionText: { color: '#FFF', fontSize: 11, fontWeight: '800' },
  chip: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 8 },
  chipText: { fontWeight: '800', fontSize: 8.5 },
  profileCard: { flexDirection: 'row', alignItems: 'center', gap: 11, backgroundColor: colors.card, padding: 14, borderWidth: 1, borderColor: colors.line, borderRadius: 15, marginBottom: 20 },
  propertyIcon: { width: 48, height: 48, borderRadius: 13, backgroundColor: colors.paleGreen, alignItems: 'center', justifyContent: 'center' },
  propertyCardName: { color: colors.ink, fontWeight: '800', fontSize: 14 },
  menuCard: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: 15, marginBottom: 20, overflow: 'hidden' },
  menuRow: { flexDirection: 'row', alignItems: 'center', gap: 11, padding: 13 },
  menuIcon: { width: 38, height: 38, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  menuLabel: { color: colors.ink, fontWeight: '700', fontSize: 13 },
  backHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 22 },
  backButton: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, alignItems: 'center', justifyContent: 'center' },
  expenseHero: { backgroundColor: colors.ink, borderRadius: 16, padding: 18, marginBottom: 20 },
  expenseHeroValue: { color: '#FFF', fontWeight: '800', fontSize: 29, marginTop: 8 },
  expenseHeroCaption: { color: '#76D2B2', marginTop: 6, fontSize: 11, fontWeight: '700' },
  expenseRow: { padding: 13, flexDirection: 'row', alignItems: 'flex-start', gap: 11 },
  expenseNotes: { color: colors.ink, fontSize: 10.5, marginTop: 4 },
  inlineLink: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 7 },
  inlineLinkText: { color: colors.green, fontSize: 10, fontWeight: '800' },
  categoryRow: { padding: 13, flexDirection: 'row', alignItems: 'center' },
  foodCard: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: 15, flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', paddingVertical: 18 },
  foodDivider: { width: 1, height: 31, backgroundColor: colors.line },
  foodValue: { color: colors.ink, fontWeight: '800', fontSize: 16 },
  reportHero: { backgroundColor: colors.ink, borderRadius: 16, padding: 18, marginBottom: 11, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  reportHeroValue: { color: '#FFF', fontWeight: '800', fontSize: 29, marginTop: 8 },
  pnlRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  pnlCard: { width: '48.7%', backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: 13, padding: 14 },
  pnlValue: { fontWeight: '800', fontSize: 18 },
  reportMetricGrid: { flexDirection: 'row', gap: 8, marginBottom: 20 },
  reportMetric: { flex: 1, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: 13, padding: 12 },
  occupancyCard: { flexDirection: 'row', alignItems: 'center', gap: 20, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: 15, padding: 16, marginBottom: 20 },
  occupancyRing: { width: 84, height: 84, borderRadius: 42, borderWidth: 9, borderColor: colors.green, alignItems: 'center', justifyContent: 'center' },
  occupancyValue: { color: colors.ink, fontWeight: '800', fontSize: 18 },
  occupancyLegend: { flexDirection: 'row', alignItems: 'center', gap: 7, marginVertical: 7 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { flex: 1, color: colors.muted, fontSize: 11 },
  legendValue: { color: colors.ink, fontWeight: '800', fontSize: 12 },
  pendingRow: { padding: 13, flexDirection: 'row', alignItems: 'center', gap: 8 },
  pendingValue: { marginLeft: 'auto', color: colors.red, fontWeight: '800', fontSize: 13 },
  exportGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 9, marginBottom: 24 },
  exportButton: { width: '48%', minHeight: 44, borderRadius: 12, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingHorizontal: 8 },
  exportButtonText: { color: colors.ink, fontSize: 11, fontWeight: '800' },
  aiScreen: { flex: 1, backgroundColor: colors.bg },
  aiTopBar: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingTop: 14, paddingBottom: 11, backgroundColor: colors.bg, borderBottomWidth: 1, borderBottomColor: 'rgba(232,236,232,0.75)', zIndex: 5 },
  aiBody: { flex: 1 },
  aiBodyContent: { padding: 14, paddingBottom: 122 },
  aiBrandIcon: { width: 48, height: 48, borderRadius: 16, backgroundColor: colors.green, alignItems: 'center', justifyContent: 'center' },
  aiTopTitle: { color: colors.ink, fontSize: 22, fontWeight: '900', letterSpacing: -0.6 },
  aiTopSubtitle: { color: colors.muted, fontSize: 12, marginTop: 2 },
  aiBellButton: { width: 39, height: 39, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line },
  aiBadge: { position: 'absolute', right: 4, top: 2, minWidth: 17, height: 17, borderRadius: 9, backgroundColor: colors.red, alignItems: 'center', justifyContent: 'center' },
  aiBadgeText: { color: '#FFF', fontSize: 9, fontWeight: '900' },
  aiOwnerAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.paleBlue, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.line },
  aiOwnerInitial: { color: colors.blue, fontWeight: '900', fontSize: 17 },
  aiOverviewCard: { backgroundColor: colors.card, borderRadius: 18, borderWidth: 1, borderColor: colors.line, padding: 11, marginBottom: 14, overflow: 'hidden' },
  aiOverviewHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 14 },
  aiGreeting: { color: colors.ink, fontSize: 20, fontWeight: '900', letterSpacing: -0.5 },
  aiOverviewText: { color: colors.muted, fontSize: 13, marginTop: 5 },
  aiHealthPill: { minWidth: 140, borderRadius: 15, backgroundColor: '#F6FCF9', borderWidth: 1, borderColor: '#D7EFE5', padding: 10, flexDirection: 'row', gap: 8 },
  aiHealthLabel: { color: colors.ink, fontSize: 11, fontWeight: '800' },
  aiHealthInline: { flexDirection: 'row', alignItems: 'flex-end', marginTop: 2 },
  aiHealthInlineScore: { fontSize: 22, fontWeight: '900' },
  aiHealthInlineMax: { color: colors.ink, fontWeight: '800', marginBottom: 3 },
  aiHealthStatus: { fontSize: 11, fontWeight: '800', marginTop: 2 },
  aiSummaryScroller: { gap: 9, paddingBottom: 4 },
  aiSummaryTileWide: { width: 126, minHeight: 118, borderRadius: 15, backgroundColor: '#FFF', borderWidth: 1, borderColor: colors.line, padding: 12 },
  aiSummaryTileCompact: { width: 90, minHeight: 82, borderRadius: 13, backgroundColor: '#FFF', borderWidth: 1, borderColor: colors.line, padding: 8 },
  aiSummaryIcon: { width: 28, height: 28, borderRadius: 9, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  aiSummaryLabelTop: { color: colors.ink, fontSize: 10, fontWeight: '800', minHeight: 20 },
  aiSummaryValueLarge: { color: colors.ink, fontSize: 18, fontWeight: '900', marginTop: 3 },
  aiSummaryLabel: { color: colors.muted, fontSize: 9.5, fontWeight: '700', marginTop: 2 },
  aiPriorityHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 14, marginBottom: 10 },
  aiPriorityScroller: { gap: 9, paddingBottom: 2 },
  aiPriorityCard: { width: 156, minHeight: 66, backgroundColor: '#FFF', borderRadius: 14, borderWidth: 1, borderColor: colors.line, padding: 10, flexDirection: 'row', alignItems: 'center', gap: 9 },
  aiPriorityText: { flex: 1, color: colors.ink, fontSize: 11.5, lineHeight: 16, fontWeight: '800' },
  aiActionText: { flex: 1, color: colors.ink, fontSize: 12, lineHeight: 17, fontWeight: '700' },
  aiCommandCard: { backgroundColor: '#FFF8EF', borderWidth: 1, borderColor: '#F3D5B5', borderRadius: 18, padding: 16, marginBottom: 15 },
  commandButtonRow: { flexDirection: 'row', gap: 10, marginTop: 12 },
  commandButton: { flex: 1, marginTop: 0 },
  aiAskPanel: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: 20, padding: 15, marginBottom: 16 },
  aiAskHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 13 },
  aiAskTitle: { color: colors.ink, fontSize: 18, fontWeight: '900' },
  aiVoiceButton: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.green, alignItems: 'center', justifyContent: 'center' },
  aiInputRowLarge: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 51, borderWidth: 1, borderColor: colors.line, borderRadius: 14, paddingLeft: 10, marginBottom: 0 },
  aiInput: { flex: 1, color: colors.ink, fontSize: 13, minHeight: 42, outlineStyle: 'none' } as any,
  aiSendButton: { width: 42, height: 42, borderRadius: 13, backgroundColor: colors.green, alignItems: 'center', justifyContent: 'center' },
  aiStickyComposer: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: '#FFFFFFF2', borderTopWidth: 1, borderTopColor: colors.line, paddingHorizontal: 10, paddingTop: 8, paddingBottom: Platform.OS === 'ios' ? 12 : 8 },
  aiInlineVoiceButton: { width: 38, height: 38, borderRadius: 12, backgroundColor: colors.paleGreen, alignItems: 'center', justifyContent: 'center' },
  aiInlineVoiceButtonActive: { backgroundColor: colors.green },
  aiPromptToggleButton: { width: 34, height: 38, borderRadius: 11, backgroundColor: '#F3FAF7', alignItems: 'center', justifyContent: 'center' },
  aiPromptMenu: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: 16, padding: 8, marginBottom: 8, gap: 5, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 12, shadowOffset: { width: 0, height: -2 } },
  aiPromptMenuItem: { minHeight: 42, borderRadius: 12, flexDirection: 'row', alignItems: 'center', gap: 9, paddingHorizontal: 8, backgroundColor: '#FBFCFA' },
  aiPromptMenuText: { flex: 1, color: colors.ink, fontSize: 12, fontWeight: '800' },
  aiSuggestionScrollerContent: { gap: 9 },
  aiPromptCard: { width: 118, minHeight: 50, borderRadius: 14, borderWidth: 1, borderColor: colors.line, backgroundColor: '#FFF', padding: 8, flexDirection: 'row', alignItems: 'center', gap: 7 },
  aiPromptIcon: { width: 28, height: 28, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  aiPromptText: { flex: 1, color: colors.ink, fontSize: 10.5, fontWeight: '800', lineHeight: 14 },
  aiChatHistory: { backgroundColor: '#FBFCFA', borderRadius: 20, borderWidth: 1, borderColor: colors.line, padding: 12, marginBottom: 16, gap: 10 },
  aiUserMessageRow: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 8, marginTop: 4 },
  aiUserBubble: { alignSelf: 'flex-end', maxWidth: '86%', backgroundColor: '#E6F7EC', borderRadius: 16, padding: 12, marginBottom: 14, flexDirection: 'row', alignItems: 'center', gap: 8 },
  aiUserBubbleText: { color: colors.ink, fontSize: 13, fontWeight: '700' },
  aiBubbleTime: { color: colors.muted, fontSize: 11 },
  aiAssistantLabel: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 9 },
  aiAssistantIcon: { width: 28, height: 28, borderRadius: 9, backgroundColor: colors.green, alignItems: 'center', justifyContent: 'center' },
  aiAssistantName: { color: colors.muted, fontSize: 12, fontWeight: '800' },
  aiAnswerCard: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: 18, padding: 13, marginBottom: 12, overflow: 'hidden' },
  aiAnswerHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, marginBottom: 12 },
  aiAnswerTitle: { color: colors.ink, fontSize: 20, fontWeight: '900', marginTop: 4 },
  aiDetailsButton: { borderWidth: 1, borderColor: '#BFE6D8', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8 },
  aiDetailsText: { color: colors.green, fontSize: 11, fontWeight: '900' },
  aiSectionLabel: { color: colors.green, fontSize: 10, fontWeight: '900', letterSpacing: 0.8, textTransform: 'uppercase', marginTop: 14, marginBottom: 6 },
  aiAnswerText: { color: colors.ink, fontSize: 13, lineHeight: 20 },
  aiMetricRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 14 },
  aiMetricCard: { flexGrow: 1, flexBasis: '30%', minWidth: 92, backgroundColor: colors.bg, borderRadius: 12, padding: 9 },
  aiMetricValue: { fontSize: 15, fontWeight: '900' },
  aiBulletList: { marginTop: 14, gap: 9 },
  aiBulletRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  aiBulletDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.green, marginTop: 6 },
  aiBulletText: { flex: 1, color: colors.muted, fontSize: 12, lineHeight: 17 },
  aiTable: { borderWidth: 1, borderColor: colors.line, borderRadius: 13, marginTop: 14, overflow: 'hidden' },
  aiTableHeader: { flexDirection: 'row', backgroundColor: colors.bg, padding: 10 },
  aiTableHeadTenant: { flex: 1.8, color: colors.muted, fontSize: 10, fontWeight: '900' },
  aiTableHead: { flex: 1, color: colors.muted, fontSize: 10, fontWeight: '900', textAlign: 'right' },
  aiTableRow: { flexDirection: 'row', alignItems: 'center', padding: 10, borderTopWidth: 1, borderTopColor: colors.line },
  aiTableTenant: { flex: 1.8, flexDirection: 'row', alignItems: 'center', gap: 8 },
  aiTableCell: { flex: 1, textAlign: 'right', color: colors.ink, fontSize: 12, fontWeight: '800' },
  aiSmartGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 9, marginTop: 14 },
  aiSmartAction: { width: '100%', backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: 15, padding: 11, flexDirection: 'row', alignItems: 'center', gap: 10 },
  aiInsightRecommendationRow: { flexDirection: 'column', gap: 10, marginTop: 14 },
  aiInsightBox: { width: '100%', backgroundColor: '#FFF8EF', borderWidth: 1, borderColor: '#F3E0C7', borderRadius: 14, padding: 12, gap: 7 },
  aiInsightBoxText: { color: colors.ink, fontSize: 12, lineHeight: 18, fontWeight: '700' },
  aiVoiceDock: { height: 72, borderRadius: 36, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, marginBottom: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', paddingHorizontal: 12 },
  aiVoiceDockButton: { width: 70, height: 70, borderRadius: 35, backgroundColor: colors.green, alignItems: 'center', justifyContent: 'center', marginTop: -18 },
  aiVoiceDockText: { color: colors.muted, fontSize: 13, fontWeight: '800' },
  ownerProfileHero: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: 18, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 16 },
  ownerProfileName: { color: colors.ink, fontSize: 22, fontWeight: '900' },
  ownerProfileMeta: { color: colors.muted, fontSize: 12, fontWeight: '700', marginTop: 4 },
  formCard: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: 18, padding: 16, marginBottom: 16 },
  formInput: { minHeight: 46, borderWidth: 1, borderColor: colors.line, borderRadius: 12, paddingHorizontal: 12, color: colors.ink, fontSize: 13, marginBottom: 14, outlineStyle: 'none' } as any,
  textArea: { minHeight: 86, paddingTop: 12, textAlignVertical: 'top' },
  bottomNav: { height: 68, backgroundColor: '#FFF', borderTopWidth: 1, borderTopColor: colors.line, flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', width: '100%', maxWidth: 520, alignSelf: 'center' },
  navItem: { alignItems: 'center', minWidth: 48, gap: 4 },
  navText: { color: colors.muted, fontSize: 9, fontWeight: '700' },
  navTextActive: { color: colors.green },
  loginScreen: { flex: 1, backgroundColor: colors.bg, justifyContent: 'space-between', padding: 22 },
  loginKeyboardContent: { flex: 1, justifyContent: 'space-between' },
  loginTop: { flex: 1, paddingTop: 54, alignItems: 'center' },
  logoImage: { width: 260, height: 188 },
  logoText: { fontSize: 32, fontWeight: '900', letterSpacing: -1.2, marginTop: -6 },
  logoTextBlue: { color: '#073060' },
  logoTextGreen: { color: '#69BE45' },
  loginTagline: { color: '#073060', fontSize: 12, fontWeight: '800', marginTop: 1 },
  loginCard: { backgroundColor: '#FFF', borderWidth: 1, borderColor: colors.line, borderRadius: 19, padding: 19, marginBottom: 58, width: '100%', maxWidth: 480, alignSelf: 'center' },
  setupCard: { backgroundColor: '#FFF', borderWidth: 1, borderColor: colors.line, borderRadius: 19, padding: 19, width: '100%', maxWidth: 520, alignSelf: 'center', marginTop: 90 },
  loginTitle: { color: colors.ink, fontSize: 21, fontWeight: '800' },
  loginCaption: { color: colors.muted, fontSize: 13, marginTop: 5, marginBottom: 21 },
  loginFieldLabel: { color: colors.muted, fontSize: 10, fontWeight: '800', letterSpacing: 0.8, marginBottom: 7 },
  otpLabel: { marginTop: 12 },
  loginInput: { height: 48, borderWidth: 1, borderColor: colors.line, borderRadius: 10, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, gap: 10 },
  prefix: { color: colors.ink, fontWeight: '700', paddingRight: 10, borderRightWidth: 1, borderRightColor: colors.line },
  authError: { color: colors.red, fontSize: 12, fontWeight: '700', marginTop: 10 },
  loginSecurityHint: { color: colors.muted, textAlign: 'center', fontSize: 11, marginTop: 14 },
  keyboardAccessory: { height: 44, backgroundColor: '#F4F5F7', borderTopWidth: 1, borderTopColor: colors.line, alignItems: 'flex-end', justifyContent: 'center', paddingHorizontal: 16 },
  keyboardDoneButton: { paddingHorizontal: 10, paddingVertical: 8 },
  keyboardDoneText: { color: colors.green, fontSize: 16, fontWeight: '800' },
  inviteCard: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: 15, padding: 14, marginBottom: 20 },
  inviteMessage: { color: colors.green, fontSize: 12, fontWeight: '700', marginTop: 10 },
  hostelOption: { flexDirection: 'row', alignItems: 'center', gap: 11, padding: 13 },
  hostelOptionActive: { backgroundColor: colors.paleGreen },
  hostelCreateBox: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: 15, padding: 14, marginBottom: 20 },
  logoutButton: { height: 46, borderRadius: 12, borderWidth: 1, borderColor: colors.line, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.card, marginBottom: 20 },
  logoutText: { color: colors.red, fontSize: 13, fontWeight: '800' },
});
