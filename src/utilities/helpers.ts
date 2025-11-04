import sql from 'mssql';
import path from 'path';
import fs from 'fs/promises';
import { executeDbQuery } from '../db';


export interface VisitType {
  viewmode: string;
  doctcode: string;
  mrno: string;
  TariffCode: string;
  HospitalId: string;
  consultationno: string;
  DEPTCODE: string;
  IPFollowUp_Days: number;
}

// Response object (matches visityType in C#)
export interface VisitTypeResponse {
  visitype: string;
  VISITS?: string;
  FreeVisit?: string;
  PaidVisit?: string;
  IP_VISITS?: string;
  PAIDCONSDATE?: string;
}

export function safeVal(val: any, def: any = 0) {
  return val === null || val === undefined ? def : val;
}

export interface PatSearchCriteria {
  pattypesearch?: string;
  mrno?: string;
  doctcd?: string;
  ipno?: string;
  patOPNum?: string;
  patMrnoDOM?: string;
  patIpnoDOM?: string;
  hospid?: string;
  // Add any other fields if needed
}

export interface PatientSearchObj {
  consultno?: string;
  consdate?: string;
  mrno?: string;
  ipno?: string;
  patsalutationid?: string;
  patname?: string;
  gender?: string;
  age?: string;
  dob?: string;
  mobile?: string;
  telphone?: string;
  email?: string;
  address1?: string;
  address2?: string;
  address3?: string;
  pincode?: string;
  countryid?: string;
  stateid?: string;
  districtid?: string;
  cityid?: string;
  departmentid?: string;
  patcatid?: string;
  tarifcatid?: string;
  doctcd?: string;
  doctname?: string;
  patsalutation?: string;
  country?: string;
  state?: string;
  district?: string;
  city?: string;
  deptname?: string;
  patcat?: string;
  tarifcat?: string;
  firstname?: string;
  middlename?: string;
  lastname?: string;
  fathername?: string;
  hieght?: string;
  weight?: string;
  bloodgroup?: string;
  maritalstatus?: string;
  pattype?: string;
  uniqueid?: string;
  compid?: string;
  compname?: string;
  empidcardno?: string;
  letterno?: string;
  limit?: string;
  validdate?: string;
  empid?: string;
  empname?: string;
  empreftype?: string;
  empdeptid?: string;
  empdeptname?: string;
  empdesgcd?: string;
  empdesgname?: string;
  refdoctcd?: string;
  refdoctname?: string;
  BEDNO?: string;
  WARDNUMBER?: string;
  AdmitDt?: string;
  AdmitTM?: string;
  ADMNDOCTOR?: string;
  DoctorName?: string;
  PRBEDCATG?: string;
  BedCategory?: string;
  NURSCODE?: string;
  NURSINGSTATION?: string;
  FOLIONO?: string;
  DISCHRGDT?: string;
  OPNum?: string;
}

