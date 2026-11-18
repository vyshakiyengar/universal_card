import { AtSign, Globe2, Link2, Phone, Plus, QrCode, Trash2 } from "lucide-react";
import {
  cardLimits, emailLabels, linkKinds, phoneLabels,
  type DestinationKind, type UniversalCard,
} from "@/lib/cards";

export const destinations = {
  linkedin: { label: "LinkedIn", field: "LinkedIn profile URL", hint: "https://www.linkedin.com/in/your-name", inputType: "text" },
  whatsapp: { label: "WhatsApp", field: "WhatsApp number or link", hint: "+44 7700 900123", inputType: "text" },
  email: { label: "Email", field: "Email address", hint: "alex@example.com", inputType: "email" },
  phone: { label: "Phone", field: "Phone number", hint: "+44 7700 900123", inputType: "tel" },
  instagram: { label: "Instagram", field: "Instagram username or URL", hint: "@yourname", inputType: "text" },
  website: { label: "Website", field: "Website URL", hint: "https://example.com", inputType: "url" },
  url: { label: "Custom link", field: "Link URL", hint: "https://example.com", inputType: "url" },
} as const;

export const scanDescriptions = {
  universal: "On compatible phones, scanning opens a vCard you can save to Contacts.",
  linkedin: "Scanning opens the linked LinkedIn page.",
  whatsapp: "Scanning opens a chat with the linked number if it is active on WhatsApp.",
  instagram: "Scanning opens the linked Instagram profile.",
  email: "Scanning opens a new email with the address in the To field.",
  phone: "Scanning opens the phone dialer with the number filled in.",
  website: "Scanning opens the website in a browser.",
  url: "Scanning opens the exact link you entered.",
} satisfies Record<DestinationKind | "universal", string>;

