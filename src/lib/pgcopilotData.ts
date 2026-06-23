import { isSupabaseConfigured, supabase } from './supabase';

export type BedStatus = 'Occupied' | 'Vacant' | 'Reserved' | 'Maintenance';
export type RentStatus = 'Paid' | 'Partial' | 'Pending';
export type Tone = 'green' | 'orange' | 'red' | 'blue' | 'ink' | 'purple';
export type UserRole = 'Owner' | 'Staff';

export type HostelSummary = {
  id: string;
  ownerId?: string;
  name: string;
  address: string;
  role: UserRole;
};

export type Room = {
  id?: string;
  number: string;
  floor: string;
  type: string;
  bedNumbers?: string[];
  beds: BedStatus[];
};

export type Tenant = {
  id?: string;
  initials: string;
  name: string;
  room: string;
  mobile: string;
  emergencyContact?: string;
  aadhaarNumber?: string;
  companyCollege?: string;
  joiningDate?: string;
  rent: number;
  deposit?: number;
  foodIncluded?: boolean;
  rentDueDay?: number;
  admissionStatus?: 'Active' | 'Vacated';
  documentCount?: number;
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
  selectedHostelId?: string;
  ownerId?: string;
  currentUserRole?: UserRole;
  hostels?: HostelSummary[];
  propertyName: string;
  propertyAddress: string;
  rooms: Room[];
  tenants: Tenant[];
  expenses: Expense[];
  assignableBeds?: string[];
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
  emergencyContact: string;
  aadhaarNumber: string;
  companyCollege: string;
  joiningDate: string;
  roomBed: string;
  rent: number;
  deposit: number;
  foodIncluded: boolean;
  rentDueDay: number;
  status: 'Active' | 'Vacated';
  documents: TenantDocumentInput[];
};

export type TenantDocumentType = 'Tenant Photo' | 'Aadhaar Front' | 'Aadhaar Back' | 'Employee ID' | 'Student ID' | 'Agreement Document';

export type TenantDocumentInput = {
  type: TenantDocumentType;
  uri: string;
  name: string;
  mimeType?: string;
};

export type HostelSetupInput = {
  name: string;
  address: string;
  contactNumber?: string;
};

const tenantTones = ['#DDEFE7', '#E4EEFA', '#FCE9DF', '#F7EED5', '#EAE4F8', '#E0F3F0'];

