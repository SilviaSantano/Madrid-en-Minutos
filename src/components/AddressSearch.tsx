import { useEffect, useState } from 'react'
import { Search } from 'lucide-react'
import { useI18n } from '../i18n'
import { searchAddress, type AddressResult } from '../lib/geocoding'

type AddressSearchProps = {
  placeholder: string
  onSelect: (result: AddressResult) => void
}

export function AddressSearch({ placeholder, onSelect }: AddressSearchProps) {
  const { t } = useI18n()
  const [text, setText] = useState('')
  const [results, setResults] = useState<AddressResult[]>([])
  const [error, setError] = useState(false)

  useEffect(() => {
    const query = text.trim()
    if (query.length < 3) {
      return
    }
    const controller = new AbortController()
    const timer = window.setTimeout(() => {
      searchAddress(query, controller.signal)
        .then((found) => {
          setResults(found)
          setError(false)
        })
        .catch((reason: unknown) => {
          if (!controller.signal.aborted) {
            console.warn('Address search failed', reason)
            setError(true)
          }
        })
    }, 300)
    return () => {
      window.clearTimeout(timer)
      controller.abort()
    }
  }, [text])

  function choose(result: AddressResult) {
    onSelect(result)
    setText('')
    setResults([])
  }

  const showResults = text.trim().length >= 3

  return (
    <div className="address-search">
      <Search className="address-search-icon" size={17} aria-hidden />
      <input
        aria-label={placeholder}
        type="search"
        value={text}
        placeholder={placeholder}
        onChange={(event) => setText(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' && results[0]) choose(results[0])
          if (event.key === 'Escape') setText('')
        }}
      />
      {showResults && (results.length > 0 || error) ? (
        <ul className="address-results">
          {error ? <li className="address-empty">{t.searchUnavailable}</li> : null}
          {results.map((result) => (
            <li key={result.id}>
              <button type="button" onClick={() => choose(result)}>
                {result.label}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
