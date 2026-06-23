import React, { useEffect, useMemo, useState } from 'react';
import {
  Image,
  Modal,
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar as NativeStatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { Session } from '@supabase/supabase-js';
import { isSupabaseConfigured, supabase } from './src/lib/supabase';
import {
  acceptStaffInvites,
  buildSummary,
  createOwnerHostel,
  createTenant as saveTenant,
  fallbackData,
  inviteStaff,
  loadPgMasterData,
  type HostelSetupInput,
  type NewTenantInput,
  type PgMasterData,
} from './src/lib/pgcopilotData';

type IconName = keyof typeof MaterialCommunityIcons.glyphMap;
type Tab = 'Home' | 'Rooms' | 'Tenants' | 'Rent' | 'More';
type Tone = 'green' | 'orange' | 'red' | 'blue' | 'ink' | 'purple';

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

const money = (value: number) =>
  `₹${value.toLocaleString('en-IN')}`;

const pgcopilotLogo = require('./assets/login-mark.png');

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
          ['chart-box-outline', 'Reports', 'More'],
        ].map(([icon, label, tab]) => (
          <TouchableOpacity key={label} style={styles.quickAction} onPress={() => onNavigate(tab as Tab)}>
            <View style={styles.quickIcon}><AppIcon name={icon as IconName} size={21} /></View>
            <Text style={styles.quickLabel}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <SectionTitle title="Recent activity" action="View all" />
      <View style={styles.listCard}>
        <Activity icon="cash-check" tone="green" title={`Rent collected from ${data.tenants.find((tenant) => tenant.status === 'Paid')?.name ?? 'tenant'}`} caption="UPI payment · synced record" value={`+ ${money(data.tenants.find((tenant) => tenant.status === 'Paid')?.rent ?? 0)}`} />
        <Activity icon="account-plus-outline" tone="blue" title={`${summary.newAdmissions} active admissions`} caption={`${data.tenants.length} tenants available`} />
        <Activity icon="file-document-outline" tone="orange" title={`${data.expenses[0]?.label ?? 'Expense'} added`} caption="Current month" value={`- ${money(data.expenses[0]?.amount ?? 0)}`} last />
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
                <Text style={styles.bedName}>{room.number}-{String.fromCharCode(65 + index)}</Text>
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

function Tenants({ data, onAddTenant }: { data: PgMasterData; onAddTenant: (input: NewTenantInput) => Promise<void> }) {
  const [modal, setModal] = useState(false);
  const [query, setQuery] = useState('');
  const summary = buildSummary(data);
  const visibleTenants = data.tenants.filter((tenant) => tenant.name.toLowerCase().includes(query.toLowerCase()) || tenant.room.includes(query));
  return (
    <>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <Header title="Tenants" subtitle={`${summary.activeTenants} active residents`} />
        <View style={styles.searchBar}>
          <AppIcon name="magnify" size={20} color={colors.muted} />
          <TextInput placeholder="Search name, room or mobile" placeholderTextColor={colors.muted} value={query} onChangeText={setQuery} style={styles.searchInput} />
          <AppIcon name="tune-variant" size={19} color={colors.green} />
        </View>
        <View style={styles.tenantSummary}>
          <View><Text style={styles.summaryNumber}>{summary.activeTenants}</Text><Text style={styles.summaryLabel}>Active</Text></View>
          <View><Text style={styles.summaryNumber}>{summary.newAdmissions}</Text><Text style={styles.summaryLabel}>New this month</Text></View>
          <View><Text style={styles.summaryNumber}>{summary.upcomingVacates}</Text><Text style={styles.summaryLabel}>Vacating soon</Text></View>
        </View>
        <SectionTitle title="Residents" action={`${visibleTenants.length} shown`} />
        <View style={styles.listCard}>
          {visibleTenants.map((tenant, index) => (
            <View key={tenant.id ?? tenant.name} style={[styles.tenantRow, index !== visibleTenants.length - 1 && styles.divider]}>
              <View style={[styles.avatar, { backgroundColor: tenant.tone }]}><Text style={styles.avatarText}>{tenant.initials}</Text></View>
              <View style={styles.flex}>
                <Text style={styles.tenantName}>{tenant.name}</Text>
                <Text style={styles.activityCaption}>Room {tenant.room} · {tenant.mobile}</Text>
              </View>
              <AppIcon name="chevron-right" size={20} color={colors.muted} />
            </View>
          ))}
        </View>
      </ScrollView>
      <TouchableOpacity accessibilityLabel="Add tenant" style={styles.fab} onPress={() => setModal(true)}><AppIcon name="plus" size={28} color="#FFF" /></TouchableOpacity>
      <AddTenantModal visible={modal} onClose={() => setModal(false)} onSubmit={onAddTenant} />
    </>
  );
}

function AddTenantModal({ visible, onClose, onSubmit }: { visible: boolean; onClose: () => void; onSubmit: (input: NewTenantInput) => Promise<void> }) {
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [roomBed, setRoomBed] = useState('');
  const [rent, setRent] = useState('');
  const [deposit, setDeposit] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await onSubmit({
        name: name.trim(),
        mobile: mobile.trim(),
        roomBed: roomBed.trim(),
        rent: Number(rent || 0),
        deposit: Number(deposit || 0),
      });
      setName('');
      setMobile('');
      setRoomBed('');
      setRent('');
      setDeposit('');
      onClose();
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
          <View style={styles.formRow}>
            <View style={[styles.formField, styles.flex]}><Text style={styles.fieldLabel}>FULL NAME</Text><TextInput placeholder="Tenant name" style={styles.fieldInput} value={name} onChangeText={setName} /></View>
          </View>
          <View style={styles.formRow}>
            <View style={[styles.formField, styles.flex]}><Text style={styles.fieldLabel}>MOBILE NUMBER</Text><TextInput placeholder="+91" style={styles.fieldInput} value={mobile} onChangeText={setMobile} keyboardType="phone-pad" /></View>
            <View style={[styles.formField, styles.flex]}><Text style={styles.fieldLabel}>ROOM / BED</Text><TextInput placeholder="101-C" style={styles.fieldInput} value={roomBed} onChangeText={setRoomBed} /></View>
          </View>
          <View style={styles.formRow}>
            <View style={[styles.formField, styles.flex]}><Text style={styles.fieldLabel}>MONTHLY RENT</Text><TextInput placeholder="₹ 0" style={styles.fieldInput} value={rent} onChangeText={setRent} keyboardType="numeric" /></View>
            <View style={[styles.formField, styles.flex]}><Text style={styles.fieldLabel}>DEPOSIT</Text><TextInput placeholder="₹ 0" style={styles.fieldInput} value={deposit} onChangeText={setDeposit} keyboardType="numeric" /></View>
          </View>
          <TouchableOpacity style={styles.primaryButton} onPress={handleSubmit} disabled={saving}><Text style={styles.primaryButtonText}>{saving ? 'Saving...' : 'Save admission'}</Text></TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

function Rent({ data }: { data: PgMasterData }) {
  const [filter, setFilter] = useState('All');
  const summary = buildSummary(data);
  const rentTenants = data.tenants.filter((tenant) => filter === 'All' || tenant.status === filter);
  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
      <Header title="Rent Collection" subtitle="June 2026" />
      <View style={styles.rentHero}>
        <Text style={styles.cardEyebrow}>TOTAL COLLECTED</Text>
        <Text style={styles.rentHeroValue}>{money(summary.collectedRent)}</Text>
        <View style={styles.rentHeroBottom}><Text style={styles.rentHeroCaption}>{summary.expectedRent ? Math.round((summary.collectedRent / summary.expectedRent) * 100) : 0}% of {money(summary.expectedRent)}</Text><Text style={styles.rentHeroPending}>{money(summary.pendingRent)} pending</Text></View>
        <View style={styles.progressTrack}><View style={[styles.progressFill, { width: `${summary.expectedRent ? Math.round((summary.collectedRent / summary.expectedRent) * 100) : 0}%` }]} /></View>
      </View>
      <View style={styles.filterRow}>
        {['All', 'Paid', 'Pending', 'Partial'].map((item) => (
          <TouchableOpacity key={item} style={[styles.filterChip, filter === item && styles.filterChipActive]} onPress={() => setFilter(item)}>
            <Text style={[styles.filterText, filter === item && styles.filterTextActive]}>{item}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <SectionTitle title="June rent status" action="Send all reminders" />
      <View style={styles.listCard}>
        {rentTenants.map((tenant, index) => (
          <View key={tenant.id ?? tenant.name} style={[styles.rentRow, index !== rentTenants.length - 1 && styles.divider]}>
            <View style={[styles.avatar, { backgroundColor: tenant.tone }]}><Text style={styles.avatarText}>{tenant.initials}</Text></View>
            <View style={styles.flex}>
              <Text style={styles.tenantName}>{tenant.name}</Text>
              <Text style={styles.activityCaption}>Room {tenant.room} · Due 5 Jun</Text>
            </View>
            <View style={styles.alignEnd}>
              <Text style={styles.rentAmount}>{money(tenant.rent)}</Text>
              <Chip label={tenant.status} tone={tenant.status === 'Paid' ? 'green' : tenant.status === 'Partial' ? 'orange' : 'red'} />
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

function More({ data, onInviteStaff, onLogout }: { data: PgMasterData; onInviteStaff: (phone: string) => Promise<void>; onLogout: () => Promise<void> }) {
  const [view, setView] = useState<'menu' | 'expenses' | 'reports'>('menu');
  const [staffPhone, setStaffPhone] = useState('');
  const [inviteMessage, setInviteMessage] = useState<string | undefined>();
  const [inviting, setInviting] = useState(false);
  const summary = buildSummary(data);
  if (view === 'expenses') return <Expenses data={data} onBack={() => setView('menu')} />;
  if (view === 'reports') return <Reports data={data} onBack={() => setView('menu')} />;

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
        <MenuRow icon="chart-box-outline" label="Reports & analytics" caption="Occupancy, pending rents and P&L" tone="purple" onPress={() => setView('reports')} last />
      </View>
      <SectionTitle title="Property settings" />
      <View style={styles.menuCard}>
        <MenuRow icon="office-building-cog-outline" label="Hostel details" caption="Address, contact, GST and bank details" tone="green" />
        <MenuRow icon="message-text-outline" label="Reminder templates" caption="WhatsApp and SMS rent reminders" tone="blue" />
        <MenuRow icon="account-group-outline" label="Staff access" caption="Manage wardens and accountants" tone="purple" last />
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

  return (
    <SafeAreaView style={styles.loginScreen}>
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
          <TextInput style={styles.flex} placeholder="Enter mobile number" keyboardType="phone-pad" value={phone} onChangeText={setPhone} />
        </View>
        {otpSent ? (
          <>
            <Text style={[styles.loginFieldLabel, styles.otpLabel]}>OTP CODE</Text>
            <View style={styles.loginInput}>
              <TextInput style={styles.flex} placeholder="Enter OTP" keyboardType="number-pad" value={otp} onChangeText={setOtp} />
            </View>
          </>
        ) : null}
        {error ? <Text style={styles.authError}>{error}</Text> : null}
        <TouchableOpacity style={styles.primaryButton} onPress={handleAuthPress} disabled={loading}>
          <Text style={styles.primaryButtonText}>{loading ? 'Please wait...' : authEnabled ? otpSent ? 'Verify OTP' : 'Send OTP' : 'Continue demo'}</Text>
        </TouchableOpacity>
        <Text style={styles.loginSecurityHint}>{authEnabled ? 'Secure access for PG owners and staff' : 'Connect Supabase to enable production login'}</Text>
      </View>
    </SafeAreaView>
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

  const authenticated = demoMode || Boolean(session);

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

  const handleSelectHostel = async (hostelId: string) => {
    setSelectedHostelId(hostelId);
    setTab('Home');
    await refreshData(hostelId);
  };

  const content = useMemo(() => {
    if (tab === 'Rooms') return <Rooms data={pgData} />;
    if (tab === 'Tenants') return <Tenants data={pgData} onAddTenant={handleAddTenant} />;
    if (tab === 'Rent') return <Rent data={pgData} />;
    if (tab === 'More') return <More data={pgData} onInviteStaff={handleInviteStaff} onLogout={handleLogout} />;
    return <Dashboard onNavigate={setTab} data={pgData} loading={loadingData} source={dataSource} error={dataError} onSelectHostel={handleSelectHostel} onCreateHostel={handleCreateHostel} />;
  }, [tab, pgData, loadingData, dataSource, dataError]);

  if (!authReady) return <SafeAreaView style={styles.loginScreen}><Text style={styles.loginTitle}>Loading PGCopilot...</Text></SafeAreaView>;
  if (!authenticated) return <><StatusBar style="dark" /><Login authEnabled={isSupabaseConfigured} onDemoLogin={() => setDemoMode(true)} onSendOtp={handleSendOtp} onVerifyOtp={handleVerifyOtp} loading={authLoading} error={authError} /></>;
  if (!demoMode && isSupabaseConfigured && !liveDataReady) return <SafeAreaView style={styles.loginScreen}><StatusBar style="dark" /><Text style={styles.loginTitle}>Loading your hostel...</Text><Text style={styles.loginCaption}>Syncing secure Supabase data</Text></SafeAreaView>;
  if (needsHostelSetup) return <><StatusBar style="dark" /><HostelSetup onCreate={handleCreateHostel} onLogout={handleLogout} saving={savingHostel} error={dataError} /></>;
  return (
    <SafeAreaView style={styles.app}>
      <StatusBar style="dark" />
      <View style={styles.content}>{content}</View>
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
  sectionHeading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4, marginBottom: 11 },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: colors.ink },
  sectionAction: { fontSize: 12, fontWeight: '700', color: colors.green },
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
  tenantName: { color: colors.ink, fontWeight: '700', fontSize: 13 },
  fab: { position: 'absolute', right: 21, bottom: 18, width: 55, height: 55, borderRadius: 28, backgroundColor: colors.green, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.16, shadowRadius: 8, elevation: 4 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: colors.bg, borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 20, paddingBottom: 28 },
  modalHandle: { width: 42, height: 4, backgroundColor: '#D1D8D5', borderRadius: 2, alignSelf: 'center', marginBottom: 17 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  modalTitle: { color: colors.ink, fontSize: 20, fontWeight: '800' },
  formRow: { flexDirection: 'row', gap: 9 },
  formField: { backgroundColor: '#FFF', borderWidth: 1, borderColor: colors.line, borderRadius: 10, padding: 10, marginBottom: 10 },
  fieldLabel: { color: colors.muted, fontWeight: '800', fontSize: 9, letterSpacing: 0.6 },
  fieldInput: { color: colors.ink, fontSize: 13, marginTop: 7, outlineStyle: 'none' } as any,
  primaryButton: { backgroundColor: colors.green, height: 49, borderRadius: 11, alignItems: 'center', justifyContent: 'center', marginTop: 9 },
  primaryButtonText: { color: '#FFF', fontWeight: '800', fontSize: 14 },
  secondaryButton: { height: 44, borderRadius: 11, alignItems: 'center', justifyContent: 'center', marginTop: 10, borderWidth: 1, borderColor: colors.line },
  secondaryButtonText: { color: colors.ink, fontWeight: '800', fontSize: 13 },
  rentHero: { backgroundColor: colors.ink, padding: 18, borderRadius: 16, marginBottom: 15 },
  rentHeroValue: { color: '#FFF', fontSize: 29, fontWeight: '800', marginTop: 8 },
  rentHeroBottom: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 5 },
  rentHeroCaption: { color: '#AAB8B4', fontSize: 11 },
  rentHeroPending: { color: '#F0A25B', fontSize: 11, fontWeight: '700' },
  rentRow: { padding: 13, flexDirection: 'row', alignItems: 'center', gap: 11 },
  rentAmount: { color: colors.ink, fontWeight: '800', fontSize: 13 },
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
  foodCard: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: 15, flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', paddingVertical: 18 },
  foodDivider: { width: 1, height: 31, backgroundColor: colors.line },
  foodValue: { color: colors.ink, fontWeight: '800', fontSize: 16 },
  reportHero: { backgroundColor: colors.ink, borderRadius: 16, padding: 18, marginBottom: 11, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  reportHeroValue: { color: '#FFF', fontWeight: '800', fontSize: 29, marginTop: 8 },
  pnlRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  pnlCard: { width: '48.7%', backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: 13, padding: 14 },
  pnlValue: { fontWeight: '800', fontSize: 18 },
  occupancyCard: { flexDirection: 'row', alignItems: 'center', gap: 20, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: 15, padding: 16, marginBottom: 20 },
  occupancyRing: { width: 84, height: 84, borderRadius: 42, borderWidth: 9, borderColor: colors.green, alignItems: 'center', justifyContent: 'center' },
  occupancyValue: { color: colors.ink, fontWeight: '800', fontSize: 18 },
  occupancyLegend: { flexDirection: 'row', alignItems: 'center', gap: 7, marginVertical: 7 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { flex: 1, color: colors.muted, fontSize: 11 },
  legendValue: { color: colors.ink, fontWeight: '800', fontSize: 12 },
  pendingRow: { padding: 13, flexDirection: 'row', alignItems: 'center', gap: 8 },
  pendingValue: { marginLeft: 'auto', color: colors.red, fontWeight: '800', fontSize: 13 },
  bottomNav: { height: 68, backgroundColor: '#FFF', borderTopWidth: 1, borderTopColor: colors.line, flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', width: '100%', maxWidth: 520, alignSelf: 'center' },
  navItem: { alignItems: 'center', minWidth: 55, gap: 4 },
  navText: { color: colors.muted, fontSize: 9.5, fontWeight: '700' },
  navTextActive: { color: colors.green },
  loginScreen: { flex: 1, backgroundColor: colors.bg, justifyContent: 'space-between', padding: 22 },
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
  inviteCard: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: 15, padding: 14, marginBottom: 20 },
  inviteMessage: { color: colors.green, fontSize: 12, fontWeight: '700', marginTop: 10 },
  hostelOption: { flexDirection: 'row', alignItems: 'center', gap: 11, padding: 13 },
  hostelOptionActive: { backgroundColor: colors.paleGreen },
  hostelCreateBox: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: 15, padding: 14, marginBottom: 20 },
  logoutButton: { height: 46, borderRadius: 12, borderWidth: 1, borderColor: colors.line, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.card, marginBottom: 20 },
  logoutText: { color: colors.red, fontSize: 13, fontWeight: '800' },
});
