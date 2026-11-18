import Image from "next/image";

export function ConnectionMark() {
  return <Image className="connection-mark" src="/universal-card-mark.svg" width={32} height={32} alt="" loading="eager" unoptimized />;
}