export const fallbackData: PgMasterData = {
  hostelId: 'demo-hostel',
  selectedHostelId: 'demo-hostel',
  propertyName: "Greenview Men's PG",
  propertyAddress: 'HSR Layout, Bengaluru',
  currentUserRole: 'Owner',
  hostels: [
    {
      id: 'demo-hostel',
      name: "Greenview Men's PG",
      address: 'HSR Layout, Bengaluru',
      role: 'Owner',
    },
  ],
  rooms: [
    { number: '101', floor: 'Ground', type: 'Triple', bedNumbers: ['101-A', '101-B', '101-C'], beds: ['Occupied', 'Occupied', 'Vacant'] },
    { number: '102', floor: 'Ground', type: 'Double', bedNumbers: ['102-A', '102-B'], beds: ['Occupied', 'Vacant'] },
    { number: '201', floor: '1st Floor', type: 'Triple', bedNumbers: ['201-A', '201-B', '201-C'], beds: ['Occupied', 'Occupied', 'Occupied'] },
    { number: '202', floor: '1st Floor', type: 'Double', bedNumbers: ['202-A', '202-B'], beds: ['Reserved', 'Vacant'] },
    { number: '301', floor: '2nd Floor', type: 'Triple', bedNumbers: ['301-A', '301-B', '301-C'], beds: ['Occupied', 'Maintenance', 'Vacant'] },
  ],
  assignableBeds: ['101-C', '102-B', '202-B', '301-C'],
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
  hostels: [],
  rooms: [],
  tenants: [],
  expenses: [],
  assignableBeds: [],
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

function documentTypeForDb(type: TenantDocumentType) {
  if (type === 'Tenant Photo') return 'Photo';
  if (type === 'Agreement Document') return 'Agreement';
  return type;
}

function slugFileName(name: string) {
  return name
    .trim()
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    || `document-${Date.now()}`;
}

async function uploadTenantDocuments(input: NewTenantInput, tenantId: string, currentData: PgMasterData, userId?: string) {
  if (!supabase || !currentData.hostelId || input.documents.length === 0) return;

  for (const document of input.documents) {
    const fileName = `${Date.now()}-${slugFileName(document.name)}`;
    const storagePath = `${currentData.hostelId}/${tenantId}/${fileName}`;
    const response = await fetch(document.uri);
    const blob = await response.blob();
    const uploadResult = await supabase.storage
      .from('tenant-documents')
      .upload(storagePath, blob, {
        contentType: document.mimeType || 'application/octet-stream',
        upsert: true,
      });

    if (uploadResult.error) throw new Error(uploadResult.error.message);

    const { error } = await supabase.from('tenant_documents').insert({
      hostel_id: currentData.hostelId,
      owner_id: currentData.ownerId,
      created_by: userId,
      tenant_id: tenantId,
      bucket_id: 'tenant-documents',
      storage_path: storagePath,
      document_type: documentTypeForDb(document.type),
      file_name: document.name,
      mime_type: document.mimeType || null,
    });

    if (error) throw new Error(error.message);
  }
}

async function currentUserId() {
  if (!supabase) return undefined;
  const { data } = await supabase.auth.getUser();
  return data.user?.id;
}

async function currentUserPhone() {
  if (!supabase) return undefined;
  const { data } = await supabase.auth.getUser();
  return data.user?.phone;
}

export async function acceptStaffInvites() {
  if (!isSupabaseConfigured || !supabase) return;
  await supabase.rpc('accept_staff_invites');
}

export async function loadPgMasterData(selectedHostelId?: string): Promise<LoadPgMasterResult> {
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
    .order('created_at', { ascending: true });

  if (hostelError) {
    return { data: fallbackData, source: 'demo', error: hostelError.message };
  }

  const hostelRows = (hostels ?? []) as any[];
  const hostelIds = hostelRows.map((hostel) => hostel.id);
  if (hostelIds.length === 0) {
    return { data: emptyHostelData, source: 'supabase', needsHostelSetup: true };
  }

  const { data: memberships } = await supabase
    .from('hostel_members')
    .select('hostel_id,role')
    .in('hostel_id', hostelIds)
    .eq('user_id', userId);

  const roleByHostel = new Map<string, UserRole>();
  (memberships ?? []).forEach((membership: any) => {
    roleByHostel.set(membership.hostel_id, membership.role === 'Staff' ? 'Staff' : 'Owner');
  });

  const hostelSummaries: HostelSummary[] = hostelRows.map((hostel) => ({
    id: hostel.id,
    ownerId: hostel.owner_id,
    name: hostel.name,
    address: hostel.address,
    role: hostel.owner_id === userId ? 'Owner' : roleByHostel.get(hostel.id) ?? 'Staff',
  }));

  const hostel = hostelRows.find((item) => item.id === selectedHostelId) ?? hostelRows[0];
  if (!hostel) {
    return { data: emptyHostelData, source: 'supabase', needsHostelSetup: true };
  }
  const currentHostel = hostelSummaries.find((item) => item.id === hostel.id);
  const role = currentHostel?.role ?? 'Owner';
  await supabase.rpc('expire_reserved_beds', { target_hostel_id: hostel.id });

  const [roomsResult, tenantsResult, expensesResult] = await Promise.all([
    supabase
      .from('rooms')
      .select('id,room_number,floor,room_type,beds(id,bed_number,status)')
      .eq('hostel_id', hostel.id)
      .order('room_number', { ascending: true }),
    supabase
      .from('tenants')
      .select('id,full_name,mobile_number,emergency_contact,aadhaar_number,company_college,joining_date,monthly_rent,deposit_amount,food_included,rent_due_day,status,rent_status,tenant_documents(id),beds(bed_number,rooms(room_number))')
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
    bedNumbers: [...(room.beds ?? [])]
      .sort((a, b) => String(a.bed_number).localeCompare(String(b.bed_number)))
      .map((bed) => String(bed.bed_number)),
    beds: [...(room.beds ?? [])]
      .sort((a, b) => String(a.bed_number).localeCompare(String(b.bed_number)))
      .map((bed) => normaliseBedStatus(bed.status)),
  }));
  const assignableBeds = rooms.flatMap((room) =>
    room.beds
      .map((status, index) => status === 'Vacant' ? room.bedNumbers?.[index] : undefined)
      .filter((bedNumber): bedNumber is string => Boolean(bedNumber))
  );

  const tenants: Tenant[] = (tenantsResult.data ?? []).map((tenant: any, index: number) => {
    const bedNumber = tenant.beds?.bed_number ?? 'Unassigned';
    return {
      id: tenant.id,
      initials: initialsFor(tenant.full_name),
      name: tenant.full_name,
      room: bedNumber,
      mobile: tenant.mobile_number ?? '',
      emergencyContact: tenant.emergency_contact ?? '',
      aadhaarNumber: tenant.aadhaar_number ?? '',
      companyCollege: tenant.company_college ?? '',
      joiningDate: tenant.joining_date ?? '',
      rent: Number(tenant.monthly_rent ?? 0),
      deposit: Number(tenant.deposit_amount ?? 0),
      foodIncluded: Boolean(tenant.food_included),
      rentDueDay: Number(tenant.rent_due_day ?? 5),
      admissionStatus: tenant.status === 'Vacated' ? 'Vacated' : 'Active',
      documentCount: tenant.tenant_documents?.length ?? 0,
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
      selectedHostelId: hostel.id,
      ownerId: hostel.owner_id,
      currentUserRole: role,
      hostels: hostelSummaries,
      propertyName: hostel.name,
      propertyAddress: hostel.address,
      rooms,
      tenants,
      expenses,
      assignableBeds,
    },
    source: 'supabase',
  };
}

export async function createOwnerHostel(input: HostelSetupInput) {
  if (!isSupabaseConfigured || !supabase) return fallbackData;
  const userId = await currentUserId();
  if (!userId) throw new Error('Login session expired. Please login again.');

  const { data: createdHostel, error } = await supabase.from('hostels').insert({
    name: input.name,
    address: input.address,
    contact_number: input.contactNumber || null,
    owner_id: userId,
    created_by: userId,
  }).select('id').single();

  if (error) throw new Error(error.message);
  const refreshed = await loadPgMasterData((createdHostel as any)?.id);
  return refreshed.data;
}

export async function inviteStaff(input: { hostelId?: string; phone: string }) {
  if (!isSupabaseConfigured || !supabase || !input.hostelId) {
    throw new Error('Live hostel setup is required before inviting staff.');
  }
  const userId = await currentUserId();
  if (!userId) throw new Error('Login session expired. Please login again.');
  const ownerPhone = normalisePhone(await currentUserPhone() ?? '');
  const invitePhone = normalisePhone(input.phone);

  if (ownerPhone && ownerPhone === invitePhone) {
    throw new Error('This mobile number is already the owner. Use a different staff mobile number.');
  }

  const { data: hostel } = await supabase
    .from('hostels')
    .select('owner_id')
    .eq('id', input.hostelId)
    .maybeSingle();

  const { error } = await supabase.from('staff_invites').insert({
    hostel_id: input.hostelId,
    owner_id: (hostel as any)?.owner_id ?? userId,
    created_by: userId,
    phone_number: invitePhone,
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
          emergencyContact: input.emergencyContact,
          aadhaarNumber: input.aadhaarNumber,
          companyCollege: input.companyCollege,
          joiningDate: input.joiningDate,
          rent: input.rent,
          deposit: input.deposit,
          foodIncluded: input.foodIncluded,
          rentDueDay: input.rentDueDay,
          admissionStatus: input.status,
          documentCount: input.documents.length,
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
    await supabase.rpc('expire_reserved_beds', { target_hostel_id: currentData.hostelId });
    const { data: bed } = await supabase
      .from('beds')
      .select('id,status')
      .eq('hostel_id', currentData.hostelId)
      .ilike('bed_number', input.roomBed.trim())
      .maybeSingle();
    const bedStatus = (bed as any)?.status;
    if (bedStatus && bedStatus !== 'Vacant') {
      throw new Error(`Bed ${input.roomBed.trim()} is ${bedStatus}. Only vacant beds can be assigned.`);
    }
    bedId = (bed as any)?.id ?? null;
  }

  const { data: tenant, error } = await supabase.from('tenants').insert({
    hostel_id: currentData.hostelId,
    owner_id: currentData.ownerId,
    created_by: userId,
    bed_id: bedId,
    full_name: input.name,
    mobile_number: input.mobile,
    emergency_contact: input.emergencyContact || null,
    aadhaar_number: input.aadhaarNumber || null,
    company_college: input.companyCollege || null,
    joining_date: input.joiningDate || new Date().toISOString().slice(0, 10),
    monthly_rent: input.rent,
    deposit_amount: input.deposit,
    food_included: input.foodIncluded,
    rent_due_day: input.rentDueDay,
    status: input.status,
    rent_status: 'Pending',
    is_active: input.status === 'Active',
  }).select('id').single();

  if (error) throw new Error(error.message);
  const tenantId = (tenant as any)?.id;

  if (tenantId) {
    await uploadTenantDocuments(input, tenantId, currentData, userId);
  }

  const refreshed = await loadPgMasterData(currentData.hostelId);
  return refreshed.data;
}
