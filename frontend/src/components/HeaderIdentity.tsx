import React from "react";
import {
  getInstitutionLogoUrl,
  INSTITUTION_BRANDING_UPDATED,
  InstitutionBrandingUpdateDetail,
} from "../lib/institutionBrandingService";
import { ResolvedHeaderIdentity } from "../lib/headerIdentity";

interface HeaderIdentityProps {
  identity: ResolvedHeaderIdentity;
  compact?: boolean;
}

export const HeaderIdentity: React.FC<HeaderIdentityProps> = ({
  identity,
  compact = false,
}) => {
  const [branding, setBranding] = React.useState({
    path: identity.institutionLogoPath,
    version: 0,
  });
  const [logoUrl, setLogoUrl] = React.useState<string | null>(null);
  const [imageReady, setImageReady] = React.useState(false);

  React.useEffect(() => {
    setBranding({ path: identity.institutionLogoPath, version: Date.now() });
  }, [identity.institutionLogoPath]);
  React.useEffect(() => {
    const refresh = (event: Event) => {
      const detail = (event as CustomEvent<InstitutionBrandingUpdateDetail>)
        .detail;
      setBranding(detail);
    };
    window.addEventListener(INSTITUTION_BRANDING_UPDATED, refresh);
    return () =>
      window.removeEventListener(INSTITUTION_BRANDING_UPDATED, refresh);
  }, []);
  React.useEffect(() => {
    let active = true;
    setImageReady(false);
    setLogoUrl(null);
    getInstitutionLogoUrl(branding.path, branding.version).then(
      (url) => active && setLogoUrl(url),
    );
    return () => {
      active = false;
    };
  }, [branding.path, branding.version]);

  const initials = (identity.institutionName || "Institution")
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return (
    <div
      className={`flex min-w-0 items-center gap-1.5 ${compact ? "leading-tight" : "leading-snug"}`}
    >
      <span className="shrink-0 text-xs font-semibold tracking-wide text-foreground">
        {identity.productName}
      </span>
      {identity.institutionName && (
        <>
          <span className="shrink-0 text-xs text-muted-foreground">•</span>
          <div className="flex min-w-0 items-start gap-2">
            <span className="relative flex h-[34px] w-[34px] shrink-0 items-center justify-center overflow-hidden rounded-lg border bg-muted text-xs font-bold">
              {initials}
              {logoUrl && (
                <img
                  src={logoUrl}
                  alt=""
                  className={`absolute inset-0 h-full w-full bg-white object-contain p-0.5 transition-opacity ${imageReady ? "opacity-100" : "opacity-0"}`}
                  onLoad={() => setImageReady(true)}
                  onError={() => {
                    setImageReady(false);
                    setLogoUrl(null);
                  }}
                />
              )}
            </span>
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold text-foreground">
                {identity.institutionName}
              </div>
              {identity.roleLabel && (
                <div className="mt-0.5 flex min-w-0 items-center gap-1.5 text-[11px] font-semibold dashboard-accent-text">
                  <span className="truncate">{identity.roleLabel}</span>
                  {identity.contextLabel && (
                    <>
                      <span className="shrink-0 text-muted-foreground">•</span>
                      <span className="truncate text-muted-foreground">
                        {identity.contextLabel}
                      </span>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
