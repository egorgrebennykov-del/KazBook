import { useState } from "react";

const VALID_EMOTIONS = new Set([
  "neutral",
  "happy",
  "laughing",
  "thinking",
  "curious",
  "surprised",
  "confused",
  "sad",
  "concerned",
  "speaking",
  "greeting",
  "loading",
  "success",
  "error",
  "messageRead",
]);

export default function LiteraCharacter({
  emotion = "neutral",
  size = 130,
  className = "",
  onClick,
  alt = "Litera AI Assistant",
}) {
  const [imgError, setImgError] = useState(false);

  const cleanEmotion = VALID_EMOTIONS.has(emotion) ? emotion : "neutral";
  const imageSrc = imgError
    ? "/images/litera/neutral.png"
    : `/images/litera/${cleanEmotion}.png`;

  return (
    <div
      className={`litera-character litera-character--${cleanEmotion} ${className}`}
      onClick={onClick}
      style={{
        width: typeof size === "number" ? `${size}px` : size,
        height: typeof size === "number" ? `${size}px` : size,
      }}
      role={onClick ? "button" : "img"}
      tabIndex={onClick ? 0 : undefined}
      aria-label={alt}
    >
      <img
        src={imageSrc}
        alt={alt}
        className="litera-character__image"
        onError={() => setImgError(true)}
        draggable={false}
      />
    </div>
  );
}
