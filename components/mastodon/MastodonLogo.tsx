/**
 * Mastodon mammoth-M mark — official brand glyph rebuilt as inline SVG.
 * Brand color: #6364FF (Mastodon indigo).
 *
 * Used in MastodonConnectModal hero header. Scales freely via `size` prop.
 */

interface Props {
  size?: number;
  className?: string;
}

export default function MastodonLogo({ size = 40, className = "" }: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 261 261"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden
    >
      <path
        fill="#6364FF"
        d="M203.5 26.6c-19.7-9.4-43.7-15.8-71.1-15.8h-.7c-27.4 0-51.4 6.4-71.1 15.8C30 41.4 23 67.6 22.2 92c-.6 15.5-.4 27.7-.4 36.9 0 56.7 4.5 70.7 13.7 88 8 14.9 25.6 32.4 56 32.6 0 0 11 0 11.7-.5 5.5-2.7 9-7.6 9.7-13.4l.4-3.4c-12.6 4-26.5 5.5-39 5.5-15.4 0-49.4-12.4-49.4-12.4l-.5-.6c14.7 13.6 25.7 25.5 65.9 25.5 12.5 0 26.4-1.5 39-5.5l.4 3.4c.7 5.8 4.2 10.7 9.7 13.4.7.5 11.7.5 11.7.5 30.4-.2 48-17.7 56-32.6 9.2-17.3 13.7-31.3 13.7-88 0-9.2.2-21.4-.4-36.9-.8-24.4-7.8-50.6-36.4-65.4z"
      />
      <path
        fill="#fff"
        d="M203 134.7v62.5h-25.7v-60.6c0-12.7-5.4-19.2-16.2-19.2-12 0-18 7.7-18 23v33.3h-25.5v-33.3c0-15.3-6-23-18-23-10.8 0-16.2 6.5-16.2 19.2v60.6H58V134.7c0-12.7 3.3-22.7 9.8-30.2 6.7-7.5 15.5-11.3 26.4-11.3 12.6 0 22.2 4.8 28.5 14.4l6.4 10.7 6.4-10.7c6.3-9.6 15.9-14.4 28.5-14.4 10.9 0 19.7 3.8 26.4 11.3 6.5 7.5 9.6 17.5 9.6 30.2z"
      />
    </svg>
  );
}
