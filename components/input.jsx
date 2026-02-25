/**
 * Reusable styled input. Use this (or the .search-input class) anywhere
 * you want the same look. Pass className to add or override styles.
 */
export default function Input({ className = '', ...props }) {
  return (
    <input
      type="text"
      className={`input input-bordered w-full rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent ${className}`.trim()}
      {...props}
    />
  )
}
