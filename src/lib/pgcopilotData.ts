import { isSupabaseConfigured, supabase } from './supabase';

export type BedStatus = 'Occupied' | 'Vacant' | 'Reserved' | 'Maintenance';
export type RentStatus = 'Paid' | 'Partial' | 'Pending';
export type Tone = 'green' | 'orange' | 'red' | 'blue' | 'ink' | 'purple';
export type UserRole = 'Owner' | 'Staff';

export type Room = {
  id?: string;
  number: string;
  floor: string;
  type: string;
  beds: BedStatus[];
};

export type Tenant = {
  id?: string;
  initials: string;
  name: string;
  room: string;
  mobile: string;
  rent: number;
  status: RentStatus;
  tone: string;
};

export type Expense = {
  id?: string;
  label: string;
  amount: number;
  icon: string;
  tone: Tone;
};

export type PgMasterData = {
  hostelId?: string;
  ownerId?: string;
  currentUserRole?: UserRole;
  propertyName: string;
  propertyAddress: string;
  rooms: Room[];
  tenants: Tenant[];
  expenses: Expense[];
};

export type LoadPgMasterResult = {
  data: PgMasterData;
  source: 'supabase' | 'demo';
  error?: string;
  needsHostelSetup?: boolean;
};

export type NewTenantInput = {
  name: string;
  mobile: string;
  roomBed: string;
  rent: number;
  deposit: number;
};

export type HostelSetupInput = {
  name: string;
  address: string;
  contactNumber?: string;
};

const tenantTones = ['#DDEFE7', '#E4EEFA', '#FCE9DF', '#F7EED5', '#EAE4F8', '#E0F3F0'];

export const fallbackData: PgMasterData = {
  propertyName: "Greenview Men's PG",
  propertyAddress: 'HSR Layout, Bengaluru',
  currentUserRole: 'Owner',
  rooms: [
    { number: '101', floor: 'Ground', type: 'Triple', beds: ['Occupied', 'Occupied', 'Vacant'] },
    { number: '102', floor: 'Ground', type: 'Double', beds: ['Occupied', 'Vacant'] },
    { number: '201', floor: '1st Floor', type: 'Triple', beds: ['Occupied', 'Occupied', 'Occupied'] },
    { number: '202', floor: '1st Floor', type: 'Double', beds: ['Reserved', 'Vacant'] },
    { number: '301', floor: '2nd Floor', type: 'Triple', beds: ['Occupied', 'Maintenance', 'Vacant'] },
  ],
  tenants: [
    { initials: 'RS', name: 'Ramesh S', room: '101-A', mobile: '98450 23891', rent: 8500, status: 'Paid', tone: '#DDEFE7' },
    { initials: 'AK', name: 'Arun Kumar', room: '101-B', mobile: '99721 18452', rent: 8500, status: 'Paid', tone: '#E4EEFA' },
    { initials: 'JN', name: 'John N', room: '201-A', mobile: '98863 53419', rent: 8000, status: 'Pending', tone: '#FCE9DF' },
    { initials: 'RV', name: 'Rahul V', room: '201-B', mobile: '98455 90876', rent: 8500, status: 'Partial', tone: '#F7EED5' },
    { initials: 'KP', name: 'Kiran P', room: '301-A', mobile: '96631 72340', rent: 9000, status: 'Pending', tone: '#EAE4F8' },
    { initials: 'SM', name: 'Sanjay M', room: '201-C', mobile: '99001 32118', rent: 8500, status: 'Paid', tone: '#E0F3F0' },
  ],
  expenses: [
    { label: 'Food supplies', amount: 65000, icon: 'silverware-fork-knife', tone: 'orange' },
    { label: 'Staff salaries', amount: 72000, icon: 'account-group-outline', tone: 'purple' },
    { label: 'Electricity', amount: 28500, icon: 'lightning-bolt-outline', tone: 'blue' },
    { label: 'Internet & utilities', amount: 24500, icon: 'wifi', tone: 'green' },
  ],
};

const emptyHostelData: PgMasterData = {
  propertyName: 'Create your first hostel',
  propertyAddress: 'Set up your property to start using PGCopilot',
  currentUserRole: 'Owner',
  rooms: [],
  tenants: [],
  expenses: [],
};

