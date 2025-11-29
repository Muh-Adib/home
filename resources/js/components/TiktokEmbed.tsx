import React, { useMemo, useEffect } from "react";

interface TiktokEmbedProps {
  url: string;
  maxWidth?: number;
  height?: number;
}

const TiktokEmbed: React.FC<TiktokEmbedProps> = ({
  url,
  maxWidth = 605,
  height = 600,
}) => {
  // Suppress TikTok SDK console warnings
  useEffect(() => {
    const originalWarn = console.warn;
    const originalError = console.error;

    console.warn = (...args: any[]) => {
      const message = args[0]?.toString() || "";
      if (
        message.includes("Permissions policy violation") ||
        message.includes("registerReactInstance")
      ) {
        return;
      }
      originalWarn(...args);
    };

    console.error = (...args: any[]) => {
      const message = args[0]?.toString() || "";
      if (
        message.includes("Permissions policy violation") ||
        message.includes("registerReactInstance")
      ) {
        return;
      }
      originalError(...args);
    };

    return () => {
      console.warn = originalWarn;
      console.error = originalError;
    };
  }, []);
  /** Extract video ID */
  const videoId = useMemo(() => {
    if (!url) return null;

    // Match both www.tiktok.com and vm.tiktok.com URLs
    const pattern = /(?:video|embed)\/(\d+)/;
    const match = url.match(pattern);
    return match?.[1] || null;
  }, [url]);

  if (!videoId) {
    return (
      <div className="w-full flex justify-center p-4">
        <p className="text-gray-500 text-sm">Invalid TikTok URL</p>
      </div>
    );
  }

  return (
    <div className="w-full flex justify-center overflow-hidden">
      <div
        style={{
          maxWidth: `${maxWidth}px`,
          minWidth: "325px",
          width: "100%",
        }}
      >
        <iframe
          src={`https://www.tiktok.com/embed/v3/${videoId}`}
          width="100%"
          height={height}
          style={{
            border: "none",
            display: "block",
          }}
          scrolling="no"
          allow="encrypted-media"
          title={`TikTok Video ${videoId}`}
          loading="lazy"
        />
      </div>
    </div>
  );
};

export default TiktokEmbed;