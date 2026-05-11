/**
 * Bluesky butterfly mark — official brand glyph rebuilt as inline SVG so it
 * scales without any HTTP request. Brand color: #0085FF (sky blue).
 *
 * Used in BlueskyConnectModal hero header. Renders at any size via the
 * `size` prop or the className override (the SVG itself uses currentColor
 * for its fill so it adapts to text color contexts if needed).
 */

interface Props {
  size?: number;
  className?: string;
}

export default function BlueskyLogo({ size = 40, className = "" }: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 600 530"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden
    >
      <path
        fill="#0085FF"
        d="M135.7 44.4C202.8 95 274.9 197.4 301.3 252.4c26.4-55 98.5-157.4 165.6-208 48.5-36.4 127-64.6 127 25.3 0 18-10.3 150.7-16.3 172.2-21 74.7-97.2 93.8-164.9 82.3 118.4 20.2 148.5 87 83.4 153.7-123.5 126.7-177.5-31.8-191.4-72.4-2.5-7.4-3.7-10.9-3.7-7.9 0-3-1.2.5-3.7 7.9-13.9 40.6-67.9 199-191.4 72.4C40.7 411.2 70.8 344.4 189.2 324.2 121.5 335.7 45.3 316.6 24.3 241.9 18.3 220.4 8 87.7 8 69.7c0-89.9 78.5-61.7 127-25.3z"
      />
    </svg>
  );
}
