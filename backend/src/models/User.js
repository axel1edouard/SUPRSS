// backend/src/models/User.js
import mongoose from 'mongoose';
const { Schema } = mongoose;

const UserSchema = new Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      index: true,
      trim: true,
    },

    // Nom facultatif (on peut le remplir via Google)
    name: { type: String, default: '' },

    // Hash de mot de passe requis SEULEMENT si pas d'OAuth
    passwordHash: {
      type: String,
      default: null,
      required: function () {
        // si pas de GoogleId => compte "classique" => mot de passe requis
        return !this.googleId;
      },
    },

    // Lien vers un compte Google
    googleId: {
      type: String,
      default: null,
      unique: true,
      sparse: true, // permet plusieurs docs sans googleId
      index: true,
    },

    prefs: {
    theme: { type: String, enum: ['light', 'dark'], default: 'light' },
    fontScale: { type: Number, default: 1 },
  },

    createdAt: { type: Date, default: Date.now },
  },
  {
    versionKey: false,
  }

);

export default mongoose.model('User', UserSchema);