export const formatDate = (d?: Date | string): string => {
  if (!d) return "";

  const dateObj = d instanceof Date ? d : new Date(d);
  if (isNaN(dateObj.getTime())) return "";

  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, "0");
  const day = String(dateObj.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export interface RegfeeInput {
  MedrecNo?: string;
  patcat?: string;
  hospid?: string;
  HospitalId?: string;
}

// Response model (similar to registrationFee in C#)
export interface RegistrationFee {
  regfeetype: string;
  opddiscount: number;
  regfeeamount: number;
}

export function safeNumber(value: any, defaultValue: number = 0): number {
  return value == null || value === "" ? defaultValue : Number(value);
}

export function containsSpecialCharacters(input: string): boolean {
  if (!input) return false;
  const specialCharacters = /[~`!@#$%^&*()+=\[\]{}\\|;:'",<>/?]/;
  return specialCharacters.test(input);
}

export function numberToWords(number: number): string {
  if (number === 0) return "zero";

  if (number < 0) return "minus " + numberToWords(Math.abs(number));

  let words = "";

  if (Math.floor(number / 1000000) > 0) {
    words += numberToWords(Math.floor(number / 1000000)) + " Million ";
    number %= 1000000;
  }

  if (Math.floor(number / 100000) > 0) {
    words += numberToWords(Math.floor(number / 100000)) + " Lakh ";
    number %= 100000;
  }

  if (Math.floor(number / 1000) > 0) {
    words += numberToWords(Math.floor(number / 1000)) + " Thousand ";
    number %= 1000;
  }

  if (Math.floor(number / 100) > 0) {
    words += numberToWords(Math.floor(number / 100)) + " Hundred ";
    number %= 100;
  }

  if (number > 0) {
    if (words !== "") words += "";

    const unitsMap = [
      "Zero", "One", "Two", "Three", "Four", "Five", "Six", "Seven",
      "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen",
      "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"
    ];

    const tensMap = [
      "Zero", "Ten", "Twenty", "Thirty", "Forty", "Fifty",
      "Sixty", "Seventy", "Eighty", "Ninety"
    ];

    if (number < 20) {
      words += unitsMap[number];
    } else {
      words += tensMap[Math.floor(number / 10)];
      if (number % 10 > 0) {
        words += "-" + unitsMap[number % 10];
      }
    }
  }

  return words.trim();
}

export interface CompanyNoticeBoardRegistration {
  validdays?: string;
  VALIDUPTO?: string;
}


export function formatDateChange(apiDate?: string | Date | null, changedYear?: string): string {
  if (!apiDate) return "";

  let dateStr: string;

  // Normalize input to string in YYYY-MM-DD
  if (apiDate instanceof Date) {
    dateStr = apiDate.toISOString().substring(0, 10); // "2025-09-11"
  } else {
    dateStr = String(apiDate);
  }

  const parts = dateStr.split("-");
  if (parts.length !== 3) return "";

  if (changedYear) {
    parts[0] = changedYear;
  }

  const day = parts[2].padStart(2, "0");
  const month = parts[1].padStart(2, "0");
  const year = parts[0];

  return `${day}/${month}/${year}`;
}

export function formatDateForDb(dt?: string | null): string {
  if (!dt) return "";

  if (dt.includes("/")) {
    const [dd, mm, yyyy] = dt.split("/");
    return `${yyyy}-${mm}-${dd}`; // dd/MM/yyyy → yyyy-MM-dd
  }

  return dt; // already yyyy-MM-dd or other acceptable format
}


export interface PatDetailsFromAppointment {
  amount?: number;
  salutation?: string;
  patname?: string;
  patfname?: string;
  patlname?: string;
  patage?: string;
  mobile?: string;
  email?: string;
  dob?: string;
  gender?: string;
  countryid?: string;
  countryname?: string;
  stateid?: string;
  statename?: string;
  districtid?: string;
  districtname?: string;
  cityidid?: string;
  cityname?: string;
  patcat?: string;
  addr1?: string;
  addr2?: string;
  addr3?: string;
  visitytype?: string;
  doctcd?: string;
  doctname?: string;
  deptcd?: string;
  deptname?: string;
}

export interface PaymentModeRow {
  Paymodeid: string;
  PayMode: string;
}

export interface PaymentFieldRow {
  FieldId: number;
  FieldName: string;
  payModeId: string;
}

export interface PaymentField {
  fieldId: number;
  fieldName: string;
  payModeId: string;
}

export interface PaymentMode {
  paymentModeId: string;
  paymentModeName: string;
  paymentFields: PaymentField[];
}

export function pureSqlDate(d: string | Date | null): Date | null {
  if (!d) return null;
  const s = new Date(d).toISOString().substring(0, 10).split("-");
  return new Date(Number(s[0]), Number(s[1]) - 1, Number(s[2]));
}

export function toInt(val: any, def: number = 0): number {
  const n = Number(val);
  return Number.isFinite(n) ? n : def;
}

export function toDate(val: any): Date | null {
  if (!val) return null;
  const d = new Date(val);
  return isNaN(d.getTime()) ? null : d;
}

export function fmtDateYYYYMMDD(d: Date | null): string | undefined {
  return d ? d.toISOString().split("T")[0] : undefined;
}

export function ensureBase64Data(data: string): Buffer {
  const idx = data.indexOf('base64,');
  const base64 = idx !== -1 ? data.substring(idx + 7) : data;
  return Buffer.from(base64, 'base64');
}

export async function saveFileToFolder( base64Data: string, filename: string, resultNo: string, subdir = 'Documents' ): Promise<string> {
  const uploadsRoot = process.env.UPLOAD_ROOT || path.join(process.cwd(), 'uploads', 'lab');
  const safeName = filename.replace(/[/\\?%*:|"<>]/g, '_');
  const dir = path.join(uploadsRoot, resultNo, subdir);
  await fs.mkdir(dir, { recursive: true });
  const filePath = path.join(dir, safeName);
  const buffer = ensureBase64Data(base64Data);
  await fs.writeFile(filePath, buffer);
  const rel = path.relative(process.cwd(), filePath).replace(/\\/g, '/');
  return `/${rel}`;
}

export async function getResEntryCurrNumber( transaction: sql.Transaction, finYear: string, clnorgcode: string, docType = "LABRESULT" ): Promise<string> {
  const FinYear = (finYear ?? "").toString().trim();
  const CLNORGCODE = (clnorgcode ?? "").toString().trim();
  const DocType = (docType ?? "").toString().trim();

  const sqlText = ` DECLARE @RES VARCHAR(50); EXEC USP_GENERATE_DOCNO @CLNGCODE = @CLNORGCODE, @DOCREFNO = @DOCREFNO, @MODULEID = @MODULEID, @RESULT = @RES OUTPUT; SELECT @RES AS RESULTNO; `;

  const params = { CLNORGCODE: CLNORGCODE, DOCREFNO: DocType, MODULEID: "005", };

  const out = await executeDbQuery(sqlText, params, { transaction, query: sqlText });

  const resultNo = out.records?.[0]?.RESULTNO ? String(out.records[0].RESULTNO).trim() : "";

  if (!resultNo) {
    throw new Error("Unable to generate RESULTNO (USP_GENERATE_DOCNO returned empty).");
  }

  return resultNo;
}