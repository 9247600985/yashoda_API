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

export const formatDate = (d?: Date | string): string =>
  d ? new Date(d).toISOString().substring(0, 10) : "";

export interface RegfeeInput {
  MedrecNo?: string;
  patcat?: string;
  hospid?: string;
  HospitalId?:string;
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