export function buildSummary(data: PgMasterData) {
  const statuses = data.rooms.flatMap((room) => room.beds);
  const occupiedBeds = statuses.filter((status) => status === 'Occupied').length;
  const vacantBeds = statuses.filter((status) => status === 'Vacant').length;
  const reservedBeds = statuses.filter((status) => status === 'Reserved').length;
  const maintenanceBeds = statuses.filter((status) => status === 'Maintenance').length;
  const totalBeds = statuses.length;
  const expectedRent = data.tenants.reduce((sum, tenant) => sum + tenant.rent, 0);
  const pendingRent = data.tenants
    .filter((tenant) => tenant.status !== 'Paid')
    .reduce((sum, tenant) => sum + tenant.rent, 0);
  const collectedRent = expectedRent - pendingRent;
  const expensesTotal = data.expenses.reduce((sum, expense) => sum + expense.amount, 0);
  const foodExpense = data.expenses
    .filter((expense) => expense.label.toLowerCase().includes('food'))
    .reduce((sum, expense) => sum + expense.amount, 0);

  return {
    totalBeds,
    occupiedBeds,
    vacantBeds,
    reservedBeds,
    maintenanceBeds,
    occupancyRate: totalBeds ? Math.round((occupiedBeds / totalBeds) * 100) : 0,
    expectedRent,
    collectedRent,
    pendingRent,
    activeTenants: data.tenants.length,
    newAdmissions: Math.min(6, data.tenants.length),
    upcomingVacates: 0,
    income: Math.max(expectedRent, collectedRent),
    expensesTotal,
    profit: Math.max(expectedRent, collectedRent) - expensesTotal,
    foodExpense,
    foodResidents: Math.max(occupiedBeds, data.tenants.length),
  };
}

function initialsFor(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || 'PG';
}

function normaliseRentStatus(value: string | null | undefined): RentStatus {
  if (value === 'Paid' || value === 'Partial') return value;
  return 'Pending';
}

function normaliseBedStatus(value: string | null | undefined): BedStatus {
  if (value === 'Occupied' || value === 'Reserved' || value === 'Maintenance') return value;
  return 'Vacant';
}

function normalisePhone(phone: string) {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 10) return `+91${digits}`;
  return digits.startsWith('91') ? `+${digits}` : phone.trim();
}

async function currentUserId() {
  if (!supabase) return undefined;
  const { data } = await supabase.auth.getUser();
  return data.user?.id;
}

export async function acceptStaffInvites() {
  if (!isSupabaseConfigured || !supabase) return;
  await supabase.rpc('accept_staff_invites');
}

export async function loadPgMasterData(): Promise<LoadPgMasterResult> {
  if (!isSupabaseConfigured || !supabase) {
    return { data: fallbackData, source: 'demo' };
  }

  const userId = await currentUserId();
  if (!userId) {
    return { data: fallbackData, source: 'demo', error: 'Please login with OTP to load live hostel data.' };
  }

  const { data: hostels, error: hostelError } = await supabase
    .from('hostels')
    .select('id,name,address,owner_id')
    .order('created_at', { ascending: true })
    .limit(1);

  if (hostelError) {
    return { data: fallbackData, source: 'demo', error: hostelError.message };
  }

  const hostel = hostels?.[0] as any;
  if (!hostel) {
    return { data: emptyHostelData, source: 'supabase', needsHostelSetup: true };
  }

  const { data: membership } = await supabase
    .from('hostel_members')
    .select('role')
    .eq('hostel_id', hostel.id)
    .eq('user_id', userId)
    .maybeSingle();

  const role = (membership?.role === 'Staff' ? 'Staff' : 'Owner') as UserRole;

  const [roomsResult, tenantsResult, expensesResult] = await Promise.all([
    supabase
      .from('rooms')
      .select('id,room_number,floor,room_type,beds(id,bed_number,status)')
      .eq('hostel_id', hostel.id)
      .order('room_number', { ascending: true }),
    supabase
      .from('tenants')
      .select('id,full_name,mobile_number,monthly_rent,rent_status,beds(bed_number,rooms(room_number))')
      .eq('hostel_id', hostel.id)
      .eq('is_active', true)
      .order('created_at', { ascending: false }),
    supabase
      .from('expenses')
      .select('id,label,category,amount')
      .eq('hostel_id', hostel.id)
      .order('created_at', { ascending: false }),
  ]);

  if (roomsResult.error || tenantsResult.error || expensesResult.error) {
    return {
      data: fallbackData,
      source: 'demo',
      error: roomsResult.error?.message || tenantsResult.error?.message || expensesResult.error?.message,
    };
  }

  const rooms: Room[] = (roomsResult.data ?? []).map((room: any) => ({
    id: room.id,
    number: room.room_number,
    floor: room.floor,
    type: room.room_type,
    beds: [...(room.beds ?? [])]
      .sort((a, b) => String(a.bed_number).localeCompare(String(b.bed_number)))
      .map((bed) => normaliseBedStatus(bed.status)),
  }));

  const tenants: Tenant[] = (tenantsResult.data ?? []).map((tenant: any, index: number) => {
    const bedNumber = tenant.beds?.bed_number ?? 'Unassigned';
    return {
      id: tenant.id,
      initials: initialsFor(tenant.full_name),
      name: tenant.full_name,
      room: bedNumber,
      mobile: tenant.mobile_number ?? '',
      rent: Number(tenant.monthly_rent ?? 0),
      status: normaliseRentStatus(tenant.rent_status),
      tone: tenantTones[index % tenantTones.length],
    };
  });

  const expenses: Expense[] = (expensesResult.data ?? []).map((expense: any) => ({
    id: expense.id,
    label: expense.label,
    amount: Number(expense.amount ?? 0),
    icon: expense.category === 'Food' ? 'silverware-fork-knife' : expense.category === 'Salary' ? 'account-group-outline' : expense.category === 'Utilities' ? 'lightning-bolt-outline' : 'file-document-outline',
    tone: expense.category === 'Food' ? 'orange' : expense.category === 'Salary' ? 'purple' : expense.category === 'Utilities' ? 'blue' : 'green',
  }));

  return {
    data: {
      hostelId: hostel.id,
      ownerId: hostel.owner_id,
      currentUserRole: role,
      propertyName: hostel.name,
      propertyAddress: hostel.address,
      rooms,
      tenants,
      expenses,
    },
    source: 'supabase',
  };
}

