export enum Gender {
  Male = "M",
  Female = "F",
}

export enum MaritalStatus {
  Single = "single",
  Married = "married",
  Divorced = "divorced",
  Widowed = "widowed",
}

export enum Dependents {
  Zero = 0,
  One = 1,
  TwoOrMore = 2,
}

export enum Seniority {
  SixMonths = 1, // de 0 a 6 meses
  OneYear = 2, // de 6 meses a 1 año
  ThreeYears = 3, // de 1 a 3 años
  ThreeYearsPlus = 4, // mas de 3 años
}

export enum Income {
  VeryLow = 1,
  Low = 2,
  Medium = 3,
  High = 4,
}

export enum OtherIncome {
  None = 0,
  Low = 1,
  Medium = 2,
  High = 3,
}

export enum Education {
  None = "none",
  Primary = "primary",
  HighSchool = "high_school",
  Bachelor = "bachelor",
  Master = "master",
  Doctorate = "doctorate",
}

export enum Status {
  Pending = "pending",
  Active = "active",
  Inactive = "inactive",
  Deleted = "deleted",
  Rejected = "rejected",
}

export interface UserRegisterPayload {
  document: string;
  name: string;
  lastname: string;
  gender: string;
  maritalStatus: string;
  birthDate: Date;
  selfEmployed: boolean;
  enterprise?: {
    name: string;
    address: string;
    phone: string;
    position: string;
  };
  dependents: number;
  seniority: number;
  income: number;
  otherIncome: number;
  education: string;
  email: string;
  phone: string;
  sessionId: string;
  password: string;
  token: string;
  tokenSms: string;
  account: {
    code: string;
    type: string;
    number: string;
  };
  isVerified: boolean;
  verificationStatus: string;
  userAgent: string;
  image: string;
  documentImages: [
    {
      documentType: string;
      image: string;
    },
  ];
  level: number;
  levelName: string;
  maxAmount: number;
  allowedFeeCount: number[];
  status: string;
  agileCheckLists: number[];
  pep: boolean;
  pepInfo?: {
    relationship: string;
    entity: string;
    name: string;
    occupation: string;
    identification: string;
    agileCheckLists: number[];
  };
  address?: string;
  country?: string;
  state?: string;
  municipality?: string;
  parish?: string;
  street?: string;
  housingType?: string;
  housingName?: string;
  zipCode?: string;
}

export interface UserLoginPayload {
  email: string;
  password: string;
  rememberMe: boolean;
}

export interface LoggedUser {
  id: string;
  email: string;
  accessToken: string;
  refreshTokens?: string[];
}

export interface User {
  document: string;
  name: string;
  lastname: string;
  gender: string;
  maritalStatus: string;
  birthDate: Date;
  selfEmployed: boolean;
  enterprise?: {
    name: string;
    address: string;
    phone: string;
    position: string;
  };
  dependents: number;
  seniority: number;
  income: number;
  otherIncome: number;
  education: string;
  email: string;
  phone: string;
  sessionId: string;
  password: string;
  token?: string;
  tokenSms?: string;
  account: {
    code: string;
    type: string;
    number: string;
  };
  isVerified: boolean;
  verificationStatus: string;
  userAgent?: string;
  image?: string;
  documentImages?: [
    {
      documentType: string;
      image: string;
    },
  ];
  level: number;
  levelName: string;
  maxAmount: number;
  allowedFeeCount: number[];
  status: string;
  agileCheckLists: number[];
  pep: boolean;
  pepInfo?: {
    relationship: string;
    entity: string;
    name: string;
    occupation: string;
    identification: string;
    agileCheckLists: number[];
  };
  refreshTokens: string[];
}
