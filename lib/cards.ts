export const emailLabels = ["work", "home", "other"] as const;
export const phoneLabels = ["mobile", "work", "home", "other"] as const;
export const linkKinds = ["linkedin", "instagram", "whatsapp", "snapchat", "url"] as const;
export const destinationKinds = [...linkKinds, "email", "phone", "website"] as const;

export type EmailLabel = (typeof emailLabels)[number];
export type PhoneLabel = (typeof phoneLabels)[number];
export type LinkKind = (typeof linkKinds)[number];
export type DestinationKind = (typeof destinationKinds)[number];

export type UniversalCard = {
  type: "universal";
  title: string;
  name: string;
  jobTitle: string;
  company: string;
  emails: { label: EmailLabel; value: string }[];
  phones: { label: PhoneLabel; value: string }[];
  links: { kind: LinkKind; value: string }[];
};

export type IndividualCard = {
  type: "individual";
  title: string;
  name?: string;
  kind: DestinationKind;
  value: string;
};

export type CardInput = UniversalCard | IndividualCard;

export const cardLimits = {
  title: 80,
  text: 120,
  email: 254,
  phone: 48,
  link: 2048,
  rows: 8,
} as const;

export class CardValidationError extends Error {
  override name = "CardValidationError";
}

function record(input: unknown): Record<string, unknown> {
  if (input === null || typeof input !== "object" || Array.isArray(input)) {
    throw new CardValidationError("Enter valid card details.");
  }
  return input as Record<string, unknown>;
}

function readString(input: unknown, field: string, maximum: number, multiline = false) {
  if (input === undefined) return "";
  if (typeof input !== "string" || input.length > maximum) {
    throw new CardValidationError(`${field} must be ${maximum} characters or fewer.`);
  }
  const checked = multiline ? input.replace(/[\t\r\n]/g, "") : input;
  if (/[\p{Cc}\p{Cs}]/u.test(checked)) {
    throw new CardValidationError(`${field} contains unsupported characters.`);
  }
  return input.trim();
}

function readChoice<T extends string>(input: unknown, options: readonly T[], message: string): T {
  const choice = options.find((option) => option === input);
  if (choice === undefined) throw new CardValidationError(message);
  return choice;
}

function readRows(input: unknown, field: string): Record<string, unknown>[] {
  if (input === undefined) return [];
  if (!Array.isArray(input) || input.length > cardLimits.rows) {
    throw new CardValidationError(`Add up to ${cardLimits.rows} ${field} per card.`);
  }
  return input.map(record);
}

function normalizeEmail(value: string): string {
  const [local, domain, ...remaining] = value.split("@");
  const invalid = () => new CardValidationError("Enter a valid email address.");
  if (
    remaining.length || !local || local.length > 64 ||
    !/^[A-Z0-9!#$%&'*+\/=?^_`{|}~-]+(?:\.[A-Z0-9!#$%&'*+\/=?^_`{|}~-]+)*$/i.test(local) ||
    !domain || !/^[\p{L}\p{N}\p{M}.-]+$/u.test(domain)
  ) {
    throw invalid();
  }
  let asciiDomain: string;
  try {
    asciiDomain = new URL(`https://${domain}`).hostname;
  } catch {
    throw invalid();
  }
  const labels = asciiDomain.split(".");
  if (labels.length < 2 || labels.some((label) => !/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(label))) {
    throw invalid();
  }
  const email = `${local}@${asciiDomain}`;
  if (email.length > cardLimits.email) throw invalid();
  return email;
}

function normalizePhone(value: string, kind: "phone" | "whatsapp") {
  const number = value.replace(/[ ().-]/g, "");
  if (kind === "whatsapp" && /^\+?[1-9]\d{6,14}$/.test(number)) {
    return number.replace(/^\+/, "");
  }
  if (kind === "phone" && /^\+[1-9]\d{6,14}$/.test(number)) return number;
  throw new CardValidationError("Enter an international number with its country code, such as +44 20 7946 0958.");
}

function readWebUrl(value: string, message: string, httpsOnly = false) {
  if (!/^https?:\/\/[^/]/i.test(value) || /[\s\\]|%(?![0-9a-f]{2})/i.test(value)) {
    throw new CardValidationError(message);
  }
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new CardValidationError(message);
  }
  if (url.username || url.password || (httpsOnly && (url.protocol !== "https:" || url.port))) {
    throw new CardValidationError(message);
  }
  return url;
}