export async function createOwnerHostel(input: HostelSetupInput) {
  if (!isSupabaseConfigured || !supabase) return fallbackData;
  const userId = await currentUserId();
  if (!userId) throw new Error('Login session expired. Please login again.');

  const { error } = await supabase.from('hostels').insert({
    name: input.name,
    address: input.address,
    contact_number: input.contactNumber || null,
    owner_id: userId,
    created_by: userId,
  });

  if (error) throw new Error(error.message);
  const refreshed = await loadPgMasterData();
  return refreshed.data;
}

export async function inviteStaff(input: { hostelId?: string; phone: string }) {
  if (!isSupabaseConfigured || !supabase || !input.hostelId) {
    throw new Error('Live hostel setup is required before inviting staff.');
  }
  const userId = await currentUserId();
  if (!userId) throw new Error('Login session expired. Please login again.');

  const { data: hostel } = await supabase
    .from('hostels')
    .select('owner_id')
    .eq('id', input.hostelId)
    .maybeSingle();

  const { error } = await supabase.from('staff_invites').insert({
    hostel_id: input.hostelId,
    owner_id: (hostel as any)?.owner_id ?? userId,
    phone_number: normalisePhone(input.phone),
    role: 'Staff',
    invited_by: userId,
  });

  if (error) throw new Error(error.message);
}

export async function createTenant(input: NewTenantInput, currentData: PgMasterData) {
  if (!isSupabaseConfigured || !supabase || !currentData.hostelId) {
    return {
      ...currentData,
      tenants: [
        {
          initials: initialsFor(input.name),
          name: input.name,
          room: input.roomBed || 'Unassigned',
          mobile: input.mobile,
          rent: input.rent,
          status: 'Pending' as RentStatus,
          tone: tenantTones[currentData.tenants.length % tenantTones.length],
        },
        ...currentData.tenants,
      ],
    };
  }

  const userId = await currentUserId();
  let bedId: string | null = null;
  if (input.roomBed.trim()) {
    const { data: bed } = await supabase
      .from('beds')
      .select('id')
      .eq('hostel_id', currentData.hostelId)
      .ilike('bed_number', input.roomBed.trim())
      .maybeSingle();
    bedId = (bed as any)?.id ?? null;
  }

  const { error } = await supabase.from('tenants').insert({
    hostel_id: currentData.hostelId,
    owner_id: currentData.ownerId,
    created_by: userId,
    bed_id: bedId,
    full_name: input.name,
    mobile_number: input.mobile,
    monthly_rent: input.rent,
    deposit_amount: input.deposit,
    rent_status: 'Pending',
    joining_date: new Date().toISOString().slice(0, 10),
    is_active: true,
  });

  if (error) throw new Error(error.message);

  if (bedId) {
    await supabase.from('beds').update({ status: 'Occupied' }).eq('id', bedId);
  }

  const refreshed = await loadPgMasterData();
  return refreshed.data;
}
