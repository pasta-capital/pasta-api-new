export default [
  {
    code: "seniority",
    name: "Antiguedad en el empleo",
    score: 20,
    items: [
      {
        code: "0-6-months",
        name: "0 a 6 meses",
        value: 0,
      },
      {
        code: "6-months-to-1-year",
        name: "6 meses a 1 año",
        value: 30,
      },
      {
        code: "1-year-to-3-years",
        name: "1 año a 3 años",
        value: 70,
      },
      {
        code: "3-years-plus",
        name: "Mayor a 3 años",
        value: 100,
      },
    ],
  },
  {
    code: "marital-status",
    name: "Estado civil",
    score: 5,
    items: [
      {
        code: "single",
        name: "Soltero",
        value: 50,
      },
      {
        code: "married",
        name: "Casado",
        value: 100,
      },
      {
        code: "divorced",
        name: "Divorciado",
        value: 0,
      },
      {
        code: "widowed",
        name: "Viudo",
        value: 0,
      },
    ],
  },
  {
    code: "phone",
    name: "Teléfono",
    score: 5,
    items: [
      {
        code: "no-smartphone",
        name: "No smartphone",
        value: 0,
      },
      {
        code: "2-years-plus",
        name: "Mayor a 2 años",
        value: 50,
      },
      {
        code: "2-years-minus",
        name: "Menor a 2 años",
        value: 100,
      },
    ],
  },
  {
    code: "loan-capacity",
    name: "Capacidad de endeudamiento",
    score: 20,
    items: [
      {
        code: "30-percent-plus",
        name: "Mayor a 30%",
        value: 0,
      },
      {
        code: "30-percent-minus",
        name: "Menor a 30%",
        value: 100,
      },
    ],
  },
  {
    code: "gender",
    name: "Género",
    score: 5,
    items: [
      {
        code: "male",
        name: "Masculino",
        value: 0,
      },
      {
        code: "female",
        name: "Femenino",
        value: 100,
      },
    ],
  },
  {
    code: "dependents",
    name: "Dependientes",
    score: 15,
    items: [
      {
        code: "0",
        name: "Sin dependientes",
        value: 100,
      },
      {
        code: "1-dependent",
        name: "1 dependiente",
        value: 50,
      },
      {
        code: "2-dependents-plus",
        name: "2 dependientes o más",
        value: 0,
      },
    ],
  },
  {
    code: "age",
    name: "Edad",
    score: 15,
    items: [
      {
        code: "23-years-minus",
        name: "Menor a 23 años",
        value: 0,
      },
      {
        code: "23-45-years",
        name: "De 23 a 45 años",
        value: 100,
      },
      {
        code: "45-60-years",
        name: "De 45 a 60 años",
        value: 70,
      },
      {
        code: "60-years-plus",
        name: "Mayor a 60 años",
        value: 0,
      },
    ],
  },
  {
    code: "education",
    name: "Educación",
    score: 15,
    items: [
      {
        code: "none",
        name: "Ninguno",
        value: 0,
      },
      {
        code: "primary",
        name: "Primaria",
        value: 20,
      },
      {
        code: "high-school",
        name: "Secundaria",
        value: 70,
      },
      {
        code: "bachelor",
        name: "Universitario",
        value: 100,
      },
    ],
  },
];
