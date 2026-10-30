import { supabase } from "./supabase";

export const INSTITUTION_ASSETS_BUCKET = "institution-assets";
export const INSTITUTION_BRANDING_UPDATED = "institution-branding-updated";

export interface InstitutionBrandingUpdateDetail {
  path: string | null;
  version: number;
}

export const validateInstitutionLogo = (file: File) => {
  if (!["image/png", "image/jpeg", "image/webp"].includes(file.type))
    throw new Error("Use a PNG, JPEG, or WebP image.");
  if (file.size > 2 * 1024 * 1024)
    throw new Error("The logo must be 2 MB or smaller.");
};

const extension = (file: File) =>
  file.type === "image/png"
    ? "png"
    : file.type === "image/webp"
      ? "webp"
      : "jpg";

const logoVariants = (institutionId: string) =>
  ["png", "jpg", "jpeg", "webp"].map((ext) => `${institutionId}/logo.${ext}`);

export const notifyInstitutionBrandingUpdated = (path: string | null) => {
  window.dispatchEvent(
    new CustomEvent<InstitutionBrandingUpdateDetail>(
      INSTITUTION_BRANDING_UPDATED,
      {
        detail: { path, version: Date.now() },
      },
    ),
  );
};

async function removeOldLogoVariants(institutionId: string, keepPath: string) {
  const obsolete = logoVariants(institutionId).filter(
    (path) => path !== keepPath,
  );
  const { error } = await supabase.storage
    .from(INSTITUTION_ASSETS_BUCKET)
    .remove(obsolete);
  if (error)
    console.warn(
      "Could not remove obsolete institution logo variants:",
      error.message,
    );
}

export async function uploadInstitutionLogo(institutionId: string, file: File) {
  validateInstitutionLogo(file);
  const path = `${institutionId}/logo.${extension(file)}`;
  const { error } = await supabase.storage
    .from(INSTITUTION_ASSETS_BUCKET)
    .upload(path, file, {
      upsert: true,
      contentType: file.type,
      cacheControl: "0",
    });
  if (error) throw error;
  const { error: updateError } = await supabase.rpc(
    "update_own_institution_logo",
    { p_logo_path: path },
  );
  if (updateError) throw updateError;
  await removeOldLogoVariants(institutionId, path);
  notifyInstitutionBrandingUpdated(path);
  return path;
}

export async function removeInstitutionLogo(
  path: string | null,
  institutionId: string,
) {
  const { error } = await supabase.storage
    .from(INSTITUTION_ASSETS_BUCKET)
    .remove(logoVariants(institutionId));
  if (error) throw error;
  const { error: updateError } = await supabase.rpc(
    "update_own_institution_logo",
    { p_logo_path: null },
  );
  if (updateError) throw updateError;
  notifyInstitutionBrandingUpdated(null);
}

export async function getInstitutionLogoUrl(
  path: string | null,
  version = Date.now(),
) {
  if (!path) return null;
  const { data, error } = await supabase.storage
    .from(INSTITUTION_ASSETS_BUCKET)
    .createSignedUrl(path, 3600);
  if (error) return null;
  return `${data.signedUrl}${data.signedUrl.includes("?") ? "&" : "?"}v=${version}`;
}

export async function fetchInstitutionLogoPath(institutionId: string) {
  const { data, error } = await supabase
    .from("institutions")
    .select("logo_path")
    .eq("id", institutionId)
    .maybeSingle();
  if (error) {
    console.info("Institution branding is not available yet:", error.message);
    return null;
  }
  return data?.logo_path?.trim() || null;
}
