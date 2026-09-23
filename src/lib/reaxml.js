// Syndication feed in REAXML style (the listing format used by Australian
// portals). This is a starting point: confirm field requirements with each
// portal's feed team before going live.

import { esc } from './html.js';

const CATEGORY = { House: 'House', Unit: 'Unit', Apartment: 'Apartment', Townhouse: 'Townhouse', Villa: 'Villa', Duplex: 'DuplexSemi-detached' };

export function reaxmlFeed(listings, baseUrl) {
  const items = listings.map((l) => {
    const street = splitStreet(l.address);
    const cert = l.certification;
    const summary = [
      `CERTIFIED TENANTED (${cert.certificateId}, grade ${cert.grade}).`,
      `Leased at $${l.weekly_rent}/wk${l.periodic ? ' (periodic)' : ` until ${l.lease_end}`}.`,
      `Gross yield ${(l.numbers.grossYield * 100).toFixed(2)}%.`,
      `Full verified tenancy pack: ${baseUrl}/listings/${l.id}`,
    ].join(' ');
    return `  <residential modTime="${esc(l.updated_at)}" status="current">
    <agentID>${esc(l.agency_id)}</agentID>
    <uniqueID>TNT-${esc(l.id)}</uniqueID>
    <listingAgent><name>${esc(l.agency_name)}</name></listingAgent>
    <price display="yes">${esc(l.price)}</price>
    <address display="yes">
      <streetNumber>${esc(street.number)}</streetNumber>
      <street>${esc(street.name)}</street>
      <suburb>${esc(l.suburb)}</suburb>
      <state>${esc(l.state)}</state>
      <postcode>${esc(l.postcode)}</postcode>
      <country>AUS</country>
    </address>
    <category name="${esc(CATEGORY[l.property_type] ?? 'House')}"/>
    <headline>${esc(`Certified tenanted investment, $${l.weekly_rent}/wk`)}</headline>
    <description>${esc(summary + (l.description ? '\n\n' + l.description : ''))}</description>
    <features>
      <bedrooms>${esc(l.bedrooms ?? 0)}</bedrooms>
      <bathrooms>${esc(l.bathrooms ?? 0)}</bathrooms>
      <garages>${esc(l.parking ?? 0)}</garages>
      <pool>${l.has_pool ? 'yes' : 'no'}</pool>
    </features>
    <isTenanted>yes</isTenanted>
    <rent period="week">${esc(l.weekly_rent)}</rent>
    <externalLink href="${esc(`${baseUrl}/listings/${l.id}`)}"/>
  </residential>`;
  });
  return `<?xml version="1.0" encoding="UTF-8"?>\n<propertyList date="${new Date().toISOString()}">\n${items.join('\n')}\n</propertyList>\n`;
}

function splitStreet(address) {
  const m = String(address).match(/^\s*([\w/-]+)\s+(.*)$/);
  return m && /\d/.test(m[1]) ? { number: m[1], name: m[2] } : { number: '', name: address };
}
