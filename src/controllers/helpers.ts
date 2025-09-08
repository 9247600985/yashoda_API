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
