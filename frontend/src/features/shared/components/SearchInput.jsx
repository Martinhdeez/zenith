import './SearchInput.css'

function SearchInput({ id, label, value, onChange, placeholder }) {
  return (
    <label className="search-input" htmlFor={id}>
      <span className="search-input__label">{label}</span>
      <input id={id} type="search" value={value} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} />
    </label>
  )
}

export default SearchInput
