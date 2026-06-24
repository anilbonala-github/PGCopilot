import { isSupabaseConfigured, supabase } from './supabase';

export type BedStatus = 'Occupied' | 'Vacant' | 'Reserved' | 'Maintenance';
export type RentStatus = 'Paid' | 'Partial' | 'Pending';
export type PaymentMode = 'Cash' | 'UPI' | 'Bank Transfer';
export type Tone = 'green' | 'orange' | 'red' | 'blue' | 'ink' | 'purple';
export type UserRole = 'Owner' | 'Staff';
export type ExpenseCategory = 'Food' | 'Electricity' | 'Water' | 'Internet' | 'Cook Salary' | 'Cleaning' | 'Maintenance' | 'Other';

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
  roomNumber?: string;
  floor?: string;
  mobile: string;
  emergencyContact?: string;
  aadhaarNumber?: string;
  companyCollege?: string;
  joiningDate?: string;
  vacateDate?: string;
  rent: number;
  deposit?: number;
  damageCharges?: number;
  depositRefund?: number;
  vacateNotes?: string;
  foodIncluded?: boolean;
  rentDueDay?: number;
  admissionStatus?: 'Active' | 'Vacated';
  documentCount?: number;
  documents?: TenantDocument[];
  photoUrl?: string;
  status: RentStatus;
  tone: string;
};

export type Expense = {
  id?: string;
  label: string;
  category?: ExpenseCategory;
  amount: number;
  date?: string;
  vendor?: string;
  notes?: string;
  billFileName?: string;
  billStoragePath?: string;
  billMimeType?: string;
  billUrl?: string;
  icon: string;
  tone: Tone;
};

export type RentReceipt = {
  id: string;
  receiptNumber: string;
  paymentDate: string;
  amount: number;
  paymentMode: PaymentMode;
  notes?: string;
};

export type RentBill = {
  id: string;
  tenantId: string;
  tenantName: string;
  room: string;
  amount: number;
  paidAmount: number;
  pendingAmount: number;
  dueDate: string;
  rentMonth: string;
  status: RentStatus;
  paymentMode?: PaymentMode;
  receipts: RentReceipt[];
};

