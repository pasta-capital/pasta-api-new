import { Schema, model } from "mongoose";
import validator from "validator";
import * as env from "../config/env.config";
import {
  Dependents,
  Gender,
  Seniority,
  Income,
  OtherIncome,
  Education,
  Status,
} from "./types";

const phoneSchema = new Schema(
  {
    countryCode: {
      type: String,
      required: [true, "Phone country code is required"],
    },
    areaCode: String,
    number: {
      type: String,
      required: [true, "Phone number is required"],
    },
  },
  { _id: false }, // 👈 evita que se genere _id en este subdocumento
);

const addressSchema = new Schema<env.Address>(
  {
    country: {
      type: Schema.Types.ObjectId,
      ref: "Location",
      required: [true, "Country is required"],
    },
    state: {
      type: Schema.Types.ObjectId,
      ref: "Location",
    },
    municipality: {
      type: Schema.Types.ObjectId,
      ref: "Location",
    },
    parish: {
      type: Schema.Types.ObjectId,
      ref: "Location",
    },
    description: String,
  },
  { _id: false }, // 👈 evita que se genere _id en este subdocumento
);

const userSchema = new Schema<env.User>(
  {
    document: {
      type: String,
      required: [true, "Document is required"],
      // unique: true,
      trim: true,
      uppercase: true,
    },
    identificationType: {
      type: String,
      enum: ["V", "E"],
      default: "V",
    },
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
    },
    lastname: {
      type: String,
      required: [true, "Lastname is required"],
      trim: true,
    },
    gender: {
      type: String,
      enum: [Gender.Male, Gender.Female],
    },
    maritalStatus: {
      type: String,
      enum: ["single", "married", "divorced", "widowed"],
    },
    birthDate: {
      type: Date,
      required: [true, "Birthday is required"],
    },
    address: String,
    selfEmployed: {
      type: Boolean,
      required: [true, "Self employed is required"],
    },
    enterprise: {
      name: {
        type: String,
        required: [
          function () {
            return !this.selfEmployed; // Solo requerido si selfEmployed es false
          },
          "Enterprise name is required",
        ],
        trim: true,
      },
      address: {
        type: String,
        required: [
          function () {
            return !this.selfEmployed; // Solo requerido si selfEmployed es false
          },
          "Enterprise address is required",
        ],
        trim: true,
      },
      phone: {
        type: String,
        required: [
          function () {
            return !this.selfEmployed; // Solo requerido si selfEmployed es false
          },
          "Enterprise phone is required",
        ],
        // validate: {
        //   validator: (value: string) =>
        //     !value || validator.isMobilePhone(value),
        //   message: "{VALUE} is not a valid phone number",
        // },
        trim: true,
      },
      position: {
        type: String,
        required: [
          function () {
            return !this.selfEmployed; // Solo requerido si selfEmployed es false
          },
          "Enterprise position is required",
        ],
        trim: true,
      },
    },
    occupation: {
      type: String,
    },
    dependents: {
      type: Number,
      required: [true, "Dependents is required"],
      enum: [Dependents.Zero, Dependents.One, Dependents.TwoOrMore],
    },
    seniority: {
      type: Number,
      required: [true, "Seniority is required"],
      enum: [
        Seniority.SixMonths,
        Seniority.OneYear,
        Seniority.ThreeYears,
        Seniority.ThreeYearsPlus,
      ],
    },
    income: {
      type: Number,
      required: [true, "Income is required"],
      enum: [Income.VeryLow, Income.Low, Income.Medium, Income.High],
    },
    otherIncome: {
      type: Number,
      required: [true, "Other income is required"],
      enum: [
        OtherIncome.None,
        OtherIncome.Low,
        OtherIncome.Medium,
        OtherIncome.High,
      ],
    },
    education: {
      type: String,
      required: [true, "Education is required"],
      /* enum: [
        Education.None,
        Education.Primary,
        Education.HighSchool,
        Education.Bachelor,
        Education.Master,
        Education.Doctorate,
      ], */
    },
    email: {
      type: String,
      // unique: true,
      required: [true, "Email is required"],
      validate: {
        validator: (value: string) => validator.isEmail(value),
        message: "{VALUE} is not a valid email",
      },
      trim: true,
      lowercase: true,
    },
    // phone: {
    //   type: String,
    //   required: [true, "Phone is required"],
    //   validate: {
    //     validator: (value: string) => validator.isMobilePhone(value),
    //     message: "{VALUE} is not a valid phone number",
    //   },
    //   trim: true,
    // },
    phone: {
      type: Schema.Types.Mixed,
    },
    sessionId: {
      type: String,
      required: [true, "SessionId is required"],
      trim: true,
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      trim: true,
    },
    status: {
      type: String,
      enum: [
        Status.Pending,
        Status.Active,
        Status.Inactive,
        Status.Deleted,
        Status.Rejected,
      ],
      default: Status.Active,
      required: [true, "Status is required"],
    },
    isVerified: {
      type: Boolean,
      required: true,
      default: false,
    },
    verificationStatus: {
      type: String,
      required: [true, "Verification status is required"],
    },
    acceptedTermsAndConditions: {
      type: [{ acceptedAt: Date, version: String }],
    },
    level: {
      type: Number,
      default: 1,
    },
    levelName: {
      type: String,
      default: "Aprendiz",
    },
    maxAmount: {
      type: Number,
      default: 0,
    },
    points: {
      type: Number,
      default: 0,
    },
    allowedFeeCount: [Number],
    roles: {
      type: [String],
      default: ["user"],
    },
    statusHistory: {
      type: [
        {
          status: String,
          note: String,
          createdAt: Date,
        },
      ],
      default: [],
    },
    notificationsConfig: {
      type: {
        email: Boolean,
        sms: Boolean,
        push: Boolean,
        promotions: Boolean,
      },
      default: {
        email: true,
        sms: true,
        push: true,
        promotions: true,
      },
    },
    image: String,
    documentImages: [
      {
        documentType: String,
        image: String,
        dateOfIssue: Date,
        expirationDate: Date,
      },
    ],
    pushToken: String,
    pushTokens: [{ type: String }],
    refreshTokens: [{ type: String }],
    achievements: [
      {
        id: {
          type: Schema.Types.ObjectId,
          ref: "Achievement", // Referencia al modelo Achievement
          required: true,
        },
        createdAt: {
          type: Date,
          default: Date.now, // Valor por defecto: fecha actual
        },
      },
    ],
    agileCheckLists: [Number],
    pep: {
      type: Boolean,
      default: false,
    },
    pepInfo: {
      relationship: String,
      entity: String,
      name: String,
      occupation: String,
      identification: String,
      agileCheckLists: [Number],
    },
  },
  {
    timestamps: true, // Agrega automáticamente campos 'createdAt' y 'updatedAt'
    strict: true,
    collection: "User", // Nombre de la colección en la base de datos
  },
);

// 🔥 Middleware para asegurar consistencia
userSchema.pre("validate", function (next) {
  if (this.phone && typeof this.phone === "string") {
    console.log("string");
    this.phone = {
      countryCode: "+58",
      number: this.phone,
    };
  }
  next();
});

userSchema.pre("save", async function (next) {
  if (this.isModified("email") || this.isNew) {
    // Si el email ha sido modificado o es un nuevo documento
    if (this.status === "active" || this.status === "pending") {
      // Solo validamos unicidad si el usuario no está "deleted"
      const existingUser = await (this.constructor as any).findOne({
        $or: [
          { email: this.email },
          {
            document: this.document,
          },
        ],
        status: { $ne: "deleted" }, // Busca usuarios con el mismo email que NO estén deleted
        _id: { $ne: this._id }, // Excluye el documento actual si estamos actualizando
      });

      if (existingUser) {
        return next(new Error("Correo o cédula ya registrado"));
      }
    }
  }
  next();
});

userSchema.index({ name: "text", lastname: "text" });

const User = model<env.User>("User", userSchema);

export default User;
