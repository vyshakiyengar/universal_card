import Image from "next/image";

export function ConnectionMark() {
  return <Image className="connection-mark" src="/universal-card-mark.svg" width={36} height={36} alt="" loading="eager" unoptimized />;
}