export type TenantActivity = {
  id: string;
  tenantId: string;
  activityType: 'admission' | 'tenant_update' | 'vacate' | 'document_upload' | 'rent_generated' | 'payment_received';
  description: string;
  createdAt: string;
  tenantName?: string;
  room?: string;
  amount?: number;
  receiptNumber?: string;
  paymentMode?: PaymentMode;
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
  rentBills?: RentBill[];
  tenantActivities?: TenantActivity[];
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

export type TenantDocument = {
  id: string;
  type: string;
  fileName: string;
  storagePath?: string;
  fileUrl?: string;
  mimeType?: string;
};

export type RecordRentPaymentInput = {
  rentPaymentId: string;
  amount: number;
  paymentDate?: string;
  paymentMode: PaymentMode;
  notes?: string;
};

export type UpdateTenantInput = Omit<NewTenantInput, 'documents'> & {
  id: string;
  documents?: TenantDocumentInput[];
};

export type VacateTenantInput = {
  tenantId: string;
  vacateDate: string;
  depositAmount: number;
  damageCharges: number;
  pendingRent: number;
  refundAmount: number;
  notes?: string;
};

export type HostelSetupInput = {
  name: string;
  address: string;
  contactNumber?: string;
};

export type ExpenseBillInput = {
  uri: string;
  name: string;
  mimeType?: string;
};

export type NewExpenseInput = {
  amount: number;
  date: string;
  category: ExpenseCategory;
  vendor: string;
  notes: string;
  bill?: ExpenseBillInput;
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
  rentBills: [],
  tenantActivities: [],
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
  rentBills: [],
  tenantActivities: [],
};

export function buildSummary(data: PgMasterData) {
  const statuses = data.rooms.flatMap((room) => room.beds);
  const occupiedBeds = statuses.filter((status) => status === 'Occupied').length;
  const vacantBeds = statuses.filter((status) => status === 'Vacant').length;
  const reservedBeds = statuses.filter((status) => status === 'Reserved').length;
  const maintenanceBeds = statuses.filter((status) => status === 'Maintenance').length;
  const totalBeds = statuses.length;
  const activeTenants = data.tenants.filter((tenant) => tenant.admissionStatus !== 'Vacated');
  const expectedRent = activeTenants.reduce((sum, tenant) => sum + tenant.rent, 0);
  const pendingRent = activeTenants
    .filter((tenant) => tenant.status !== 'Paid')
    .reduce((sum, tenant) => sum + tenant.rent, 0);
  const collectedRent = expectedRent - pendingRent;
  const billedRent = data.rentBills?.reduce((sum, bill) => sum + bill.amount, 0) ?? expectedRent;
  const paidRent = data.rentBills?.reduce((sum, bill) => sum + bill.paidAmount, 0) ?? collectedRent;
  const unpaidRent = data.rentBills?.reduce((sum, bill) => sum + bill.pendingAmount, 0) ?? pendingRent;
  const expensesTotal = data.expenses.reduce((sum, expense) => sum + expense.amount, 0);
  const foodExpense = data.expenses
    .filter((expense) => expense.category === 'Food' || expense.label.toLowerCase().includes('food'))
    .reduce((sum, expense) => sum + expense.amount, 0);

  return {
    totalBeds,
    occupiedBeds,
    vacantBeds,
    reservedBeds,
    maintenanceBeds,
    occupancyRate: totalBeds ? Math.round((occupiedBeds / totalBeds) * 100) : 0,
    expectedRent: billedRent,
    collectedRent: paidRent,
    pendingRent: unpaidRent,
    activeTenants: activeTenants.length,
    newAdmissions: Math.min(6, activeTenants.length),
    upcomingVacates: 0,
    income: Math.max(billedRent, paidRent),
    expensesTotal,
    profit: Math.max(billedRent, paidRent) - expensesTotal,
    foodExpense,
    foodResidents: Math.max(occupiedBeds, activeTenants.length),
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

function expenseVisual(category: string | null | undefined): { icon: string; tone: Tone } {
  if (category === 'Food') return { icon: 'silverware-fork-knife', tone: 'orange' };
  if (category === 'Cook Salary' || category === 'Cleaning') return { icon: 'account-group-outline', tone: 'purple' };
  if (category === 'Electricity') return { icon: 'lightning-bolt-outline', tone: 'blue' };
  if (category === 'Water') return { icon: 'water-outline', tone: 'blue' };
  if (category === 'Internet') return { icon: 'wifi', tone: 'green' };
  if (category === 'Maintenance') return { icon: 'hammer-wrench', tone: 'red' };
  return { icon: 'file-document-outline', tone: 'green' };
}

async function uploadTenantDocuments(input: Pick<NewTenantInput, 'documents'>, tenantId: string, currentData: PgMasterData, userId?: string) {
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

    const dbDocumentType = documentTypeForDb(document.type);
    await supabase
      .from('tenant_documents')
      .delete()
      .eq('tenant_id', tenantId)
      .eq('document_type', dbDocumentType);

    const { error } = await supabase.from('tenant_documents').insert({
      hostel_id: currentData.hostelId,
      owner_id: currentData.ownerId,
      created_by: userId,
      tenant_id: tenantId,
      bucket_id: 'tenant-documents',
      storage_path: storagePath,
      document_type: dbDocumentType,
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

  const [roomsResult, tenantsResult, expensesResult, rentPaymentsResult, tenantActivityResult] = await Promise.all([
    supabase
      .from('rooms')
      .select('id,room_number,floor,room_type,beds(id,bed_number,status)')
      .eq('hostel_id', hostel.id)
      .order('room_number', { ascending: true }),
    supabase
      .from('tenants')
      .select('id,full_name,mobile_number,emergency_contact,aadhaar_number,company_college,joining_date,vacate_date,monthly_rent,deposit_amount,damage_charges,deposit_refund,vacate_notes,food_included,rent_due_day,status,rent_status,tenant_documents(id,document_type,file_name,storage_path,mime_type),beds(bed_number,rooms(room_number,floor))')
      .eq('hostel_id', hostel.id)
      .order('created_at', { ascending: false }),
    supabase
      .from('expenses')
      .select('id,label,category,amount,expense_date,vendor,notes,bill_storage_path,bill_file_name,bill_mime_type')
      .eq('hostel_id', hostel.id)
      .order('created_at', { ascending: false }),
    supabase
      .from('rent_payments')
      .select('id,tenant_id,rent_month,amount,paid_amount,due_date,status,payment_mode,rent_receipts(id,receipt_number,payment_date,amount,payment_mode,notes),tenants(full_name,beds(bed_number))')
      .eq('hostel_id', hostel.id)
      .order('due_date', { ascending: false }),
    supabase
      .from('tenant_activity')
      .select('id,tenant_id,activity_type,description,created_at,tenants(full_name,beds(bed_number))')
      .eq('hostel_id', hostel.id)
      .order('created_at', { ascending: false })
      .limit(100),
  ]);

  if (roomsResult.error || tenantsResult.error || expensesResult.error || rentPaymentsResult.error || tenantActivityResult.error) {
    return {
      data: fallbackData,
      source: 'demo',
      error: roomsResult.error?.message || tenantsResult.error?.message || expensesResult.error?.message || rentPaymentsResult.error?.message || tenantActivityResult.error?.message,
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

  const tenants: Tenant[] = await Promise.all((tenantsResult.data ?? []).map(async (tenant: any, index: number) => {
    const bedNumber = tenant.beds?.bed_number ?? 'Unassigned';
    let documents: TenantDocument[] = (tenant.tenant_documents ?? []).map((document: any) => ({
      id: document.id,
      type: document.document_type,
      fileName: document.file_name,
      storagePath: document.storage_path,
      mimeType: document.mime_type,
    }));
    documents = await Promise.all(documents.map(async (document) => {
      if (!document.storagePath) return document;
      const { data: signedDocument } = await supabase!.storage
        .from('tenant-documents')
        .createSignedUrl(document.storagePath, 60 * 60);
      return { ...document, fileUrl: signedDocument?.signedUrl };
    }));
    const photoUrl = documents.find((document) => document.type === 'Photo' && document.fileUrl)?.fileUrl;
    return {
      id: tenant.id,
      initials: initialsFor(tenant.full_name),
      name: tenant.full_name,
      room: bedNumber,
      roomNumber: tenant.beds?.rooms?.room_number ?? '',
      floor: tenant.beds?.rooms?.floor ?? '',
      mobile: tenant.mobile_number ?? '',
      emergencyContact: tenant.emergency_contact ?? '',
      aadhaarNumber: tenant.aadhaar_number ?? '',
      companyCollege: tenant.company_college ?? '',
      joiningDate: tenant.joining_date ?? '',
      vacateDate: tenant.vacate_date ?? '',
      rent: Number(tenant.monthly_rent ?? 0),
      deposit: Number(tenant.deposit_amount ?? 0),
      damageCharges: Number(tenant.damage_charges ?? 0),
      depositRefund: Number(tenant.deposit_refund ?? 0),
      vacateNotes: tenant.vacate_notes ?? '',
      foodIncluded: Boolean(tenant.food_included),
      rentDueDay: Number(tenant.rent_due_day ?? 5),
      admissionStatus: tenant.status === 'Vacated' ? 'Vacated' : 'Active',
      documentCount: documents.length,
      documents,
      photoUrl,
      status: normaliseRentStatus(tenant.rent_status),
      tone: tenantTones[index % tenantTones.length],
    };
  }));

  const expenses: Expense[] = await Promise.all((expensesResult.data ?? []).map(async (expense: any) => {
    const visual = expenseVisual(expense.category);
    let billUrl: string | undefined;
    if (expense.bill_storage_path) {
      const { data: signedBill } = await supabase!.storage
        .from('expense-bills')
        .createSignedUrl(expense.bill_storage_path, 60 * 60);
      billUrl = signedBill?.signedUrl;
    }
    return {
      id: expense.id,
      label: expense.label,
      category: expense.category,
      amount: Number(expense.amount ?? 0),
      date: expense.expense_date,
      vendor: expense.vendor ?? '',
      notes: expense.notes ?? '',
      billFileName: expense.bill_file_name ?? undefined,
      billStoragePath: expense.bill_storage_path ?? undefined,
      billMimeType: expense.bill_mime_type ?? undefined,
      billUrl,
      icon: visual.icon,
      tone: visual.tone,
    };
  }));

  const rentBills: RentBill[] = (rentPaymentsResult.data ?? []).map((bill: any) => {
    const amount = Number(bill.amount ?? 0);
    const paidAmount = Number(bill.paid_amount ?? 0);
    const tenant = Array.isArray(bill.tenants) ? bill.tenants[0] : bill.tenants;
    return {
      id: bill.id,
      tenantId: bill.tenant_id,
      tenantName: tenant?.full_name ?? 'Tenant',
      room: tenant?.beds?.bed_number ?? 'Unassigned',
      amount,
      paidAmount,
      pendingAmount: Math.max(amount - paidAmount, 0),
      dueDate: bill.due_date,
      rentMonth: bill.rent_month,
      status: normaliseRentStatus(bill.status),
      paymentMode: bill.payment_mode || undefined,
      receipts: [...(bill.rent_receipts ?? [])]
        .sort((a, b) => String(b.payment_date).localeCompare(String(a.payment_date)))
        .map((receipt: any) => ({
          id: receipt.id,
          receiptNumber: receipt.receipt_number,
          paymentDate: receipt.payment_date,
          amount: Number(receipt.amount ?? 0),
          paymentMode: receipt.payment_mode,
          notes: receipt.notes ?? undefined,
        })),
    };
  });

  const tenantById = new Map(tenants.map((tenant) => [tenant.id, tenant]));
  const receiptByTenantAndNumber = new Map<string, RentReceipt>();
  const latestReceiptByTenant = new Map<string, RentReceipt>();
  rentBills.forEach((bill) => {
    bill.receipts.forEach((receipt) => {
      receiptByTenantAndNumber.set(`${bill.tenantId}:${receipt.receiptNumber}`, receipt);
      const current = latestReceiptByTenant.get(bill.tenantId);
      if (!current || String(receipt.paymentDate).localeCompare(String(current.paymentDate)) > 0) {
        latestReceiptByTenant.set(bill.tenantId, receipt);
      }
    });
  });
  const tenantActivities: TenantActivity[] = (tenantActivityResult.data ?? []).map((activity: any) => {
    const joinedTenant = Array.isArray(activity.tenants) ? activity.tenants[0] : activity.tenants;
    const tenant = tenantById.get(activity.tenant_id);
    const receiptNumber = String(activity.description ?? '').match(/PGC-[A-Z0-9-]+/)?.[0];
    const receipt = activity.activity_type === 'payment_received'
      ? (receiptNumber ? receiptByTenantAndNumber.get(`${activity.tenant_id}:${receiptNumber}`) : undefined) ?? latestReceiptByTenant.get(activity.tenant_id)
      : undefined;
    return {
      id: activity.id,
      tenantId: activity.tenant_id,
      activityType: activity.activity_type,
      description: activity.description,
      createdAt: activity.created_at,
      tenantName: tenant?.name ?? joinedTenant?.full_name,
      room: tenant?.room ?? joinedTenant?.beds?.bed_number,
      amount: receipt?.amount,
      receiptNumber: receipt?.receiptNumber,
      paymentMode: receipt?.paymentMode,
    };
  });

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
      rentBills,
      tenantActivities,
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

export async function updateTenant(input: UpdateTenantInput, currentData: PgMasterData) {
  if (!isSupabaseConfigured || !supabase || !currentData.hostelId) {
    return {
      ...currentData,
      tenants: currentData.tenants.map((tenant) => tenant.id === input.id ? {
        ...tenant,
        initials: initialsFor(input.name),
        name: input.name,
        room: input.roomBed || tenant.room,
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
      } : tenant),
    };
  }

  if (!input.id) throw new Error('Tenant id is required.');
  const { data: currentTenant, error: currentError } = await supabase
    .from('tenants')
    .select('id,bed_id,beds(bed_number)')
    .eq('id', input.id)
    .eq('hostel_id', currentData.hostelId)
    .maybeSingle();

  if (currentError) throw new Error(currentError.message);
  if (!currentTenant) throw new Error('Tenant not found.');

  let bedId: string | null = (currentTenant as any).bed_id ?? null;
  const currentBedNumber = (currentTenant as any).beds?.bed_number ?? '';
  const nextBedNumber = input.roomBed.trim();
  if (nextBedNumber && nextBedNumber !== currentBedNumber) {
    await supabase.rpc('expire_reserved_beds', { target_hostel_id: currentData.hostelId });
    const { data: bed } = await supabase
      .from('beds')
      .select('id,status')
      .eq('hostel_id', currentData.hostelId)
      .ilike('bed_number', nextBedNumber)
      .maybeSingle();
    const bedStatus = (bed as any)?.status;
    if (!bed) throw new Error(`Bed ${nextBedNumber} was not found.`);
    if (bedStatus !== 'Vacant') {
      throw new Error(`Bed ${nextBedNumber} is ${bedStatus}. Only vacant beds can be assigned.`);
    }
    bedId = (bed as any).id;
  } else if (!nextBedNumber) {
    bedId = null;
  }

  const { error } = await supabase
    .from('tenants')
    .update({
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
      is_active: input.status === 'Active',
    })
    .eq('id', input.id)
    .eq('hostel_id', currentData.hostelId);

  if (error) throw new Error(error.message);
  if (input.documents?.length) {
    const userId = await currentUserId();
    await uploadTenantDocuments({ documents: input.documents }, input.id, currentData, userId);
  }
  const refreshed = await loadPgMasterData(currentData.hostelId);
  return refreshed.data;
}

export async function vacateTenant(input: VacateTenantInput, currentData: PgMasterData) {
  if (!isSupabaseConfigured || !supabase || !currentData.hostelId) {
    return {
      ...currentData,
      tenants: currentData.tenants.map((tenant) => tenant.id === input.tenantId ? {
        ...tenant,
        admissionStatus: 'Vacated' as const,
        vacateDate: input.vacateDate,
        damageCharges: input.damageCharges,
        depositRefund: input.refundAmount,
        vacateNotes: input.notes,
      } : tenant),
    };
  }

  const { error } = await supabase
    .from('tenants')
    .update({
      status: 'Vacated',
      is_active: false,
      vacate_date: input.vacateDate,
      damage_charges: input.damageCharges,
      deposit_refund: input.refundAmount,
      vacate_notes: input.notes || null,
    })
    .eq('id', input.tenantId)
    .eq('hostel_id', currentData.hostelId);

  if (error) throw new Error(error.message);
  const refreshed = await loadPgMasterData(currentData.hostelId);
  return refreshed.data;
}

export async function generateMonthlyRent(currentData: PgMasterData, rentMonth = new Date().toISOString().slice(0, 10)) {
  if (!isSupabaseConfigured || !supabase || !currentData.hostelId) {
    return { data: currentData, generatedCount: 0 };
  }

  const { data, error } = await supabase.rpc('generate_monthly_rent', {
    target_hostel_id: currentData.hostelId,
    target_month: rentMonth,
  });

  if (error) throw new Error(error.message);
  const refreshed = await loadPgMasterData(currentData.hostelId);
  return { data: refreshed.data, generatedCount: Number(data ?? 0) };
}

export async function recordRentPayment(input: RecordRentPaymentInput, currentData: PgMasterData) {
  if (!isSupabaseConfigured || !supabase || !currentData.hostelId) {
    throw new Error('Live Supabase setup is required to record payments.');
  }

  const { data: receipt, error } = await supabase.rpc('record_rent_payment', {
    target_rent_payment_id: input.rentPaymentId,
    payment_amount: input.amount,
    payment_date_value: input.paymentDate || new Date().toISOString(),
    payment_mode_value: input.paymentMode,
    payment_notes: input.notes || null,
  });

  if (error) throw new Error(error.message);
  const refreshed = await loadPgMasterData(currentData.hostelId);
  return { data: refreshed.data, receipt: receipt as any };
}

export async function createExpense(input: NewExpenseInput, currentData: PgMasterData) {
  if (!isSupabaseConfigured || !supabase || !currentData.hostelId) {
    const visual = expenseVisual(input.category);
    return {
      ...currentData,
      expenses: [
        {
          label: `${input.category}${input.vendor ? ` - ${input.vendor}` : ''}`,
          category: input.category,
          amount: input.amount,
          date: input.date,
          vendor: input.vendor,
          notes: input.notes,
          billFileName: input.bill?.name,
          icon: visual.icon,
          tone: visual.tone,
        },
        ...currentData.expenses,
      ],
    };
  }

  const userId = await currentUserId();
  let billStoragePath: string | undefined;
  if (input.bill) {
    const fileName = `${Date.now()}-${slugFileName(input.bill.name)}`;
    billStoragePath = `${currentData.hostelId}/expenses/${fileName}`;
    const response = await fetch(input.bill.uri);
    const blob = await response.blob();
    const uploadResult = await supabase.storage
      .from('expense-bills')
      .upload(billStoragePath, blob, {
        contentType: input.bill.mimeType || 'application/octet-stream',
        upsert: true,
      });
    if (uploadResult.error) throw new Error(uploadResult.error.message);
  }

  const label = `${input.category}${input.vendor ? ` - ${input.vendor}` : ''}`;
  const { error } = await supabase.from('expenses').insert({
    hostel_id: currentData.hostelId,
    owner_id: currentData.ownerId,
    created_by: userId,
    label,
    category: input.category,
    amount: input.amount,
    expense_date: input.date,
    expense_month: `${input.date.slice(0, 7)}-01`,
    vendor: input.vendor || null,
    notes: input.notes || null,
    bill_bucket_id: input.bill ? 'expense-bills' : null,
    bill_storage_path: billStoragePath ?? null,
    bill_file_name: input.bill?.name ?? null,
    bill_mime_type: input.bill?.mimeType ?? null,
  });

  if (error) throw new Error(error.message);
  const refreshed = await loadPgMasterData(currentData.hostelId);
  return refreshed.data;
}
