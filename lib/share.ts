export async function tryNativeShare(data: ShareData) {
  if (!navigator.share) return false;
  if (data.files ? !navigator.canShare?.({ files: data.files }) : navigator.canShare?.(data) === false) {
    return false;
  }

  try {
    await navigator.share(data);
    return true;
  } catch (error) {
    return error instanceof DOMException && error.name === "AbortError";
  }
}
