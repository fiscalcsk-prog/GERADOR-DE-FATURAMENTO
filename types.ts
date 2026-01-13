
export interface BillingMonth {
  year: string;
  month: string;
  amount: number | null;
}

export interface Signatory {
  name: string;
  role: string;
  identifier: string; // CPF or CRC
}

export interface BillingData {
  companyName: string;
  cep: string;
  address: string;
  addressComplement: string;
  cnpj: string;
  city: string;
  state: string;
  date: string;
  locationDateText: string;
  declarationText: string;
  logoUrl: string | null;
  footerLine1: string;
  footerLine2: string;
  footerLine3: string;
  billingMonths: BillingMonth[];
  partner: Signatory;
  accountant: Signatory;
}

export interface ExtractionResponse {
  companyName?: string;
  address?: string;
  cnpj?: string;
  city?: string;
  state?: string;
  date?: string;
  billingMonths?: BillingMonth[];
  partner?: Signatory;
  accountant?: Signatory;
}
