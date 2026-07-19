import { z } from 'zod';

// Photos are uploaded as base64 data URIs and stored inline in Mongo (no
// S3/R2 yet — see backend/CLAUDE.md). Mobile compresses to ~1024px/quality 70
// before sending, so 700k chars (~500KB) comfortably covers a real photo
// while still bounding document size on the free Atlas tier.
// Used for Event.image_url, Group.cover_url, and User.avatar_url.
export const IMAGE_URL = z.string().trim().max(700_000).regex(
  /^(https?:\/\/\S+|data:image\/(png|jpe?g|webp);base64,[A-Za-z0-9+/]+=*)$/,
  'Image invalide'
).optional();

export const OBJECT_ID = /^[a-f\d]{24}$/i;
