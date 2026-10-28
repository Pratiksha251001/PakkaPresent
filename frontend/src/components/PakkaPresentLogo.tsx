import React from "react";

interface PakkaPresentLogoProps {
  variant?: "full" | "horizontal" | "icon";
  size?: "sm" | "md" | "lg" | "xl" | "2xl";
  className?: string;
  showTagline?: boolean;
  useImage?: boolean;
  colorMode?: "auto" | "light" | "onDark";
}

export const PakkaPresentLogo: React.FC<PakkaPresentLogoProps> = ({
  variant = "horizontal",
  size = "md",
  className = "",
  showTagline = false,
  colorMode = "auto",
}) => {
  const iconDimensions =
    {
      sm: "h-9 w-9",
      md: "h-11 w-11 sm:h-12 sm:w-12",
      lg: "h-14 w-14 sm:h-16 sm:w-16",
      xl: "h-20 w-20 sm:h-24 sm:w-24",
      "2xl": "h-28 w-28 sm:h-32 sm:w-32",
    }[size] || "h-11 w-11";

  const textSize =
    {
      sm: "text-lg",
      md: "text-xl sm:text-2xl",
      lg: "text-2xl sm:text-3xl",
      xl: "text-3xl sm:text-4xl",
      "2xl": "text-4xl sm:text-5xl",
    }[size] || "text-xl";

  // Clean PakkaPresent monogram emblem
  const Emblem = (
    <div
      className={`relative flex shrink-0 items-center justify-center overflow-hidden rounded-xl ${colorMode === "onDark" ? "border border-white/15" : "border border-transparent dark:border-white/15"} ${iconDimensions}`}
    >
      <img
        src="/pakkapresent-logo.svg"
        alt="PakkaPresent"
        className="h-full w-full object-contain object-center block rounded-xl"
      />
    </div>
  );

  if (variant === "icon") {
    return (
      <div className={`flex items-center justify-center mx-auto ${className}`}>
        {Emblem}
      </div>
    );
  }

  const onDark = colorMode === "onDark";
  const brandColor = onDark ? "text-white" : "text-[#14161F] dark:text-white";
  const secondaryColor = onDark
    ? "text-white/70"
    : "text-slate-500 dark:text-slate-400";

  const Wordmark = (
    <div className="flex flex-col text-left justify-center leading-none">
      <div
        className={`flex items-center font-display font-black leading-none tracking-tight ${textSize}`}
      >
        <span className={brandColor}>Pakka</span>
        <span className="text-[#8dde24]">Present</span>
      </div>
      {showTagline && (
        <p
          className={`mt-1 text-[10px] font-bold uppercase leading-none tracking-[0.16em] sm:text-xs ${secondaryColor}`}
        >
          Smart academic operations
        </p>
      )}
    </div>
  );

  if (variant === "full") {
    return (
      <div
        className={`flex flex-col items-center justify-center text-center ${className}`}
      >
        <div className="mx-auto">{Emblem}</div>
        <div className="mt-3">{Wordmark}</div>
      </div>
    );
  }

  return (
    <div className={`inline-flex items-center gap-2.5 sm:gap-3 ${className}`}>
      {Emblem}
      {Wordmark}
    </div>
  );
};
