import mongoose from 'mongoose';
import { CUSTOMER_STATUSES } from '../utils/constants.js';

const customerSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      maxlength: 254,
      unique: true,
    },
    phone: {
      type: String,
      trim: true,
      maxlength: 30,
      default: null,
    },
    status: {
      type: String,
      enum: CUSTOMER_STATUSES,
      default: 'active',
      index: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
    toJSON: {
      transform(_document, returned) {
        returned.id = returned._id.toString();
        delete returned._id;
        return returned;
      },
    },
  },
);

export const Customer =
  mongoose.models.Customer ?? mongoose.model('Customer', customerSchema);