function destinationValue(kind: DestinationKind, value: string): string {
  switch (kind) {
    case "email": {
      const [local, domain] = normalizeEmail(value).split("@");
      return `mailto:${encodeURIComponent(local).replace(/%2B/g, "+")}@${domain}`;
    }
    case "phone":
      return `tel:${normalizePhone(value, "phone")}`;
    case "whatsapp": {
      const message = "Enter a WhatsApp number with its country code or a https://wa.me/ link.";
      if (/^https?:/i.test(value)) {
        const url = readWebUrl(value, message, true);
        const match = /^\/([1-9]\d{6,14})\/?$/.exec(url.pathname);
        if (url.hostname !== "wa.me" || !match) throw new CardValidationError(message);
        return `https://wa.me/${match[1]}`;
      }
      return `https://wa.me/${normalizePhone(value, "whatsapp")}`;
    }
    case "linkedin": {
      const message = "Enter a LinkedIn profile, company or school URL starting with https://.";
      const url = readWebUrl(value, message, true);
      const match = /^\/(in|company|school)\/([a-z0-9_%.-]+)\/?$/i.exec(url.pathname);
      if (!/^(?:[a-z]{2,3}\.)?linkedin\.com$/.test(url.hostname) || !match) {
        throw new CardValidationError(message);
      }
      return `https://www.linkedin.com/${match[1]}/${match[2]}`;
    }
    case "instagram": {
      const message = "Enter an Instagram username or profile URL starting with https://.";
      const profile = /^[a-z0-9_][a-z0-9_.]{0,29}$/i;
      const username = value.replace(/^@/, "");
      if (profile.test(username)) return `https://www.instagram.com/${username}/`;
      const url = readWebUrl(value, message, true);
      const path = url.pathname.replace(/^\/|\/$/g, "");
      if (!/^(?:www\.)?instagram\.com$/.test(url.hostname) || !profile.test(path)) {
        throw new CardValidationError(message);
      }
      return `https://www.instagram.com/${path}/`;
    }
    case "snapchat": {
      const message = "Enter a Snapchat username or a https://www.snapchat.com/add/ profile link.";
      let username = value.replace(/^@/, "");
      if (/^https?:/i.test(value)) {
        const url = readWebUrl(value, message, true);
        const match = /^\/add\/([^/]+)\/?$/.exec(url.pathname);
        if (!/^(?:www\.)?snapchat\.com$/.test(url.hostname) || !match) throw new CardValidationError(message);
        username = match[1];
      }
      if (username.length < 3 || username.length > 15 || !/^[a-z][a-z0-9]*(?:[._-][a-z0-9]+)?$/i.test(username)) {
        throw new CardValidationError(message);
      }
      return `https://www.snapchat.com/add/${username.toLowerCase()}`;
    }
    case "website":
    case "url": {
      const url = readWebUrl(value, "Enter a website URL starting with https:// or http://.");
      const path = `${url.pathname}${url.search}${url.hash}`;
      // WHATWG URLs can leave some characters unescaped that RFC 3986 excludes from URI values.
      return url.origin + path.replace(/[\[\]^|]/g, (character) => encodeURIComponent(character));
    }
  }
}

function readUniversalCard(input: Record<string, unknown>, title: string): UniversalCard {
  const name = readString(input.name, "Contact name", cardLimits.text, true);
  const jobTitle = readString(input.jobTitle, "Job title", cardLimits.text, true);
  const company = readString(input.company, "Company", cardLimits.text, true);
  const emails = readRows(input.emails, "email addresses").flatMap((row) => {
    const value = readString(row.value, "Email address", cardLimits.email);
    if (!value) return [];
    const label = readChoice(row.label, emailLabels, "Choose an email label.");
    return [{ label, value: normalizeEmail(value) }];
  });
  const phones = readRows(input.phones, "phone numbers").flatMap((row) => {
    const value = readString(row.value, "Phone number", cardLimits.phone);
    if (!value) return [];
    const label = readChoice(row.label, phoneLabels, "Choose a phone label.");
    return [{ label, value: normalizePhone(value, "phone") }];
  });
  const links = readRows(input.links, "links").flatMap((row) => {
    const value = readString(row.value, "Link", cardLimits.link);
    if (!value) return [];
    const kind = readChoice(row.kind, linkKinds, "Choose a link type.");
    return [{ kind, value: destinationValue(kind, value) }];
  });
  if (!name && !jobTitle && !company && !emails.length && !phones.length && !links.length) {
    throw new CardValidationError("Add at least one contact detail to make a QR code.");
  }
  return { type: "universal", title, name, jobTitle, company, emails, phones, links };
}

function escapeVCardText(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/([,;])/g, "\\$1").replace(/\r\n|\r|\n/g, "\\n");
}

const utf8 = new TextEncoder();

function foldVCardLine(line: string) {
  let column = 0;
  let folded = "";
  for (const character of line) {
    const bytes = utf8.encode(character).length;
    if (column + bytes > 75) {
      folded += "\r\n ";
      column = 1;
    }
    folded += character;
    column += bytes;
  }
  return folded;
}

function serializeVCard(card: UniversalCard) {
  const lines = ["BEGIN:VCARD", "VERSION:4.0", `FN:${escapeVCardText(card.name || "Contact")}`];
  if (card.jobTitle) lines.push(`TITLE:${escapeVCardText(card.jobTitle)}`);
  if (card.company) lines.push(`ORG:${escapeVCardText(card.company)}`);
  for (const { label, value } of card.emails) {
    const type = label === "other" ? "" : `;TYPE=${label}`;
    lines.push(`EMAIL${type}:${escapeVCardText(value)}`);
  }
  for (const { label, value } of card.phones) {
    const type = label === "other" ? "" : `;TYPE=${label === "mobile" ? "cell" : label}`;
    // RFC 6350 permits text TEL values for compatibility with vCard 3.0 readers.
    lines.push(`TEL${type}:${value}`);
  }
  for (const { value } of card.links) lines.push(`URL:${value}`);
  lines.push("END:VCARD");
  return `${lines.map(foldVCardLine).join("\r\n")}\r\n`;
}

export function makeCardPayload(input: unknown): { card: CardInput; payload: string } {
  const source = record(input);
  const title = readString(source.title, "Card name", cardLimits.title);
  if (!title) throw new CardValidationError("Give your card a name.");

  if (source.type === "universal") {
    const card = readUniversalCard(source, title);
    return { card, payload: serializeVCard(card) };
  }
  if (source.type === "individual") {
    const kind = readChoice(source.kind, destinationKinds, "Choose a destination for your card.");
    const maximum = kind === "email" ? cardLimits.email : kind === "phone" ? cardLimits.phone : cardLimits.link;
    const value = readString(source.value, "Destination", maximum);
    if (!value) throw new CardValidationError("Enter a destination to make a QR code.");
    const name = readString(source.name, "Name", cardLimits.text);
    const card: IndividualCard = { type: "individual", title, ...(name ? { name } : {}), kind, value };
    return { card, payload: destinationValue(kind, value) };
  }
  throw new CardValidationError("Choose a card type.");
}
