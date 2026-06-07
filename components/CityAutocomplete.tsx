"use client";
import { useState, useRef, useEffect } from "react";

const US_METROS = [
  "New York, NY", "Los Angeles, CA", "Chicago, IL", "Houston, TX",
  "Phoenix, AZ", "Philadelphia, PA", "San Antonio, TX", "San Diego, CA",
  "Dallas, TX", "San Jose, CA", "Austin, TX", "Jacksonville, FL",
  "Fort Worth, TX", "Columbus, OH", "Charlotte, NC", "Indianapolis, IN",
  "San Francisco, CA", "Seattle, WA", "Denver, CO", "Nashville, TN",
  "Oklahoma City, OK", "El Paso, TX", "Washington, DC", "Las Vegas, NV",
  "Louisville, KY", "Memphis, TN", "Portland, OR", "Baltimore, MD",
  "Milwaukee, WI", "Albuquerque, NM", "Tucson, AZ", "Fresno, CA",
  "Sacramento, CA", "Kansas City, MO", "Mesa, AZ", "Atlanta, GA",
  "Omaha, NE", "Colorado Springs, CO", "Raleigh, NC", "Miami, FL",
  "Long Beach, CA", "Virginia Beach, VA", "Minneapolis, MN", "Tampa, FL",
  "New Orleans, LA", "Arlington, TX", "Bakersfield, CA", "Honolulu, HI",
  "Anaheim, CA", "Aurora, CO", "Santa Ana, CA", "Corpus Christi, TX",
  "Riverside, CA", "St. Louis, MO", "Lexington, KY", "Pittsburgh, PA",
  "Stockton, CA", "Anchorage, AK", "Cincinnati, OH", "St. Paul, MN",
  "Greensboro, NC", "Toledo, OH", "Newark, NJ", "Plano, TX",
  "Henderson, NV", "Orlando, FL", "Lincoln, NE", "Jersey City, NJ",
  "Chandler, AZ", "St. Petersburg, FL", "Laredo, TX", "Norfolk, VA",
  "Madison, WI", "Durham, NC", "Lubbock, TX", "Winston-Salem, NC",
  "Garland, TX", "Glendale, AZ", "Hialeah, FL", "Reno, NV",
  "Baton Rouge, LA", "Irvine, CA", "Chesapeake, VA", "Scottsdale, AZ",
  "North Las Vegas, NV", "Fremont, CA", "Gilbert, AZ", "San Bernardino, CA",
  "Birmingham, AL", "Rochester, NY", "Richmond, VA", "Spokane, WA",
  "Des Moines, IA", "Montgomery, AL", "Modesto, CA", "Fayetteville, NC",
  "Tacoma, WA", "Akron, OH", "Grand Rapids, MI", "Oxnard, CA",
  "Little Rock, AR", "Salt Lake City, UT", "Tallahassee, FL",
  "Huntsville, AL", "Worcester, MA", "Knoxville, TN", "Providence, RI",
  "Brownsville, TX", "Fort Lauderdale, FL", "Chattanooga, TN",
  "Hartford, CT", "Shreveport, LA", "Aurora, IL", "Mobile, AL",
  "Clarksville, TN", "Salem, OR", "Cary, NC", "Rockford, IL",
  "Fort Collins, CO", "Jackson, MS", "Cape Coral, FL", "Savannah, GA",
  "Bridgeport, CT", "Syracuse, NY", "McAllen, TX", "Pasadena, CA",
  "Bellevue, WA", "Dayton, OH", "Buffalo, NY", "Boise, ID",
  "Fargo, ND", "Sioux Falls, SD",
];

interface Props {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  required?: boolean;
  autoFocus?: boolean;
  inputClassName?: string;
  onBlur?: () => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
}

export default function CityAutocomplete({
  value,
  onChange,
  placeholder = "e.g. Chicago, IL",
  required,
  autoFocus,
  inputClassName,
  onBlur,
  onKeyDown,
}: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(value);
  const containerRef = useRef<HTMLDivElement>(null);

  // Keep query in sync if parent resets value externally
  useEffect(() => { setQuery(value); }, [value]);

  const filtered = query.length < 1
    ? []
    : US_METROS.filter((m) => m.toLowerCase().includes(query.toLowerCase())).slice(0, 8);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function select(metro: string) {
    setQuery(metro);
    onChange(metro);
    setOpen(false);
  }

  return (
    <div ref={containerRef} className="relative">
      <input
        type="text"
        value={query}
        onChange={(e) => { setQuery(e.target.value); onChange(e.target.value); setOpen(true); }}
        onFocus={() => filtered.length > 0 && setOpen(true)}
        onBlur={onBlur}
        onKeyDown={onKeyDown}
        required={required}
        autoFocus={autoFocus}
        autoComplete="off"
        placeholder={placeholder}
        className={inputClassName ?? "w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white placeholder-gray-600 focus:outline-none focus:border-purple-500"}
      />
      {open && filtered.length > 0 && (
        <ul className="absolute z-50 mt-1 w-full bg-[#14141f] border border-white/10 rounded-lg overflow-hidden shadow-xl">
          {filtered.map((metro) => (
            <li key={metro}>
              <button
                type="button"
                onMouseDown={() => select(metro)}
                className="w-full text-left px-3 py-2 text-sm text-gray-200 hover:bg-purple-600/30 transition-colors"
              >
                {metro}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