export function DestinationMark({ kind }: { kind: DestinationKind | "universal" }) {
  return (
    <span className={`destination-mark mark-${kind}`} aria-hidden="true">
      {kind === "linkedin" && <svg viewBox="0 0 24 24" fill="currentColor"><path d="M20.45 2H3.55C2.69 2 2 2.68 2 3.53v16.94c0 .85.69 1.53 1.55 1.53h16.9c.86 0 1.55-.68 1.55-1.53V3.53C22 2.68 21.31 2 20.45 2ZM7.94 19.05H4.97V9.5h2.97v9.55ZM6.46 8.19a1.72 1.72 0 1 1 0-3.44 1.72 1.72 0 0 1 0 3.44Zm12.59 10.86h-2.96V14.4c0-1.11-.02-2.54-1.55-2.54-1.55 0-1.78 1.21-1.78 2.46v4.73H9.8V9.5h2.84v1.31h.04a3.12 3.12 0 0 1 2.81-1.54c3 0 3.56 1.97 3.56 4.54v5.24Z"/></svg>}
      {kind === "whatsapp" && <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12.04 2a9.9 9.9 0 0 0-8.59 14.82L2 22l5.33-1.4A10 10 0 1 0 12.04 2Zm0 18.3c-1.52 0-2.96-.4-4.25-1.17l-.3-.18-3.15.83.84-3.07-.2-.32a8.3 8.3 0 1 1 7.06 3.91Zm4.55-6.17c-.25-.12-1.47-.72-1.7-.8-.22-.09-.39-.13-.55.12-.17.25-.64.8-.78.96-.15.17-.29.19-.54.06-.25-.12-1.05-.38-2-1.23-.74-.66-1.24-1.48-1.39-1.73-.14-.25-.01-.38.11-.5.11-.12.25-.29.37-.44.13-.14.17-.24.25-.41.09-.16.04-.31-.02-.43l-.77-1.85c-.2-.49-.4-.42-.55-.43h-.47c-.16 0-.43.06-.66.31s-.87.86-.87 2.1.89 2.43 1.01 2.6c.12.17 1.75 2.68 4.23 3.76.6.26 1.06.41 1.42.53.59.18 1.12.15 1.55.09.48-.07 1.47-.61 1.68-1.2.2-.58.2-1.08.14-1.18-.06-.11-.23-.17-.48-.29Z"/></svg>}
      {kind === "instagram" && <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.7" r="1" fill="currentColor" stroke="none"/></svg>}
      {kind === "email" && <AtSign />}
      {kind === "phone" && <Phone />}
      {kind === "url" && <Link2 />}
      {kind === "website" && <Globe2 />}
      {kind === "universal" && <QrCode />}
    </span>
  );
}

type Row<Label extends string> = { label: Label; value: string };
const labelText: Record<string, string> = { home: "Home", work: "Work", mobile: "Mobile", other: "Other" };

function ContactRows<Label extends string>({ labels, rows, onChange, type }: {
  labels: readonly Label[];
  rows: Row<Label>[];
  onChange: (rows: Row<Label>[]) => void;
  type: "email" | "phone";
}) {
  const name = type === "email" ? "email" : "phone";
  const defaultLabel = labels.find((label) => label === (type === "email" ? "work" : "mobile")) ?? labels[0];
  function update(index: number, change: Partial<Row<Label>>) {
    onChange(rows.map((row, position) => position === index ? { ...row, ...change } : row));
  }
  return (
    <div className="contact-group">
      <div className="group-heading">
        <h3>{type === "email" ? "Email addresses" : "Phone numbers"}</h3>
        <button type="button" className="text-button" disabled={rows.length >= cardLimits.rows} onClick={() => onChange([...rows, { label: defaultLabel, value: "" }])}>
          <Plus size={16} /> Add {name}
        </button>
      </div>
      {rows.map((row, index) => (
        <div className="field-row" key={index}>
          <select aria-label={`${name} ${index + 1} label`} value={row.label} onChange={(event) => update(index, { label: event.target.value as Label })}>
            {labels.map((label) => <option value={label} key={label}>{labelText[label]}</option>)}
          </select>
          <input aria-label={`${name} ${index + 1}`} type={type === "email" ? "email" : "tel"} autoComplete={type === "email" ? "email" : "tel"} value={row.value}
            maxLength={cardLimits[type]} placeholder={destinations[type].hint} onChange={(event) => update(index, { value: event.target.value })} />
          <button className="icon-button" type="button" aria-label={`Remove ${name} ${index + 1}`} onClick={() => onChange(rows.filter((_, position) => position !== index))}>
            <Trash2 size={16} />
          </button>
        </div>
      ))}
    </div>
  );
}

export function UniversalFields({ draft, onChange }: { draft: UniversalCard; onChange: (draft: UniversalCard) => void }) {
  return (
    <>
      <div className="input-pair">
        <label className="field">Job title
          <input value={draft.jobTitle} maxLength={cardLimits.text} placeholder="Product designer" autoComplete="organization-title"
            onChange={(event) => onChange({ ...draft, jobTitle: event.target.value })} />
        </label>
        <label className="field">Company
          <input value={draft.company} maxLength={cardLimits.text} placeholder="Studio North" autoComplete="organization"
            onChange={(event) => onChange({ ...draft, company: event.target.value })} />
        </label>
      </div>
      <div className="contact-fields">
        <ContactRows labels={emailLabels} type="email" rows={draft.emails} onChange={(emails) => onChange({ ...draft, emails })} />
        <ContactRows labels={phoneLabels} type="phone" rows={draft.phones} onChange={(phones) => onChange({ ...draft, phones })} />
        <div className="contact-group">
          <div className="group-heading">
            <h3>Links</h3>
            <button className="text-button" type="button" disabled={draft.links.length >= cardLimits.rows}
              onClick={() => onChange({ ...draft, links: [...draft.links, { kind: "linkedin", value: "" }] })}>
              <Plus size={16} /> Add link
            </button>
          </div>
          {draft.links.map((link, index) => (
            <div className="field-row" key={index}>
              <select aria-label={`Link ${index + 1} type`} value={link.kind} onChange={(event) => onChange({
                ...draft, links: draft.links.map((entry, position) => position === index ? { ...entry, kind: event.target.value as typeof link.kind } : entry),
              })}>
                {linkKinds.map((kind) => <option key={kind} value={kind}>{destinations[kind].label}</option>)}
              </select>
              <input aria-label={`Link ${index + 1}`} maxLength={cardLimits.link} value={link.value}
                placeholder={destinations[link.kind].hint} onChange={(event) => onChange({
                  ...draft, links: draft.links.map((entry, position) => position === index ? { ...entry, value: event.target.value } : entry),
                })} />
              <button className="icon-button" type="button" aria-label={`Remove link ${index + 1}`}
                onClick={() => onChange({ ...draft, links: draft.links.filter((_, position) => index !== position) })}>
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
