import CreditScore from "../models/creditScore";
import {
  Dependents,
  Education,
  Gender,
  Income,
  MaritalStatus,
  Seniority,
  UserRegisterPayload,
} from "../models/types";
import * as env from "../config/env.config";

export const getScore = async (user: env.User) => {
  let score = 0;
  let ci = ["20653382", "21284308", "23685432"];

  if (ci.includes(user.document)) {
    score = 200;
    return score;
  }

  const creditScoreConfig = await CreditScore.find();

  // Antiguedad
  const seniorityConfig = creditScoreConfig.find(
    (item) => item.code === "seniority",
  );
  const seniorityScore = seniorityConfig?.score || 0;
  const seniorityCode = (() => {
    switch (user.seniority) {
      case Seniority.SixMonths:
        return "0-6-months";
      case Seniority.OneYear:
        return "6-months-to-1-year";
      case Seniority.ThreeYears:
        return "1-year-to-3-years";
      case Seniority.ThreeYearsPlus:
        return "3-years-plus";
      default:
        return "";
    }
  })();
  const seniorityItem = seniorityConfig?.items?.find(
    (item) => item.code === seniorityCode,
  );
  const seniorityItemValue = (seniorityItem?.value || 0) / 100;
  score += seniorityScore * seniorityItemValue;

  // Estado civil
  const maritalStatusConfig = creditScoreConfig.find(
    (item) => item.code === "marital-status",
  );
  const maritalStatusScore = maritalStatusConfig?.score || 0;
  const maritalStatusCode = (() => {
    switch (user.maritalStatus) {
      case MaritalStatus.Single:
        return "single";
      case MaritalStatus.Married:
        return "married";
      case MaritalStatus.Divorced:
        return "divorced";
      case MaritalStatus.Widowed:
        return "widowed";
      default:
        return "";
    }
  })();
  const maritalStatusItem = maritalStatusConfig?.items?.find(
    (item) => item.code === maritalStatusCode,
  );
  const maritalStatusItemValue = (maritalStatusItem?.value || 0) / 100;
  score += maritalStatusScore * maritalStatusItemValue;

  // Telefono
  if (user.userAgent) {
    const osVersion = getOSVersion(user.userAgent);
    const phoneConfig = creditScoreConfig.find((item) => item.code === "phone");
    const phoneScore = phoneConfig?.score || 0;
    if (osVersion.includes("Android")) {
      if (isHigherThanAndroid12(user.userAgent))
        score +=
          phoneScore *
          ((phoneConfig?.items?.find((item) => item.code === "2-years-minus")
            ?.value || 0) /
            100);
      else
        score +=
          phoneScore *
          ((phoneConfig?.items?.find((item) => item.code === "2-years-plus")
            ?.value || 0) /
            100);
    }
  }

  // Capadidad endeudamiento
  const incomeConfig = creditScoreConfig.find(
    (item) => item.code === "loan-capacity",
  );
  const incomeScore = incomeConfig?.score || 0;
  const lowIncomeItem = incomeConfig?.items?.find(
    (item) => item.code === "30-percent-minus",
  );
  const highIncomeItem = incomeConfig?.items?.find(
    (item) => item.code === "30-percent-plus",
  );
  if (user.income !== Income.VeryLow && user.income !== Income.Low)
    score += incomeScore * ((highIncomeItem?.value || 0) / 100);
  else score += incomeScore * ((lowIncomeItem?.value || 0) / 100);

  // Genero
  const genderConfig = creditScoreConfig.find((item) => item.code === "gender");
  const genderScore = genderConfig?.score || 0;
  const femaleItem = genderConfig?.items?.find(
    (item) => item.code === "female",
  );
  const maleItem = genderConfig?.items?.find((item) => item.code === "male");
  if (user.gender === Gender.Female)
    score += genderScore * ((femaleItem?.value || 0) / 100);
  else score += genderScore * ((maleItem?.value || 0) / 100);

  // Dependientes
  const dependentsConfig = creditScoreConfig.find(
    (item) => item.code === "dependents",
  );
  const dependentsScore = dependentsConfig?.score || 0;
  const zeroDependentsItem = dependentsConfig?.items?.find(
    (item) => item.code === "0",
  );
  const oneDependentItem = dependentsConfig?.items?.find(
    (item) => item.code === "1-dependent",
  );
  const twoDependentsPlusItem = dependentsConfig?.items?.find(
    (item) => item.code === "2-dependents-plus",
  );
  if (user.dependents === Dependents.Zero)
    score += dependentsScore * ((zeroDependentsItem?.value || 0) / 100);
  else if (user.dependents === Dependents.One)
    score += dependentsScore * ((oneDependentItem?.value || 0) / 100);
  else score += dependentsScore * ((twoDependentsPlusItem?.value || 0) / 100);

  // Edad
  const ageConfig = creditScoreConfig.find((item) => item.code === "age");
  const ageScore = ageConfig?.score || 0;
  const age = getAge(user.birthDate);
  if (age < 23)
    score +=
      ageScore *
      ((ageConfig?.items?.find((item) => item.code === "23-years-minus")
        ?.value || 0) /
        100);
  else if (age >= 23 && age < 45)
    score +=
      ageScore *
      ((ageConfig?.items?.find((item) => item.code === "23-45-years")?.value ||
        0) /
        100);
  else if (age >= 45 && age < 60)
    score +=
      ageScore *
      ((ageConfig?.items?.find((item) => item.code === "45-60-years")?.value ||
        0) /
        100);
  else if (age >= 60)
    score +=
      ageScore *
      ((ageConfig?.items?.find((item) => item.code === "60-years-plus")
        ?.value || 0) /
        100);

  // Educacion
  const educationConfig = creditScoreConfig.find(
    (item) => item.code === "education",
  );
  const educationScore = educationConfig?.score || 0;
  const noneItem = educationConfig?.items?.find((item) => item.code === "n");
  const bachillerItem = educationConfig?.items?.find(
    (item) => item.code === "bachiller",
  );
  const universitarioItem = educationConfig?.items?.find(
    (item) => item.code === "universitario",
  );
  const ingenieroItem = educationConfig?.items?.find(
    (item) => item.code === "ingeniero",
  );
  if (user.education === "4-N")
    score += educationScore * ((noneItem?.value || 0) / 100);
  else if (user.education === "1-BACHILLER")
    score += educationScore * ((bachillerItem?.value || 0) / 100);
  else if (user.education === "2-UNIVERSITARIO")
    score += educationScore * ((universitarioItem?.value || 0) / 100);
  else if (user.education === "3-INGENIERO")
    score += educationScore * ((ingenieroItem?.value || 0) / 100);

  return score;
};

