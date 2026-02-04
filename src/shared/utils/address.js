// utils/address.js
export const formatAddress = (address) => {
  if (!address) return '—';
  
  const parts = [];
  
  if (address.line1) parts.push(address.line1);
  if (address.line2) parts.push(address.line2);
  
  const cityRegion = [];
  if (address.city) cityRegion.push(address.city);
  if (address.region) cityRegion.push(address.region);
  
  if (cityRegion.length > 0) {
    parts.push(cityRegion.join(', '));
  }
  
  const postalCountry = [];
  if (address.postal_code) postalCountry.push(address.postal_code);
  if (address.country) postalCountry.push(address.country);
  
  if (postalCountry.length > 0) {
    parts.push(postalCountry.join(' '));
  }
  
  return parts.join('\n') || '—';
};

// Or a single line format
export const formatAddressSingleLine = (address) => {
  if (!address) return '—';
  
  const parts = [];
  
  if (address.line1) parts.push(address.line1);
  if (address.line2) parts.push(address.line2);
  
  const cityRegion = [];
  if (address.city) cityRegion.push(address.city);
  if (address.region) cityRegion.push(address.region);
  
  if (cityRegion.length > 0) {
    parts.push(cityRegion.join(', '));
  }
  
  const postalCountry = [];
  if (address.postal_code) postalCountry.push(address.postal_code);
  if (address.country) postalCountry.push(address.country);
  
  if (postalCountry.length > 0) {
    parts.push(postalCountry.join(' '));
  }
  
  return parts.join(', ') || '—';
};