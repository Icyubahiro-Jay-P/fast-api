import { useId } from 'react';
import Icon from './Icon.jsx';

export default function SearchInput({ value, onChange, placeholder = 'Search...', label = 'Search' }) {
  const inputId = useId();

  return (
    <div className="relative">
      <label className="sr-only" htmlFor={inputId}>
        {label}
      </label>
      <Icon
        name="search"
        size={14}
        className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-muted-foreground"
      />
      <input
        id={inputId}
        type="search"
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="control w-56 pr-7 pl-8 md:w-64 [&::-webkit-search-cancel-button]:hidden"
      />
      {value ? (
        <button
          className="absolute top-1/2 right-1.5 grid size-5 -translate-y-1/2 place-items-center rounded text-muted-foreground hover:text-foreground"
          type="button"
          aria-label="Clear search"
          onClick={() => onChange('')}
        >
          <Icon name="close" size={12} />
        </button>
      ) : null}
    </div>
  );
}