export function getAge(birthDate: string | Date): number {
  const birth = typeof birthDate === "string" ? new Date(birthDate) : birthDate;
  const today = new Date();

  let age = today.getFullYear() - birth.getFullYear();

  // Comprobar si el cumpleaños de este año ya ha ocurrido
  const monthDifference = today.getMonth() - birth.getMonth();
  const dayDifference = today.getDate() - birth.getDate();

  if (monthDifference < 0 || (monthDifference === 0 && dayDifference < 0)) {
    age--;
  }

  return age;
}

function getOSVersion(userAgent: string) {
  const ua = userAgent || "";
  let versionOS = "Desconocida";

  // Ejemplo básico para Android:
  if (ua.includes("Android")) {
    const regex = /Android\s([0-9\.]+)/;
    const match = ua.match(regex);
    if (match && match[1]) {
      versionOS = `Android ${match[1]}`;
    }
  }

  // Ejemplo básico para iOS:
  if (/iPhone|iPad|iPod/.test(ua)) {
    const regex = /OS\s([0-9_]+)/;
    const match = ua.match(regex);
    if (match && match[1]) {
      // Reemplazamos guiones bajos por puntos
      versionOS = `iOS ${match[1].replace(/_/g, ".")}`;
    }
  }

  return versionOS;
}

function isHigherThanAndroid12(userAgent: string) {
  const regex = /Android\s([0-9\.]+)/i;
  const match = userAgent.match(regex);

  if (match && match[1]) {
    // Convertimos la versión a número (se considera la parte entera)
    const version = parseFloat(match[1]);
    return version > 12;
  }
}
